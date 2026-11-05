-- Migración 20: Módulo de facturación
--
-- Extiende las tablas de facturas existentes para que cada comprobante guarde los
-- datos del formato e-CF de la DGII (v1.0, octubre 2025), sea cual sea el modo de
-- emisión. Las escrituras pasan por funciones transaccionales y un comprobante
-- emitido queda inmutable: se corrige con notas de crédito o débito.

-- ---------------------------------------------------------------------------
-- 0. Corrección general de seguridad
-- ---------------------------------------------------------------------------
-- Estas funciones se declararon con search_path vacío pero usan tablas sin esquema,
-- así que fallaban al ejecutarse ("relation does not exist") y, con ellas, toda
-- política RLS que las invoca.
ALTER FUNCTION get_user_company_ids() SET search_path = public, pg_temp;
ALTER FUNCTION has_permission(UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION is_admin(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION generate_case_number(UUID, UUID) SET search_path = public, pg_temp;
DO $$
DECLARE
    v_sig TEXT;
BEGIN
    SELECT p.oid::regprocedure::text INTO v_sig FROM pg_proc p
    WHERE p.proname = 'create_entity_revision' AND p.pronamespace = 'public'::regnamespace;
    IF v_sig IS NOT NULL THEN
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', v_sig);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Configuración de emisión por empresa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_settings (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    emission_mode TEXT NOT NULL DEFAULT 'ecf_externo'
        CHECK (emission_mode IN ('ecf_externo', 'ncf_interno', 'ecf_directo')),
    dgii_environment TEXT NOT NULL DEFAULT 'prod' CHECK (dgii_environment IN ('test', 'cert', 'prod')),
    rnc TEXT NOT NULL CHECK (rnc ~ '^([0-9]{9}|[0-9]{11})$'),
    legal_name TEXT NOT NULL CHECK (length(legal_name) BETWEEN 1 AND 150),
    trade_name TEXT,
    address TEXT NOT NULL CHECK (length(address) BETWEEN 1 AND 100),
    phone TEXT,
    email TEXT,
    default_due_days INT NOT NULL DEFAULT 30 CHECK (default_due_days BETWEEN 0 AND 365),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_billing_settings
BEFORE UPDATE ON billing_settings
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Rangos de secuencias autorizados por la DGII (serie B y serie E)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    prefix TEXT NOT NULL CHECK (prefix IN ('B01','B02','B03','B04','B14','B15','B16','E31','E32','E33','E34','E44','E45','E46')),
    start_number BIGINT NOT NULL CHECK (start_number > 0),
    end_number BIGINT NOT NULL,
    next_number BIGINT NOT NULL,
    expires_on DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (end_number >= start_number),
    CHECK (next_number BETWEEN start_number AND end_number + 1),
    -- Tipos 32 y 34 no llevan fecha de vencimiento en el e-CF; los demás siempre.
    CHECK (expires_on IS NOT NULL OR prefix IN ('E32', 'E34'))
);

CREATE INDEX IF NOT EXISTS idx_fiscal_sequences_lookup ON fiscal_sequences(company_id, prefix, is_active);

CREATE TRIGGER set_updated_at_fiscal_sequences
BEFORE UPDATE ON fiscal_sequences
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE OR REPLACE FUNCTION billing_guard_sequence_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.fiscal_sequences s
        WHERE s.company_id = NEW.company_id
          AND s.prefix = NEW.prefix
          AND s.id <> NEW.id
          AND s.start_number <= NEW.end_number
          AND s.end_number >= NEW.start_number
    ) THEN
        RAISE EXCEPTION 'El rango se solapa con otro ya registrado para %.', NEW.prefix;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER guard_fiscal_sequence_overlap
BEFORE INSERT OR UPDATE ON fiscal_sequences
FOR EACH ROW EXECUTE FUNCTION billing_guard_sequence_overlap();

-- ---------------------------------------------------------------------------
-- 3. Numeración interna (FAC-, NC-, ND-, REC-)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_counters (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    series TEXT NOT NULL,
    year INT NOT NULL,
    last_number INT NOT NULL DEFAULT 0,
    PRIMARY KEY (company_id, series, year)
);

-- ---------------------------------------------------------------------------
-- 4. Facturas: datos que exige el formato e-CF
-- ---------------------------------------------------------------------------
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_ncf_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_ncf_type_check CHECK (
    ncf_type IN ('B01','B02','B03','B04','B14','B15','B16','E31','E32','E33','E34','E44','E45','E46','ninguno')
);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (
    status IN ('borrador', 'emitida', 'parcialmente_pagada', 'pagada', 'vencida', 'acreditada', 'anulada')
);

-- La factura de consumo menor de RD$250,000 puede ser anónima.
ALTER TABLE invoices ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS fiscal_type TEXT,
    ADD COLUMN IF NOT EXISTS emission_mode TEXT CHECK (emission_mode IN ('ecf_externo', 'ncf_interno', 'ecf_directo')),
    ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS sequence_expires_on DATE,
    ADD COLUMN IF NOT EXISTS income_type TEXT NOT NULL DEFAULT '01' CHECK (income_type IN ('01','02','03','04','05','06')),
    ADD COLUMN IF NOT EXISTS payment_type SMALLINT NOT NULL DEFAULT 1 CHECK (payment_type IN (1, 2, 3)),
    ADD COLUMN IF NOT EXISTS payment_forms JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS buyer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS emitter_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS taxable_18 NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxable_16 NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxable_0 NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS exempt_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS non_billable_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS itbis_18 NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS itbis_16 NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS itbis_withholding_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS isr_withholding_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS itbis_withheld NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS isr_withheld NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_due NUMERIC(18, 2) NOT NULL DEFAULT 0,
    -- Suma del MontoTotal de las notas de crédito: limita cuánto más se puede acreditar.
    ADD COLUMN IF NOT EXISTS credited_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    -- Lo que esas notas bajan del saldo del cliente, neto de retenciones.
    ADD COLUMN IF NOT EXISTS credited_due NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS modifies_invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS modified_ncf TEXT,
    ADD COLUMN IF NOT EXISTS modified_ncf_date DATE,
    ADD COLUMN IF NOT EXISTS modification_code SMALLINT CHECK (modification_code BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS modification_reason TEXT CHECK (length(modification_reason) <= 90),
    ADD COLUMN IF NOT EXISTS void_reason TEXT,
    ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id);

-- Clasifica las facturas ya existentes según su serie.
UPDATE invoices SET fiscal_type = CASE ncf_type
    WHEN 'B01' THEN '31'
    WHEN 'B14' THEN '44'
    WHEN 'B15' THEN '45'
    ELSE '32'
END WHERE fiscal_type IS NULL;
UPDATE invoices SET amount_due = total WHERE amount_due = 0;

ALTER TABLE invoices ALTER COLUMN fiscal_type SET NOT NULL;
ALTER TABLE invoices ADD CONSTRAINT invoices_fiscal_type_check
    CHECK (fiscal_type IN ('31', '32', '33', '34', '44', '45', '46'));
ALTER TABLE invoices ADD CONSTRAINT invoices_notes_reference_check
    CHECK (fiscal_type NOT IN ('33', '34') OR modifies_invoice_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_company_number ON invoices(company_id, invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_company_ncf ON invoices(company_id, ncf) WHERE ncf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_modifies ON invoices(modifies_invoice_id);

-- Dependen de columnas que cambian de tipo; se recrean en la sección 8.
DROP VIEW IF EXISTS view_financial_kpis;
DROP VIEW IF EXISTS view_case_profitability;

ALTER TABLE invoice_items
    ALTER COLUMN quantity TYPE NUMERIC(18, 2),
    ALTER COLUMN unit_price TYPE NUMERIC(18, 4),
    ALTER COLUMN itbis_amount TYPE NUMERIC(18, 2),
    ALTER COLUMN total TYPE NUMERIC(18, 2),
    ADD COLUMN IF NOT EXISTS details TEXT CHECK (length(details) <= 1000),
    ADD COLUMN IF NOT EXISTS billing_indicator SMALLINT NOT NULL DEFAULT 1 CHECK (billing_indicator BETWEEN 0 AND 4),
    ADD COLUMN IF NOT EXISTS good_or_service SMALLINT NOT NULL DEFAULT 2 CHECK (good_or_service IN (1, 2)),
    ADD COLUMN IF NOT EXISTS unit_code SMALLINT,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS itbis_withheld NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS isr_withheld NUMERIC(18, 2) NOT NULL DEFAULT 0;

UPDATE invoice_items SET
    billing_indicator = CASE WHEN applies_itbis THEN 1 ELSE 4 END,
    amount = total - itbis_amount
WHERE amount = 0;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS void_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_company_receipt ON payments(company_id, receipt_number);

-- Los e-CF emitidos fuera del sistema se registran en la misma tabla que usará la emisión directa.
ALTER TABLE ecf_invoices
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'directo' CHECK (source IN ('directo', 'externo'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecf_invoices_company_encf ON ecf_invoices(company_id, encf);

-- ---------------------------------------------------------------------------
-- 5. Protección: lo emitido no se modifica
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION billing_guard_invoice()
RETURNS TRIGGER AS $$
DECLARE
    -- COALESCE: sin la variable, la comparación da NULL y el candado no se activaría.
    v_internal BOOLEAN := COALESCE(current_setting('billing.rpc', TRUE) = 'on', FALSE);
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'borrador' THEN
            RAISE EXCEPTION 'Un comprobante emitido no se puede eliminar.';
        END IF;
        RETURN OLD;
    END IF;

    IF NOT v_internal AND (OLD.status <> 'borrador' OR NEW.status <> 'borrador') THEN
        RAISE EXCEPTION 'Los comprobantes emitidos solo cambian mediante las operaciones de facturación.';
    END IF;

    IF OLD.status <> 'borrador' AND (
        (NEW.ncf, NEW.ncf_type, NEW.fiscal_type, NEW.issue_date, NEW.client_id, NEW.currency, NEW.exchange_rate,
         NEW.subtotal, NEW.itbis, NEW.discount, NEW.total, NEW.amount_due, NEW.taxable_18, NEW.taxable_16,
         NEW.taxable_0, NEW.exempt_amount, NEW.non_billable_amount, NEW.itbis_18, NEW.itbis_16, NEW.itbis_withheld,
         NEW.isr_withheld, NEW.buyer_snapshot, NEW.emitter_snapshot, NEW.modified_ncf, NEW.modification_code,
         NEW.income_type, NEW.payment_type, NEW.invoice_number, NEW.company_id)
        IS DISTINCT FROM
        (OLD.ncf, OLD.ncf_type, OLD.fiscal_type, OLD.issue_date, OLD.client_id, OLD.currency, OLD.exchange_rate,
         OLD.subtotal, OLD.itbis, OLD.discount, OLD.total, OLD.amount_due, OLD.taxable_18, OLD.taxable_16,
         OLD.taxable_0, OLD.exempt_amount, OLD.non_billable_amount, OLD.itbis_18, OLD.itbis_16, OLD.itbis_withheld,
         OLD.isr_withheld, OLD.buyer_snapshot, OLD.emitter_snapshot, OLD.modified_ncf, OLD.modification_code,
         OLD.income_type, OLD.payment_type, OLD.invoice_number, OLD.company_id)
    ) THEN
        RAISE EXCEPTION 'Los datos fiscales de un comprobante emitido son inmutables; emita una nota de crédito o débito.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER guard_invoice_immutability
BEFORE UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION billing_guard_invoice();

CREATE OR REPLACE FUNCTION billing_guard_invoice_item()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT i.status INTO v_status FROM public.invoices i
    WHERE i.id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Sin factura madre: es el borrado en cascada de un borrador.
    IF FOUND AND v_status <> 'borrador' THEN
        RAISE EXCEPTION 'Las líneas de un comprobante emitido no se pueden modificar.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER guard_invoice_item_immutability
BEFORE INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION billing_guard_invoice_item();

-- ---------------------------------------------------------------------------
-- 6. Operaciones transaccionales
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION billing_require(p_company_id UUID, p_permissions TEXT[])
RETURNS VOID AS $$
DECLARE
    v_perm TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión.' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.get_user_company_ids() c WHERE c = p_company_id) THEN
        RAISE EXCEPTION 'No perteneces a esta empresa.' USING ERRCODE = '42501';
    END IF;
    FOREACH v_perm IN ARRAY p_permissions LOOP
        IF public.has_permission(p_company_id, v_perm) THEN
            RETURN;
        END IF;
    END LOOP;
    RAISE EXCEPTION 'No tienes permiso para esta operación (%).', array_to_string(p_permissions, ' o ') USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION billing_today()
RETURNS DATE AS $$
    SELECT (now() AT TIME ZONE 'America/Santo_Domingo')::date;
$$ LANGUAGE sql STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION billing_next_number(p_company_id UUID, p_series TEXT)
RETURNS TEXT AS $$
DECLARE
    v_year INT := EXTRACT(YEAR FROM public.billing_today());
    v_next INT;
BEGIN
    INSERT INTO public.billing_counters AS c (company_id, series, year, last_number)
    VALUES (p_company_id, p_series, v_year, 1)
    ON CONFLICT (company_id, series, year)
    DO UPDATE SET last_number = c.last_number + 1
    RETURNING last_number INTO v_next;
    RETURN p_series || '-' || v_year || '-' || lpad(v_next::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Crea o reemplaza un borrador con sus líneas en una sola transacción.
CREATE OR REPLACE FUNCTION billing_save_draft(
    p_company_id UUID,
    p_invoice_id UUID,
    p_header JSONB,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_id UUID := p_invoice_id;
    v_status TEXT;
    v_client UUID := NULLIF(p_header->>'client_id', '')::uuid;
    v_modifies UUID := NULLIF(p_header->>'modifies_invoice_id', '')::uuid;
    v_type TEXT := p_header->>'fiscal_type';
    v_series TEXT := CASE v_type WHEN '33' THEN 'ND' WHEN '34' THEN 'NC' ELSE 'FAC' END;
BEGIN
    PERFORM public.billing_require(p_company_id, ARRAY['finance.create', 'finance.edit']);
    PERFORM set_config('billing.rpc', 'on', TRUE);

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El comprobante debe tener al menos una línea.';
    END IF;

    IF v_client IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.clients c WHERE c.id = v_client AND c.company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'El cliente no pertenece a esta empresa.';
    END IF;

    IF v_modifies IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.invoices m
        WHERE m.id = v_modifies AND m.company_id = p_company_id AND m.ncf IS NOT NULL
          AND m.status <> 'anulada' AND m.fiscal_type NOT IN ('33', '34')
    ) THEN
        RAISE EXCEPTION 'El comprobante a modificar no existe o no está emitido.';
    END IF;

    IF v_id IS NULL THEN
        INSERT INTO public.invoices (
            company_id, invoice_number, status, created_by, fiscal_type, ncf_type, client_id, case_id, quote_id,
            issue_date, due_date, currency, exchange_rate, income_type, payment_type, payment_forms, payment_terms,
            notes, buyer_snapshot, subtotal, itbis, discount, total, paid_amount, balance_due, amount_due,
            taxable_18, taxable_16, taxable_0, exempt_amount, non_billable_amount, itbis_18, itbis_16,
            itbis_withholding_rate, isr_withholding_rate, itbis_withheld, isr_withheld,
            modifies_invoice_id, modification_code, modification_reason
        ) VALUES (
            p_company_id, public.billing_next_number(p_company_id, v_series), 'borrador', auth.uid(), v_type,
            'ninguno', v_client, NULLIF(p_header->>'case_id', '')::uuid, NULLIF(p_header->>'quote_id', '')::uuid,
            (p_header->>'issue_date')::date, (p_header->>'due_date')::date, p_header->>'currency',
            (p_header->>'exchange_rate')::numeric, p_header->>'income_type', (p_header->>'payment_type')::smallint,
            COALESCE(p_header->'payment_forms', '[]'::jsonb), p_header->>'payment_terms', p_header->>'notes',
            COALESCE(p_header->'buyer_snapshot', '{}'::jsonb), (p_header->>'subtotal')::numeric,
            (p_header->>'itbis')::numeric, (p_header->>'discount')::numeric, (p_header->>'total')::numeric,
            0, (p_header->>'amount_due')::numeric, (p_header->>'amount_due')::numeric,
            (p_header->>'taxable_18')::numeric, (p_header->>'taxable_16')::numeric, (p_header->>'taxable_0')::numeric,
            (p_header->>'exempt_amount')::numeric, (p_header->>'non_billable_amount')::numeric,
            (p_header->>'itbis_18')::numeric, (p_header->>'itbis_16')::numeric,
            (p_header->>'itbis_withholding_rate')::numeric, (p_header->>'isr_withholding_rate')::numeric,
            (p_header->>'itbis_withheld')::numeric, (p_header->>'isr_withheld')::numeric,
            v_modifies, (p_header->>'modification_code')::smallint, p_header->>'modification_reason'
        ) RETURNING id INTO v_id;
    ELSE
        SELECT i.status INTO v_status FROM public.invoices i
        WHERE i.id = v_id AND i.company_id = p_company_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Comprobante no encontrado.';
        END IF;
        IF v_status <> 'borrador' THEN
            RAISE EXCEPTION 'Solo se pueden editar los borradores.';
        END IF;

        UPDATE public.invoices SET
            fiscal_type = v_type, client_id = v_client,
            case_id = NULLIF(p_header->>'case_id', '')::uuid,
            issue_date = (p_header->>'issue_date')::date, due_date = (p_header->>'due_date')::date,
            currency = p_header->>'currency', exchange_rate = (p_header->>'exchange_rate')::numeric,
            income_type = p_header->>'income_type', payment_type = (p_header->>'payment_type')::smallint,
            payment_forms = COALESCE(p_header->'payment_forms', '[]'::jsonb),
            payment_terms = p_header->>'payment_terms', notes = p_header->>'notes',
            buyer_snapshot = COALESCE(p_header->'buyer_snapshot', '{}'::jsonb),
            subtotal = (p_header->>'subtotal')::numeric, itbis = (p_header->>'itbis')::numeric,
            discount = (p_header->>'discount')::numeric, total = (p_header->>'total')::numeric,
            balance_due = (p_header->>'amount_due')::numeric, amount_due = (p_header->>'amount_due')::numeric,
            taxable_18 = (p_header->>'taxable_18')::numeric, taxable_16 = (p_header->>'taxable_16')::numeric,
            taxable_0 = (p_header->>'taxable_0')::numeric, exempt_amount = (p_header->>'exempt_amount')::numeric,
            non_billable_amount = (p_header->>'non_billable_amount')::numeric,
            itbis_18 = (p_header->>'itbis_18')::numeric, itbis_16 = (p_header->>'itbis_16')::numeric,
            itbis_withholding_rate = (p_header->>'itbis_withholding_rate')::numeric,
            isr_withholding_rate = (p_header->>'isr_withholding_rate')::numeric,
            itbis_withheld = (p_header->>'itbis_withheld')::numeric, isr_withheld = (p_header->>'isr_withheld')::numeric,
            modifies_invoice_id = v_modifies, modification_code = (p_header->>'modification_code')::smallint,
            modification_reason = p_header->>'modification_reason'
        WHERE id = v_id;

        DELETE FROM public.invoice_items WHERE invoice_id = v_id;
    END IF;

    INSERT INTO public.invoice_items (
        invoice_id, description, details, item_type, quantity, unit_price, unit_code, applies_itbis,
        billing_indicator, good_or_service, discount_amount, amount, itbis_amount, total,
        itbis_withheld, isr_withheld, order_index
    )
    SELECT
        v_id, it->>'description', it->>'details', COALESCE(it->>'item_type', 'servicio'),
        (it->>'quantity')::numeric, (it->>'unit_price')::numeric, (it->>'unit_code')::smallint,
        (it->>'billing_indicator')::smallint IN (1, 2), (it->>'billing_indicator')::smallint,
        (it->>'good_or_service')::smallint, (it->>'discount_amount')::numeric, (it->>'amount')::numeric,
        (it->>'itbis_amount')::numeric, (it->>'total')::numeric, (it->>'itbis_withheld')::numeric,
        (it->>'isr_withheld')::numeric, ord::int
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(it, ord);

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION billing_delete_draft(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_company UUID;
BEGIN
    SELECT company_id INTO v_company FROM public.invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no encontrado.';
    END IF;
    PERFORM public.billing_require(v_company, ARRAY['finance.create', 'finance.edit']);
    DELETE FROM public.invoices WHERE id = p_invoice_id AND status = 'borrador';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solo se pueden eliminar los borradores.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recalcula saldo y estado a partir de lo cobrado y lo acreditado.
CREATE OR REPLACE FUNCTION billing_refresh_balance(p_invoice_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.invoices i SET
        balance_due = GREATEST(0, i.amount_due - i.paid_amount - i.credited_due),
        status = CASE
            WHEN GREATEST(0, i.amount_due - i.paid_amount - i.credited_due) = 0 THEN
                CASE WHEN i.paid_amount > 0 THEN 'pagada' ELSE 'acreditada' END
            WHEN i.paid_amount > 0 THEN 'parcialmente_pagada'
            ELSE 'emitida'
        END
    WHERE i.id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Emite un borrador: valida el cuadre, fija los datos y obtiene el número fiscal.
CREATE OR REPLACE FUNCTION billing_issue_invoice(
    p_invoice_id UUID,
    p_encf TEXT DEFAULT NULL,
    p_security_code TEXT DEFAULT NULL,
    p_signed_at TIMESTAMPTZ DEFAULT NULL,
    p_track_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_inv public.invoices%ROWTYPE;
    v_parent public.invoices%ROWTYPE;
    v_settings public.billing_settings%ROWTYPE;
    v_seq public.fiscal_sequences%ROWTYPE;
    v_today DATE := public.billing_today();
    v_prefix TEXT;
    v_number TEXT;
    v_expires DATE;
    v_status TEXT := 'emitida';
    v_balance NUMERIC;
    v_total_dop NUMERIC;
    v_sum_amount NUMERIC;
    v_sum_itbis NUMERIC;
    v_bad_lines INT;
    v_buyer_id TEXT;
    v_buyer_name TEXT;
    v_buyer_foreign TEXT;
BEGIN
    SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no encontrado.';
    END IF;
    PERFORM public.billing_require(v_inv.company_id, ARRAY['finance.create', 'ecf.emit']);
    PERFORM set_config('billing.rpc', 'on', TRUE);

    IF v_inv.status <> 'borrador' THEN
        RAISE EXCEPTION 'El comprobante % ya fue emitido.', v_inv.invoice_number;
    END IF;

    SELECT * INTO v_settings FROM public.billing_settings WHERE company_id = v_inv.company_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configura los datos fiscales de la empresa antes de emitir.';
    END IF;
    IF v_settings.emission_mode = 'ecf_directo' THEN
        RAISE EXCEPTION 'La emisión directa de e-CF aún no está disponible.';
    END IF;
    IF v_inv.issue_date > v_today THEN
        RAISE EXCEPTION 'La fecha de emisión no puede ser futura.';
    END IF;

    -- Verificación independiente del cuadre: la base de datos no confía en los totales recibidos.
    SELECT COUNT(*) FILTER (
               WHERE round(quantity * unit_price, 2) - discount_amount <> amount
                  OR amount + itbis_amount <> total
                  OR amount < 0
           ),
           COALESCE(SUM(amount) FILTER (WHERE billing_indicator <> 0), 0),
           COALESCE(SUM(itbis_amount), 0)
    INTO v_bad_lines, v_sum_amount, v_sum_itbis
    FROM public.invoice_items WHERE invoice_id = p_invoice_id;

    IF NOT EXISTS (SELECT 1 FROM public.invoice_items WHERE invoice_id = p_invoice_id) THEN
        RAISE EXCEPTION 'El comprobante debe tener al menos una línea.';
    END IF;
    IF v_bad_lines > 0
        OR v_sum_amount <> v_inv.subtotal
        OR v_sum_itbis <> v_inv.itbis
        OR v_inv.itbis_18 <> round(v_inv.taxable_18 * 0.18, 2)
        OR v_inv.itbis_16 <> round(v_inv.taxable_16 * 0.16, 2)
        OR v_inv.itbis <> v_inv.itbis_18 + v_inv.itbis_16
        OR v_inv.subtotal <> v_inv.taxable_18 + v_inv.taxable_16 + v_inv.taxable_0 + v_inv.exempt_amount
        OR v_inv.total <> v_inv.subtotal + v_inv.itbis
        OR v_inv.amount_due <> v_inv.total + v_inv.non_billable_amount - v_inv.itbis_withheld - v_inv.isr_withheld
    THEN
        RAISE EXCEPTION 'Los montos del comprobante % no cuadran; revísalo y guárdalo de nuevo.', v_inv.invoice_number;
    END IF;

    -- Comprador: se fija aquí desde la base de datos, no desde lo que envió el navegador.
    IF v_inv.fiscal_type IN ('33', '34') THEN
        SELECT i.buyer_snapshot INTO v_inv.buyer_snapshot FROM public.invoices i
        WHERE i.id = v_inv.modifies_invoice_id AND i.company_id = v_inv.company_id;
    ELSIF v_inv.client_id IS NOT NULL THEN
        SELECT jsonb_strip_nulls(jsonb_build_object(
            'taxId', NULLIF(regexp_replace(COALESCE(NULLIF(c.rnc, ''), c.cedula, ''), '[^0-9]', '', 'g'), ''),
            'foreignId', CASE WHEN COALESCE(c.rnc, c.cedula, '') = '' THEN NULLIF(c.passport, '') END,
            'name', COALESCE(NULLIF(c.business_name, ''), NULLIF(trim(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), '')),
            'address', NULLIF(c.address, ''),
            'email', NULLIF(c.email, '')
        )) INTO v_inv.buyer_snapshot
        FROM public.clients c WHERE c.id = v_inv.client_id AND c.company_id = v_inv.company_id;
    END IF;

    v_buyer_id := NULLIF(v_inv.buyer_snapshot->>'taxId', '');
    v_buyer_name := NULLIF(v_inv.buyer_snapshot->>'name', '');
    v_buyer_foreign := NULLIF(v_inv.buyer_snapshot->>'foreignId', '');
    v_total_dop := v_inv.total * CASE WHEN v_inv.currency = 'DOP' THEN 1 ELSE COALESCE(v_inv.exchange_rate, 0) END;

    IF v_inv.fiscal_type IN ('31', '45') AND (v_buyer_id IS NULL OR v_buyer_name IS NULL) THEN
        RAISE EXCEPTION 'Este tipo de comprobante requiere RNC/cédula y razón social del comprador.';
    END IF;
    IF v_inv.fiscal_type = '32' AND v_total_dop >= 250000
        AND (v_buyer_name IS NULL OR (v_buyer_id IS NULL AND v_buyer_foreign IS NULL)) THEN
        RAISE EXCEPTION 'Desde RD$250,000.00 la factura de consumo debe identificar al comprador.';
    END IF;

    -- Notas: datos de referencia tomados del comprobante original, no del formulario.
    IF v_inv.fiscal_type IN ('33', '34') THEN
        SELECT * INTO v_parent FROM public.invoices
        WHERE id = v_inv.modifies_invoice_id AND company_id = v_inv.company_id FOR UPDATE;
        IF NOT FOUND OR v_parent.ncf IS NULL OR v_parent.status = 'anulada' THEN
            RAISE EXCEPTION 'El comprobante a modificar no existe o no está vigente.';
        END IF;
        IF v_inv.modification_code NOT IN (1, 2, 3) OR COALESCE(v_inv.modification_reason, '') = '' THEN
            RAISE EXCEPTION 'La nota requiere código (1, 2 o 3) y razón de modificación.';
        END IF;
        IF v_inv.issue_date < v_parent.issue_date THEN
            RAISE EXCEPTION 'La nota no puede ser anterior al comprobante que modifica.';
        END IF;
        IF v_inv.currency <> v_parent.currency THEN
            RAISE EXCEPTION 'La nota debe estar en la misma moneda del comprobante que modifica.';
        END IF;
        IF v_inv.fiscal_type = '34' AND v_inv.total > v_parent.total - v_parent.credited_amount THEN
            RAISE EXCEPTION 'La nota supera lo acreditable del comprobante (%).', v_parent.total - v_parent.credited_amount;
        END IF;
    END IF;

    -- Número fiscal según el modo de emisión de la empresa
    IF v_settings.emission_mode = 'ncf_interno' THEN
        v_prefix := 'B' || CASE v_inv.fiscal_type
            WHEN '31' THEN '01' WHEN '32' THEN '02' WHEN '33' THEN '03' WHEN '34' THEN '04'
            WHEN '44' THEN '14' WHEN '45' THEN '15' WHEN '46' THEN '16' END;

        SELECT * INTO v_seq FROM public.fiscal_sequences
        WHERE company_id = v_inv.company_id AND prefix = v_prefix AND is_active
          AND next_number <= end_number AND (expires_on IS NULL OR expires_on >= v_today)
        ORDER BY start_number
        LIMIT 1
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No hay un rango autorizado vigente para %.', v_prefix;
        END IF;

        v_number := v_prefix || lpad(v_seq.next_number::text, 8, '0');
        v_expires := v_seq.expires_on;
        UPDATE public.fiscal_sequences SET next_number = next_number + 1 WHERE id = v_seq.id;
    ELSE
        v_prefix := 'E' || v_inv.fiscal_type;
        IF COALESCE(p_encf, '') !~ ('^' || v_prefix || '[0-9]{10}$') THEN
            RAISE EXCEPTION 'El e-NCF debe tener 13 posiciones e iniciar con %.', v_prefix;
        END IF;
        IF COALESCE(p_security_code, '') !~ '^[0-9A-Za-z]{6}$' THEN
            RAISE EXCEPTION 'El código de seguridad debe tener 6 caracteres alfanuméricos.';
        END IF;
        IF p_signed_at IS NULL OR p_signed_at > now() THEN
            RAISE EXCEPTION 'Indica la fecha y hora de firma del e-CF; no puede ser futura.';
        END IF;
        IF EXISTS (SELECT 1 FROM public.invoices WHERE company_id = v_inv.company_id AND ncf = p_encf) THEN
            RAISE EXCEPTION 'El e-NCF % ya está registrado en otro comprobante.', p_encf;
        END IF;
        v_number := p_encf;

        INSERT INTO public.ecf_invoices (
            company_id, invoice_id, encf, ecf_type, environment, security_code, sign_date,
            track_id, dgii_status, source, created_by
        ) VALUES (
            v_inv.company_id, v_inv.id, p_encf, v_prefix,
            CASE v_settings.dgii_environment WHEN 'prod' THEN 'PROD' WHEN 'cert' THEN 'CERT' ELSE 'DEV' END,
            upper(p_security_code), p_signed_at, NULLIF(p_track_id, ''), 'enviado', 'externo', auth.uid()
        );
    END IF;

    v_balance := CASE WHEN v_inv.fiscal_type = '34' THEN 0 ELSE v_inv.amount_due END;
    IF v_inv.fiscal_type <> '34' AND v_balance = 0 THEN
        v_status := 'pagada';
    END IF;

    UPDATE public.invoices SET
        status = v_status,
        ncf = v_number,
        ncf_type = v_prefix,
        emission_mode = v_settings.emission_mode,
        issued_at = now(),
        issued_by = auth.uid(),
        sequence_expires_on = v_expires,
        balance_due = v_balance,
        buyer_snapshot = v_inv.buyer_snapshot,
        modified_ncf = v_parent.ncf,
        modified_ncf_date = v_parent.issue_date,
        emitter_snapshot = jsonb_build_object(
            'rnc', v_settings.rnc, 'legalName', v_settings.legal_name, 'tradeName', v_settings.trade_name,
            'address', v_settings.address, 'phone', v_settings.phone, 'email', v_settings.email
        )
    WHERE id = p_invoice_id;

    IF v_inv.fiscal_type = '34' THEN
        UPDATE public.invoices SET
            credited_amount = credited_amount + v_inv.total,
            credited_due = credited_due + v_inv.amount_due
        WHERE id = v_parent.id;
        PERFORM public.billing_refresh_balance(v_parent.id);
    END IF;

    RETURN p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Solo el NCF tradicional se anula directamente; un e-CF se anula con nota de crédito (código 1).
CREATE OR REPLACE FUNCTION billing_void_invoice(p_invoice_id UUID, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
    v_inv public.invoices%ROWTYPE;
BEGIN
    SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no encontrado.';
    END IF;
    PERFORM public.billing_require(v_inv.company_id, ARRAY['finance.void']);
    PERFORM set_config('billing.rpc', 'on', TRUE);

    IF COALESCE(trim(p_reason), '') = '' THEN
        RAISE EXCEPTION 'Indica el motivo de la anulación.';
    END IF;
    IF v_inv.status IN ('borrador', 'anulada') THEN
        RAISE EXCEPTION 'Este comprobante no se puede anular.';
    END IF;
    IF v_inv.emission_mode <> 'ncf_interno' THEN
        RAISE EXCEPTION 'Un e-CF no se anula: emite una nota de crédito con código 1.';
    END IF;
    IF v_inv.paid_amount > 0 OR v_inv.credited_amount > 0 THEN
        RAISE EXCEPTION 'No se puede anular un comprobante con cobros o notas de crédito.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.invoices n
        WHERE n.modifies_invoice_id = p_invoice_id AND n.status <> 'borrador' AND n.status <> 'anulada'
    ) THEN
        RAISE EXCEPTION 'No se puede anular un comprobante con notas emitidas.';
    END IF;

    UPDATE public.invoices SET
        status = 'anulada', balance_due = 0, void_reason = trim(p_reason), voided_at = now(), voided_by = auth.uid()
    WHERE id = p_invoice_id;

    -- Al anular una nota de crédito, la factura original recupera ese saldo.
    IF v_inv.fiscal_type = '34' THEN
        PERFORM 1 FROM public.invoices WHERE id = v_inv.modifies_invoice_id FOR UPDATE;
        UPDATE public.invoices SET
            credited_amount = credited_amount - v_inv.total,
            credited_due = credited_due - v_inv.amount_due
        WHERE id = v_inv.modifies_invoice_id;
        PERFORM public.billing_refresh_balance(v_inv.modifies_invoice_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION billing_register_payment(
    p_invoice_id UUID,
    p_amount NUMERIC,
    p_payment_date DATE,
    p_method TEXT,
    p_reference TEXT DEFAULT NULL,
    p_bank_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_inv public.invoices%ROWTYPE;
    v_payment_id UUID;
BEGIN
    SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no encontrado.';
    END IF;
    PERFORM public.billing_require(v_inv.company_id, ARRAY['receivables.collect', 'finance.create']);
    PERFORM set_config('billing.rpc', 'on', TRUE);

    IF v_inv.status NOT IN ('emitida', 'parcialmente_pagada', 'vencida') OR v_inv.fiscal_type = '34' THEN
        RAISE EXCEPTION 'Este comprobante no admite cobros.';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN
        RAISE EXCEPTION 'El monto debe ser positivo y tener hasta 2 decimales.';
    END IF;
    IF p_amount > v_inv.balance_due THEN
        RAISE EXCEPTION 'El cobro (%) supera el saldo pendiente (%).', p_amount, v_inv.balance_due;
    END IF;
    IF p_payment_date < v_inv.issue_date OR p_payment_date > public.billing_today() THEN
        RAISE EXCEPTION 'La fecha del cobro debe estar entre la emisión y hoy.';
    END IF;

    INSERT INTO public.payments (
        company_id, receipt_number, client_id, payment_date, payment_method, reference_number,
        bank_name, amount, currency, notes, created_by
    ) VALUES (
        v_inv.company_id, public.billing_next_number(v_inv.company_id, 'REC'), v_inv.client_id, p_payment_date,
        p_method, NULLIF(p_reference, ''), NULLIF(p_bank_name, ''), p_amount, v_inv.currency, NULLIF(p_notes, ''), auth.uid()
    ) RETURNING id INTO v_payment_id;

    INSERT INTO public.payment_applications (payment_id, invoice_id, amount_applied)
    VALUES (v_payment_id, p_invoice_id, p_amount);

    UPDATE public.invoices SET paid_amount = paid_amount + p_amount WHERE id = p_invoice_id;
    PERFORM public.billing_refresh_balance(p_invoice_id);

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION billing_void_payment(p_payment_id UUID, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
    v_payment public.payments%ROWTYPE;
    v_app RECORD;
BEGIN
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cobro no encontrado.';
    END IF;
    PERFORM public.billing_require(v_payment.company_id, ARRAY['receivables.void', 'finance.void']);
    PERFORM set_config('billing.rpc', 'on', TRUE);

    IF v_payment.voided_at IS NOT NULL THEN
        RAISE EXCEPTION 'Este cobro ya fue anulado.';
    END IF;
    IF COALESCE(trim(p_reason), '') = '' THEN
        RAISE EXCEPTION 'Indica el motivo de la anulación.';
    END IF;

    UPDATE public.payments SET voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
    WHERE id = p_payment_id;

    FOR v_app IN
        SELECT invoice_id, amount_applied FROM public.payment_applications
        WHERE payment_id = p_payment_id ORDER BY invoice_id
    LOOP
        PERFORM 1 FROM public.invoices WHERE id = v_app.invoice_id FOR UPDATE;
        UPDATE public.invoices SET paid_amount = paid_amount - v_app.amount_applied WHERE id = v_app.invoice_id;
        PERFORM public.billing_refresh_balance(v_app.invoice_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Resumen en pesos, calculado en la base para no depender del límite de filas de la API.
-- Corre con los permisos del usuario, de modo que RLS aplica.
CREATE OR REPLACE FUNCTION billing_summary(p_company_id UUID)
RETURNS TABLE (
    invoiced_this_month NUMERIC,
    collectible NUMERIC,
    overdue NUMERIC,
    overdue_count BIGINT,
    draft_count BIGINT
) AS $$
    SELECT
        COALESCE(SUM(i.total * COALESCE(i.exchange_rate, 1) * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END) FILTER (
            WHERE i.status NOT IN ('borrador', 'anulada')
              AND date_trunc('month', i.issue_date) = date_trunc('month', public.billing_today())
        ), 0),
        COALESCE(SUM(i.balance_due * COALESCE(i.exchange_rate, 1)) FILTER (
            WHERE i.status IN ('emitida', 'parcialmente_pagada', 'vencida')
        ), 0),
        COALESCE(SUM(i.balance_due * COALESCE(i.exchange_rate, 1)) FILTER (
            WHERE i.status IN ('emitida', 'parcialmente_pagada', 'vencida')
              AND i.payment_type = 2 AND i.balance_due > 0 AND i.due_date < public.billing_today()
        ), 0),
        COUNT(*) FILTER (
            WHERE i.status IN ('emitida', 'parcialmente_pagada', 'vencida')
              AND i.payment_type = 2 AND i.balance_due > 0 AND i.due_date < public.billing_today()
        ),
        COUNT(*) FILTER (WHERE i.status = 'borrador')
    FROM public.invoices i
    WHERE i.company_id = p_company_id;
$$ LANGUAGE sql STABLE SET search_path = '';

-- Las funciones no se exponen a visitantes sin sesión.
DO $$
DECLARE
    v_fn TEXT;
BEGIN
    FOREACH v_fn IN ARRAY ARRAY[
        'billing_require(uuid, text[])',
        'billing_next_number(uuid, text)',
        'billing_refresh_balance(uuid)',
        'billing_save_draft(uuid, uuid, jsonb, jsonb)',
        'billing_delete_draft(uuid)',
        'billing_issue_invoice(uuid, text, text, timestamptz, text)',
        'billing_void_invoice(uuid, text)',
        'billing_register_payment(uuid, numeric, date, text, text, text, text)',
        'billing_void_payment(uuid, text)',
        'billing_summary(uuid)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', v_fn);
    END LOOP;
    -- Internas: solo se invocan desde las demás funciones.
    REVOKE ALL ON FUNCTION public.billing_next_number(uuid, text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.billing_refresh_balance(uuid) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.billing_save_draft(uuid, uuid, jsonb, jsonb) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.billing_delete_draft(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.billing_issue_invoice(uuid, text, text, timestamptz, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.billing_void_invoice(uuid, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.billing_register_payment(uuid, numeric, date, text, text, text, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.billing_void_payment(uuid, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.billing_summary(uuid) TO authenticated;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Seguridad de filas
-- ---------------------------------------------------------------------------
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_settings_tenant" ON billing_settings AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "billing_settings_select" ON billing_settings FOR SELECT TO authenticated
    USING (has_permission(company_id, 'finance.view'));
CREATE POLICY "billing_settings_write" ON billing_settings FOR ALL TO authenticated
    USING (has_permission(company_id, 'config.manage'))
    WITH CHECK (has_permission(company_id, 'config.manage'));

CREATE POLICY "fiscal_sequences_tenant" ON fiscal_sequences AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "fiscal_sequences_select" ON fiscal_sequences FOR SELECT TO authenticated
    USING (has_permission(company_id, 'finance.view'));
CREATE POLICY "fiscal_sequences_write" ON fiscal_sequences FOR ALL TO authenticated
    USING (has_permission(company_id, 'config.manage'))
    WITH CHECK (has_permission(company_id, 'config.manage'));

-- billing_counters queda sin políticas: solo lo tocan las funciones de facturación.

-- Antes, cualquier usuario autenticado podía leer y alterar las líneas de otras empresas
-- (USING TRUE sin frontera de empresa). Ahora las escrituras pasan por las funciones.
DROP POLICY IF EXISTS "invoices_all" ON invoices;
DROP POLICY IF EXISTS "invoice_items_all" ON invoice_items;
DROP POLICY IF EXISTS "payments_all" ON payments;
DROP POLICY IF EXISTS "payment_applications_all" ON payment_applications;

CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated
    USING (has_permission(company_id, 'finance.view') OR has_permission(company_id, 'receivables.view'));

CREATE POLICY "invoice_items_select" ON invoice_items FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id));

CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated
    USING (has_permission(company_id, 'finance.view') OR has_permission(company_id, 'receivables.view'));

CREATE POLICY "payment_applications_select" ON payment_applications FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM payments p WHERE p.id = payment_applications.payment_id));

-- Rol Contabilidad: solo Administrador tenía permisos asignados.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
    'finance.view', 'finance.create', 'finance.edit', 'finance.void',
    'receivables.view', 'receivables.create', 'receivables.collect', 'receivables.void',
    'ecf.view', 'ecf.create', 'ecf.emit', 'clients.view'
)
WHERE r.name = 'Contabilidad' AND r.is_system = TRUE
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Vistas: las notas de crédito restan, y los datos respetan a la empresa del usuario
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_financial_kpis AS
SELECT 
    c.id AS company_id,
    c.name AS company_name,
    c.rnc AS company_rnc,
    
    -- Facturación tradicional emitida (excluye borradores y anuladas)
    COALESCE(inv.total_invoiced, 0.00) AS total_invoiced,
    
    -- Facturación e-CF (comprobantes electrónicos fiscales E31, E32, etc.)
    COALESCE(inv.total_ecf_invoiced, 0.00) AS total_ecf_invoiced,
    
    -- Recaudos / Cobros recibidos
    COALESCE(pay.total_collected, 0.00) AS total_collected,
    
    -- ITBIS fiscal total facturado
    COALESCE(inv.total_itbis, 0.00) AS total_itbis,
    
    -- Saldo pendiente en Cuentas por Cobrar (CxC)
    COALESCE(inv.total_outstanding, 0.00) AS total_outstanding,
    
    -- Total Gastos operativos y de expedientes
    COALESCE(exp.total_expenses, 0.00) AS total_expenses,
    
    -- ITBIS Pagado en gastos/compras (Crédito Fiscal)
    COALESCE(exp.total_expenses_itbis, 0.00) AS total_expenses_itbis,
    
    -- Beneficio Neto Estimado (Facturación - Gastos)
    (COALESCE(inv.total_invoiced, 0.00) - COALESCE(exp.total_expenses, 0.00)) AS net_profit,
    
    -- Margen Operativo (%)
    CASE 
        WHEN COALESCE(inv.total_invoiced, 0.00) > 0 THEN
            ROUND(((COALESCE(inv.total_invoiced, 0.00) - COALESCE(exp.total_expenses, 0.00)) / inv.total_invoiced) * 100, 2)
        ELSE 0.00
    END AS operational_margin_percentage
FROM companies c
LEFT JOIN (
    SELECT 
        i.company_id,
        SUM(i.total * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END) FILTER (WHERE i.status NOT IN ('borrador', 'anulada')) AS total_invoiced,
        SUM(i.total * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END) FILTER (
            WHERE i.status NOT IN ('borrador', 'anulada') 
            AND (i.ncf LIKE 'E%' OR EXISTS (
                SELECT 1 FROM ecf_invoices ei 
                WHERE ei.invoice_id = i.id 
                AND ei.dgii_status NOT IN ('rechazado', 'anulado')
            ))
        ) AS total_ecf_invoiced,
        SUM(i.itbis * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END) FILTER (WHERE i.status NOT IN ('borrador', 'anulada')) AS total_itbis,
        SUM(i.balance_due) FILTER (WHERE i.status IN ('emitida', 'parcialmente_pagada', 'vencida')) AS total_outstanding
    FROM invoices i
    GROUP BY i.company_id
) inv ON inv.company_id = c.id
LEFT JOIN (
    SELECT 
        p.company_id,
        SUM(p.amount) AS total_collected
    FROM payments p
    WHERE p.voided_at IS NULL
    GROUP BY p.company_id
) pay ON pay.company_id = c.id
LEFT JOIN (
    SELECT 
        e.company_id,
        SUM(e.total_amount) AS total_expenses,
        SUM(e.itbis_paid) AS total_expenses_itbis
    FROM expenses e
    GROUP BY e.company_id
) exp ON exp.company_id = c.id;


-- Vista 2: Rentabilidad por Expediente (Casos Legales y de Agrimensura)
CREATE OR REPLACE VIEW view_case_profitability AS
SELECT 
    ca.id AS case_id,
    ca.company_id,
    ca.case_number,
    ca.title AS case_title,
    ca.status AS case_status,
    ca.priority,
    ca.client_id,
    TRIM(CONCAT(cl.first_name, ' ', COALESCE(cl.last_name, ''))) AS client_name,
    cl.business_name AS client_business_name,
    cl.rnc AS client_rnc,
    cl.cedula AS client_cedula,
    ca.responsible_id,
    TRIM(CONCAT(pr.first_name, ' ', COALESCE(pr.last_name, ''))) AS responsible_name,
    sa.name AS area_name,
    sa.code AS area_code,
    
    -- Ingresos facturados al caso
    COALESCE(inv.total_billed, 0.00) AS total_billed,
    COALESCE(inv.fees_billed, 0.00) AS fees_billed,
    COALESCE(inv.other_billed, 0.00) AS other_billed,
    
    -- Gastos imputados al caso desagregados por categoría legal y técnica
    COALESCE(exp.total_expenses, 0.00) AS total_expenses,
    COALESCE(exp.judicial_fees, 0.00) AS judicial_expenses,
    COALESCE(exp.cadastral_fees, 0.00) AS cadastral_expenses,
    COALESCE(exp.notary_fees, 0.00) AS notary_expenses,
    COALESCE(exp.expert_fees, 0.00) AS expert_expenses,
    COALESCE(exp.travel_fees, 0.00) AS travel_expenses,
    COALESCE(exp.other_expenses, 0.00) AS other_expenses,
    
    -- Beneficio Neto y Margen de Rentabilidad
    (COALESCE(inv.total_billed, 0.00) - COALESCE(exp.total_expenses, 0.00)) AS net_profit,
    CASE 
        WHEN COALESCE(inv.total_billed, 0.00) > 0 THEN
            ROUND(((COALESCE(inv.total_billed, 0.00) - COALESCE(exp.total_expenses, 0.00)) / inv.total_billed) * 100, 2)
        ELSE 0.00
    END AS margin_percentage
FROM cases ca
LEFT JOIN clients cl ON cl.id = ca.client_id
LEFT JOIN profiles pr ON pr.id = ca.responsible_id
LEFT JOIN service_areas sa ON sa.id = ca.area_id
LEFT JOIN (
    SELECT 
        i.case_id,
        SUM(i.total * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END) AS total_billed,
        COALESCE(SUM(item_agg.fees_sum * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END), 0.00) AS fees_billed,
        COALESCE(SUM(item_agg.other_sum * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END), 0.00) AS other_billed
    FROM invoices i
    LEFT JOIN (
        SELECT 
            invoice_id,
            SUM(total) FILTER (WHERE item_type IN ('honorarios', 'servicio')) AS fees_sum,
            SUM(total) FILTER (WHERE item_type NOT IN ('honorarios', 'servicio')) AS other_sum
        FROM invoice_items
        GROUP BY invoice_id
    ) item_agg ON item_agg.invoice_id = i.id
    WHERE i.case_id IS NOT NULL AND i.status NOT IN ('borrador', 'anulada')
    GROUP BY i.case_id
) inv ON inv.case_id = ca.id
LEFT JOIN (
    SELECT 
        e.case_id,
        SUM(e.total_amount) AS total_expenses,
        SUM(e.total_amount) FILTER (WHERE e.category = 'tasas_judiciales') AS judicial_fees,
        SUM(e.total_amount) FILTER (WHERE e.category = 'tasas_catastrales') AS cadastral_fees,
        SUM(e.total_amount) FILTER (WHERE e.category = 'gastos_notariales') AS notary_fees,
        SUM(e.total_amount) FILTER (WHERE e.category = 'peritajes') AS expert_fees,
        SUM(e.total_amount) FILTER (WHERE e.category = 'viaticos_combustible') AS travel_fees,
        SUM(e.total_amount) FILTER (WHERE e.category NOT IN ('tasas_judiciales', 'tasas_catastrales', 'gastos_notariales', 'peritajes', 'viaticos_combustible')) AS other_expenses
    FROM expenses e
    WHERE e.case_id IS NOT NULL
    GROUP BY e.case_id
) exp ON exp.case_id = ca.id;

-- Sin security_invoker estas vistas ignoraban RLS y cualquier visitante podía leer
-- los indicadores financieros de todas las empresas.
ALTER VIEW view_financial_kpis SET (security_invoker = true);
ALTER VIEW view_case_profitability SET (security_invoker = true);
ALTER VIEW view_operational_productivity SET (security_invoker = true);
REVOKE ALL ON view_financial_kpis, view_case_profitability, view_operational_productivity FROM anon;
