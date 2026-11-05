-- Migración 22: Cierre de accesos abiertos
--
-- Estas tablas no tenían RLS y, con los permisos por defecto de Supabase, cualquier
-- visitante sin sesión podía leerlas y modificarlas mediante la API.

-- Contactos de clientes: se heredan del cliente, cuya política ya limita por empresa.
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_contacts_select" ON client_contacts FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_contacts.client_id));

CREATE POLICY "client_contacts_write" ON client_contacts FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_contacts.client_id AND has_permission(c.company_id, 'clients.edit')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_contacts.client_id AND has_permission(c.company_id, 'clients.edit')
    ));

-- Verificaciones de RNC: ligadas al cliente.
ALTER TABLE rnc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rnc_verifications_select" ON rnc_verifications FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = rnc_verifications.client_id));

CREATE POLICY "rnc_verifications_insert" ON rnc_verifications FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = rnc_verifications.client_id AND has_permission(c.company_id, 'clients.edit')
    ));

-- Registro de RNC: datos públicos de la DGII compartidos entre empresas. Solo lectura;
-- lo alimenta el servidor con la clave de servicio.
ALTER TABLE rnc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rnc_records_select" ON rnc_records FOR SELECT TO authenticated USING (TRUE);

-- Catálogo de permisos: lectura para usuarios con sesión.
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select" ON permissions FOR SELECT TO authenticated USING (TRUE);

-- Numeración de expedientes: generate_case_number corre como dueño y no depende de estas políticas.
ALTER TABLE numbering_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "numbering_sequences_select" ON numbering_sequences FOR SELECT TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "numbering_sequences_write" ON numbering_sequences FOR ALL TO authenticated
    USING (has_permission(company_id, 'config.manage'))
    WITH CHECK (has_permission(company_id, 'config.manage'));

REVOKE ALL ON client_contacts, rnc_verifications, rnc_records, permissions, numbering_sequences FROM anon;

-- Líneas de cotización: USING (TRUE) sin frontera de empresa las exponía entre empresas.
DROP POLICY IF EXISTS "quote_items_all" ON quote_items;

CREATE POLICY "quote_items_all" ON quote_items FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id))
    WITH CHECK (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id));

-- Certificado e-CF: cualquier miembro de la empresa podía leer el certificado y su contraseña.
-- Esas dos columnas quedan solo para la clave de servicio, usada únicamente en el servidor.
DROP POLICY IF EXISTS "ecf_configs_all" ON ecf_configs;

CREATE POLICY "ecf_configs_select" ON ecf_configs FOR SELECT TO authenticated
    USING (has_permission(company_id, 'ecf.view') OR has_permission(company_id, 'config.manage'));

CREATE POLICY "ecf_configs_write" ON ecf_configs FOR ALL TO authenticated
    USING (has_permission(company_id, 'config.manage'))
    WITH CHECK (has_permission(company_id, 'config.manage'));

REVOKE ALL ON ecf_configs FROM anon, authenticated;

GRANT SELECT (
    id, company_id, environment, rnc, business_name, trade_name, economic_activity,
    certificate_alias, certificate_expiry, has_certificate, auto_send_dgii, created_at, updated_at
) ON ecf_configs TO authenticated;

GRANT INSERT (
    company_id, environment, rnc, business_name, trade_name, economic_activity,
    certificate_alias, certificate_expiry, auto_send_dgii
), UPDATE (
    environment, rnc, business_name, trade_name, economic_activity,
    certificate_alias, certificate_expiry, auto_send_dgii
) ON ecf_configs TO authenticated;
