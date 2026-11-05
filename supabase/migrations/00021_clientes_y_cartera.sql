-- Migración 21: Clientes con permisos de escritura y consultas de cartera
--
-- Las pantallas de clientes, CxC, cobros y resumen pasan a leer de la base de datos.
-- Los totales se calculan aquí, como billing_summary, para no depender del límite de
-- filas de la API. Todas las consultas corren con los permisos del usuario: RLS aplica.

-- ---------------------------------------------------------------------------
-- 1. Clientes: escribir exige un permiso de escritura, no clients.view
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permissive perms for clients" ON clients;

CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
    USING (has_permission(company_id, 'clients.view'));
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
    WITH CHECK (has_permission(company_id, 'clients.create'));
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
    USING (has_permission(company_id, 'clients.edit') OR has_permission(company_id, 'clients.archive'))
    WITH CHECK (has_permission(company_id, 'clients.edit') OR has_permission(company_id, 'clients.archive'));

-- Sin política de DELETE: un cliente se archiva. Las facturas y los cobros lo referencian.

-- RLS no distingue columnas: clients.edit y clients.archive se separan aquí.
CREATE OR REPLACE FUNCTION clients_guard_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
        RAISE EXCEPTION 'Un cliente no se puede mover a otra empresa.';
    END IF;

    -- Sin usuario: migraciones y mantenimiento de la base.
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF (NEW.is_active, NEW.archived_at) IS DISTINCT FROM (OLD.is_active, OLD.archived_at)
        AND NOT public.has_permission(NEW.company_id, 'clients.archive') THEN
        RAISE EXCEPTION 'No tienes permiso para archivar clientes.' USING ERRCODE = '42501';
    END IF;

    IF (to_jsonb(NEW) - ARRAY['is_active', 'archived_at', 'updated_at'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['is_active', 'archived_at', 'updated_at'])
        AND NOT public.has_permission(NEW.company_id, 'clients.edit') THEN
        RAISE EXCEPTION 'No tienes permiso para editar clientes.' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER clients_guard_update
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION clients_guard_update();

-- Contabilidad crea clientes desde el formulario de la factura y corrige sus datos
-- fiscales antes de emitir; hasta ahora lo hacía gracias a la política incorrecta.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN ('clients.create', 'clients.edit')
WHERE r.name = 'Contabilidad' AND r.is_system = TRUE
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Cuentas por cobrar
-- ---------------------------------------------------------------------------
-- Comprobantes con saldo, en pesos a la tasa de cada uno. Solo una venta a crédito
-- vence: al contado, due_date es la fecha de emisión y no indica mora.
CREATE OR REPLACE FUNCTION billing_open_receivables(p_company_id UUID)
RETURNS TABLE (
    invoice_id UUID,
    client_id UUID,
    client_name TEXT,
    tax_id TEXT,
    balance_dop NUMERIC,
    days_late INT
) AS $$
    SELECT
        i.id,
        i.client_id,
        COALESCE(
            NULLIF(c.business_name, ''),
            NULLIF(trim(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''),
            NULLIF(i.buyer_snapshot->>'name', ''),
            'Consumidor final'
        ),
        COALESCE(NULLIF(c.rnc, ''), NULLIF(c.cedula, ''), NULLIF(i.buyer_snapshot->>'taxId', '')),
        i.balance_due * COALESCE(i.exchange_rate, 1),
        CASE WHEN i.payment_type = 2 AND i.due_date < public.billing_today()
            THEN public.billing_today() - i.due_date
            ELSE 0
        END
    FROM public.invoices i
    LEFT JOIN public.clients c ON c.id = i.client_id
    WHERE i.company_id = p_company_id
      AND i.status IN ('emitida', 'parcialmente_pagada', 'vencida')
      AND i.balance_due > 0;
$$ LANGUAGE sql STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION billing_receivables_summary(p_company_id UUID)
RETURNS TABLE (
    total NUMERIC,
    current_amount NUMERIC,
    days_1_30 NUMERIC,
    days_31_60 NUMERIC,
    days_61_90 NUMERIC,
    days_over_90 NUMERIC,
    invoice_count BIGINT,
    client_count BIGINT
) AS $$
    SELECT
        COALESCE(SUM(r.balance_dop), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late = 0), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late BETWEEN 1 AND 30), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late BETWEEN 31 AND 60), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late BETWEEN 61 AND 90), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late > 90), 0),
        COUNT(*),
        COUNT(DISTINCT COALESCE(r.client_id::text, 'sin_cliente'))
    FROM public.billing_open_receivables(p_company_id) r;
$$ LANGUAGE sql STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION billing_receivables_by_client(p_company_id UUID)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    tax_id TEXT,
    invoice_count BIGINT,
    total NUMERIC,
    current_amount NUMERIC,
    days_1_30 NUMERIC,
    days_31_60 NUMERIC,
    days_61_90 NUMERIC,
    days_over_90 NUMERIC
) AS $$
    SELECT
        r.client_id,
        MIN(r.client_name),
        MIN(r.tax_id),
        COUNT(*),
        SUM(r.balance_dop),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late = 0), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late BETWEEN 1 AND 30), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late BETWEEN 31 AND 60), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late BETWEEN 61 AND 90), 0),
        COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late > 90), 0)
    FROM public.billing_open_receivables(p_company_id) r
    GROUP BY r.client_id
    ORDER BY SUM(r.balance_dop) DESC;
$$ LANGUAGE sql STABLE SET search_path = '';

-- ---------------------------------------------------------------------------
-- 3. Cobros
-- ---------------------------------------------------------------------------
-- Un cobro se convierte a pesos con la tasa del comprobante al que se aplicó, la
-- misma con la que se valoró su saldo. Los cobros anulados no suman.
CREATE OR REPLACE FUNCTION billing_payments_summary(p_company_id UUID)
RETURNS TABLE (
    collected_total NUMERIC,
    collected_this_month NUMERIC,
    transfer_total NUMERIC,
    receipt_count BIGINT,
    voided_count BIGINT
) AS $$
    SELECT
        COALESCE(SUM(x.amount_dop) FILTER (WHERE p.voided_at IS NULL), 0),
        COALESCE(SUM(x.amount_dop) FILTER (
            WHERE p.voided_at IS NULL
              AND date_trunc('month', p.payment_date) = date_trunc('month', public.billing_today())
        ), 0),
        COALESCE(SUM(x.amount_dop) FILTER (WHERE p.voided_at IS NULL AND p.payment_method = 'transferencia'), 0),
        COUNT(*) FILTER (WHERE p.voided_at IS NULL),
        COUNT(*) FILTER (WHERE p.voided_at IS NOT NULL)
    FROM public.payments p
    CROSS JOIN LATERAL (
        SELECT COALESCE(SUM(pa.amount_applied * COALESCE(i.exchange_rate, 1)), p.amount) AS amount_dop
        FROM public.payment_applications pa
        JOIN public.invoices i ON i.id = pa.invoice_id
        WHERE pa.payment_id = p.id
    ) x
    WHERE p.company_id = p_company_id;
$$ LANGUAGE sql STABLE SET search_path = '';

-- La búsqueda cruza recibo, comprobante y cliente, que PostgREST no filtra en una sola llamada.
CREATE OR REPLACE FUNCTION billing_list_payments(
    p_company_id UUID,
    p_client_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_method TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    id UUID,
    receipt_number TEXT,
    payment_date DATE,
    payment_method TEXT,
    reference_number TEXT,
    bank_name TEXT,
    amount NUMERIC,
    currency TEXT,
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    invoice_id UUID,
    invoice_number TEXT,
    ncf TEXT,
    client_id UUID,
    client_name TEXT,
    total_count BIGINT
) AS $$
    SELECT
        p.id, p.receipt_number, p.payment_date, p.payment_method, p.reference_number, p.bank_name,
        p.amount, p.currency::text, p.voided_at, p.void_reason,
        inv.id, inv.invoice_number, inv.ncf, p.client_id,
        COALESCE(NULLIF(inv.buyer_snapshot->>'name', ''), 'Consumidor final'),
        COUNT(*) OVER ()
    FROM public.payments p
    LEFT JOIN LATERAL (
        SELECT i.id, i.invoice_number, i.ncf, i.buyer_snapshot
        FROM public.payment_applications pa
        JOIN public.invoices i ON i.id = pa.invoice_id
        WHERE pa.payment_id = p.id
        ORDER BY i.created_at
        LIMIT 1
    ) inv ON TRUE
    WHERE p.company_id = p_company_id
      AND (p_client_id IS NULL OR p.client_id = p_client_id)
      AND (p_method IS NULL OR p.payment_method = p_method)
      AND (
          COALESCE(p_search, '') = ''
          OR strpos(lower(p.receipt_number), lower(p_search)) > 0
          OR strpos(lower(COALESCE(p.reference_number, '')), lower(p_search)) > 0
          OR strpos(lower(COALESCE(inv.invoice_number, '')), lower(p_search)) > 0
          OR strpos(lower(COALESCE(inv.ncf, '')), lower(p_search)) > 0
          OR strpos(lower(COALESCE(inv.buyer_snapshot->>'name', '')), lower(p_search)) > 0
      )
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
    OFFSET GREATEST(p_offset, 0);
$$ LANGUAGE sql STABLE SET search_path = '';

-- ---------------------------------------------------------------------------
-- 4. Resumen y estado de cuenta
-- ---------------------------------------------------------------------------
-- Acumulado por concepto, antes de ITBIS y neto de notas de crédito. Las facturas no
-- están ligadas a un área de servicio: lo que sí consta es el tipo de cada línea.
CREATE OR REPLACE FUNCTION billing_invoiced_by_concept(p_company_id UUID)
RETURNS TABLE (item_type TEXT, amount NUMERIC) AS $$
    SELECT
        it.item_type,
        SUM(it.amount * COALESCE(i.exchange_rate, 1) * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END)
    FROM public.invoice_items it
    JOIN public.invoices i ON i.id = it.invoice_id
    WHERE i.company_id = p_company_id
      AND i.status NOT IN ('borrador', 'anulada')
      AND it.billing_indicator <> 0
    GROUP BY it.item_type
    ORDER BY 2 DESC;
$$ LANGUAGE sql STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION billing_client_summary(p_company_id UUID, p_client_id UUID)
RETURNS TABLE (
    billed NUMERIC,
    collected NUMERIC,
    balance NUMERIC,
    overdue NUMERIC,
    invoice_count BIGINT
) AS $$
    SELECT
        (SELECT COALESCE(SUM(i.total * COALESCE(i.exchange_rate, 1) * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END), 0)
         FROM public.invoices i
         WHERE i.company_id = p_company_id AND i.client_id = p_client_id
           AND i.status NOT IN ('borrador', 'anulada')),
        (SELECT COALESCE(SUM(pa.amount_applied * COALESCE(i.exchange_rate, 1)), 0)
         FROM public.payments p
         JOIN public.payment_applications pa ON pa.payment_id = p.id
         JOIN public.invoices i ON i.id = pa.invoice_id
         WHERE p.company_id = p_company_id AND p.client_id = p_client_id AND p.voided_at IS NULL),
        (SELECT COALESCE(SUM(r.balance_dop), 0)
         FROM public.billing_open_receivables(p_company_id) r WHERE r.client_id = p_client_id),
        (SELECT COALESCE(SUM(r.balance_dop) FILTER (WHERE r.days_late > 0), 0)
         FROM public.billing_open_receivables(p_company_id) r WHERE r.client_id = p_client_id),
        (SELECT COUNT(*)
         FROM public.invoices i
         WHERE i.company_id = p_company_id AND i.client_id = p_client_id
           AND i.status NOT IN ('borrador', 'anulada'));
$$ LANGUAGE sql STABLE SET search_path = '';

-- Las funciones no se exponen a visitantes sin sesión.
DO $$
DECLARE
    v_fn TEXT;
BEGIN
    FOREACH v_fn IN ARRAY ARRAY[
        'billing_open_receivables(uuid)',
        'billing_receivables_summary(uuid)',
        'billing_receivables_by_client(uuid)',
        'billing_payments_summary(uuid)',
        'billing_list_payments(uuid, uuid, text, text, int, int)',
        'billing_invoiced_by_concept(uuid)',
        'billing_client_summary(uuid, uuid)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', v_fn);
    END LOOP;
END $$;
