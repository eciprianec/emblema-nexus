-- Migración 3: Clientes y RNC

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_type TEXT CHECK (client_type IN ('persona_fisica', 'persona_juridica')),
    first_name TEXT,
    last_name TEXT,
    cedula TEXT,
    passport TEXT,
    nationality TEXT,
    business_name TEXT,
    trade_name TEXT,
    rnc TEXT,
    legal_representative TEXT,
    email TEXT,
    phone TEXT,
    phone_secondary TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    notes TEXT,
    tax_data JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    archived_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_cedula ON clients(company_id, cedula);
CREATE INDEX IF NOT EXISTS idx_clients_company_rnc ON clients(company_id, rnc);

CREATE TRIGGER set_updated_at_clients
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rnc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rnc TEXT NOT NULL UNIQUE,
    business_name TEXT,
    trade_name TEXT,
    status TEXT,
    economic_activity TEXT,
    tax_regime TEXT,
    source TEXT,
    verified_at TIMESTAMPTZ,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rnc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    rnc TEXT NOT NULL,
    result JSONB,
    source TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
