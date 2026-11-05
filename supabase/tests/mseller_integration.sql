-- Prueba de integración de la emisión por proveedor. Todo corre en una transacción y se revierte.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/mseller_integration.sql
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

-- Cabecera y línea de $1,000 + 18 %, con fecha de hoy para que cuente en el resumen del mes.
CREATE FUNCTION pg_temp.header(p_type TEXT, p_client UUID, p_extra JSONB DEFAULT '{}') RETURNS JSONB AS $$
    SELECT jsonb_build_object(
        'fiscal_type', p_type, 'client_id', p_client, 'issue_date', public.billing_today(), 'due_date', public.billing_today(),
        'currency', 'DOP', 'exchange_rate', 1, 'income_type', '01', 'payment_type', 1,
        'buyer_snapshot', '{}'::jsonb,
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

CREATE FUNCTION pg_temp.payload(p_encf TEXT) RETURNS TEXT AS $$
    -- Claves en orden del e-CF, que JSONB no conserva: debe sobrevivir en la copia exacta.
    SELECT '{"ECF":{"Encabezado":{"Version":"1.0","IdDoc":{"TipoeCF":31,"eNCF":"' || p_encf || '"},'
        || '"Comprador":{"RNCComprador":"131880738"},"Totales":{"MontoTotal":1180}}}}';
$$ LANGUAGE sql;

-- Lo que hace el servidor de Next: service role, sin sesión de usuario, con empresa y usuario explícitos.
CREATE FUNCTION pg_temp.use(p_company UUID, p_actor UUID) RETURNS VOID AS $$
    SELECT set_config('test.company', p_company::text, TRUE), set_config('test.actor', p_actor::text, TRUE);
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.sv(p_sql TEXT, OUT o_result TEXT) AS $$
DECLARE
    v_role TEXT := current_setting('role');
    v_claims TEXT := current_setting('request.jwt.claims', TRUE);
    v_sub TEXT := current_setting('request.jwt.claim.sub', TRUE);
BEGIN
    PERFORM set_config('role', 'service_role', TRUE),
            set_config('request.jwt.claims', '', TRUE),
            set_config('request.jwt.claim.sub', '', TRUE);
    EXECUTE p_sql INTO o_result;
    PERFORM set_config('role', v_role, TRUE),
            set_config('request.jwt.claims', COALESCE(v_claims, ''), TRUE),
            set_config('request.jwt.claim.sub', COALESCE(v_sub, ''), TRUE);
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION pg_temp.ctx() RETURNS TEXT AS $$
    SELECT format('%L, %L', current_setting('test.company'), current_setting('test.actor'));
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.store(p_ecf UUID, p_raw TEXT) RETURNS TEXT AS $$
    SELECT pg_temp.sv(format('SELECT public.billing_ecf_store_payload(%s, %L, %L)', pg_temp.ctx(), p_ecf, p_raw));
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.begin_send(p_ecf UUID) RETURNS JSONB AS $$
    SELECT pg_temp.sv(format('SELECT public.billing_ecf_begin_send(%s, %L)', pg_temp.ctx(), p_ecf))::jsonb;
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.record_sent(p_ecf UUID, p_code TEXT, p_qr TEXT, p_internal TEXT) RETURNS VOID AS $$
    SELECT pg_temp.sv(format('SELECT public.billing_ecf_record_sent(%s, %L, %L, %L, %L, %L, %L)',
        pg_temp.ctx(), p_ecf, p_code, '14-05-2026 02:57:33', '2026-05-14T02:57:33-04:00', p_qr, p_internal));
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.ambiguous(p_ecf UUID, p_reason TEXT) RETURNS VOID AS $$
    SELECT pg_temp.sv(format('SELECT public.billing_ecf_mark_ambiguous(%s, %L, %L)', pg_temp.ctx(), p_ecf, p_reason));
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.confirm(p_ecf UUID) RETURNS VOID AS $$
    SELECT pg_temp.sv(format('SELECT public.billing_ecf_confirm_not_received(%s, %L)', pg_temp.ctx(), p_ecf));
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.refused(p_ecf UUID, p_reason TEXT, p_attempt INT) RETURNS VOID AS $$
    SELECT pg_temp.sv(format('SELECT public.billing_ecf_send_refused(%s, %L, %L, %L)', pg_temp.ctx(), p_ecf, p_reason, p_attempt));
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.release(p_ecf UUID, p_reason TEXT, p_messages JSONB DEFAULT '[]', p_attempt INT DEFAULT NULL, p_park BOOLEAN DEFAULT FALSE) RETURNS VOID AS $$
    SELECT pg_temp.sv(format('SELECT public.billing_release_ecf(%s, %L, %L, %L, %L, %L)', pg_temp.ctx(), p_ecf, p_reason, p_messages, p_attempt, p_park));
$$ LANGUAGE sql;

-- Por defecto, una respuesta del envío vigente: fechada ahora y con el total de lo guardado.
CREATE FUNCTION pg_temp.apply(
    p_ecf UUID, p_status TEXT, p_messages JSONB DEFAULT NULL, p_seq BOOLEAN DEFAULT NULL, p_track TEXT DEFAULT NULL,
    p_code TEXT DEFAULT NULL, p_qr TEXT DEFAULT NULL, p_internal TEXT DEFAULT NULL,
    p_updated TIMESTAMPTZ DEFAULT now(), p_total NUMERIC DEFAULT 1180, p_buyer TEXT DEFAULT NULL
) RETURNS JSONB AS $$
    SELECT pg_temp.sv(format(
        'SELECT public.billing_apply_ecf_status(%s, p_ecf_id => %L, p_status => %L, p_messages => %L, p_secuencia_utilizada => %L, '
        'p_track_id => %L, p_status_code => %L, p_qr_url => %L, p_internal_track => %L, p_updated_at => %L, p_doc_total => %L, p_doc_buyer => %L)',
        pg_temp.ctx(), p_ecf, p_status, p_messages, p_seq, p_track, p_code, p_qr, p_internal, p_updated, p_total, p_buyer))::jsonb;
$$ LANGUAGE sql;

-- Guarda, envía y registra la confirmación del proveedor: deja el e-CF esperando a la DGII.
CREATE FUNCTION pg_temp.sent(p_ecf UUID) RETURNS VOID AS $$
    SELECT pg_temp.store(p_ecf, pg_temp.payload((SELECT encf FROM public.ecf_invoices WHERE id = p_ecf)));
    SELECT pg_temp.begin_send(p_ecf);
    SELECT pg_temp.record_sent(p_ecf, 'aB3xYz', 'https://ecf.dgii.gov.do/testecf/consultatimbre?x=1', 'interno-' || p_ecf);
$$ LANGUAGE sql;

-- Todo corre en una transacción, donde now() no avanza: sin esto los intentos empatan en created_at.
CREATE FUNCTION pg_temp.stamp_ecf() RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at := clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_test_stamp_ecf BEFORE INSERT ON public.ecf_invoices
    FOR EACH ROW EXECUTE FUNCTION pg_temp.stamp_ecf();

-- Con privilegios propios: la sesión del usuario ya no puede leer lo enviado al proveedor.
CREATE FUNCTION pg_temp.ecf_of(p_invoice UUID) RETURNS public.ecf_invoices AS $$
    SELECT * FROM public.ecf_invoices WHERE invoice_id = p_invoice ORDER BY created_at DESC, id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION pg_temp.ecf_row(p_ecf UUID) RETURNS public.ecf_invoices AS $$
    SELECT * FROM public.ecf_invoices WHERE id = p_ecf;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION pg_temp.in_pool(p_company UUID, p_encf TEXT) RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM public.ecf_released_numbers WHERE company_id = p_company AND encf = p_encf);
$$ LANGUAGE sql SECURITY DEFINER;

DO $$
DECLARE
    c_a UUID := gen_random_uuid();
    c_b UUID := gen_random_uuid();
    u_a UUID := gen_random_uuid();
    u_b UUID := gen_random_uuid();
    u_sin UUID := gen_random_uuid();
    u_cont UUID := gen_random_uuid();
    cl_a UUID;
    cl_b UUID;
    cl_c UUID;
    admin_role UUID;
    cont_role UUID;
    inv UUID;
    inv2 UUID;
    inv3 UUID;
    nc UUID;
    nc2 UUID;
    ecf UUID;
    seq_e31 UUID;
    r RECORD;
    v_raw TEXT;
    v_result JSONB;
    v_attempt INT;
    v_old UUID;
    v_new UUID;
BEGIN
    INSERT INTO companies (id, name, rnc) VALUES (c_a, 'Empresa A', '131880738'), (c_b, 'Empresa B', '101672919');
    INSERT INTO auth.users (id, email) VALUES (u_a, 'a@test.local'), (u_b, 'b@test.local'), (u_sin, 'c@test.local'), (u_cont, 'd@test.local');
    INSERT INTO company_members (company_id, user_id) VALUES (c_a, u_a), (c_b, u_b), (c_a, u_sin), (c_a, u_cont);
    SELECT id INTO admin_role FROM roles WHERE name = 'Administrador' AND is_system;
    SELECT id INTO cont_role FROM roles WHERE name = 'Contabilidad' AND is_system;
    INSERT INTO user_roles (user_id, role_id, company_id) VALUES (u_a, admin_role, c_a), (u_b, admin_role, c_b), (u_cont, cont_role, c_a);
    INSERT INTO clients (company_id, client_type, business_name, rnc) VALUES (c_a, 'persona_juridica', 'Cliente A', '131880738') RETURNING id INTO cl_a;

    INSERT INTO billing_settings (company_id, emission_mode, dgii_environment, rnc, legal_name, address, phone)
    VALUES (c_a, 'ecf_proveedor', 'test', '131880738', 'Empresa A SRL', 'Santo Domingo', '809-555-1234');
    INSERT INTO billing_settings (company_id, emission_mode, dgii_environment, rnc, legal_name, address)
    VALUES (c_b, 'ecf_proveedor', 'test', '101672919', 'Empresa B SRL', 'Santiago');

    PERFORM pg_temp.use(c_a, u_a);
    PERFORM pg_temp.as_user(u_a);

    -- ---- Modo y requisitos previos
    inv := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_issue_invoice(%L)', inv), 'emite por el proveedor');
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv), 'Faltan las credenciales');

    PERFORM billing_save_provider_credentials(c_a, 'test', 'v1.cifrado.prueba.a', 'de***@empresa.do');
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv), 'No hay un rango');
    PERFORM pg_temp.check((SELECT status = 'borrador' AND ncf IS NULL FROM invoices WHERE id = inv), 'sin rango sigue en borrador');

    -- Un rango de otro ambiente no sirve: los números de prueba coinciden con los reales.
    UPDATE billing_settings SET dgii_environment = 'prod' WHERE company_id = c_a;
    INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment)
    VALUES (c_a, 'E31', 1, 5, 1, '2028-12-31', 'prod') RETURNING id INTO seq_e31;
    UPDATE billing_settings SET dgii_environment = 'test' WHERE company_id = c_a;
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv), 'No hay un rango');
    PERFORM pg_temp.check(billing_ecf_has_number(c_a, 'E31', 'test') = FALSE, 'un rango de producción no cuenta en pruebas');
    PERFORM pg_temp.check(billing_ecf_has_number(c_a, 'E31', 'prod') = TRUE, 'sí cuenta en su ambiente');
    DELETE FROM fiscal_sequences WHERE id = seq_e31;

    INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment)
    VALUES (c_a, 'E31', 1, 5, 1, '2028-12-31', 'test') RETURNING id INTO seq_e31;
    INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment)
    VALUES (c_a, 'E34', 1, 5, 1, NULL, 'test'), (c_a, 'E32', 1, 5, 1, NULL, 'test');
    -- En un mismo ambiente no se solapan; entre ambientes sí pueden coincidir.
    PERFORM pg_temp.must_fail(format(
        'INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment) VALUES (%L, %L, 3, 9, 3, %L, %L)',
        c_a, 'E31', '2028-12-31', 'test'), 'se solapa');
    UPDATE billing_settings SET dgii_environment = 'prod' WHERE company_id = c_a;
    INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment)
    VALUES (c_a, 'E31', 1, 5, 1, '2028-12-31', 'prod');
    UPDATE billing_settings SET dgii_environment = 'test' WHERE company_id = c_a;

    -- Ni con permiso de configuración se cambia el ambiente o la serie de un rango por la API,
    -- ni se registra un rango de e-NCF en otro ambiente que el de la empresa.
    PERFORM pg_temp.must_fail(format('UPDATE fiscal_sequences SET environment = %L WHERE id = %L', 'prod', seq_e31), 'no se pueden cambiar');
    PERFORM pg_temp.must_fail(format('UPDATE fiscal_sequences SET prefix = %L WHERE id = %L', 'E45', seq_e31), 'no se pueden cambiar');
    PERFORM pg_temp.must_fail(format(
        'INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment) VALUES (%L, %L, 900, 905, 900, %L, %L)',
        c_a, 'E31', '2028-12-31', 'cert'), 'ambiente configurado');
    PERFORM pg_temp.must_fail(format(
        'INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on) VALUES (%L, %L, 900, 905, 900, %L)',
        c_a, 'E31', '2028-12-31'), 'ambiente configurado');
    PERFORM pg_temp.check((SELECT environment = 'test' FROM fiscal_sequences WHERE id = seq_e31), 'el rango sigue en su ambiente');

    -- ---- Credenciales: ilegibles para la aplicación y por rol
    PERFORM pg_temp.must_fail('SELECT * FROM billing_provider_credentials', 'permission denied');
    PERFORM pg_temp.must_fail('SELECT * FROM ecf_released_numbers', 'permission denied');
    PERFORM pg_temp.must_fail(format('INSERT INTO billing_provider_credentials (company_id, environment, ciphertext) VALUES (%L, %L, %L)', c_a, 'cert', 'x'), 'permission denied');
    PERFORM pg_temp.check(billing_read_provider_credentials(c_a, 'test') = 'v1.cifrado.prueba.a', 'lee solo el texto cifrado');
    SELECT * INTO r FROM billing_provider_credentials_status(c_a, 'test');
    PERFORM pg_temp.check(r.configured AND r.email_hint = 'de***@empresa.do', 'estado de credenciales');
    SELECT * INTO r FROM billing_provider_credentials_status(c_a, 'prod');
    PERFORM pg_temp.check(r.configured = FALSE AND r.email_hint IS NULL, 'otro ambiente sin credenciales');

    PERFORM pg_temp.as_user(u_cont);
    PERFORM pg_temp.must_fail(format('SELECT billing_save_provider_credentials(%L, %L, %L, %L)', c_a, 'test', 'x', 'x'), 'No tienes permiso');
    PERFORM pg_temp.check(billing_read_provider_credentials(c_a, 'test') IS NOT NULL, 'contabilidad puede usar las credenciales');

    PERFORM pg_temp.as_user(u_sin);
    PERFORM pg_temp.must_fail(format('SELECT billing_read_provider_credentials(%L, %L)', c_a, 'test'), 'No tienes permiso');
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv), 'No tienes permiso');

    PERFORM pg_temp.as_user(u_b);
    PERFORM pg_temp.must_fail(format('SELECT billing_read_provider_credentials(%L, %L)', c_a, 'test'), 'No perteneces');
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv), 'No perteneces');

    PERFORM pg_temp.as_admin();
    PERFORM set_config('role', 'anon', TRUE);
    PERFORM pg_temp.must_fail('SELECT * FROM billing_provider_credentials', 'permission denied');
    PERFORM pg_temp.must_fail('SELECT * FROM ecf_released_numbers', 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_read_provider_credentials(%L, %L)', c_a, 'test'), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_apply_ecf_status(%L, %L, %L, %L)', c_a, u_a, gen_random_uuid(), 'Aceptado'), 'permission denied');
    PERFORM set_config('role', 'authenticated', TRUE);
    PERFORM pg_temp.must_fail('SELECT billing_check_issuable(NULL::invoices)', 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_return_to_draft(%L)', inv), 'permission denied');
    PERFORM pg_temp.as_user(u_a);

    -- ---- Reserva: atómica y sin efectos de cobro
    v_result := billing_reserve_ecf(inv);
    ecf := (v_result->>'ecf_id')::uuid;
    PERFORM pg_temp.check(v_result->>'encf' = 'E310000000001' AND v_result->>'environment' = 'test', 'toma el primer número');
    PERFORM pg_temp.check((SELECT next_number = 2 FROM fiscal_sequences WHERE id = seq_e31), 'avanza el rango');
    SELECT * INTO r FROM invoices WHERE id = inv;
    PERFORM pg_temp.check(r.status = 'en_proceso' AND r.ncf = 'E310000000001' AND r.ncf_type = 'E31' AND r.balance_due = 0
        AND r.emission_mode = 'ecf_proveedor' AND r.dgii_environment = 'test' AND r.sequence_expires_on = '2028-12-31'
        AND r.emitter_snapshot->>'legalName' = 'Empresa A SRL' AND r.buyer_snapshot->>'name' = 'Cliente A', 'fija los datos');
    SELECT * INTO r FROM pg_temp.ecf_row(ecf);
    PERFORM pg_temp.check(r.dgii_status = 'pendiente' AND r.source = 'proveedor' AND r.provider_phase = 'reservado'
        AND r.security_code IS NULL AND r.environment = 'DEV' AND r.invoice_id = inv, 'registro pendiente');
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv), 'ya fue emitido o está en proceso');

    -- Una falla de la reserva no consume número.
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a, '{"total": 1.00, "amount_due": 1.00}'), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv2), 'no cuadran');
    PERFORM pg_temp.check((SELECT next_number = 2 FROM fiscal_sequences WHERE id = seq_e31), 'un fallo no consume número');
    PERFORM billing_delete_draft(inv2);

    -- ---- En proceso no cuenta
    SELECT * INTO r FROM billing_summary(c_a);
    PERFORM pg_temp.check(r.invoiced_this_month = 0 AND r.collectible = 0 AND r.overdue = 0, 'el resumen no lo cuenta');
    PERFORM pg_temp.check((SELECT total = 0 AND invoice_count = 0 FROM billing_receivables_summary(c_a)), 'cartera vacía');
    PERFORM pg_temp.check(NOT EXISTS (SELECT 1 FROM billing_receivables_by_client(c_a)), 'cartera por cliente vacía');
    PERFORM pg_temp.check((SELECT billed = 0 AND balance = 0 AND invoice_count = 0 FROM billing_client_summary(c_a, cl_a)), 'ficha del cliente sin efecto');
    PERFORM pg_temp.check(NOT EXISTS (SELECT 1 FROM billing_invoiced_by_concept(c_a)), 'concepto vacío');
    PERFORM pg_temp.check((SELECT total_invoiced = 0 AND total_ecf_invoiced = 0 AND total_itbis = 0 AND total_outstanding = 0 FROM view_financial_kpis WHERE company_id = c_a), 'KPI sin efecto');

    -- Ni cobros, ni anulación, ni notas, ni edición, ni borrado.
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 10, %L, %L)', inv, billing_today(), 'efectivo'), 'no admite cobros');
    PERFORM pg_temp.must_fail(format('SELECT billing_void_invoice(%L, %L)', inv, 'x'), 'no se puede anular');
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, %L, %L, %L)', c_a, inv, pg_temp.header('31', cl_a), pg_temp.items()), 'Solo se pueden editar');
    PERFORM pg_temp.must_fail(format('SELECT billing_delete_draft(%L)', inv), 'Solo se pueden eliminar los borradores');
    PERFORM pg_temp.must_fail(format('SELECT billing_save_draft(%L, NULL, %L, %L)', c_a,
        pg_temp.header('34', cl_a, jsonb_build_object('modifies_invoice_id', inv, 'modification_code', 3, 'modification_reason', 'x')), pg_temp.items()), 'no existe o no está emitido');

    -- Nadie reescribe el registro ni el comprobante directamente.
    UPDATE ecf_invoices SET dgii_status = 'aceptado' WHERE id = ecf;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).dgii_status = 'pendiente', 'RLS impide actualizar ecf_invoices');
    PERFORM pg_temp.must_fail(format('INSERT INTO ecf_invoices (company_id, encf, ecf_type, security_code) VALUES (%L, %L, %L, %L)', c_a, 'E319999999999', 'E31', 'x'), 'row-level security');

    PERFORM pg_temp.as_admin();
    -- Las RPC dejan la variable activa hasta el fin de la transacción, y aquí todo es una sola.
    PERFORM set_config('billing.rpc', 'off', TRUE);
    PERFORM pg_temp.must_fail(format('UPDATE invoices SET ncf = NULL WHERE id = %L', inv), 'solo cambian mediante');
    PERFORM set_config('billing.rpc', 'on', TRUE);
    PERFORM pg_temp.must_fail(format('UPDATE invoices SET status = %L WHERE id = %L', 'borrador', inv), 'por rechazo o liberación');
    PERFORM pg_temp.must_fail(format('UPDATE invoices SET total = 1 WHERE id = %L', inv), 'inmutables');
    PERFORM set_config('billing.rpc', 'off', TRUE);
    PERFORM pg_temp.as_user(u_a);

    -- ---- Una sesión de usuario no puede afirmar lo que respondió el proveedor
    -- Contabilidad tiene finance.create y ecf.emit; igual no alcanza.
    PERFORM pg_temp.as_user(u_cont);
    PERFORM pg_temp.must_fail(format('SELECT billing_apply_ecf_status(%L, %L, %L, %L)', c_a, u_cont, ecf, 'Aceptado'), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_ecf_store_payload(%L, %L, %L, %L)', c_a, u_cont, ecf, pg_temp.payload('E310000000001')), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_ecf_begin_send(%L, %L, %L)', c_a, u_cont, ecf), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_ecf_record_sent(%L, %L, %L, %L, %L, %L, %L, %L)', c_a, u_cont, ecf, 'HACK01', 'x', now(), 'https://evil.example/', 'x'), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_ecf_mark_ambiguous(%L, %L, %L, %L)', c_a, u_cont, ecf, 'x'), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_ecf_confirm_not_received(%L, %L, %L)', c_a, u_cont, ecf), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_ecf_send_refused(%L, %L, %L, %L, 1)', c_a, u_cont, ecf, 'x'), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_release_ecf(%L, %L, %L, %L)', c_a, u_cont, ecf, 'x'), 'permission denied');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' AND balance_due = 0 FROM invoices WHERE id = inv), 'nada cambió');
    -- La reserva sí sigue siendo del usuario, y lo enviado no se lee con su sesión.
    PERFORM pg_temp.must_fail('SELECT provider_payload FROM ecf_invoices', 'permission denied');
    PERFORM pg_temp.must_fail('SELECT provider_payload_raw FROM ecf_invoices', 'permission denied');
    PERFORM pg_temp.must_fail('SELECT * FROM ecf_invoices', 'permission denied');
    PERFORM pg_temp.check((SELECT encf = 'E310000000001' FROM ecf_invoices WHERE id = ecf), 'con permiso lee las demás columnas');
    PERFORM pg_temp.as_user(u_sin);
    PERFORM pg_temp.check((SELECT COUNT(*) = 0 FROM ecf_invoices), 'un miembro sin permisos no ve registros');
    PERFORM pg_temp.as_user(u_a);

    -- El servidor debe nombrar empresa y usuario, y ambos se comprueban.
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.sv(%L)', format('SELECT public.billing_ecf_begin_send(NULL, %L, %L)', u_a, ecf)), 'Falta la empresa');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.sv(%L)', format('SELECT public.billing_ecf_begin_send(%L, NULL, %L)', c_a, ecf)), 'Falta la empresa');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.sv(%L)', format('SELECT public.billing_apply_ecf_status(%L, %L, %L, %L)', c_a, u_sin, ecf, 'Aceptado')), 'No tienes permiso');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.sv(%L)', format('SELECT public.billing_apply_ecf_status(%L, %L, %L, %L)', c_a, u_b, ecf, 'Aceptado')), 'No perteneces');
    -- El registro de otra empresa no se toca, aunque el usuario tenga permiso en la suya.
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.sv(%L)', format('SELECT public.billing_apply_ecf_status(%L, %L, %L, %L)', c_b, u_b, ecf, 'Aceptado')), 'no encontrado en esta empresa');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.sv(%L)', format('SELECT public.billing_release_ecf(%L, %L, %L, %L)', c_b, u_b, ecf, 'x')), 'no encontrado en esta empresa');

    -- ---- Un registro que no salió no recibe estados, aunque los pida el servidor
    v_result := pg_temp.apply(ecf, 'Aceptado');
    PERFORM pg_temp.check(v_result->>'ignored' = 'sin_envio' AND v_result->>'applied' = 'false', 'sin envío no se acepta');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' FROM invoices WHERE id = inv), 'sigue en proceso');

    -- ---- Lo enviado se guarda antes y no cambia
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.begin_send(%L)', ecf), 'no está listo');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.store(%L, %L)', ecf, pg_temp.payload('E310000000099')), 'no corresponde');
    v_raw := pg_temp.store(ecf, pg_temp.payload('E310000000001'));
    PERFORM pg_temp.check(v_raw = pg_temp.payload('E310000000001'), 'devuelve lo guardado');
    PERFORM pg_temp.check(pg_temp.store(ecf, '{"ECF":{"Encabezado":{"IdDoc":{"eNCF":"E310000000001"},"Otro":1}}}') = v_raw, 'no se reemplaza');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).provider_payload_raw = v_raw AND (pg_temp.ecf_of(inv)).provider_payload #>> '{ECF,Encabezado,IdDoc,eNCF}' = 'E310000000001', 'copia exacta y consultable');

    v_result := pg_temp.begin_send(ecf);
    PERFORM pg_temp.check(v_result->>'raw' = v_raw AND (v_result->>'attempt')::int = 1, 'envía los mismos bytes');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).provider_phase = 'enviando' AND (pg_temp.ecf_of(inv)).send_attempts = 1, 'marca el envío');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).provider_actor = u_a, 'queda quién actuó');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.begin_send(%L)', ecf), 'no está listo');

    -- En pleno envío solo libera el intento que sabe que falló; ni la pantalla ni un intento viejo.
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.release(%L, %L)', ecf, 'x'), 'verifica su estado');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.release(%L, %L, %L, 99)', ecf, 'x', '[]'), 'verifica su estado');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' AND ncf = 'E310000000001' FROM invoices WHERE id = inv), 'no se liberó');
    PERFORM pg_temp.check(pg_temp.in_pool(c_a, 'E310000000001') = FALSE, 'no entró a la bolsa');

    -- ---- Resultado ambiguo: no se libera ni se reenvía sin confirmación
    PERFORM pg_temp.ambiguous(ecf, 'Tiempo agotado');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.release(%L, %L)', ecf, 'x'), 'pudo haber llegado');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.release(%L, %L, %L, 1)', ecf, 'x', '[]'), 'pudo haber llegado');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.begin_send(%L)', ecf), 'no está listo');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.confirm(%L)', ecf), 'Espera unos minutos');
    PERFORM pg_temp.as_admin();
    UPDATE ecf_invoices SET last_sent_at = now() - interval '10 minutes' WHERE id = ecf;
    PERFORM pg_temp.as_user(u_a);
    PERFORM pg_temp.confirm(ecf);
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).provider_phase = 'reservado', 'confirmado: se puede reenviar');
    v_result := pg_temp.begin_send(ecf);
    PERFORM pg_temp.check(v_result->>'raw' = v_raw AND (pg_temp.ecf_of(inv)).send_attempts = 2, 'el reenvío es idéntico');

    -- Un reenvío rechazado no libera: lo guardado ya salió antes. Queda para verificar de nuevo.
    PERFORM pg_temp.refused(ecf, 'El proveedor respondió 400', 1);
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).provider_phase = 'enviando', 'un intento viejo no cambia nada');
    PERFORM pg_temp.refused(ecf, 'El proveedor respondió 400', 2);
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).provider_phase = 'reservado' AND (pg_temp.ecf_of(inv)).provider_error LIKE '%400', 'vuelve a reservado con el motivo');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' AND ncf = 'E310000000001' FROM invoices WHERE id = inv), 'sigue en proceso');
    PERFORM pg_temp.check(pg_temp.in_pool(c_a, 'E310000000001') = FALSE, 'tampoco entró a la bolsa');
    v_result := pg_temp.begin_send(ecf);
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).send_attempts = 3, 'se puede intentar otra vez');

    -- ---- Confirmación del proveedor: el código no se altera
    PERFORM pg_temp.record_sent(ecf, 'aB3xYz', 'https://evil.example/phish', 'interno-1');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).qr_code_url IS NULL AND (pg_temp.ecf_of(inv)).security_code = 'aB3xYz', 'una URL ajena no se guarda');
    PERFORM pg_temp.record_sent(ecf, 'OTRO01', 'javascript:alert(1)', 'interno-2');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).qr_code_url IS NULL AND (pg_temp.ecf_of(inv)).security_code = 'aB3xYz' AND (pg_temp.ecf_of(inv)).provider_track_id = 'interno-1', 'lo guardado no se reescribe');
    PERFORM pg_temp.record_sent(ecf, 'aB3xYz', 'https://ecf.dgii.gov.do@evil.example/x', 'interno-1');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).qr_code_url IS NULL, 'tampoco con el host disfrazado');
    PERFORM pg_temp.record_sent(ecf, 'aB3xYz', 'https://ecf.dgii.gov.do/testecf/consultatimbre?x=1', 'interno-1');
    SELECT * INTO r FROM pg_temp.ecf_row(ecf);
    PERFORM pg_temp.check(r.security_code = 'aB3xYz' AND r.provider_phase = 'enviado' AND r.dgii_status = 'enviado'
        AND r.provider_signed_date = '14-05-2026 02:57:33' AND r.qr_code_url LIKE 'https://ecf.dgii.gov.do/%' AND r.provider_track_id = 'interno-1', 'registra lo devuelto tal cual');

    -- Estados no finales: sigue en proceso y se muestra el estado.
    v_result := pg_temp.apply(ecf, 'En Cola');
    PERFORM pg_temp.check(v_result->>'applied' = 'false' AND v_result->>'invoice_status' = 'en_proceso', 'en cola no finaliza');
    PERFORM pg_temp.apply(ecf, 'Error');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' FROM invoices WHERE id = inv) AND (pg_temp.ecf_of(inv)).provider_status = 'Error', 'Error no es final');
    PERFORM pg_temp.apply(ecf, 'No encontrado');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' FROM invoices WHERE id = inv) AND (pg_temp.ecf_of(inv)).provider_status = 'No encontrado', 'No encontrado no es final');
    PERFORM pg_temp.apply(ecf, NULL);
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).provider_status = 'No encontrado' AND (pg_temp.ecf_of(inv)).checked_at IS NOT NULL, 'estado nulo solo anota la consulta');

    -- ---- Aceptado: el saldo aparece una vez
    v_result := pg_temp.apply(ecf, 'Aceptado', '[]', TRUE, 'track-1', '1');
    PERFORM pg_temp.check(v_result->>'applied' = 'true' AND v_result->>'invoice_status' = 'emitida', 'aceptado finaliza');
    SELECT * INTO r FROM invoices WHERE id = inv;
    PERFORM pg_temp.check(r.status = 'emitida' AND r.balance_due = 1180, 'saldo al aceptar');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).dgii_status = 'aceptado' AND (pg_temp.ecf_of(inv)).track_id = 'track-1', 'registro aceptado');

    v_result := pg_temp.apply(ecf, 'Aceptado');
    PERFORM pg_temp.check(v_result->>'applied' = 'false', 'repetir no aplica');
    PERFORM pg_temp.apply(ecf, 'Rechazado', '[{"codigo":1,"valor":"x"}]', FALSE);
    PERFORM pg_temp.check((SELECT status = 'emitida' AND balance_due = 1180 AND ncf = 'E310000000001' FROM invoices WHERE id = inv), 'un final no retrocede');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).dgii_status = 'aceptado', 'el registro sigue aceptado');
    -- Ya final, el código y el QR no se reescriben.
    PERFORM pg_temp.record_sent(ecf, 'HACK01', 'https://ecf.dgii.gov.do/otra', 'x');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv)).security_code = 'aB3xYz' AND (pg_temp.ecf_of(inv)).qr_code_url LIKE '%consultatimbre?x=1' AND (pg_temp.ecf_of(inv)).dgii_status = 'aceptado', 'lo aceptado no cambia');
    PERFORM pg_temp.check(NOT EXISTS (SELECT 1 FROM ecf_invoices WHERE id = ecf AND secuencia_utilizada IS FALSE), 'no liberó nada');

    SELECT * INTO r FROM billing_summary(c_a);
    PERFORM pg_temp.check(r.invoiced_this_month = 1180 AND r.collectible = 1180, 'ya cuenta en el resumen');
    PERFORM pg_temp.check((SELECT total_invoiced = 1180 FROM view_financial_kpis WHERE company_id = c_a), 'ya cuenta en KPI');

    -- ---- Ambiente: con e-CF vigentes no se cambia
    PERFORM pg_temp.must_fail(format('UPDATE billing_settings SET dgii_environment = %L WHERE company_id = %L', 'prod', c_a), 'ya tiene e-CF vigentes');
    -- Y borrar la configuración para crearla de nuevo tampoco lo salta.
    DELETE FROM billing_settings WHERE company_id = c_a;
    PERFORM pg_temp.check((SELECT COUNT(*) = 1 FROM billing_settings WHERE company_id = c_a), 'la configuración no se borra');
    PERFORM pg_temp.as_admin();
    DELETE FROM billing_settings WHERE company_id = c_a;
    PERFORM pg_temp.as_user(u_a);
    PERFORM pg_temp.must_fail(format(
        'INSERT INTO billing_settings (company_id, emission_mode, dgii_environment, rnc, legal_name, address) VALUES (%L, %L, %L, %L, %L, %L)',
        c_a, 'ecf_proveedor', 'prod', '131880738', 'Empresa A SRL', 'Santo Domingo'), 'ya tiene e-CF vigentes');
    INSERT INTO billing_settings (company_id, emission_mode, dgii_environment, rnc, legal_name, address, phone)
    VALUES (c_a, 'ecf_proveedor', 'test', '131880738', 'Empresa A SRL', 'Santo Domingo', '809-555-1234');
    PERFORM pg_temp.as_user(u_b);
    UPDATE billing_settings SET dgii_environment = 'cert' WHERE company_id = c_b;
    PERFORM pg_temp.check((SELECT dgii_environment = 'cert' FROM billing_settings WHERE company_id = c_b), 'sin e-CF sí se cambia');
    UPDATE billing_settings SET dgii_environment = 'test' WHERE company_id = c_b;
    PERFORM pg_temp.as_user(u_a);

    -- ---- Nota de crédito: el crédito se aplica al aceptar, una vez
    nc := billing_save_draft(c_a, NULL, pg_temp.header('34', cl_a, jsonb_build_object('modifies_invoice_id', inv, 'modification_code', 3, 'modification_reason', 'Corrige monto')), pg_temp.items());
    nc2 := billing_save_draft(c_a, NULL, pg_temp.header('34', cl_a, jsonb_build_object('modifies_invoice_id', inv, 'modification_code', 3, 'modification_reason', 'Corrige monto')), pg_temp.items());
    v_result := billing_reserve_ecf(nc);
    ecf := (v_result->>'ecf_id')::uuid;
    PERFORM pg_temp.sent(ecf);
    PERFORM pg_temp.check((SELECT credited_amount = 0 AND balance_due = 1180 FROM invoices WHERE id = inv), 'reservar la nota no toca la factura');
    -- Lo que la nota compromete no se cobra mientras la DGII responde.
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 1180, %L, %L)', inv, billing_today(), 'efectivo'), 'notas de crédito en proceso');
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 0.01, %L, %L)', inv, billing_today(), 'efectivo'), 'solo se puede cobrar 0');
    PERFORM pg_temp.check((SELECT paid_amount = 0 AND balance_due = 1180 AND status = 'emitida' FROM invoices WHERE id = inv), 'no se registró el cobro');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' AND modified_ncf = 'E310000000001' AND sequence_expires_on IS NULL FROM invoices WHERE id = nc), 'referencia fijada, sin vencimiento');
    -- Otra nota no puede usar el margen que la primera ya comprometió.
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', nc2), 'supera lo acreditable');
    PERFORM pg_temp.check((SELECT next_number = 2 FROM fiscal_sequences WHERE company_id = c_a AND prefix = 'E34'), 'ese intento no consumió número');

    PERFORM pg_temp.apply(ecf, 'Aceptado');
    PERFORM pg_temp.apply(ecf, 'Aceptado');
    PERFORM pg_temp.apply(ecf, 'Aceptado Condicional');
    SELECT * INTO r FROM invoices WHERE id = inv;
    PERFORM pg_temp.check(r.credited_amount = 1180 AND r.credited_due = 1180 AND r.balance_due = 0 AND r.status = 'acreditada', 'crédito aplicado una sola vez');
    PERFORM pg_temp.check((SELECT status = 'emitida' AND balance_due = 0 FROM invoices WHERE id = nc), 'la nota no tiene saldo');
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', nc2), 'supera lo acreditable');
    PERFORM billing_delete_draft(nc2);

    -- ---- Un comprobante en proceso no se referencia aunque el borrador de la nota ya exista
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a), pg_temp.items());
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.sent(ecf);
    PERFORM pg_temp.apply(ecf, 'Aceptado Condicional', '[{"codigo":1924,"valor":"Excede la tolerancia"}]', TRUE, 't2', '4');
    SELECT * INTO r FROM pg_temp.ecf_row(ecf);
    PERFORM pg_temp.check(r.dgii_status = 'condicional' AND r.dgii_messages->0->>'valor' = 'Excede la tolerancia', 'condicional guarda observaciones');
    PERFORM pg_temp.check((SELECT status = 'emitida' AND balance_due = 1180 FROM invoices WHERE id = inv2), 'condicional también finaliza');
    nc := billing_save_draft(c_a, NULL, pg_temp.header('34', cl_a, jsonb_build_object('modifies_invoice_id', inv2, 'modification_code', 3, 'modification_reason', 'Corrige')), pg_temp.items());
    PERFORM pg_temp.as_admin();
    PERFORM set_config('billing.rpc', 'on', TRUE);
    UPDATE invoices SET status = 'en_proceso' WHERE id = inv2;
    PERFORM set_config('billing.rpc', 'off', TRUE);
    PERFORM pg_temp.as_user(u_a);
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', nc), 'sigue en proceso');
    PERFORM pg_temp.as_admin();
    PERFORM set_config('billing.rpc', 'on', TRUE);
    UPDATE invoices SET status = 'emitida' WHERE id = inv2;
    PERFORM set_config('billing.rpc', 'off', TRUE);
    PERFORM pg_temp.as_user(u_a);

    -- Una nota rechazada no toca la factura y vuelve a borrador.
    ecf := (billing_reserve_ecf(nc)->>'ecf_id')::uuid;
    PERFORM pg_temp.sent(ecf);
    PERFORM pg_temp.must_fail(format('SELECT billing_register_payment(%L, 1, %L, %L)', inv2, billing_today(), 'efectivo'), 'notas de crédito en proceso');
    PERFORM pg_temp.apply(ecf, 'Rechazado', '[{"codigo":615,"valor":"Excede saldo"}]', TRUE);
    PERFORM pg_temp.check((SELECT credited_amount = 0 AND balance_due = 1180 FROM invoices WHERE id = inv2), 'nota rechazada sin efecto');
    PERFORM pg_temp.check((SELECT status = 'borrador' AND ncf IS NULL AND modified_ncf IS NULL AND modifies_invoice_id = inv2 FROM invoices WHERE id = nc), 'la nota vuelve a borrador');
    PERFORM billing_delete_draft(nc);

    -- ---- Rechazo con secuencia usada: número quemado
    inv3 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a), pg_temp.items());
    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000003', 'siguiente número');
    PERFORM pg_temp.sent(ecf);
    v_result := pg_temp.apply(ecf, 'Rechazado', '[{"codigo":1920,"valor":"MontoGravadoTotal"}]', TRUE, 't3', '2');
    PERFORM pg_temp.check(v_result->>'invoice_status' = 'borrador', 'rechazado vuelve a borrador');
    SELECT * INTO r FROM invoices WHERE id = inv3;
    PERFORM pg_temp.check(r.status = 'borrador' AND r.ncf IS NULL AND r.ncf_type = 'ninguno' AND r.emission_mode IS NULL AND r.dgii_environment IS NULL
        AND r.issued_at IS NULL AND r.issued_by IS NULL AND r.sequence_expires_on IS NULL AND r.emitter_snapshot IS NULL
        AND r.modified_ncf IS NULL AND r.balance_due = 1180, 'sin rastro fiscal');
    SELECT * INTO r FROM pg_temp.ecf_row(ecf);
    PERFORM pg_temp.check(r.dgii_status = 'rechazado' AND r.secuencia_utilizada = TRUE AND r.dgii_messages->0->>'valor' = 'MontoGravadoTotal' AND r.invoice_id = inv3, 'historial del rechazo');

    -- El borrador devuelto se puede editar con el candado puesto.
    PERFORM billing_save_draft(c_a, inv3, pg_temp.header('31', cl_a, '{"notes": "Corregida"}'), pg_temp.items());
    PERFORM pg_temp.check((SELECT notes = 'Corregida' FROM invoices WHERE id = inv3) AND (SELECT COUNT(*) = 1 FROM invoice_items WHERE invoice_id = inv3), 'edita el borrador devuelto');

    -- Reemitir toma un número nuevo y no reutiliza el quemado.
    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000004', 'el quemado no se reutiliza');
    PERFORM pg_temp.check((SELECT COUNT(*) = 2 FROM ecf_invoices WHERE invoice_id = inv3), 'admite varios intentos');

    -- ---- Rechazo con secuencia sin usar: el número se reutiliza, primero que el siguiente
    v_old := ecf;
    PERFORM pg_temp.sent(ecf);
    PERFORM pg_temp.apply(ecf, 'Rechazado', '[{"codigo":100,"valor":"Estructura"}]', FALSE, 't4', '2');
    -- La repetición no debe devolver el número dos veces ni fallar.
    PERFORM pg_temp.apply(ecf, 'Rechazado', NULL, FALSE);
    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000004', 'reutiliza el liberado');
    PERFORM pg_temp.check((SELECT next_number = 5 FROM fiscal_sequences WHERE id = seq_e31), 'no avanzó el rango');
    PERFORM pg_temp.check((SELECT COUNT(*) = 2 FROM ecf_invoices WHERE encf = 'E310000000004' AND company_id = c_a), 'ambas filas conviven');

    -- ---- Número reutilizado: el proveedor aún muestra el documento anterior
    PERFORM pg_temp.store(ecf, pg_temp.payload('E310000000004'));
    PERFORM pg_temp.begin_send(ecf);
    PERFORM pg_temp.ambiguous(ecf, 'Tiempo agotado');

    -- Fechado antes de este envío: no dice nada, ni rechaza ni libera.
    v_result := pg_temp.apply(ecf, 'Rechazado', '[{"codigo":100,"valor":"Estructura"}]', FALSE, p_updated => now() - interval '1 hour');
    PERFORM pg_temp.check(v_result->>'ignored' = 'anterior' AND v_result->>'applied' = 'false', 'el rechazo viejo se ignora');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' AND ncf = 'E310000000004' FROM invoices WHERE id = inv3), 'sigue en proceso');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).dgii_status <> 'rechazado' AND (pg_temp.ecf_of(inv3)).provider_phase = 'ambiguo', 'sigue ambiguo');
    PERFORM pg_temp.check(pg_temp.in_pool(c_a, 'E310000000004') = FALSE, 'el número no volvió a la bolsa');
    -- Tampoco acepta con una respuesta vieja, ni con un Aceptado sin fecha.
    v_result := pg_temp.apply(ecf, 'Aceptado', p_updated => now() - interval '1 hour');
    PERFORM pg_temp.check(v_result->>'ignored' = 'anterior', 'un aceptado viejo se ignora');
    v_result := pg_temp.apply(ecf, 'Aceptado', p_updated => NULL);
    PERFORM pg_temp.check(v_result->>'ignored' = 'sin_prueba', 'sin fecha no prueba nada');
    PERFORM pg_temp.check(v_result->>'applied' = 'false' AND (SELECT status = 'en_proceso' FROM invoices WHERE id = inv3), 'nada se aplicó');
    -- Dentro del margen de relojes tampoco, si trae el seguimiento de un intento ya rechazado.
    v_result := pg_temp.apply(ecf, 'Rechazado', NULL, FALSE, 't4');
    PERFORM pg_temp.check(v_result->>'ignored' = 'sin_prueba', 'mismo TrackId del rechazado');
    v_result := pg_temp.apply(ecf, 'Aceptado', p_internal => 'interno-' || v_old);
    PERFORM pg_temp.check(v_result->>'ignored' = 'sin_prueba', 'mismo seguimiento interno, sin TrackId');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' FROM invoices WHERE id = inv3), 'sigue en proceso');

    -- Otro total u otro comprador: es otro documento con el mismo número.
    v_result := pg_temp.apply(ecf, 'Aceptado', p_track => 't5', p_total => 999);
    PERFORM pg_temp.check(v_result->>'ignored' = 'no_coincide', 'otro total');
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).provider_error LIKE '%otro total o comprador%', 'se explica');
    v_result := pg_temp.apply(ecf, 'Aceptado', p_track => 't5', p_buyer => '101672919');
    PERFORM pg_temp.check(v_result->>'ignored' = 'no_coincide', 'otro comprador');
    v_result := pg_temp.apply(ecf, 'Aceptado', p_track => 't5', p_total => NULL);
    PERFORM pg_temp.check(v_result->>'ignored' = 'sin_prueba', 'sin monto no se puede comparar');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' AND balance_due = 0 FROM invoices WHERE id = inv3), 'nada se aplicó con diferencias');

    -- Un TrackId nuevo prueba otro envío aunque se conserve el seguimiento interno, y lo que coincide se aplica.
    v_result := pg_temp.apply(ecf, 'Rechazado', '[{"codigo":100,"valor":"Otra vez"}]', FALSE, 't5', p_internal => 'interno-' || v_old, p_buyer => '131880738');
    PERFORM pg_temp.check(v_result->>'applied' = 'true' AND v_result->>'invoice_status' = 'borrador', 'el rechazo actual sí aplica');
    PERFORM pg_temp.check(pg_temp.in_pool(c_a, 'E310000000004') = TRUE, 'y libera el número');
    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000004', 'reutilizado otra vez');

    -- ---- Un número vigente no se repite: índice parcial
    PERFORM pg_temp.as_admin();
    PERFORM pg_temp.must_fail(format(
        'INSERT INTO ecf_invoices (company_id, encf, ecf_type, security_code, dgii_status, source) VALUES (%L, %L, %L, %L, %L, %L)',
        c_a, 'E310000000004', 'E31', 'x', 'enviado', 'externo'), 'uq_ecf_invoices_company_encf');
    PERFORM pg_temp.as_user(u_a);

    -- ---- Sin el dato de la secuencia se da por usada
    PERFORM pg_temp.sent(ecf);
    PERFORM pg_temp.apply(ecf, 'Rechazado', '[]');
    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000005', 'sin dato no reutiliza');

    -- ---- Fallo antes de llegar al proveedor: libera y reutiliza
    PERFORM pg_temp.store(ecf, pg_temp.payload('E310000000005'));
    v_attempt := (pg_temp.begin_send(ecf)->>'attempt')::int;
    PERFORM pg_temp.release(ecf, 'El proveedor rechazó las credenciales', '[{"codigo":"AUTH","valor":"403"}]', v_attempt);
    SELECT * INTO r FROM pg_temp.ecf_row(ecf);
    PERFORM pg_temp.check(r.dgii_status = 'rechazado' AND r.provider_phase = 'no_enviado' AND r.secuencia_utilizada = FALSE AND r.provider_error LIKE 'El proveedor%', 'historial de lo no enviado');
    PERFORM pg_temp.check((SELECT status = 'borrador' AND ncf IS NULL AND balance_due = 1180 FROM invoices WHERE id = inv3), 'vuelve a borrador');
    PERFORM pg_temp.must_fail(format('SELECT pg_temp.release(%L, %L)', ecf, 'x'), 'pudo haber llegado');

    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000005', 'reutiliza lo liberado');

    -- Desde 'reservado' sí se puede volver a borrador: nada salió.
    -- Un rango inactivo no entrega números, ni siquiera los liberados.
    PERFORM pg_temp.release(ecf, 'x');
    UPDATE fiscal_sequences SET is_active = FALSE WHERE id = seq_e31;
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv3), 'No hay un rango');
    PERFORM pg_temp.check(billing_ecf_has_number(c_a, 'E31', 'test') = FALSE, 'sin números disponibles');
    UPDATE fiscal_sequences SET is_active = TRUE WHERE id = seq_e31;
    PERFORM pg_temp.check(billing_ecf_has_number(c_a, 'E31', 'test') = TRUE, 'el liberado cuenta como disponible');

    -- ---- Un 400 sin ECF_VALIDATION_FAILED aparta el número: la siguiente reserva sigue con otro
    PERFORM pg_temp.as_admin();
    UPDATE fiscal_sequences SET end_number = 8 WHERE id = seq_e31;
    PERFORM pg_temp.as_user(u_a);
    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000005', 'sale de la bolsa');
    PERFORM pg_temp.store(ecf, pg_temp.payload('E310000000005'));
    v_attempt := (pg_temp.begin_send(ecf)->>'attempt')::int;
    PERFORM pg_temp.release(ecf, 'El proveedor rechazó el envío (400): se apartó el número.', '[]', v_attempt, TRUE);
    SELECT * INTO r FROM pg_temp.ecf_row(ecf);
    PERFORM pg_temp.check(r.number_parked_at IS NOT NULL AND r.secuencia_utilizada IS NULL AND r.provider_phase = 'no_enviado', 'queda apartado');
    PERFORM pg_temp.check(pg_temp.in_pool(c_a, 'E310000000005') = FALSE, 'no vuelve a la bolsa');
    PERFORM pg_temp.check((SELECT status = 'borrador' AND ncf IS NULL FROM invoices WHERE id = inv3), 'el comprobante vuelve a borrador');
    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000006', 'la siguiente reserva toma otro número');
    PERFORM pg_temp.release(ecf, 'x');
    PERFORM pg_temp.as_admin();
    -- Aunque el rango se reinicie, el número apartado se salta.
    UPDATE fiscal_sequences SET next_number = 5 WHERE id = seq_e31;
    DELETE FROM ecf_released_numbers WHERE company_id = c_a AND encf = 'E310000000006';
    PERFORM pg_temp.as_user(u_a);
    ecf := (billing_reserve_ecf(inv3)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv3)).encf = 'E310000000006', 'el apartado se salta');
    PERFORM pg_temp.release(ecf, 'x');

    -- ---- Un número registrado fuera del sistema no traba el rango
    PERFORM pg_temp.as_admin();
    INSERT INTO ecf_invoices (company_id, encf, ecf_type, security_code, dgii_status, source, environment)
    VALUES (c_a, 'E320000000001', 'E32', 'ABC123', 'enviado', 'externo', 'DEV');
    PERFORM pg_temp.as_user(u_a);
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', NULL), pg_temp.items());
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv2)).encf = 'E320000000002', 'salta el número ocupado');

    -- ---- Consumo sin saldo: pagada al aceptar
    PERFORM pg_temp.sent(ecf);
    PERFORM pg_temp.apply(ecf, 'Aceptado');
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', NULL, '{"subtotal": 0, "itbis": 0, "total": 0, "amount_due": 0, "taxable_18": 0, "itbis_18": 0}'),
        '[{"description":"Gratis","quantity":1,"unit_price":0,"billing_indicator":4,"good_or_service":2,"discount_amount":0,"amount":0,"itbis_amount":0,"total":0,"itbis_withheld":0,"isr_withheld":0}]');
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.sent(ecf);
    PERFORM pg_temp.apply(ecf, 'Aceptado');
    PERFORM pg_temp.check((SELECT status = 'pagada' AND balance_due = 0 FROM invoices WHERE id = inv2), 'sin saldo queda pagada');

    -- ---- El listado de cobros rotula el ambiente del e-CF
    PERFORM billing_register_payment(inv2_paid.id, 5, billing_today(), 'efectivo') FROM (SELECT id FROM invoices WHERE company_id = c_a AND status = 'emitida' AND fiscal_type = '32' LIMIT 1) inv2_paid;
    PERFORM pg_temp.check((SELECT dgii_environment = 'test' AND ncf LIKE 'E32%' FROM billing_list_payments(c_a) LIMIT 1), 'el cobro trae el ambiente');

    -- ---- Límites del formato y un RNC vacío no cuenta como RNC
    PERFORM pg_temp.as_admin();
    INSERT INTO clients (company_id, client_type, first_name, rnc, cedula, passport) VALUES (c_a, 'persona_fisica', 'Con cédula', '', '00113918205', 'P123') RETURNING id INTO cl_b;
    INSERT INTO clients (company_id, client_type, first_name, passport) VALUES (c_a, 'persona_fisica', 'Pasaporte largo', '123456789012345678901') RETURNING id INTO cl_c;
    PERFORM pg_temp.as_user(u_a);
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', cl_b), pg_temp.items());
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((SELECT buyer_snapshot->>'taxId' = '00113918205' AND buyer_snapshot->>'foreignId' IS NULL FROM invoices WHERE id = inv2), 'con cédula no va el pasaporte');
    PERFORM pg_temp.release(ecf, 'x');
    PERFORM billing_delete_draft(inv2);
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', cl_c), pg_temp.items());
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv2), 'hasta 20 caracteres');
    PERFORM billing_delete_draft(inv2);
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('32', NULL), pg_temp.items());
    UPDATE billing_settings SET trade_name = repeat('x', 151) WHERE company_id = c_a;
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv2), 'hasta 150 caracteres');
    UPDATE billing_settings SET trade_name = NULL WHERE company_id = c_a;
    PERFORM billing_delete_draft(inv2);

    -- ---- Permisos de las fases
    inv2 := billing_save_draft(c_a, NULL, pg_temp.header('31', cl_a), pg_temp.items());
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.as_user(u_sin);
    PERFORM pg_temp.must_fail(format('SELECT billing_apply_ecf_status(%L, %L, %L, %L)', c_a, u_sin, ecf, 'Aceptado'), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT billing_release_ecf(%L, %L, %L, %L)', c_a, u_sin, ecf, 'x'), 'permission denied');
    PERFORM pg_temp.as_user(u_b);
    PERFORM pg_temp.must_fail(format('SELECT billing_apply_ecf_status(%L, %L, %L, %L)', c_a, u_b, ecf, 'Aceptado'), 'permission denied');
    PERFORM pg_temp.check((SELECT COUNT(*) = 0 FROM ecf_invoices WHERE id = ecf), 'B no ve registros de A');
    PERFORM pg_temp.as_user(u_a);

    -- ---- Modo: no se abandona con comprobantes en proceso
    PERFORM pg_temp.must_fail(format('UPDATE billing_settings SET emission_mode = %L WHERE company_id = %L', 'ncf_interno', c_a), 'en proceso');

    -- ---- Con solo rechazados, el ambiente sí se puede cambiar
    PERFORM pg_temp.use(c_b, u_b);
    PERFORM pg_temp.as_user(u_b);
    PERFORM billing_save_provider_credentials(c_b, 'test', 'v1.b', 'b');
    INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment) VALUES (c_b, 'E31', 1, 5, 1, '2028-12-31', 'test');
    inv2 := billing_save_draft(c_b, NULL, pg_temp.header('31', NULL, '{"buyer_snapshot": {"taxId": "131880738", "name": "Cliente"}}'), pg_temp.items());
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.must_fail(format('UPDATE billing_settings SET dgii_environment = %L WHERE company_id = %L', 'prod', c_b), 'ya tiene e-CF vigentes');
    PERFORM pg_temp.sent(ecf);
    PERFORM pg_temp.apply(ecf, 'Rechazado', '[]', FALSE);
    UPDATE billing_settings SET dgii_environment = 'prod' WHERE company_id = c_b;
    PERFORM pg_temp.check((SELECT dgii_environment = 'prod' FROM billing_settings WHERE company_id = c_b), 'con rechazados sí cambia');

    -- El rango de pruebas no se consume en producción, ni el número liberado en pruebas.
    PERFORM billing_save_provider_credentials(c_b, 'prod', 'v1.b.prod', 'b');
    PERFORM pg_temp.must_fail(format('SELECT billing_reserve_ecf(%L)', inv2), 'No hay un rango');
    PERFORM pg_temp.check(billing_ecf_has_number(c_b, 'E31', 'prod') = FALSE, 'en producción no hay números');
    PERFORM pg_temp.check((SELECT status = 'borrador' FROM invoices WHERE id = inv2), 'sigue en borrador');
    INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment) VALUES (c_b, 'E31', 101, 105, 101, '2028-12-31', 'prod');
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv2)).encf = 'E310000000101' AND (pg_temp.ecf_of(inv2)).environment = 'PROD', 'usa solo su rango');
    PERFORM pg_temp.check(pg_temp.in_pool(c_b, 'E310000000001') = TRUE, 'la bolsa es por ambiente');

    -- ---- Número reutilizado de tipo 32: el proveedor conserva internalTrackId y no da TrackId
    INSERT INTO fiscal_sequences (company_id, prefix, start_number, end_number, next_number, expires_on, environment) VALUES (c_b, 'E32', 1, 5, 1, NULL, 'prod');
    inv2 := billing_save_draft(c_b, NULL, pg_temp.header('32', NULL, '{"buyer_snapshot": {}}'), pg_temp.items());
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv2)).encf = 'E320000000001', 'primer E32');
    PERFORM pg_temp.store(ecf, pg_temp.payload('E320000000001'));
    PERFORM pg_temp.begin_send(ecf);
    PERFORM pg_temp.record_sent(ecf, 'aB3xYz', 'https://fc.dgii.gov.do/testecf/consultatimbrefc?x=1', 'I-E32');
    v_result := pg_temp.apply(ecf, 'Rechazado', '[{"codigo":100,"valor":"Estructura"}]', FALSE, p_internal => 'I-E32');
    PERFORM pg_temp.check(v_result->>'invoice_status' = 'borrador' AND pg_temp.in_pool(c_b, 'E320000000001'), 'el rechazo libera el número');

    nc2 := billing_save_draft(c_b, NULL, pg_temp.header('32', NULL, '{"buyer_snapshot": {}}'), pg_temp.items());
    ecf := (billing_reserve_ecf(nc2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(nc2)).encf = 'E320000000001', 'toma el mismo número de la bolsa');
    PERFORM pg_temp.store(ecf, pg_temp.payload('E320000000001'));
    PERFORM pg_temp.begin_send(ecf);
    PERFORM pg_temp.record_sent(ecf, 'cD4zWq', 'https://fc.dgii.gov.do/testecf/consultatimbrefc?x=2', 'I-E32');
    -- Con el POST confirmado, solo lo fechado antes del envío puede ser el documento rechazado.
    v_result := pg_temp.apply(ecf, 'Rechazado', NULL, FALSE, p_internal => 'I-E32', p_updated => now() - interval '1 minute');
    PERFORM pg_temp.check(v_result->>'ignored' = 'sin_prueba', 'el POST confirmado no da por buena una fecha previa');
    v_result := pg_temp.apply(ecf, 'Aceptado', p_internal => 'I-E32', p_updated => now() + interval '30 seconds');
    PERFORM pg_temp.check(v_result->>'applied' = 'true' AND v_result->>'dgii_status' = 'aceptado' AND v_result->>'invoice_status' = 'emitida',
        'tras un POST confirmado, lo posterior al envío es este envío aunque conserve internalTrackId');
    PERFORM pg_temp.check((SELECT balance_due = 1180 FROM invoices WHERE id = nc2), 'y queda el saldo');

    -- ---- Número reutilizado sin confirmar: el margen de relojes no vale para un Rechazado viejo
    inv2 := billing_save_draft(c_b, NULL, pg_temp.header('32', NULL, '{"buyer_snapshot": {}}'), pg_temp.items());
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv2)).encf = 'E320000000002', 'siguiente E32');
    PERFORM pg_temp.store(ecf, pg_temp.payload('E320000000002'));
    PERFORM pg_temp.begin_send(ecf);
    PERFORM pg_temp.record_sent(ecf, 'eF5aRt', 'https://fc.dgii.gov.do/testecf/consultatimbrefc?x=3', 'I-31');
    PERFORM pg_temp.apply(ecf, 'Rechazado', '[{"codigo":100,"valor":"Estructura"}]', FALSE, 'T1', p_internal => 'I-31');

    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv2)).encf = 'E320000000002', 'reutiliza el liberado');
    PERFORM pg_temp.store(ecf, pg_temp.payload('E320000000002'));
    PERFORM pg_temp.begin_send(ecf);
    PERFORM pg_temp.ambiguous(ecf, 'Tiempo agotado');
    v_result := pg_temp.apply(ecf, 'Rechazado', NULL, FALSE, p_updated => now() - interval '1 minute');
    PERFORM pg_temp.check(v_result->>'ignored' = 'anterior' AND v_result->>'applied' = 'false', 'el rechazo dentro del margen no se cree');
    PERFORM pg_temp.check((SELECT status = 'en_proceso' FROM invoices WHERE id = inv2), 'sigue en proceso');
    PERFORM pg_temp.check(pg_temp.in_pool(c_b, 'E320000000002') = FALSE, 'el número no volvió a la bolsa');
    -- Lo fechado después del envío sí se compara y se aplica.
    v_result := pg_temp.apply(ecf, 'Rechazado', NULL, FALSE, p_updated => now() + interval '30 seconds');
    PERFORM pg_temp.check(v_result->>'applied' = 'true' AND pg_temp.in_pool(c_b, 'E320000000002'), 'lo posterior al envío sí aplica');

    -- Sin un intento anterior del número, el margen de relojes se mantiene.
    ecf := (billing_reserve_ecf(inv2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(inv2)).encf = 'E320000000002', 'otra vez el liberado');
    nc2 := billing_save_draft(c_b, NULL, pg_temp.header('32', NULL, '{"buyer_snapshot": {}}'), pg_temp.items());
    v_new := (billing_reserve_ecf(nc2)->>'ecf_id')::uuid;
    PERFORM pg_temp.check((pg_temp.ecf_of(nc2)).encf = 'E320000000003', 'número sin intentos anteriores');
    PERFORM pg_temp.store(v_new, pg_temp.payload('E320000000003'));
    PERFORM pg_temp.begin_send(v_new);
    PERFORM pg_temp.ambiguous(v_new, 'Tiempo agotado');
    v_result := pg_temp.apply(v_new, 'Aceptado', p_updated => now() - interval '1 minute');
    PERFORM pg_temp.check(v_result->>'applied' = 'true', 'sin intentos anteriores, el desfase de relojes se tolera');
    PERFORM pg_temp.release(ecf, 'No llegó');

    RAISE NOTICE 'OK: todas las verificaciones de la emisión por proveedor pasaron';
END $$;

ROLLBACK;
