-- Prueba de accesos abiertos: visitantes sin sesión y usuarios de otra empresa.
-- Corre en una transacción y se revierte:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_integration.sql

BEGIN;

CREATE FUNCTION pg_temp.as_user(p_user UUID) RETURNS VOID AS $$
    SELECT set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, TRUE),
           set_config('request.jwt.claim.sub', p_user::text, TRUE),
           set_config('role', 'authenticated', TRUE);
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.as_anon() RETURNS VOID AS $$
    SELECT set_config('request.jwt.claims', '', TRUE),
           set_config('request.jwt.claim.sub', '', TRUE),
           set_config('role', 'anon', TRUE);
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

CREATE FUNCTION pg_temp.count(p_sql TEXT) RETURNS BIGINT AS $$
DECLARE
    v BIGINT;
BEGIN
    EXECUTE 'SELECT COUNT(*) FROM (' || p_sql || ') q' INTO v;
    RETURN v;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    c_a UUID := gen_random_uuid();
    c_b UUID := gen_random_uuid();
    u_a UUID := gen_random_uuid();
    u_b UUID := gen_random_uuid();
    u_c UUID := gen_random_uuid();
    cl_a UUID;
    q_a UUID;
    contact UUID;
    admin_role UUID;
    t TEXT;
    n BIGINT;
BEGIN
    INSERT INTO companies (id, name) VALUES (c_a, 'A'), (c_b, 'B');
    INSERT INTO auth.users (id, email) VALUES (u_a, 'a@t.local'), (u_b, 'b@t.local'), (u_c, 'c@t.local');
    INSERT INTO company_members (company_id, user_id) VALUES (c_a, u_a), (c_b, u_b), (c_a, u_c);
    SELECT id INTO admin_role FROM roles WHERE name = 'Administrador' AND is_system;
    INSERT INTO user_roles (user_id, role_id, company_id) VALUES (u_a, admin_role, c_a), (u_b, admin_role, c_b);
    INSERT INTO clients (company_id, client_type, business_name) VALUES (c_a, 'persona_juridica', 'Cliente A') RETURNING id INTO cl_a;
    INSERT INTO client_contacts (client_id, name) VALUES (cl_a, 'Contacto') RETURNING id INTO contact;
    INSERT INTO rnc_verifications (client_id, rnc) VALUES (cl_a, '131880738');
    INSERT INTO rnc_records (rnc) VALUES ('131880738');
    INSERT INTO numbering_sequences (company_id, prefix) VALUES (c_a, 'EXP');
    INSERT INTO quotes (company_id, quote_number, client_id) VALUES (c_a, 'COT-1', cl_a) RETURNING id INTO q_a;
    INSERT INTO quote_items (quote_id, description) VALUES (q_a, 'Línea');
    INSERT INTO ecf_configs (company_id, rnc, business_name, certificate_data, certificate_password_hash)
    VALUES (c_a, '131880738', 'A', 'CERTIFICADO', 'CLAVE');

    -- ---- Ninguna tabla de la API queda sin RLS
    SELECT string_agg(c.relname, ', ') INTO t FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND NOT c.relrowsecurity;
    PERFORM pg_temp.check(t IS NULL, 'tablas sin RLS: ' || COALESCE(t, ''));

    -- ---- Ninguna política USING TRUE cruza empresas, salvo catálogos públicos declarados
    SELECT string_agg(DISTINCT p.tablename, ', ') INTO t FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.qual = 'true' AND p.permissive = 'PERMISSIVE'
      AND p.tablename NOT IN ('rnc_records', 'permissions')
      AND NOT EXISTS (
          SELECT 1 FROM pg_policies r
          WHERE r.schemaname = 'public' AND r.tablename = p.tablename AND r.permissive = 'RESTRICTIVE'
      );
    PERFORM pg_temp.check(t IS NULL, 'USING TRUE sin frontera: ' || COALESCE(t, ''));

    -- ---- Visitante sin sesión
    PERFORM pg_temp.as_anon();
    FOREACH t IN ARRAY ARRAY['client_contacts', 'rnc_verifications', 'rnc_records', 'permissions', 'numbering_sequences', 'ecf_configs'] LOOP
        PERFORM pg_temp.must_fail('SELECT * FROM ' || t, 'permission denied');
    END LOOP;
    PERFORM pg_temp.must_fail(format('DELETE FROM client_contacts WHERE id = %L', contact), 'permission denied');
    PERFORM pg_temp.must_fail('SELECT * FROM clients', 'permission denied');
    PERFORM pg_temp.must_fail('SELECT * FROM quote_items', 'permission denied');
    PERFORM pg_temp.must_fail('SELECT * FROM case_tracking_tokens', 'permission denied');
    PERFORM pg_temp.must_fail(format('INSERT INTO client_inquiries (company_id) VALUES (%L)', c_a), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT generate_case_number(%L, %L)', c_a, c_a), 'permission denied');
    PERFORM pg_temp.must_fail(format('SELECT create_entity_revision(%L, %L, %L, %L, %L, %L)', c_a, 't', c_a, '{}', 'x', 'x'), 'permission denied');

    -- ---- Usuario de otra empresa
    PERFORM pg_temp.as_user(u_b);
    PERFORM pg_temp.check(pg_temp.count('SELECT 1 FROM client_contacts') = 0, 'B no ve contactos de A');
    PERFORM pg_temp.check(pg_temp.count('SELECT 1 FROM rnc_verifications') = 0, 'B no ve verificaciones de A');
    PERFORM pg_temp.check(pg_temp.count('SELECT 1 FROM numbering_sequences') = 0, 'B no ve numeración de A');
    PERFORM pg_temp.check(pg_temp.count('SELECT 1 FROM quote_items') = 0, 'B no ve líneas de cotización de A');
    PERFORM pg_temp.must_fail(format('INSERT INTO client_contacts (client_id, name) VALUES (%L, %L)', cl_a, 'x'), 'row-level security');
    PERFORM pg_temp.must_fail(format('INSERT INTO quote_items (quote_id, description) VALUES (%L, %L)', q_a, 'x'), 'row-level security');
    PERFORM pg_temp.check(pg_temp.count('SELECT 1 FROM rnc_records') = 1, 'el registro público de RNC sí se lee');
    PERFORM pg_temp.must_fail(format('INSERT INTO rnc_records (rnc) VALUES (%L)', '101672919'), 'row-level security');
    PERFORM pg_temp.must_fail('UPDATE permissions SET description = ''x'' WHERE FALSE; INSERT INTO permissions (key, module, action) VALUES (''x.y'', ''x'', ''y'')', 'row-level security');

    -- ---- Miembro de la empresa con permisos
    PERFORM pg_temp.as_user(u_a);
    PERFORM pg_temp.check(pg_temp.count('SELECT 1 FROM client_contacts') = 1, 'A ve sus contactos');
    PERFORM pg_temp.check(pg_temp.count('SELECT 1 FROM quote_items') = 1, 'A ve sus líneas');
    INSERT INTO client_contacts (client_id, name) VALUES (cl_a, 'Otro');
    INSERT INTO quote_items (quote_id, description) VALUES (q_a, 'Otra');

    -- ---- El certificado no se lee ni siquiera siendo administrador de la empresa
    PERFORM pg_temp.must_fail('SELECT certificate_data FROM ecf_configs', 'permission denied');
    PERFORM pg_temp.must_fail('SELECT certificate_password_hash FROM ecf_configs', 'permission denied');
    PERFORM pg_temp.must_fail('SELECT * FROM ecf_configs', 'permission denied');
    PERFORM pg_temp.check(pg_temp.count('SELECT rnc, has_certificate FROM ecf_configs') = 1, 'los datos no secretos sí se leen');
    PERFORM pg_temp.must_fail('UPDATE ecf_configs SET certificate_data = ''x''', 'permission denied');
    UPDATE ecf_configs SET trade_name = 'Comercial' WHERE company_id = c_a;

    -- ---- Miembro sin permisos
    PERFORM pg_temp.as_user(u_c);
    PERFORM pg_temp.check(pg_temp.count('SELECT rnc FROM ecf_configs') = 0, 'sin ecf.view no ve la configuración');
    PERFORM pg_temp.must_fail(format('INSERT INTO client_contacts (client_id, name) VALUES (%L, %L)', cl_a, 'x'), 'row-level security');

    RAISE NOTICE 'OK: todas las verificaciones de seguridad pasaron';
END $$;

ROLLBACK;
