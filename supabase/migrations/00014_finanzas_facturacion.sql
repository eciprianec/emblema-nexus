-- Migración 14: Finanzas, Facturación Tradicional, CxC, Cotizaciones y Gastos (Fase 4)

-- 1. Cotizaciones / Presupuestos
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    currency TEXT DEFAULT 'DOP' CHECK (currency IN ('DOP', 'USD')),
    exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    itbis NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'facturada', 'vencida')),
    valid_until DATE,
    terms_and_conditions TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_case ON quotes(case_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(company_id, status);

-- 2. Ítems de Cotización
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    item_type TEXT DEFAULT 'servicio' CHECK (item_type IN ('servicio', 'honorarios', 'tasa_judicial', 'tasa_catastral', 'gasto_notarial', 'otro')),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    applies_itbis BOOLEAN DEFAULT TRUE,
    itbis_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    order_index INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- 3. Facturas Tradicionales
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    ncf_type TEXT CHECK (ncf_type IN ('B01', 'B02', 'B14', 'B15', 'ninguno')) DEFAULT 'B02',
    ncf TEXT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    currency TEXT DEFAULT 'DOP' CHECK (currency IN ('DOP', 'USD')),
    exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    itbis NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'emitida', 'parcialmente_pagada', 'pagada', 'vencida', 'anulada')),
    payment_terms TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_case ON invoices(case_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(company_id, due_date);

-- 4. Ítems de Factura
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    item_type TEXT DEFAULT 'servicio' CHECK (item_type IN ('servicio', 'honorarios', 'tasa_judicial', 'tasa_catastral', 'gasto_notarial', 'otro')),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    applies_itbis BOOLEAN DEFAULT TRUE,
    itbis_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    order_index INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- 5. Recibos de Pago / Cobros de Clientes
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro')) NOT NULL,
    reference_number TEXT,
    bank_name TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'DOP' CHECK (currency IN ('DOP', 'USD')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);

-- 6. Imputación de Pagos a Facturas
CREATE TABLE IF NOT EXISTS payment_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount_applied NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_apps_payment ON payment_applications(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_invoice ON payment_applications(invoice_id);

-- 7. Gastos Operativos y de Expedientes
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    expense_number TEXT NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    supplier_name TEXT,
    supplier_rnc TEXT,
    ncf TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT CHECK (category IN ('tasas_judiciales', 'tasas_catastrales', 'gastos_notariales', 'peritajes', 'viaticos_combustible', 'suministros_oficina', 'servicios_basicos', 'honorarios_externos', 'otro')) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    itbis_paid NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'DOP' CHECK (currency IN ('DOP', 'USD')),
    payment_status TEXT CHECK (payment_status IN ('pendiente', 'pagado', 'reembolsado')) DEFAULT 'pendiente',
    is_billable_to_client BOOLEAN DEFAULT FALSE,
    is_reimbursed BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_case ON expenses(case_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(company_id, category);

-- 8. Cuentas Bancarias
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT CHECK (account_type IN ('corriente', 'ahorros')) DEFAULT 'corriente',
    currency TEXT DEFAULT 'DOP' CHECK (currency IN ('DOP', 'USD')),
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);

-- 9. Cajas Chicas
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'DOP' CHECK (currency IN ('DOP', 'USD')),
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    responsible_id UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('abierta', 'cerrada')) DEFAULT 'abierta',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_company ON cash_registers(company_id);

-- Triggers de actualización
CREATE TRIGGER set_updated_at_quotes
BEFORE UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_invoices
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_expenses
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_bank_accounts
BEFORE UPDATE ON bank_accounts
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_cash_registers
BEFORE UPDATE ON cash_registers
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Habilitar RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "tenant_boundary_quotes" ON quotes
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "quotes_all" ON quotes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "quote_items_all" ON quote_items FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_invoices" ON invoices
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "invoices_all" ON invoices FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "invoice_items_all" ON invoice_items FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_payments" ON payments
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "payments_all" ON payments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "payment_applications_all" ON payment_applications FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_expenses" ON expenses
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "expenses_all" ON expenses FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_bank_accounts" ON bank_accounts
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "bank_accounts_all" ON bank_accounts FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_cash_registers" ON cash_registers
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "cash_registers_all" ON cash_registers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
