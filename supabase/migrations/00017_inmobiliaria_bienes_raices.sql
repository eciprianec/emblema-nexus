-- Migración 17: Inmobiliaria y Bienes Raíces (Fase 7)
-- Gestión integral de inventario inmobiliario, contratos de corretaje/arrendamiento, citas/visitas y liquidación de comisiones.

-- 1. Propiedades e Inmuebles
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parcel_id UUID NULL REFERENCES cadastral_parcels(id) ON DELETE SET NULL,
    case_id UUID NULL REFERENCES cases(id) ON DELETE SET NULL,
    owner_client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL, -- ej: 'PROP-2026-001'
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('apartamento', 'casa', 'villa', 'solar_terreno', 'local_comercial', 'nave_industrial', 'oficina', 'edificio', 'finca')),
    listing_type VARCHAR(30) NOT NULL CHECK (listing_type IN ('venta', 'alquiler', 'alquiler_amueblado', 'venta_o_alquiler')),
    status VARCHAR(30) NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'reservada', 'bajo_contrato', 'vendida', 'alquilada', 'inactiva')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'DOP')),
    sale_price NUMERIC(14, 2) NULL,
    rental_price NUMERIC(14, 2) NULL,
    maintenance_fee NUMERIC(12, 2) NULL,
    bedrooms INTEGER NULL,
    bathrooms NUMERIC(3, 1) NULL,
    half_bathrooms INTEGER NULL,
    parking_spots INTEGER NULL,
    construction_area_m2 NUMERIC(12, 2) NULL,
    land_area_m2 NUMERIC(12, 2) NULL,
    land_area_tareas NUMERIC(12, 2) GENERATED ALWAYS AS (ROUND(land_area_m2 / 628.86, 2)) STORED,
    year_built INTEGER NULL,
    levels INTEGER NULL,
    furnished VARCHAR(30) DEFAULT 'no_amueblado' CHECK (furnished IN ('no_amueblado', 'semi_amueblado', 'completamente_amueblado')),
    amenities JSONB DEFAULT '[]'::jsonb,
    address_province VARCHAR(100) NOT NULL DEFAULT 'Santo Domingo',
    address_municipality VARCHAR(100) NOT NULL DEFAULT 'Distrito Nacional',
    address_sector VARCHAR(100) NOT NULL DEFAULT 'Piantini',
    address_street VARCHAR(255) NULL,
    latitude NUMERIC(10, 7) NULL,
    longitude NUMERIC(10, 7) NULL,
    images JSONB DEFAULT '[]'::jsonb,
    virtual_tour_url VARCHAR(500) NULL,
    title_deed_number VARCHAR(100) NULL,
    is_exclusive BOOLEAN DEFAULT false,
    commission_percentage NUMERIC(5, 2) DEFAULT 5.00,
    created_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_properties_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_properties_company ON properties(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(company_id, code);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(company_id, status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(company_id, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_listing ON properties(company_id, listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_client_id);
CREATE INDEX IF NOT EXISTS idx_properties_parcel ON properties(parcel_id);
CREATE INDEX IF NOT EXISTS idx_properties_case ON properties(case_id);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(company_id, sale_price, rental_price);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(company_id, address_province, address_municipality, address_sector);

-- 2. Contratos Inmobiliarios (Alquiler, Promesa de Venta, etc.)
CREATE TABLE IF NOT EXISTS property_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    contract_number VARCHAR(50) NOT NULL, -- ej: 'CON-2026-001'
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('alquiler', 'promesa_venta', 'opcion_compra', 'administracion')),
    status VARCHAR(30) NOT NULL DEFAULT 'vigente' CHECK (status IN ('borrador', 'vigente', 'vencido', 'resuelto', 'cancelado')),
    lessor_client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
    tenant_client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
    case_id UUID NULL REFERENCES cases(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'DOP')),
    amount NUMERIC(14, 2) NOT NULL,
    deposit_amount NUMERIC(14, 2) NULL,
    deposit_months INTEGER DEFAULT 2,
    payment_frequency VARCHAR(30) DEFAULT 'mensual',
    late_fee_percentage NUMERIC(5, 2) DEFAULT 5.00,
    grace_period_days INTEGER DEFAULT 5,
    terms_conditions TEXT NULL,
    document_url VARCHAR(500) NULL,
    created_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_property_contracts_company_number UNIQUE (company_id, contract_number)
);

CREATE INDEX IF NOT EXISTS idx_property_contracts_company ON property_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_property_contracts_property ON property_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_contracts_number ON property_contracts(company_id, contract_number);
CREATE INDEX IF NOT EXISTS idx_property_contracts_status ON property_contracts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_property_contracts_dates ON property_contracts(company_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_property_contracts_lessor ON property_contracts(lessor_client_id);
CREATE INDEX IF NOT EXISTS idx_property_contracts_tenant ON property_contracts(tenant_client_id);

-- 3. Citas y Visitas Inmobiliarias
CREATE TABLE IF NOT EXISTS property_showings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
    agent_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    showing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'programada' CHECK (status IN ('programada', 'completada', 'cancelada', 'no_asistio')),
    interest_level VARCHAR(20) DEFAULT 'medio' CHECK (interest_level IN ('alto', 'medio', 'bajo', 'descartado')),
    feedback TEXT NULL,
    offer_made BOOLEAN DEFAULT false,
    offer_amount NUMERIC(14, 2) NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_showings_company ON property_showings(company_id);
CREATE INDEX IF NOT EXISTS idx_property_showings_property ON property_showings(property_id);
CREATE INDEX IF NOT EXISTS idx_property_showings_agent ON property_showings(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_showings_client ON property_showings(client_id);
CREATE INDEX IF NOT EXISTS idx_property_showings_date ON property_showings(company_id, showing_date);
CREATE INDEX IF NOT EXISTS idx_property_showings_status ON property_showings(company_id, status);

-- 4. Liquidación y Pago de Comisiones de Corretaje
CREATE TABLE IF NOT EXISTS broker_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    contract_id UUID NULL REFERENCES property_contracts(id) ON DELETE SET NULL,
    invoice_id UUID NULL REFERENCES invoices(id) ON DELETE SET NULL,
    beneficiary_type VARCHAR(30) NOT NULL CHECK (beneficiary_type IN ('agente_interno', 'corredor_externo', 'empresa', 'colaborador')),
    agent_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    external_broker_name VARCHAR(200) NULL,
    external_broker_rnc VARCHAR(20) NULL,
    total_deal_amount NUMERIC(14, 2) NOT NULL,
    commission_percentage NUMERIC(5, 2) NOT NULL,
    commission_amount NUMERIC(14, 2) NOT NULL,
    tax_withholding NUMERIC(14, 2) DEFAULT 0.00, -- Retención ISR dominicano 10% para personas físicas
    net_amount NUMERIC(14, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobada', 'pagada', 'cancelada')),
    paid_date DATE NULL,
    payment_method VARCHAR(50) NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broker_commissions_company ON broker_commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_broker_commissions_property ON broker_commissions(property_id);
CREATE INDEX IF NOT EXISTS idx_broker_commissions_contract ON broker_commissions(contract_id);
CREATE INDEX IF NOT EXISTS idx_broker_commissions_agent ON broker_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_broker_commissions_status ON broker_commissions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_broker_commissions_invoice ON broker_commissions(invoice_id);

-- Triggers de actualización automática de updated_at
CREATE TRIGGER set_updated_at_properties
BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_property_contracts
BEFORE UPDATE ON property_contracts
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_property_showings
BEFORE UPDATE ON property_showings
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_broker_commissions
BEFORE UPDATE ON broker_commissions
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_commissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS multitenant aisladas por company_id
CREATE POLICY "tenant_boundary_properties" ON properties
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "properties_all" ON properties FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_property_contracts" ON property_contracts
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "property_contracts_all" ON property_contracts FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_property_showings" ON property_showings
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "property_showings_all" ON property_showings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_broker_commissions" ON broker_commissions
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "broker_commissions_all" ON broker_commissions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
