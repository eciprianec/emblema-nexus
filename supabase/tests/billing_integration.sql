-- Prueba de integración del módulo de facturación. Todo corre en una transacción
-- y se revierte. Con el stack de Supabase corriendo:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/billing_integration.sql
-- Cualquier expectativa incumplida aborta con "FALLA: ...".

BEGIN;

CREATE FUNCTION pg_temp.as_user(p_user UUID) RETURNS VOID AS $$
    SELECT set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, TRUE),
           set_config('request.jwt.claim.sub', p_user::text, TRUE),
           set_config('role', 'authenticated', TRUE);
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.as_admin() RETURNS VOID AS $$
    SELECT set_config('role', 'postgres', TRUE),
           set_config('request.jwt.claims', '', TRUE),
           set_config('request.jwt.claim.sub', '', TRUE);
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.check(p_ok BOOLEAN, p_what TEXT) RETURNS VOID AS $$
BEGIN
    IF p_ok IS NOT TRUE THEN RAISE EXCEPTION 'FALLA: %', p_what; END IF;
END;
$$ LANGUAGE plpgsql;

-- Ejecuta p_sql y exige que falle con un mensaje que contenga p_expected.
CREATE FUNCTION pg_temp.must_fail(p_sql TEXT, p_expected TEXT) RETURNS VOID AS $$
DECLARE
    v_rows INT;
BEGIN
    BEGIN
        EXECUTE p_sql;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT ILIKE '%' || p_expected || '%' THEN
            RAISE EXCEPTION 'FALLA: esperaba "%" y obtuvo "%" en: %', p_expected, SQLERRM, p_sql;
        END IF;
        RETURN;
    END;
    RAISE EXCEPTION 'FALLA: debió rechazarse: %', p_sql;
END;
$$ LANGUAGE plpgsql;

-- Cabecera y línea de $1,000 + 18 % para simplificar.
CREATE FUNCTION pg_temp.header(p_type TEXT, p_client UUID, p_extra JSONB DEFAULT '{}') RETURNS JSONB AS $$
    SELECT jsonb_build_object(
        'fiscal_type', p_type, 'client_id', p_client, 'issue_date', '2026-10-15', 'due_date', '2026-10-15',
        'currency', 'DOP', 'exchange_rate', 1, 'income_type', '01', 'payment_type', 1,
        'buyer_snapshot', jsonb_build_object('taxId', '131880738', 'name', 'Cliente SRL'),
        'subtotal', 1000, 'itbis', 180, 'discount', 0, 'total', 1180, 'amount_due', 1180,
        'taxable_18', 1000, 'taxable_16', 0, 'taxable_0', 0, 'exempt_amount', 0, 'non_billable_amount', 0,
        'itbis_18', 180, 'itbis_16', 0, 'itbis_withholding_rate', 0, 'isr_withholding_rate', 0,
        'itbis_withheld', 0, 'isr_withheld', 0
    ) || p_extra;
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.items() RETURNS JSONB AS $$
    SELECT '[{"description":"Honorarios","quantity":1,"unit_price":1000,"billing_indicator":1,"good_or_service":2,
              "discount_amount":0,"amount":1000,"itbis_amount":180,"total":1180,"itbis_withheld":0,"isr_withheld":0}]'::jsonb;
$$ LANGUAGE sql;

DO $$
DECLARE
    c_a UUID := gen_random_uuid();
    c_b UUID := gen_random_uuid();
    u_a UUID := gen_random_uuid();
    u_b UUID := gen_random_uuid();
    u_sin UUID := gen_random_uuid();
    cl_a UUID;
    cl_b UUID;
    admin_role UUID;
    inv UUID;
    inv2 UUID;
    nc UUID;
    pago UUID;
    r RECORD;
BEGIN
    -- Dos empresas, un administrador por empresa y un miembro sin permisos
    INSERT INTO companies (id, name, rnc) VALUES (c_a, 'Empresa A', '131880738'), (c_b, 'Empresa B', '101672919');
    INSERT INTO auth.users (id, email) VALUES (u_a, 'a@test.local'), (u_b, 'b@test.local'), (u_sin, 'c@test.local');
    INSERT INTO company_members (company_id, user_id) VALUES (c_a, u_a), (c_b, u_b), (c_a, u_sin);
    SELECT id INTO admin_role FROM roles WHERE name = 'Administrador' AND is_system;
    INSERT INTO user_roles (user_id, role_id, company_id) VALUES (u_a, admin_role, c_a), (u_b, admin_role, c_b);
    INSERT INTO clients (company_id, client_type, business_name, rnc) VALUES (c_a, 'persona_juridica', 'Cliente A', '131880738') RETURNING id INTO cl_a;
    INSERT INTO clients (company_id, client_type, business_name, rnc) VALUES (c_b, 'persona_juridica', 'Cliente B', '101672919') RETURNING id INTO cl_b;

    PERFORM pg_temp.as_user(u_a);

    -- Sin configuración no se emite
    inv := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L)', inv), 'Configura los datos fiscales');

    INSERT INTO billing_settings (company_id, emission_mode, rnc, legal_name, address)
    VALUES (c_a, 'ecf_externo', '131880738', 'Empresa A SRL', 'Santo Domingo');
    PERFORM pg_temp.check((SELECT invoice_number LIKE 'FAC-%-0001' FROM invoices WHERE id = inv), 'numeración interna');

    -- ---- Aislamiento entre empresas
    PERFORM pg_temp.as_user(u_b);
    PERFORM pg_temp.check((SELECT COUNT(*) FROM invoices WHERE id = inv) = 0, 'B no ve facturas de A');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM invoice_items WHERE invoice_id = inv) = 0, 'B no ve líneas de A');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_settings WHERE company_id = c_a) = 0, 'B no ve configuración de A');
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, NULL, %L, %L)', c_a, pg_temp.header('31', NULL), pg_temp.items()), 'No perteneces');
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv, 'E310000000099', 'ABC123'), 'No perteneces');
    PERFORM pg_temp.must_fail(format('SELECT billing_delete_draft(%L)', inv), 'No perteneces');
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 10, %L, %L)', inv, '2026-10-16', 'efectivo'), 'No perteneces');
    PERFORM pg_temp.must_fail(format('INSERT INTO invoice_items (invoice_id, description) VALUES (%L, %L)', inv, 'x'), 'row-level security');

    -- Un cliente de otra empresa no se puede facturar
    PERFORM pg_temp.as_user(u_a);
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, NULL, %L, %L)', c_a, pg_temp.header('31', cl_b), pg_temp.items()), 'no pertenece a esta empresa');

    -- ---- Permisos
    PERFORM pg_temp.as_user(u_sin);
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, NULL, %L, %L)', c_a, pg_temp.header('31', cl_a), pg_temp.items()), 'No tienes permiso');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM invoices WHERE company_id = c_a) = 0, 'sin finance.view no ve facturas');

    -- ---- Sin sesión
    PERFORM pg_temp.as_admin();
    PERFORM set_config('role', 'anon', TRUE);
    PERFORM pg_temp.must_fail('SELECT * FROM view_financial_kpis', 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L)', inv), 'permission denied');

    -- ---- Los KPI respetan la empresa
    PERFORM pg_temp.as_user(u_b);
    PERFORM pg_temp.check((SELECT COUNT(*) FROM view_financial_kpis WHERE company_id = c_a) = 0, 'B no ve KPI de A');

    -- ---- Cuadre verificado por la base de datos
    PERFORM pg_temp.as_user(u_a);
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a, '{"total": 1.00, "amount_due": 1.00}'), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv2, 'E310000000001', 'ABC123'), 'no cuadran');
    inv2 := billing_save_draft(c_a, inv2, pg_temp.header('31', cl_a, '{"itbis_18": 1, "itbis": 1, "total": 1001, "amount_due": 1001}'), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv2, 'E310000000001', 'ABC123'), 'no cuadran');
    PERFORM billing_delete_draft(inv2);

    -- ---- Reglas del comprador
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', NULL, '{"buyer_snapshot": {}}'), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv2, 'E310000000001', 'ABC123'), 'requiere RNC');
    PERFORM billing_delete_draft(inv2);

    -- ---- Validación del e-NCF
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv, 'E3100000001', 'ABC123'), '13 posiciones');
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv, 'E320000000001', 'ABC123'), '13 posiciones');
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv, 'E310000000001', 'ABC'), 'código de seguridad');
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L)', inv, 'E310000000001', 'ABC123'), 'fecha y hora de firma');

    -- ---- Emisión con e-CF externo
    PERFORM billing_issue_invoice(inv, 'E310000000001', 'abc123', now() - interval '1 minute', 'TRK-1');
    SELECT * INTO r FROM invoices WHERE id = inv;
    PERFORM pg_temp.check(r.status = 'emitida' AND r.ncf = 'E310000000001' AND r.ncf_type = 'E31', 'emitida con e-NCF');
    PERFORM pg_temp.check(r.emission_mode = 'ecf_externo' AND r.emitter_snapshot->>'legalName' = 'Empresa A SRL', 'fija al emisor');
    PERFORM pg_temp.check(r.buyer_snapshot->>'name' = 'Cliente A', 'el comprador se toma del cliente, no del navegador');
    PERFORM pg_temp.check((SELECT security_code = 'ABC123' AND source = 'externo' FROM ecf_invoices WHERE invoice_id = inv), 'registra el e-CF');

    -- No se puede registrar dos veces el mismo e-NCF ni reemitir
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv2, 'E310000000001', 'ABC123'), 'ya está registrado');
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv, 'E310000000002', 'ABC123'), 'ya fue emitido');
    PERFORM billing_delete_draft(inv2);

    -- ---- Inmutabilidad, incluso para el dueño de la base
    -- Sin política de escritura, RLS no da error: simplemente no afecta ninguna fila.
    UPDATE invoices SET total = 1 WHERE id = inv;
    PERFORM pg_temp.check((SELECT total = 1180 FROM invoices WHERE id = inv), 'un usuario no altera un comprobante');
    PERFORM pg_temp.as_admin();
    -- La marca interna dura hasta el fin de la transacción: aquí se limpia porque
    -- toda la prueba corre en una sola; cada llamada real a la API es la suya.
    PERFORM set_config('billing.rpc', '', TRUE);
    PERFORM pg_temp.must_fail(format('UPDATE invoices SET total = 1 WHERE id = %L', inv), 'solo cambian mediante');
    PERFORM pg_temp.must_fail(format('DELETE FROM invoices WHERE id = %L', inv), 'no se puede eliminar');
    PERFORM pg_temp.must_fail(format('UPDATE invoice_items SET amount = 1 WHERE invoice_id = %L', inv), 'no se pueden modificar');
    PERFORM pg_temp.must_fail(format('DELETE FROM invoice_items WHERE invoice_id = %L', inv), 'no se pueden modificar');
    PERFORM set_config('billing.rpc', 'on', TRUE);
    PERFORM pg_temp.must_fail(format('UPDATE invoices SET ncf = %L WHERE id = %L', 'E310000000777', inv), 'inmutables');
    PERFORM set_config('billing.rpc', '', TRUE);
    PERFORM pg_temp.as_user(u_a);

    -- Un e-CF no se anula directamente, ni se edita como borrador
    PERFORM pg_temp.must_fail(format('SELECT billing_void_invoice(%L, %L)', inv, 'motivo'), 'nota de crédito');
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, %L, %L, %L)', c_a, inv, pg_temp.header('31', cl_a), pg_temp.items()), 'Solo se pueden editar');
    PERFORM pg_temp.must_fail(format('SELECT billing_delete_draft(%L)', inv), 'Solo se pueden eliminar');

    -- ---- Cobros
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 5000, %L, %L)', inv, '2026-10-16', 'efectivo'), 'supera el saldo');
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, -5, %L, %L)', inv, '2026-10-16', 'efectivo'), 'positivo');
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 5, %L, %L)', inv, '2026-10-01', 'efectivo'), 'entre la emisión y hoy');
    pago := billing_register_payment(inv, 180, '2026-10-16', 'transferencia', 'REF-1');
    SELECT * INTO r FROM invoices WHERE id = inv;
    PERFORM pg_temp.check(r.status = 'parcialmente_pagada' AND r.paid_amount = 180 AND r.balance_due = 1000, 'cobro parcial');

    -- Anular un cobro devuelve el saldo y conserva el recibo
    PERFORM billing_void_payment(pago, 'Error de digitación');
    SELECT * INTO r FROM invoices WHERE id = inv;
    PERFORM pg_temp.check(r.status = 'emitida' AND r.paid_amount = 0 AND r.balance_due = 1180, 'anula cobro');
    PERFORM pg_temp.check((SELECT voided_at IS NOT NULL FROM payments WHERE id = pago), 'conserva el recibo anulado');
    PERFORM pg_temp.must_fail(format('SELECT billing_void_payment(%L, %L)', pago, 'otra vez'), 'ya fue anulado');
    PERFORM pg_temp.check((SELECT total_collected FROM view_financial_kpis WHERE company_id = c_a) = 0, 'KPI excluye cobros anulados');

    -- ---- Notas de crédito
    nc := billing_save_draft(c_a, NULL, pg_temp.header('34', cl_a, jsonb_build_object(
        'modifies_invoice_id', inv, 'modification_code', 3, 'modification_reason', 'Error en precio',
        'subtotal', 100, 'itbis', 18, 'total', 118, 'amount_due', 118, 'taxable_18', 100, 'itbis_18', 18)),
        '[{"description":"Ajuste","quantity":1,"unit_price":100,"billing_indicator":1,"good_or_service":2,"discount_amount":0,"amount":100,"itbis_amount":18,"total":118,"itbis_withheld":0,"isr_withheld":0}]');
    PERFORM pg_temp.check((SELECT invoice_number LIKE 'NC-%' FROM invoices WHERE id = nc), 'numeración de nota');
    PERFORM billing_issue_invoice(nc, 'E340000000001', 'XYZ789', now());
    SELECT * INTO r FROM invoices WHERE id = nc;
    PERFORM pg_temp.check(r.modified_ncf = 'E310000000001' AND r.modified_ncf_date = '2026-10-15' AND r.balance_due = 0, 'referencia tomada del original');
    SELECT * INTO r FROM invoices WHERE id = inv;
    PERFORM pg_temp.check(r.credited_amount = 118 AND r.balance_due = 1062, 'la nota reduce el saldo');
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 10, %L, %L)', nc, '2026-10-16', 'efectivo'), 'no admite cobros');
    PERFORM pg_temp.check((SELECT total_invoiced FROM view_financial_kpis WHERE company_id = c_a) = 1062, 'la nota resta en los KPI');

    -- La suma de notas no puede superar el comprobante
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('34', cl_a, jsonb_build_object('modifies_invoice_id', inv, 'modification_code', 1, 'modification_reason', 'Anula')), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv2, 'E340000000002', 'XYZ790'), 'supera lo acreditable');
    PERFORM billing_delete_draft(inv2);

    -- Con retenciones, el saldo baja por el neto de la nota y el límite sigue siendo el total
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a, '{"itbis_withheld": 54, "isr_withheld": 100, "amount_due": 1026}'),
        '[{"description":"Honorarios","quantity":1,"unit_price":1000,"billing_indicator":1,"good_or_service":2,"discount_amount":0,"amount":1000,"itbis_amount":180,"total":1180,"itbis_withheld":54,"isr_withheld":100}]');
    PERFORM billing_issue_invoice(inv2, 'E310000000200', 'RET001', now());
    nc := billing_save_draft(c_a, NULL, pg_temp.header('34', cl_a, jsonb_build_object(
        'modifies_invoice_id', inv2, 'modification_code', 3, 'modification_reason', 'Ajuste con retenciones',
        'subtotal', 500, 'itbis', 90, 'total', 590, 'amount_due', 513, 'taxable_18', 500, 'itbis_18', 90,
        'itbis_withheld', 27, 'isr_withheld', 50)),
        '[{"description":"Ajuste","quantity":1,"unit_price":500,"billing_indicator":1,"good_or_service":2,"discount_amount":0,"amount":500,"itbis_amount":90,"total":590,"itbis_withheld":27,"isr_withheld":50}]');
    PERFORM billing_issue_invoice(nc, 'E340000000200', 'RET002', now());
    SELECT * INTO r FROM invoices WHERE id = inv2;
    PERFORM pg_temp.check(r.credited_amount = 590 AND r.balance_due = 513, 'el saldo baja por el neto de retenciones');
    nc := billing_save_draft(c_a, NULL, pg_temp.header('34', cl_a, jsonb_build_object(
        'modifies_invoice_id', inv2, 'modification_code', 3, 'modification_reason', 'Excede',
        'subtotal', 1000, 'itbis', 180, 'total', 1180, 'amount_due', 1180)), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', nc, 'E340000000201', 'RET003'), 'supera lo acreditable');
    PERFORM billing_delete_draft(nc);

    -- Una nota sin referencia se rechaza; tampoco una nota sobre otra nota
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, NULL, %L, %L)', c_a, pg_temp.header('34', cl_a), pg_temp.items()), 'invoices_notes_reference_check');
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, NULL, %L, %L)', c_a, pg_temp.header('34', cl_a, jsonb_build_object('modifies_invoice_id', nc)), pg_temp.items()), 'no existe o no está emitido');

    -- ---- Cobro total
    PERFORM billing_register_payment(inv, 1062, '2026-10-20', 'efectivo');
    PERFORM pg_temp.check((SELECT status = 'pagada' AND balance_due = 0 FROM invoices WHERE id = inv), 'pagada al saldar');

    -- ---- Una nota puede pasar del saldo: lo cobrado de más queda a favor del cliente
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a), pg_temp.items());
    PERFORM billing_issue_invoice(inv2, 'E310000000300', 'FAV001', now());
    pago := billing_register_payment(inv2, 100, '2026-10-20', 'efectivo');
    PERFORM pg_temp.check((SELECT COUNT(*) = 0 FROM billing_customer_credits(c_a)), 'sin nota no hay saldo a favor');
    FOR i IN 1..2 LOOP
        nc := billing_save_draft(c_a, NULL, pg_temp.header('34', cl_a, jsonb_build_object(
            'modifies_invoice_id', inv2, 'modification_code', 3, 'modification_reason', 'Devolución',
            'subtotal', 500, 'itbis', 90, 'total', 590, 'amount_due', 590, 'taxable_18', 500, 'itbis_18', 90)),
            '[{"description":"Ajuste","quantity":1,"unit_price":500,"billing_indicator":1,"good_or_service":2,"discount_amount":0,"amount":500,"itbis_amount":90,"total":590,"itbis_withheld":0,"isr_withheld":0}]');
        PERFORM billing_issue_invoice(nc, 'E34000000030' || i, 'FAV00' || (i + 1), now());
    END LOOP;
    SELECT * INTO r FROM invoices WHERE id = inv2;
    PERFORM pg_temp.check(r.balance_due = 0 AND r.credited_amount = 1180 AND r.paid_amount = 100 AND r.status = 'pagada', 'la nota llega al total del comprobante');
    PERFORM pg_temp.check((SELECT amount = 100 AND amount_dop = 100 AND invoice_id = inv2 AND client_id = cl_a FROM billing_customer_credits(c_a)), 'el cobro de más queda a favor del cliente');
    PERFORM pg_temp.check((SELECT COUNT(*) = 1 FROM billing_customer_credits(c_a)), 'solo ese comprobante');
    -- Sin el cobro no hay saldo a favor, aunque lo acreditado llegue al total.
    PERFORM billing_void_payment(pago, 'Error');
    PERFORM pg_temp.check((SELECT COUNT(*) = 0 FROM billing_customer_credits(c_a)), 'el saldo a favor no pasa de lo cobrado');

    -- ---- Modo NCF tradicional con rangos
    UPDATE billing_settings SET emission_mode = 'ncf_interno' WHERE company_id = c_a;
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', cl_a), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L)', inv2), 'No hay un rango autorizado');
    INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on)
    VALUES (c_a, 'B02', 1, 2, 1, '2020-01-01');
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L)', inv2), 'No hay un rango autorizado');
    UPDATE fiscal_sequences SET expires_on = '2099-12-31' WHERE company_id = c_a;
    PERFORM pg_temp.must_fail(format('INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on) VALUES (%L, %L, 2, 5, 2, %L)', c_a, 'B02', '2099-12-31'), 'solapa');
    PERFORM billing_issue_invoice(inv2);
    PERFORM pg_temp.check((SELECT ncf = 'B0200000001' AND sequence_expires_on = '2099-12-31' FROM invoices WHERE id = inv2), 'asigna NCF de 11 posiciones');

    -- Anulación de NCF tradicional
    PERFORM pg_temp.must_fail(format('SELECT billing_void_invoice(%L, %L)', inv2, ' '), 'motivo');
    PERFORM billing_void_invoice(inv2, 'Error de cliente');
    PERFORM pg_temp.check((SELECT status = 'anulada' AND balance_due = 0 AND ncf = 'B0200000001' FROM invoices WHERE id = inv2), 'anulada conserva NCF');
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, NULL, %L, %L)', c_a, pg_temp.header('34', cl_a, jsonb_build_object('modifies_invoice_id', inv2)), pg_temp.items()), 'no existe o no está emitido');

    -- Agotamiento del rango
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', cl_a), pg_temp.items());
    PERFORM billing_issue_invoice(inv2);
    PERFORM pg_temp.check((SELECT ncf = 'B0200000002' FROM invoices WHERE id = inv2), 'siguiente NCF');
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', cl_a), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L)', inv2), 'No hay un rango autorizado');

    -- Modo directo: aún no disponible
    UPDATE billing_settings SET emission_mode = 'ecf_directo' WHERE company_id = c_a;
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L)', inv2), 'aún no está disponible');

    -- Umbral de RD$250,000 en consumo
    UPDATE billing_settings SET emission_mode = 'ecf_externo' WHERE company_id = c_a;
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', NULL, '{"buyer_snapshot": {}, "subtotal": 250000, "itbis": 0, "total": 250000, "amount_due": 250000, "taxable_18": 0, "itbis_18": 0, "exempt_amount": 250000}'),
        '[{"description":"Servicio","quantity":1,"unit_price":250000,"billing_indicator":4,"good_or_service":2,"discount_amount":0,"amount":250000,"itbis_amount":0,"total":250000,"itbis_withheld":0,"isr_withheld":0}]');
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv2, 'E320000000001', 'ABC123'), '250,000');

    -- Una fecha futura no se emite
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a, '{"issue_date": "2099-01-01"}'), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L, %L, %L, now())', inv2, 'E310000000050', 'ABC123'), 'no puede ser futura');

    RAISE NOTICE 'OK: todas las verificaciones de facturación pasaron';
END $$;

ROLLBACK;
