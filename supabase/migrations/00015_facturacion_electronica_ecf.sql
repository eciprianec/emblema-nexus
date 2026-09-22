-- Migración 15: Facturación Electrónica e-CF (DGII República Dominicana - Fase 5)

-- 1. Configuración de Emisor Electrónico por Empresa
CREATE TABLE IF NOT EXISTS ecf_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    environment TEXT DEFAULT 'CERT' CHECK (environment IN ('DEV', 'CERT', 'PROD')),
    rnc TEXT NOT NULL,
    business_name TEXT NOT NULL,
    trade_name TEXT,
    economic_activity TEXT,
    certificate_alias TEXT,
    certificate_expiry DATE,
    has_certificate BOOLEAN DEFAULT FALSE,
    certificate_data TEXT, -- Base64 encriptado o referencia segura de almacenamiento
    certificate_password_hash TEXT,
    auto_send_dgii BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecf_configs_company ON ecf_configs(company_id);

-- 2. Secuencias de e-NCF Autorizadas por la DGII
CREATE TABLE IF NOT EXISTS ecf_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ecf_type TEXT NOT NULL CHECK (ecf_type IN ('E31', 'E32', 'E33', 'E34', 'E41', 'E43', 'E44', 'E45', 'E46', 'E47')),
    series TEXT DEFAULT 'E',
    current_number BIGINT NOT NULL DEFAULT 1,
    start_number BIGINT NOT NULL DEFAULT 1,
    end_number BIGINT NOT NULL,
    expiration_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (company_id, ecf_type, series)
);

CREATE INDEX IF NOT EXISTS idx_ecf_sequences_company ON ecf_sequences(company_id, ecf_type);

-- 3. Comprobantes Fiscales Electrónicos Emitidos (e-CF)
CREATE TABLE IF NOT EXISTS ecf_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    encf TEXT NOT NULL,
    ecf_type TEXT NOT NULL CHECK (ecf_type IN ('E31', 'E32', 'E33', 'E34', 'E41', 'E43', 'E44', 'E45', 'E46', 'E47')),
    environment TEXT DEFAULT 'CERT' CHECK (environment IN ('DEV', 'CERT', 'PROD')),
    security_code TEXT NOT NULL, -- Código alfanumérico de 6 caracteres del resumen digital
    sign_date TIMESTAMPTZ,
    xml_unsigned TEXT,
    xml_signed TEXT,
    track_id TEXT, -- Identificador devuelto por la DGII al recibir el lote
    dgii_status TEXT DEFAULT 'borrador' CHECK (dgii_status IN ('borrador', 'firmado', 'enviado', 'aceptado', 'rechazado', 'condicional', 'en_proceso', 'anulado')),
    dgii_status_code TEXT,
    dgii_messages JSONB DEFAULT '[]'::jsonb,
    qr_code_url TEXT,
    buyer_acceptance_status TEXT DEFAULT 'pendiente' CHECK (buyer_acceptance_status IN ('pendiente', 'aprobado', 'rechazado')),
    buyer_acceptance_date TIMESTAMPTZ,
    buyer_rejection_reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecf_invoices_company ON ecf_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_ecf_invoices_encf ON ecf_invoices(company_id, encf);
CREATE INDEX IF NOT EXISTS idx_ecf_invoices_invoice ON ecf_invoices(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ecf_invoices_track_id ON ecf_invoices(track_id);
CREATE INDEX IF NOT EXISTS idx_ecf_invoices_status ON ecf_invoices(company_id, dgii_status);

-- 4. Comprobantes Electrónicos Recibidos (Buzón B2B de Compras / Aprobación Comercial)
CREATE TABLE IF NOT EXISTS ecf_receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    emitter_rnc TEXT NOT NULL,
    emitter_name TEXT NOT NULL,
    encf TEXT NOT NULL,
    ecf_type TEXT NOT NULL,
    issue_date DATE NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    itbis_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    security_code TEXT,
    commercial_status TEXT DEFAULT 'pendiente' CHECK (commercial_status IN ('pendiente', 'aprobado', 'rechazado')),
    commercial_rejection_reason TEXT,
    xml_received TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecf_receptions_company ON ecf_receptions(company_id);
CREATE INDEX IF NOT EXISTS idx_ecf_receptions_encf ON ecf_receptions(company_id, encf);

-- Triggers de actualización
CREATE TRIGGER set_updated_at_ecf_configs
BEFORE UPDATE ON ecf_configs
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_ecf_sequences
BEFORE UPDATE ON ecf_sequences
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_ecf_invoices
BEFORE UPDATE ON ecf_invoices
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_ecf_receptions
BEFORE UPDATE ON ecf_receptions
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Habilitar RLS
ALTER TABLE ecf_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecf_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecf_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecf_receptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "tenant_boundary_ecf_configs" ON ecf_configs
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "ecf_configs_all" ON ecf_configs FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_ecf_sequences" ON ecf_sequences
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "ecf_sequences_all" ON ecf_sequences FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_ecf_invoices" ON ecf_invoices
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "ecf_invoices_all" ON ecf_invoices FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_ecf_receptions" ON ecf_receptions
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "ecf_receptions_all" ON ecf_receptions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
