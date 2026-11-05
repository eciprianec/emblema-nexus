-- Migración 7: Gestión Documental y Plantillas (Fase 2)

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    remote_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT DEFAULT 0,
    current_version INT DEFAULT 1,
    status TEXT CHECK (status IN ('borrador', 'en_revision', 'aprobado', 'firmado', 'obsoleto')) DEFAULT 'borrador',
    checklist_item_id UUID REFERENCES case_checklist_items(id) ON DELETE SET NULL,
    metadata JSONB,
    archived_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_checklist ON documents(checklist_item_id);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    remote_path TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    mime_type TEXT,
    change_summary TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON document_versions(document_id);

CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    area_id UUID REFERENCES service_areas(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    template_remote_path TEXT,
    current_version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    remote_path TEXT NOT NULL,
    variables JSONB,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (template_id, version_number)
);

CREATE TABLE IF NOT EXISTS document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    link_type TEXT DEFAULT 'adjunto',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_links_lookup ON document_links(entity_type, entity_id);

-- Triggers de actualización
CREATE TRIGGER set_updated_at_documents
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_document_templates
BEFORE UPDATE ON document_templates
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Habilitar RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;

-- Las políticas siguientes dependen de estas funciones, que 00010 vuelve a declarar.
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT company_id 
    FROM company_members 
    WHERE user_id = (SELECT auth.uid()) AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION has_permission(p_company_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_has_perm BOOLEAN;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    -- Chequear en user_permissions
    SELECT granted INTO v_has_perm
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = v_user_id AND up.company_id = p_company_id AND p.key = p_permission_key;
    
    IF v_has_perm IS NOT NULL THEN
        RETURN v_has_perm;
    END IF;
    
    -- Chequear en role_permissions
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = v_user_id AND ur.company_id = p_company_id AND p.key = p_permission_key
    ) INTO v_has_perm;
    
    RETURN v_has_perm;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Políticas RLS para documents
CREATE POLICY "tenant_boundary_documents" ON documents
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "documents_select" ON documents
    FOR SELECT TO authenticated
    USING (has_permission(company_id, 'documents.view'));

CREATE POLICY "documents_insert" ON documents
    FOR INSERT TO authenticated
    WITH CHECK (has_permission(company_id, 'documents.upload'));

CREATE POLICY "documents_update" ON documents
    FOR UPDATE TO authenticated
    USING (has_permission(company_id, 'documents.edit'))
    WITH CHECK (has_permission(company_id, 'documents.edit'));

CREATE POLICY "documents_delete" ON documents
    FOR DELETE TO authenticated
    USING (has_permission(company_id, 'documents.delete'));
