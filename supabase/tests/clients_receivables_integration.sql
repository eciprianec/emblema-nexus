-- Prueba de integración de clientes y cartera (migración 00021). Todo corre en una
-- transacción y se revierte. Con el stack de Supabase corriendo:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/clients_receivables_integration.sql
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

CREATE FUNCTION pg_temp.must_fail(p_sql TEXT, p_expected TEXT) RETURNS VOID AS $$
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT ILIKE '%' || p_expected || '%' THEN
            RAISE EXCEPTION 'FALLA: esperaba "%" y obtuvo "%" en: %', p_expected, SQLERRM, p_sql;
        END IF;
        RETURN;
    END;
    RAISE EXCEPTION 'FALLA: debió rechazarse: %', p_sql;
END;
$$ LANGUAGE plpgsql;

-- Cuántas filas afecta una escritura: RLS no da error, solo no toca la fila.
CREATE FUNCTION pg_temp.rows_touched(p_sql TEXT) RETURNS INT AS $$
DECLARE
    v_rows INT;
BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION pg_temp.header(p_client UUID, p_extra JSONB DEFAULT '{}') RETURNS JSONB AS $$
    SELECT jsonb_build_object(
        'fiscal_type', '31', 'client_id', p_client, 'issue_date', '2026-01-15', 'due_date', '2026-01-15',
        'currency', 'DOP', 'exchange_rate', 1, 'income_type', '01', 'payment_type', 1,
        'subtotal', 1000, 'itbis', 180, 'discount', 0, 'total', 1180, 'amount_due', 1180,
        'taxable_18', 1000, 'taxable_16', 0, 'taxable_0', 0, 'exempt_amount', 0, 'non_billable_amount', 0,
        'itbis_18', 180, 'itbis_16', 0, 'itbis_withholding_rate', 0, 'isr_withholding_rate', 0,
        'itbis_withheld', 0, 'isr_withheld', 0
    ) || p_extra;
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.items() RETURNS JSONB AS $$
    SELECT '[{"description":"Honorarios","item_type":"honorarios","quantity":1,"unit_price":1000,"billing_indicator":1,"good_or_service":2,
              "discount_amount":0,"amount":1000,"itbis_amount":180,"total":1180,"itbis_withheld":0,"isr_withheld":0}]'::jsonb;
$$ LANGUAGE sql;

DO $$
DECLARE
    c_a UUID := gen_random_uuid();
    c_b UUID := gen_random_uuid();
    u_admin UUID := gen_random_uuid();
    u_conta UUID := gen_random_uuid();
    u_ver UUID := gen_random_uuid();
    u_arch UUID := gen_random_uuid();
    u_b UUID := gen_random_uuid();
    r_admin UUID;
    r_conta UUID;
    r_ver UUID;
    r_arch UUID;
    cl_a UUID;
    cl_seg UUID;
    today DATE := billing_today();
    inv UUID;
    inv_contado UUID;
    inv_vencida UUID;
    inv_usd UUID;
    inv_anulable UUID;
    inv_borrador UUID;
    nc UUID;
    pago UUID;
    s RECORD;
    p RECORD;
    f RECORD;
    v_numbers INT := 100;
BEGIN
    INSERT INTO companies (id, name, rnc) VALUES (c_a, 'Empresa A', '131880738'), (c_b, 'Empresa B', '101672919');
    INSERT INTO auth.users (id, email) VALUES
        (u_admin, 'admin@test.local'), (u_conta, 'conta@test.local'), (u_ver, 'ver@test.local'),
        (u_arch, 'arch@test.local'), (u_b, 'b@test.local');
    INSERT INTO company_members (company_id, user_id) VALUES
        (c_a, u_admin), (c_a, u_conta), (c_a, u_ver), (c_a, u_arch), (c_b, u_b);

    SELECT id INTO r_admin FROM roles WHERE name = 'Administrador' AND is_system;
    SELECT id INTO r_conta FROM roles WHERE name = 'Contabilidad' AND is_system;
    INSERT INTO roles (company_id, name) VALUES (c_a, 'Solo ver') RETURNING id INTO r_ver;
    INSERT INTO role_permissions (role_id, permission_id) SELECT r_ver, id FROM permissions WHERE key = 'clients.view';
    INSERT INTO roles (company_id, name) VALUES (c_a, 'Solo archivar') RETURNING id INTO r_arch;
    INSERT INTO role_permissions (role_id, permission_id) SELECT r_arch, id FROM permissions WHERE key IN ('clients.view', 'clients.archive');
    INSERT INTO user_roles (user_id, role_id, company_id) VALUES
        (u_admin, r_admin, c_a), (u_conta, r_conta, c_a), (u_ver, r_ver, c_a), (u_arch, r_arch, c_a), (u_b, r_admin, c_b);

    INSERT INTO billing_settings (company_id, emission_mode, rnc, legal_name, address)
    VALUES (c_a, 'ecf_externo', '131880738', 'Empresa A SRL', 'Santo Domingo');

    -- ---- Permisos de escritura sobre clientes
    PERFORM pg_temp.as_user(u_ver);
    PERFORM pg_temp.must_fail(format('INSERT INTO clients (company_id, client_type, business_name) VALUES (%L, %L, %L)', c_a, 'persona_juridica', 'X'), 'row-level security');

    PERFORM pg_temp.as_user(u_admin);
    INSERT INTO clients (company_id, client_type, business_name, rnc, created_by)
    VALUES (c_a, 'persona_juridica', 'Cliente A', '131880738', u_admin) RETURNING id INTO cl_a;

    PERFORM pg_temp.as_user(u_ver);
    PERFORM pg_temp.check((SELECT COUNT(*) FROM clients WHERE id = cl_a) = 1, 'clients.view lee');
    PERFORM pg_temp.check(pg_temp.rows_touched(format('UPDATE clients SET email = %L WHERE id = %L', 'x@x.test', cl_a)) = 0, 'clients.view no edita');
    PERFORM pg_temp.check(pg_temp.rows_touched(format('UPDATE clients SET archived_at = now() WHERE id = %L', cl_a)) = 0, 'clients.view no archiva');
    PERFORM pg_temp.check(pg_temp.rows_touched(format('DELETE FROM clients WHERE id = %L', cl_a)) = 0, 'clients.view no borra');

    -- Contabilidad factura a clientes nuevos y corrige sus datos, pero no archiva
    PERFORM pg_temp.as_user(u_conta);
    INSERT INTO clients (company_id, client_type, first_name, created_by)
    VALUES (c_a, 'persona_fisica', 'Segundo', u_conta) RETURNING id INTO cl_seg;
    PERFORM pg_temp.check(pg_temp.rows_touched(format('UPDATE clients SET email = %L WHERE id = %L', 'seg@x.test', cl_seg)) = 1, 'Contabilidad edita');
    PERFORM pg_temp.must_fail(format('UPDATE clients SET archived_at = now(), is_active = FALSE WHERE id = %L', cl_seg), 'archivar');

    -- Archivar no da permiso de editar los datos
    PERFORM pg_temp.as_user(u_arch);
    PERFORM pg_temp.must_fail(format('UPDATE clients SET email = %L WHERE id = %L', 'y@x.test', cl_seg), 'editar');
    PERFORM pg_temp.check(pg_temp.rows_touched(format('UPDATE clients SET archived_at = now(), is_active = FALSE WHERE id = %L', cl_seg)) = 1, 'clients.archive archiva');
    PERFORM pg_temp.check(pg_temp.rows_touched(format('UPDATE clients SET archived_at = NULL, is_active = TRUE WHERE id = %L', cl_seg)) = 1, 'clients.archive restaura');

    -- Nadie borra ni mueve un cliente, ni el administrador
    PERFORM pg_temp.as_user(u_admin);
    PERFORM pg_temp.check(pg_temp.rows_touched(format('DELETE FROM clients WHERE id = %L', cl_a)) = 0, 'un cliente no se borra');
    PERFORM pg_temp.must_fail(format('UPDATE clients SET company_id = %L WHERE id = %L', c_b, cl_a), 'mover');

    -- Aislamiento entre empresas
    PERFORM pg_temp.as_user(u_b);
    PERFORM pg_temp.check((SELECT COUNT(*) FROM clients WHERE id = cl_a) = 0, 'B no ve clientes de A');
    PERFORM pg_temp.check(pg_temp.rows_touched(format('UPDATE clients SET email = %L WHERE id = %L', 'b@x.test', cl_a)) = 0, 'B no edita clientes de A');
    PERFORM pg_temp.must_fail(format('INSERT INTO clients (company_id, client_type, business_name) VALUES (%L, %L, %L)', c_a, 'persona_juridica', 'Y'), 'row-level security');

    -- ---- Un cliente del directorio se puede facturar: el comprador sale de su ficha
    PERFORM pg_temp.as_user(u_admin);
    -- A crédito, vence en 10 días: al día aunque tenga cobro parcial
    inv := billing_save_draft(c_a, NULL, pg_temp.header(cl_a, jsonb_build_object('payment_type', 2, 'issue_date', today - 5, 'due_date', today + 10)), pg_temp.items());
    PERFORM billing_issue_invoice(inv, 'E310000000001', 'ABC123', now());
    PERFORM pg_temp.check((SELECT buyer_snapshot->>'name' = 'Cliente A' FROM invoices WHERE id = inv), 'comprador desde el cliente');
    pago := billing_register_payment(inv, 180, today, 'transferencia', 'REF-1');

    -- Al contado y con fecha vieja: no es mora, due_date es solo la fecha de emisión
    inv_contado := billing_save_draft(c_a, NULL, pg_temp.header(cl_a, jsonb_build_object('payment_type', 1, 'issue_date', today - 200, 'due_date', today - 200)), pg_temp.items());
    PERFORM billing_issue_invoice(inv_contado, 'E310000000002', 'ABC124', now());

    -- A crédito, vencida hace 45 días y con nota de crédito de 118
    inv_vencida := billing_save_draft(c_a, NULL, pg_temp.header(cl_seg, jsonb_build_object('payment_type', 2, 'issue_date', today - 75, 'due_date', today - 45, 'fiscal_type', '32')), pg_temp.items());
    PERFORM billing_issue_invoice(inv_vencida, 'E320000000001', 'ABC125', now());
    nc := billing_save_draft(c_a, NULL, pg_temp.header(cl_seg, jsonb_build_object(
        'fiscal_type', '34', 'modifies_invoice_id', inv_vencida, 'modification_code', 3, 'modification_reason', 'Ajuste',
        'issue_date', today, 'due_date', today,
        'subtotal', 100, 'itbis', 18, 'total', 118, 'amount_due', 118, 'taxable_18', 100, 'itbis_18', 18)),
        '[{"description":"Ajuste","item_type":"honorarios","quantity":1,"unit_price":100,"billing_indicator":1,"good_or_service":2,"discount_amount":0,"amount":100,"itbis_amount":18,"total":118,"itbis_withheld":0,"isr_withheld":0}]');
    PERFORM billing_issue_invoice(nc, 'E340000000001', 'ABC126', now());

    -- En dólares, anónima y vencida hace 100 días; saldo a RD$60
    inv_usd := billing_save_draft(c_a, NULL, pg_temp.header(NULL, jsonb_build_object(
        'fiscal_type', '32', 'payment_type', 2, 'currency', 'USD', 'exchange_rate', 60,
        'issue_date', today - 130, 'due_date', today - 100)), pg_temp.items());
    PERFORM billing_issue_invoice(inv_usd, 'E320000000002', 'ABC127', now());
    PERFORM billing_register_payment(inv_usd, 100, today, 'efectivo');

    -- Borrador: no cuenta
    inv_borrador := billing_save_draft(c_a, NULL, pg_temp.header(cl_a), pg_temp.items());

    -- ---- Cartera: los saldos cuadran con lo emitido, cobrado y acreditado
    SELECT * INTO s FROM billing_receivables_summary(c_a);
    PERFORM pg_temp.check(s.current_amount = 1000 + 1180, 'al día: crédito sin vencer y contado');
    PERFORM pg_temp.check(s.days_1_30 = 0, 'tramo 1-30 vacío');
    PERFORM pg_temp.check(s.days_31_60 = 1062, 'tramo 31-60: neto de la nota de crédito');
    PERFORM pg_temp.check(s.days_61_90 = 0, 'tramo 61-90 vacío');
    PERFORM pg_temp.check(s.days_over_90 = (1180 - 100) * 60, 'tramo +90 en pesos a la tasa del comprobante');
    PERFORM pg_temp.check(s.total = 1000 + 1180 + 1062 + 64800, 'total de cartera');
    PERFORM pg_temp.check(s.invoice_count = 4 AND s.client_count = 3, 'cuenta sin borrador ni nota de crédito');

    -- El total es el mismo que muestra la pantalla de facturas
    PERFORM pg_temp.check((SELECT collectible = s.total FROM billing_summary(c_a)), 'CxC cuadra con billing_summary');
    PERFORM pg_temp.check((SELECT overdue FROM billing_summary(c_a)) = s.days_31_60 + s.days_over_90, 'vencido cuadra con billing_summary');

    -- Por cliente: suma lo mismo y agrupa lo anónimo
    PERFORM pg_temp.check((SELECT SUM(total) FROM billing_receivables_by_client(c_a)) = s.total, 'por cliente suma el total');
    SELECT * INTO f FROM billing_receivables_by_client(c_a) WHERE client_id = cl_a;
    PERFORM pg_temp.check(f.client_name = 'Cliente A' AND f.total = 2180 AND f.invoice_count = 2, 'fila del cliente');
    SELECT * INTO f FROM billing_receivables_by_client(c_a) WHERE client_id IS NULL;
    PERFORM pg_temp.check(f.client_name = 'Consumidor final' AND f.days_over_90 = 64800, 'fila sin cliente');

    -- ---- Cobros: en pesos a la tasa del comprobante y sin los anulados
    SELECT * INTO p FROM billing_payments_summary(c_a);
    PERFORM pg_temp.check(p.collected_total = 180 + 6000, 'cobrado en pesos');
    PERFORM pg_temp.check(p.transfer_total = 180 AND p.receipt_count = 2 AND p.voided_count = 0, 'por forma de pago');

    PERFORM billing_void_payment(pago, 'Error de digitación');
    SELECT * INTO p FROM billing_payments_summary(c_a);
    PERFORM pg_temp.check(p.collected_total = 6000 AND p.receipt_count = 1 AND p.voided_count = 1, 'excluye el anulado');
    SELECT * INTO s FROM billing_receivables_summary(c_a);
    PERFORM pg_temp.check(s.current_amount = 1180 + 1180, 'anular el cobro devuelve el saldo');

    -- La lista conserva el anulado, busca y filtra
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_list_payments(c_a)) = 2, 'lista con anulados');
    PERFORM pg_temp.check((SELECT total_count FROM billing_list_payments(c_a, NULL, NULL, NULL, 1, 0) LIMIT 1) = 2, 'total sin importar la página');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_list_payments(c_a, cl_a)) = 1, 'filtra por cliente');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_list_payments(c_a, NULL, 'ref-1')) = 1, 'busca por referencia');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_list_payments(c_a, NULL, 'E320000000002')) = 1, 'busca por NCF');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_list_payments(c_a, NULL, 'Cliente a')) = 1, 'busca por cliente');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_list_payments(c_a, NULL, '%')) = 0, 'el % no es comodín');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_list_payments(c_a, NULL, NULL, 'efectivo')) = 1, 'filtra por forma de pago');
    PERFORM pg_temp.check((SELECT client_name FROM billing_list_payments(c_a, NULL, NULL, 'efectivo')) = 'Consumidor final', 'cobro anónimo');

    -- ---- Por concepto: antes de ITBIS, en pesos y neto de notas
    PERFORM pg_temp.check((SELECT amount FROM billing_invoiced_by_concept(c_a) WHERE item_type = 'honorarios') = 1000 + 1000 + 1000 - 100 + 60000, 'facturado por concepto');

    -- ---- Estado de cuenta del cliente
    SELECT * INTO f FROM billing_client_summary(c_a, cl_seg);
    PERFORM pg_temp.check(f.billed = 1180 - 118 AND f.collected = 0 AND f.balance = 1062 AND f.overdue = 1062, 'estado de cuenta');
    SELECT * INTO f FROM billing_client_summary(c_a, cl_a);
    PERFORM pg_temp.check(f.billed = 2360 AND f.collected = 0 AND f.balance = 2360 AND f.overdue = 0, 'estado de cuenta sin mora');

    -- ---- Permisos y aislamiento en las consultas
    PERFORM pg_temp.as_user(u_ver);
    PERFORM pg_temp.check((SELECT total FROM billing_receivables_summary(c_a)) = 0, 'sin finance.view no hay cartera');
    PERFORM pg_temp.check((SELECT collected_total FROM billing_payments_summary(c_a)) = 0, 'sin finance.view no hay cobros');
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 10, %L, %L)', inv, today, 'efectivo'), 'No tienes permiso');

    PERFORM pg_temp.as_user(u_b);
    PERFORM pg_temp.check((SELECT total FROM billing_receivables_summary(c_a)) = 0, 'B no ve la cartera de A');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_list_payments(c_a)) = 0, 'B no ve los cobros de A');
    PERFORM pg_temp.check((SELECT COUNT(*) FROM billing_receivables_by_client(c_a)) = 0, 'B no ve clientes de A en la cartera');
    PERFORM pg_temp.check((SELECT balance FROM billing_client_summary(c_a, cl_a)) = 0, 'B no ve el estado de cuenta de A');

    -- Contabilidad, sin depender del directorio, ve la misma cartera
    PERFORM pg_temp.as_user(u_conta);
    PERFORM pg_temp.check((SELECT collectible = (SELECT total FROM billing_receivables_summary(c_a)) FROM billing_summary(c_a)), 'Contabilidad ve la cartera');

    -- Sin sesión
    PERFORM pg_temp.as_admin();
    PERFORM set_config('role', 'anon', TRUE);
    PERFORM pg_temp.must_fail(format('SELECT * FROM billing_receivables_summary(%L)', c_a), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT * FROM billing_list_payments(%L)', c_a), 'permission denied');
    PERFORM pg_temp.as_admin();

    -- Mantenimiento de la base: el guardián no bloquea sin usuario, salvo mover de empresa
    PERFORM pg_temp.check(pg_temp.rows_touched(format('UPDATE clients SET notes = %L WHERE id = %L', 'nota', cl_a)) = 1, 'la base puede corregir datos');

    RAISE NOTICE 'OK: todas las verificaciones de clientes y cartera pasaron';
END $$;

ROLLBACK;
