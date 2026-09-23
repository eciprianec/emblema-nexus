-- Migración 18: Portal de Clientes, Consultas Externas y Tracking de Expedientes (Fase 8)
-- Acceso de clientes al portal, seguimiento público de expedientes mediante token/código,
-- recepción de consultas y cotizaciones externas, y solicitudes de documentos para clientes.

-- 1. Accesos al Portal de Clientes
CREATE TABLE IF NOT EXISTS client_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    access_token VARCHAR(128) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    magic_code VARCHAR(10) NULL, -- Código PIN temporal de 6 dígitos
    magic_code_expires_at TIMESTAMPTZ NULL,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_client_portal_access_company_client UNIQUE (company_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_access_company ON client_portal_access(company_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_client ON client_portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_email ON client_portal_access(email);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_token ON client_portal_access(access_token);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_active ON client_portal_access(company_id, is_active);

-- 2. Tokens de Seguimiento Público de Expedientes
CREATE TABLE IF NOT EXISTS case_tracking_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    tracking_code VARCHAR(64) NOT NULL UNIQUE, -- ej: 'TRK-2026-X89B2'
    is_public BOOLEAN DEFAULT true,
    allow_document_download BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_case_tracking_tokens_company_case UNIQUE (company_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_case_tracking_tokens_company ON case_tracking_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_case_tracking_tokens_case ON case_tracking_tokens(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tracking_tokens_code ON case_tracking_tokens(tracking_code);
CREATE INDEX IF NOT EXISTS idx_case_tracking_tokens_public ON case_tracking_tokens(tracking_code, is_public);

-- 3. Consultas y Solicitudes Externas (Leads / Clientes Potenciales)
CREATE TABLE IF NOT EXISTS client_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    rnc_cedula VARCHAR(20) NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('legal_inmobiliario', 'deslinde_mensura', 'compraventa', 'constitucion_compania', 'otro')),
    message TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'en_cotizacion', 'convertido', 'descartado')),
    client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
    case_id UUID NULL REFERENCES cases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_inquiries_company ON client_inquiries(company_id);
CREATE INDEX IF NOT EXISTS idx_client_inquiries_client ON client_inquiries(client_id);
CREATE INDEX IF NOT EXISTS idx_client_inquiries_case ON client_inquiries(case_id);
CREATE INDEX IF NOT EXISTS idx_client_inquiries_status ON client_inquiries(company_id, status);
CREATE INDEX IF NOT EXISTS idx_client_inquiries_service ON client_inquiries(company_id, service_type);
CREATE INDEX IF NOT EXISTS idx_client_inquiries_email ON client_inquiries(email);

-- 4. Requerimientos y Solicitudes de Documentos a Clientes
CREATE TABLE IF NOT EXISTS client_document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    case_id UUID NULL REFERENCES cases(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status VARCHAR(30) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'subido', 'revisado', 'rechazado')),
    uploaded_document_id UUID NULL REFERENCES documents(id) ON DELETE SET NULL,
    due_date DATE NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_doc_requests_company ON client_document_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_client_doc_requests_client ON client_document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_doc_requests_case ON client_document_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_client_doc_requests_status ON client_document_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_client_doc_requests_doc ON client_document_requests(uploaded_document_id);

-- 5. Triggers de actualización automática de updated_at
CREATE TRIGGER set_updated_at_client_portal_access
BEFORE UPDATE ON client_portal_access
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_case_tracking_tokens
BEFORE UPDATE ON case_tracking_tokens
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_client_inquiries
BEFORE UPDATE ON client_inquiries
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_client_document_requests
BEFORE UPDATE ON client_document_requests
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_tracking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_document_requests ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS multitenant aisladas por company_id (autenticados internos)
CREATE POLICY "tenant_boundary_client_portal_access" ON client_portal_access
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "client_portal_access_all" ON client_portal_access 
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_case_tracking_tokens" ON case_tracking_tokens
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "case_tracking_tokens_all" ON case_tracking_tokens 
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_client_inquiries" ON client_inquiries
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "client_inquiries_all" ON client_inquiries 
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_client_document_requests" ON client_document_requests
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "client_document_requests_all" ON client_document_requests 
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 8. Políticas públicas y anónimas (Tracking público y envío de consultas)
CREATE POLICY "case_tracking_tokens_anon_read" ON case_tracking_tokens
    FOR SELECT TO anon
    USING (is_public = TRUE);

CREATE POLICY "client_inquiries_anon_insert" ON client_inquiries
    FOR INSERT TO anon
    WITH CHECK (TRUE);
