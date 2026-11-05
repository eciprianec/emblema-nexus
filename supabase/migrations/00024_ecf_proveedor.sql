-- Migración 24: Emisión de e-CF por proveedor autorizado (MSeller)
--
-- El sistema asigna el e-NCF de sus rangos y el proveedor firma y presenta a la DGII.
-- La respuesta de la DGII llega después, así que la emisión tiene dos fases:
--   1. billing_reserve_ecf: toma el número, fija los datos y deja la factura en
--      'en_proceso', sin saldo y sin efecto en el comprobante que modifica.
--   2. billing_apply_ecf_status: si la DGII acepta, se aplican saldo y crédito una sola
--      vez; si rechaza, vuelve a borrador y el número se reutiliza o se da por usado
--      según secuenciaUtilizada.
-- 'ncf_interno' y 'ecf_externo' siguen emitiendo en un solo paso.

-- ---------------------------------------------------------------------------
-- 1. Modo de emisión y estados
-- ---------------------------------------------------------------------------
ALTER TABLE billing_settings DROP CONSTRAINT IF EXISTS billing_settings_emission_mode_check;
ALTER TABLE billing_settings ADD CONSTRAINT billing_settings_emission_mode_check
    CHECK (emission_mode IN ('ecf_externo', 'ncf_interno', 'ecf_directo', 'ecf_proveedor'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_emission_mode_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_emission_mode_check
    CHECK (emission_mode IN ('ecf_externo', 'ncf_interno', 'ecf_directo', 'ecf_proveedor'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (
    status IN ('borrador', 'en_proceso', 'emitida', 'parcialmente_pagada', 'pagada', 'vencida', 'acreditada', 'anulada')
);

-- Permite rotular cualquier listado sin consultar ecf_invoices. Nulo salvo en modo proveedor.
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS dgii_environment TEXT CHECK (dgii_environment IN ('test', 'cert', 'prod'));

-- ---------------------------------------------------------------------------
-- 2. Registro del e-CF: una factura rechazada conserva su historial y puede reemitirse
-- ---------------------------------------------------------------------------
ALTER TABLE ecf_invoices ALTER COLUMN security_code DROP NOT NULL;

ALTER TABLE ecf_invoices DROP CONSTRAINT IF EXISTS ecf_invoices_source_check;
ALTER TABLE ecf_invoices ADD CONSTRAINT ecf_invoices_source_check
    CHECK (source IN ('directo', 'externo', 'proveedor'));

ALTER TABLE ecf_invoices DROP CONSTRAINT IF EXISTS ecf_invoices_dgii_status_check;
ALTER TABLE ecf_invoices ADD CONSTRAINT ecf_invoices_dgii_status_check CHECK (
    dgii_status IN ('borrador', 'pendiente', 'firmado', 'enviado', 'aceptado', 'rechazado', 'condicional', 'en_proceso', 'anulado')
);

ALTER TABLE ecf_invoices
    -- Lo enviado, para consultarlo. JSONB reordena las claves al guardar...
    ADD COLUMN IF NOT EXISTS provider_payload JSONB,
    -- ...así que los bytes exactos que se envían y se reenvían se guardan aparte.
    ADD COLUMN IF NOT EXISTS provider_payload_raw TEXT,
    -- reservado: el proveedor no lo tiene | enviando/ambiguo: quizá lo tiene |
    -- enviado: lo confirmó | no_enviado: se descartó antes de llegar.
    ADD COLUMN IF NOT EXISTS provider_phase TEXT
        CHECK (provider_phase IN ('reservado', 'enviando', 'ambiguo', 'enviado', 'no_enviado')),
    ADD COLUMN IF NOT EXISTS provider_status TEXT,
    ADD COLUMN IF NOT EXISTS provider_track_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_signed_date TEXT,
    ADD COLUMN IF NOT EXISTS provider_error TEXT,
    ADD COLUMN IF NOT EXISTS secuencia_utilizada BOOLEAN,
    ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES fiscal_sequences(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS send_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ,
    -- El proveedor rechazó el envío sin decir por qué: el número no vuelve a la bolsa.
    ADD COLUMN IF NOT EXISTS number_parked_at TIMESTAMPTZ,
    -- Quien pidió la última operación: con service role, auth.uid() no lo dice.
    ADD COLUMN IF NOT EXISTS provider_actor UUID REFERENCES profiles(id);

-- Un número rechazado puede volver a usarse; uno vigente, nunca.
DROP INDEX IF EXISTS uq_ecf_invoices_company_encf;
CREATE UNIQUE INDEX uq_ecf_invoices_company_encf ON ecf_invoices(company_id, encf)
    WHERE dgii_status <> 'rechazado';
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecf_invoices_active_provider ON ecf_invoices(invoice_id)
    WHERE source = 'proveedor' AND dgii_status <> 'rechazado';

-- Cualquier miembro podía reescribir estos registros: ahora solo las funciones de facturación.
-- Tampoco los lee cualquier miembro: traen comprador, montos y detalle de las líneas.
DROP POLICY IF EXISTS "ecf_invoices_all" ON ecf_invoices;
DROP POLICY IF EXISTS "ecf_invoices_select" ON ecf_invoices;
CREATE POLICY "ecf_invoices_select" ON ecf_invoices FOR SELECT TO authenticated USING (
    has_permission(company_id, 'finance.view')
    OR has_permission(company_id, 'receivables.view')
    OR has_permission(company_id, 'ecf.emit')
    OR has_permission(company_id, 'finance.create')
);

-- Lo enviado al proveedor solo lo lee el servidor, como en ecf_configs (00023).
REVOKE SELECT ON ecf_invoices FROM authenticated;
GRANT SELECT (
    id, company_id, invoice_id, encf, ecf_type, environment, security_code, sign_date, xml_unsigned, xml_signed,
    track_id, dgii_status, dgii_status_code, dgii_messages, qr_code_url, buyer_acceptance_status,
    buyer_acceptance_date, buyer_rejection_reason, created_by, created_at, updated_at, source,
    provider_phase, provider_status, provider_track_id, provider_signed_date, provider_error,
    secuencia_utilizada, sequence_id, send_attempts, last_sent_at, checked_at, number_parked_at, provider_actor
) ON ecf_invoices TO authenticated;

-- Un rango vale para un solo ambiente: los números de prueba coinciden con los reales.
-- Los de serie B son siempre reales; los e-NCF existentes quedan en el ambiente de la empresa.
ALTER TABLE fiscal_sequences
    ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'prod' CHECK (environment IN ('test', 'cert', 'prod'));

-- Antes de la guarda de abajo, que ya no deja cambiar el ambiente de un rango.
UPDATE fiscal_sequences s SET environment = b.dgii_environment
FROM billing_settings b
WHERE b.company_id = s.company_id AND s.prefix LIKE 'E%';

-- La guarda corre también con el permiso de configuración: sin ella, una llamada directa a la API
-- podría mover un rango de pruebas a producción o registrarlo en otro ambiente.
CREATE OR REPLACE FUNCTION billing_guard_sequence_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_environment TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND (NEW.environment IS DISTINCT FROM OLD.environment OR NEW.prefix IS DISTINCT FROM OLD.prefix) THEN
        RAISE EXCEPTION 'La serie y el ambiente de un rango no se pueden cambiar: registra otro rango.';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.prefix LIKE 'E%' THEN
        SELECT b.dgii_environment INTO v_environment FROM public.billing_settings b WHERE b.company_id = NEW.company_id;
        IF v_environment IS DISTINCT FROM NEW.environment THEN
            RAISE EXCEPTION 'Un rango de e-NCF se registra en el ambiente configurado de la empresa.';
        END IF;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.fiscal_sequences s
        WHERE s.company_id = NEW.company_id
          AND s.prefix = NEW.prefix
          AND s.environment = NEW.environment
          AND s.id <> NEW.id
          AND s.start_number <= NEW.end_number
          AND s.end_number >= NEW.start_number
    ) THEN
        RAISE EXCEPTION 'El rango se solapa con otro ya registrado para % en este ambiente.', NEW.prefix;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ---------------------------------------------------------------------------
-- 3. Números liberados y credenciales: sin políticas ni permisos, solo por funciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ecf_released_numbers (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    environment TEXT NOT NULL CHECK (environment IN ('test', 'cert', 'prod')),
    prefix TEXT NOT NULL,
    encf TEXT NOT NULL,
    sequence_id UUID NOT NULL REFERENCES fiscal_sequences(id) ON DELETE CASCADE,
    released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, environment, encf)
);
ALTER TABLE ecf_released_numbers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS billing_provider_credentials (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    environment TEXT NOT NULL CHECK (environment IN ('test', 'cert', 'prod')),
    provider TEXT NOT NULL DEFAULT 'mseller' CHECK (provider IN ('mseller')),
    -- AES-256-GCM cifrado en el servidor de Next con BILLING_SECRETS_KEY. La base no tiene la clave.
    ciphertext TEXT NOT NULL,
    email_hint TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, environment, provider)
);
ALTER TABLE billing_provider_credentials ENABLE ROW LEVEL SECURITY;

-- 00023 concede por defecto las tablas nuevas a authenticated.
REVOKE ALL ON ecf_released_numbers, billing_provider_credentials FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Candados
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

    -- El único regreso a borrador: un e-CF que la DGII rechazó o que no llegó a enviarse.
    IF OLD.status = 'en_proceso' AND NEW.status = 'borrador' THEN
        IF COALESCE(current_setting('billing.ecf_return', TRUE) = 'on', FALSE) THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Un comprobante en proceso solo vuelve a borrador por rechazo o liberación.';
    END IF;
    IF OLD.status <> 'borrador' AND NEW.status = 'borrador' THEN
        RAISE EXCEPTION 'Un comprobante emitido no puede volver a borrador.';
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

-- Los números de prueba coinciden con los reales: un ambiente no se cambia con e-CF vigentes en otro.
CREATE OR REPLACE FUNCTION billing_guard_settings_environment()
RETURNS TRIGGER AS $$
DECLARE
    v_env TEXT := CASE NEW.dgii_environment WHEN 'prod' THEN 'PROD' WHEN 'cert' THEN 'CERT' ELSE 'DEV' END;
BEGIN
    IF OLD.emission_mode = 'ecf_proveedor' AND NEW.emission_mode <> 'ecf_proveedor' AND EXISTS (
        SELECT 1 FROM public.invoices i WHERE i.company_id = NEW.company_id AND i.status = 'en_proceso'
    ) THEN
        RAISE EXCEPTION 'Hay comprobantes en proceso en la DGII: espera su respuesta antes de cambiar el modo de emisión.';
    END IF;

    IF (NEW.dgii_environment IS DISTINCT FROM OLD.dgii_environment
            OR (NEW.emission_mode = 'ecf_proveedor' AND OLD.emission_mode <> 'ecf_proveedor'))
        AND EXISTS (
            SELECT 1 FROM public.ecf_invoices e
            WHERE e.company_id = NEW.company_id
              AND e.dgii_status <> 'rechazado'
              AND e.environment <> v_env
              AND (e.source = 'proveedor' OR NEW.emission_mode = 'ecf_proveedor')
        )
    THEN
        RAISE EXCEPTION 'No se puede usar este ambiente: la empresa ya tiene e-CF vigentes en otro y sus números podrían coincidir. Usa otra empresa para las pruebas.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- También al insertar: borrar la fila y crearla de nuevo no debe saltarse la comprobación.
DROP TRIGGER IF EXISTS guard_billing_settings_environment ON billing_settings;
CREATE TRIGGER guard_billing_settings_environment
BEFORE INSERT OR UPDATE ON billing_settings
FOR EACH ROW EXECUTE FUNCTION billing_guard_settings_environment();

-- La configuración no se borra: la política general se reparte sin DELETE.
DROP POLICY IF EXISTS "billing_settings_write" ON billing_settings;
DROP POLICY IF EXISTS "billing_settings_config_select" ON billing_settings;
DROP POLICY IF EXISTS "billing_settings_insert" ON billing_settings;
DROP POLICY IF EXISTS "billing_settings_update" ON billing_settings;
CREATE POLICY "billing_settings_config_select" ON billing_settings FOR SELECT TO authenticated
    USING (has_permission(company_id, 'config.manage'));
CREATE POLICY "billing_settings_insert" ON billing_settings FOR INSERT TO authenticated
    WITH CHECK (has_permission(company_id, 'config.manage'));
CREATE POLICY "billing_settings_update" ON billing_settings FOR UPDATE TO authenticated
    USING (has_permission(company_id, 'config.manage'))
    WITH CHECK (has_permission(company_id, 'config.manage'));

-- ---------------------------------------------------------------------------
-- 5. Comprobaciones comunes a toda emisión
-- ---------------------------------------------------------------------------
-- Espera la factura bloqueada por quien llama. Devuelve el comprador a fijar y el
-- comprobante modificado, que queda bloqueado hasta el final de la transacción.
CREATE OR REPLACE FUNCTION billing_check_issuable(
    p_inv public.invoices,
    OUT o_buyer JSONB,
    OUT o_parent_id UUID,
    OUT o_parent_ncf TEXT,
    OUT o_parent_date DATE
) AS $$
DECLARE
    v_parent public.invoices%ROWTYPE;
    v_today DATE := public.billing_today();
    v_total_dop NUMERIC;
    v_sum_amount NUMERIC;
    v_sum_itbis NUMERIC;
    v_bad_lines INT;
    v_buyer_id TEXT;
    v_buyer_name TEXT;
    v_buyer_foreign TEXT;
    v_pending_credit NUMERIC;
BEGIN
    o_buyer := p_inv.buyer_snapshot;

    IF p_inv.issue_date > v_today THEN
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
    FROM public.invoice_items WHERE invoice_id = p_inv.id;

    IF NOT EXISTS (SELECT 1 FROM public.invoice_items WHERE invoice_id = p_inv.id) THEN
        RAISE EXCEPTION 'El comprobante debe tener al menos una línea.';
    END IF;
    IF v_bad_lines > 0
        OR v_sum_amount <> p_inv.subtotal
        OR v_sum_itbis <> p_inv.itbis
        OR p_inv.itbis_18 <> round(p_inv.taxable_18 * 0.18, 2)
        OR p_inv.itbis_16 <> round(p_inv.taxable_16 * 0.16, 2)
        OR p_inv.itbis <> p_inv.itbis_18 + p_inv.itbis_16
        OR p_inv.subtotal <> p_inv.taxable_18 + p_inv.taxable_16 + p_inv.taxable_0 + p_inv.exempt_amount
        OR p_inv.total <> p_inv.subtotal + p_inv.itbis
        OR p_inv.amount_due <> p_inv.total + p_inv.non_billable_amount - p_inv.itbis_withheld - p_inv.isr_withheld
    THEN
        RAISE EXCEPTION 'Los montos del comprobante % no cuadran; revísalo y guárdalo de nuevo.', p_inv.invoice_number;
    END IF;

    -- Comprador: se fija aquí desde la base de datos, no desde lo que envió el navegador.
    IF p_inv.fiscal_type IN ('33', '34') THEN
        SELECT i.buyer_snapshot INTO o_buyer FROM public.invoices i
        WHERE i.id = p_inv.modifies_invoice_id AND i.company_id = p_inv.company_id;
    ELSIF p_inv.client_id IS NOT NULL THEN
        SELECT jsonb_strip_nulls(jsonb_build_object(
            'taxId', NULLIF(regexp_replace(COALESCE(NULLIF(c.rnc, ''), c.cedula, ''), '[^0-9]', '', 'g'), ''),
            'foreignId', CASE WHEN COALESCE(NULLIF(c.rnc, ''), c.cedula, '') = '' THEN NULLIF(c.passport, '') END,
            'name', COALESCE(NULLIF(c.business_name, ''), NULLIF(trim(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), '')),
            'address', NULLIF(c.address, ''),
            'email', NULLIF(c.email, '')
        )) INTO o_buyer
        FROM public.clients c WHERE c.id = p_inv.client_id AND c.company_id = p_inv.company_id;
    END IF;

    v_buyer_id := NULLIF(o_buyer->>'taxId', '');
    v_buyer_name := NULLIF(o_buyer->>'name', '');
    v_buyer_foreign := NULLIF(o_buyer->>'foreignId', '');
    v_total_dop := p_inv.total * CASE WHEN p_inv.currency = 'DOP' THEN 1 ELSE COALESCE(p_inv.exchange_rate, 0) END;

    IF p_inv.fiscal_type IN ('31', '45') AND (v_buyer_id IS NULL OR v_buyer_name IS NULL) THEN
        RAISE EXCEPTION 'Este tipo de comprobante requiere RNC/cédula y razón social del comprador.';
    END IF;
    IF p_inv.fiscal_type = '32' AND v_total_dop >= 250000
        AND (v_buyer_name IS NULL OR (v_buyer_id IS NULL AND v_buyer_foreign IS NULL)) THEN
        RAISE EXCEPTION 'Desde RD$250,000.00 la factura de consumo debe identificar al comprador.';
    END IF;

    -- Notas: datos de referencia tomados del comprobante original, no del formulario.
    IF p_inv.fiscal_type IN ('33', '34') THEN
        SELECT * INTO v_parent FROM public.invoices
        WHERE id = p_inv.modifies_invoice_id AND company_id = p_inv.company_id FOR UPDATE;
        IF NOT FOUND OR v_parent.ncf IS NULL OR v_parent.status = 'anulada' THEN
            RAISE EXCEPTION 'El comprobante a modificar no existe o no está vigente.';
        END IF;
        IF v_parent.status = 'en_proceso' THEN
            RAISE EXCEPTION 'El comprobante a modificar sigue en proceso en la DGII; espera su respuesta.';
        END IF;
        IF p_inv.modification_code NOT IN (1, 2, 3) OR COALESCE(p_inv.modification_reason, '') = '' THEN
            RAISE EXCEPTION 'La nota requiere código (1, 2 o 3) y razón de modificación.';
        END IF;
        IF p_inv.issue_date < v_parent.issue_date THEN
            RAISE EXCEPTION 'La nota no puede ser anterior al comprobante que modifica.';
        END IF;
        IF p_inv.currency <> v_parent.currency THEN
            RAISE EXCEPTION 'La nota debe estar en la misma moneda del comprobante que modifica.';
        END IF;
        IF p_inv.fiscal_type = '34' THEN
            -- Las notas en proceso aún no suman a credited_amount, pero ya comprometen ese margen.
            SELECT COALESCE(SUM(n.total), 0) INTO v_pending_credit FROM public.invoices n
            WHERE n.modifies_invoice_id = v_parent.id AND n.fiscal_type = '34'
              AND n.status = 'en_proceso' AND n.id <> p_inv.id;
            IF p_inv.total > v_parent.total - v_parent.credited_amount - v_pending_credit THEN
                RAISE EXCEPTION 'La nota supera lo acreditable del comprobante (%).', v_parent.total - v_parent.credited_amount - v_pending_credit;
            END IF;
        END IF;
        o_parent_id := v_parent.id;
        o_parent_ncf := v_parent.ncf;
        o_parent_date := v_parent.issue_date;
    END IF;
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
    v_settings public.billing_settings%ROWTYPE;
    v_seq public.fiscal_sequences%ROWTYPE;
    v_check RECORD;
    v_today DATE := public.billing_today();
    v_prefix TEXT;
    v_number TEXT;
    v_expires DATE;
    v_status TEXT := 'emitida';
    v_balance NUMERIC;
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
    IF v_settings.emission_mode = 'ecf_proveedor' THEN
        RAISE EXCEPTION 'En este modo el e-CF se emite por el proveedor; usa la opción Emitir de la factura.';
    END IF;

    SELECT * INTO v_check FROM public.billing_check_issuable(v_inv);
    v_inv.buyer_snapshot := v_check.o_buyer;

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
        modified_ncf = v_check.o_parent_ncf,
        modified_ncf_date = v_check.o_parent_date,
        emitter_snapshot = jsonb_build_object(
            'rnc', v_settings.rnc, 'legalName', v_settings.legal_name, 'tradeName', v_settings.trade_name,
            'address', v_settings.address, 'phone', v_settings.phone, 'email', v_settings.email
        )
    WHERE id = p_invoice_id;

    IF v_inv.fiscal_type = '34' THEN
        UPDATE public.invoices SET
            credited_amount = credited_amount + v_inv.total,
            credited_due = credited_due + v_inv.amount_due
        WHERE id = v_check.o_parent_id;
        PERFORM public.billing_refresh_balance(v_check.o_parent_id);
    END IF;

    RETURN p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Un comprobante en proceso aún no se puede modificar con una nota.
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
          AND m.status NOT IN ('anulada', 'en_proceso') AND m.fiscal_type NOT IN ('33', '34')
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
    IF v_inv.status IN ('borrador', 'anulada', 'en_proceso') THEN
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

-- ---------------------------------------------------------------------------
-- 6. Fases de la emisión por proveedor
-- ---------------------------------------------------------------------------
-- La reserva la pide el usuario. Lo demás afirma qué respondió el proveedor, y una sesión de
-- usuario no puede probar eso: solo el servidor de Next lo llama, con service role y después de
-- comprobar al usuario con su propia sesión. La empresa y quien actúa llegan como parámetros.

-- Interna: vuelve la factura a borrador, sin rastro fiscal. El registro del e-CF queda como historial.
CREATE OR REPLACE FUNCTION billing_return_to_draft(p_invoice_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('billing.ecf_return', 'on', TRUE);
    UPDATE public.invoices SET
        status = 'borrador',
        ncf = NULL,
        ncf_type = 'ninguno',
        emission_mode = NULL,
        dgii_environment = NULL,
        issued_at = NULL,
        issued_by = NULL,
        sequence_expires_on = NULL,
        emitter_snapshot = NULL,
        modified_ncf = NULL,
        modified_ncf_date = NULL,
        balance_due = amount_due
    WHERE id = p_invoice_id;
    PERFORM set_config('billing.ecf_return', 'off', TRUE);
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Interna: comprueba empresa y permiso de quien actúa, y bloquea en orden factura → registro
-- para no cruzarse con la reserva. auth.uid() es nulo con service role: la identidad se fija
-- solo para esta transacción, de modo que el permiso se evalúa sobre quien actúa.
CREATE OR REPLACE FUNCTION billing_lock_ecf(
    p_company_id UUID,
    p_actor UUID,
    p_ecf_id UUID,
    OUT o_ecf public.ecf_invoices,
    OUT o_inv public.invoices
) AS $$
DECLARE
    v_invoice UUID;
    v_company UUID;
BEGIN
    IF p_company_id IS NULL OR p_actor IS NULL THEN
        RAISE EXCEPTION 'Falta la empresa o el usuario de la operación.';
    END IF;
    PERFORM set_config('request.jwt.claim.sub', p_actor::text, TRUE);
    PERFORM public.billing_require(p_company_id, ARRAY['finance.create', 'ecf.emit']);

    SELECT invoice_id, company_id INTO v_invoice, v_company
    FROM public.ecf_invoices WHERE id = p_ecf_id AND source = 'proveedor';
    -- El mismo mensaje en ambos casos: no se revela si el registro existe en otra empresa.
    IF v_invoice IS NULL OR v_company <> p_company_id THEN
        RAISE EXCEPTION 'Registro de e-CF no encontrado en esta empresa.';
    END IF;

    SELECT * INTO o_inv FROM public.invoices WHERE id = v_invoice FOR UPDATE;
    UPDATE public.ecf_invoices SET provider_actor = p_actor WHERE id = p_ecf_id
    RETURNING * INTO o_ecf;
    PERFORM set_config('billing.rpc', 'on', TRUE);
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Primera fase: toma el número y fija los datos, sin saldo ni efecto en el comprobante modificado.
CREATE OR REPLACE FUNCTION billing_reserve_ecf(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_inv public.invoices%ROWTYPE;
    v_settings public.billing_settings%ROWTYPE;
    v_seq public.fiscal_sequences%ROWTYPE;
    v_check RECORD;
    v_today DATE := public.billing_today();
    v_prefix TEXT;
    v_env TEXT;
    v_env_code TEXT;
    v_number TEXT;
    v_seq_id UUID;
    v_expires DATE;
    v_next BIGINT;
    v_ecf_id UUID;
BEGIN
    SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no encontrado.';
    END IF;
    PERFORM public.billing_require(v_inv.company_id, ARRAY['finance.create', 'ecf.emit']);
    PERFORM set_config('billing.rpc', 'on', TRUE);

    IF v_inv.status <> 'borrador' THEN
        RAISE EXCEPTION 'El comprobante % ya fue emitido o está en proceso.', v_inv.invoice_number;
    END IF;

    -- FOR SHARE: un cambio de ambiente en paralelo espera a que esta reserva termine.
    SELECT * INTO v_settings FROM public.billing_settings WHERE company_id = v_inv.company_id FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configura los datos fiscales de la empresa antes de emitir.';
    END IF;
    IF v_settings.emission_mode <> 'ecf_proveedor' THEN
        RAISE EXCEPTION 'La empresa no está configurada para emitir por proveedor.';
    END IF;
    IF v_inv.fiscal_type NOT IN ('31', '32', '33', '34', '45') THEN
        RAISE EXCEPTION 'Este tipo de comprobante aún no se emite por el proveedor.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.billing_provider_credentials c
        WHERE c.company_id = v_inv.company_id AND c.environment = v_settings.dgii_environment
    ) THEN
        RAISE EXCEPTION 'Faltan las credenciales del proveedor para este ambiente; regístralas en la configuración.';
    END IF;
    IF length(COALESCE(v_settings.trade_name, '')) > 150 THEN
        RAISE EXCEPTION 'El nombre comercial admite hasta 150 caracteres; corrígelo en la configuración.';
    END IF;

    SELECT * INTO v_check FROM public.billing_check_issuable(v_inv);

    IF length(COALESCE(v_check.o_buyer->>'foreignId', '')) > 20 THEN
        RAISE EXCEPTION 'El identificador extranjero del comprador admite hasta 20 caracteres.';
    END IF;

    v_prefix := 'E' || v_inv.fiscal_type;
    v_env := v_settings.dgii_environment;
    v_env_code := CASE v_env WHEN 'prod' THEN 'PROD' WHEN 'cert' THEN 'CERT' ELSE 'DEV' END;

    -- Primero los números que la DGII no llegó a consumir, solo de rangos de este ambiente.
    SELECT r.encf, s.id, s.expires_on INTO v_number, v_seq_id, v_expires
    FROM public.ecf_released_numbers r
    JOIN public.fiscal_sequences s ON s.id = r.sequence_id
    WHERE r.company_id = v_inv.company_id AND r.environment = v_env AND r.prefix = v_prefix
      AND s.environment = v_env
      AND s.is_active AND (s.expires_on IS NULL OR s.expires_on >= v_today)
    ORDER BY r.encf
    LIMIT 1
    FOR UPDATE OF r SKIP LOCKED;

    IF v_number IS NOT NULL THEN
        DELETE FROM public.ecf_released_numbers
        WHERE company_id = v_inv.company_id AND environment = v_env AND encf = v_number;
    ELSE
        SELECT * INTO v_seq FROM public.fiscal_sequences
        WHERE company_id = v_inv.company_id AND prefix = v_prefix AND environment = v_env AND is_active
          AND next_number <= end_number AND (expires_on IS NULL OR expires_on >= v_today)
        ORDER BY start_number
        LIMIT 1
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No hay un rango e-NCF vigente con números disponibles para % en este ambiente; regístralo en la configuración.', v_prefix;
        END IF;

        -- Un número ya registrado (p. ej. emitido fuera del sistema) no debe trabar el rango.
        v_next := v_seq.next_number;
        WHILE v_next <= v_seq.end_number AND (
            EXISTS (SELECT 1 FROM public.invoices i WHERE i.company_id = v_inv.company_id AND i.ncf = v_prefix || lpad(v_next::text, 10, '0'))
            OR EXISTS (
                SELECT 1 FROM public.ecf_invoices e
                WHERE e.company_id = v_inv.company_id AND e.encf = v_prefix || lpad(v_next::text, 10, '0')
                  AND e.environment = v_env_code
                  AND (e.dgii_status <> 'rechazado' OR e.secuencia_utilizada IS DISTINCT FROM FALSE)
            )
        ) LOOP
            v_next := v_next + 1;
        END LOOP;
        IF v_next > v_seq.end_number OR length(v_next::text) > 10 THEN
            RAISE EXCEPTION 'No hay un rango e-NCF vigente con números disponibles para % en este ambiente; regístralo en la configuración.', v_prefix;
        END IF;

        v_number := v_prefix || lpad(v_next::text, 10, '0');
        v_seq_id := v_seq.id;
        v_expires := v_seq.expires_on;
        UPDATE public.fiscal_sequences SET next_number = v_next + 1 WHERE id = v_seq.id;
    END IF;

    -- Los tipos 32 y 34 no llevan fecha de vencimiento en el e-CF.
    IF v_inv.fiscal_type IN ('32', '34') THEN
        v_expires := NULL;
    END IF;

    INSERT INTO public.ecf_invoices (
        company_id, invoice_id, encf, ecf_type, environment, dgii_status, source,
        provider_phase, sequence_id, created_by
    ) VALUES (
        v_inv.company_id, v_inv.id, v_number, v_prefix, v_env_code,
        'pendiente', 'proveedor', 'reservado', v_seq_id, auth.uid()
    ) RETURNING id INTO v_ecf_id;

    UPDATE public.invoices SET
        status = 'en_proceso',
        ncf = v_number,
        ncf_type = v_prefix,
        emission_mode = 'ecf_proveedor',
        dgii_environment = v_env,
        issued_at = now(),
        issued_by = auth.uid(),
        sequence_expires_on = v_expires,
        -- Nada que cobrar hasta que la DGII lo acepte.
        balance_due = 0,
        buyer_snapshot = v_check.o_buyer,
        modified_ncf = v_check.o_parent_ncf,
        modified_ncf_date = v_check.o_parent_date,
        emitter_snapshot = jsonb_build_object(
            'rnc', v_settings.rnc, 'legalName', v_settings.legal_name, 'tradeName', v_settings.trade_name,
            'address', v_settings.address, 'phone', v_settings.phone, 'email', v_settings.email
        )
    WHERE id = p_invoice_id;

    RETURN jsonb_build_object('ecf_id', v_ecf_id, 'encf', v_number, 'environment', v_env, 'sequence_expires_on', v_expires);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Guarda lo que se enviará antes de enviarlo. Una vez guardado no cambia: un reenvío debe ser idéntico.
CREATE OR REPLACE FUNCTION billing_ecf_store_payload(p_company_id UUID, p_actor UUID, p_ecf_id UUID, p_raw TEXT)
RETURNS TEXT AS $$
DECLARE
    v_lock RECORD;
    v_json JSONB := p_raw::jsonb;
BEGIN
    SELECT * INTO v_lock FROM public.billing_lock_ecf(p_company_id, p_actor, p_ecf_id);
    IF (v_lock.o_ecf).provider_phase <> 'reservado' THEN
        RAISE EXCEPTION 'Este e-CF ya se envió al proveedor.';
    END IF;
    IF (v_lock.o_ecf).provider_payload_raw IS NOT NULL THEN
        RETURN (v_lock.o_ecf).provider_payload_raw;
    END IF;
    IF v_json #>> '{ECF,Encabezado,IdDoc,eNCF}' IS DISTINCT FROM (v_lock.o_ecf).encf THEN
        RAISE EXCEPTION 'El documento no corresponde al e-NCF reservado.';
    END IF;
    UPDATE public.ecf_invoices SET provider_payload = v_json, provider_payload_raw = p_raw WHERE id = p_ecf_id;
    RETURN p_raw;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Marca el envío antes de hacerlo: si el servidor cae en medio, el resultado queda como ambiguo.
-- Devuelve el número de intento: solo quien lo tiene sabe cómo terminó ese envío.
CREATE OR REPLACE FUNCTION billing_ecf_begin_send(p_company_id UUID, p_actor UUID, p_ecf_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_lock RECORD;
    v_attempt INT;
BEGIN
    SELECT * INTO v_lock FROM public.billing_lock_ecf(p_company_id, p_actor, p_ecf_id);
    IF (v_lock.o_ecf).provider_phase <> 'reservado' OR (v_lock.o_ecf).provider_payload_raw IS NULL THEN
        RAISE EXCEPTION 'Este e-CF no está listo para enviarse o ya se envió.';
    END IF;
    UPDATE public.ecf_invoices SET
        provider_phase = 'enviando',
        send_attempts = send_attempts + 1,
        last_sent_at = now(),
        provider_error = NULL
    WHERE id = p_ecf_id
    RETURNING send_attempts INTO v_attempt;
    RETURN jsonb_build_object('raw', (v_lock.o_ecf).provider_payload_raw, 'attempt', v_attempt);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Interna: lo único que se acepta como URL del QR. Va impresa en un comprobante fiscal.
CREATE OR REPLACE FUNCTION billing_ecf_safe_qr(p_url TEXT)
RETURNS TEXT AS $$
    SELECT CASE WHEN p_url ~ '^https://(ecf|fc)\.dgii\.gov\.do/' THEN p_url END;
$$ LANGUAGE sql IMMUTABLE SET search_path = '';

-- El proveedor confirmó que lo tiene. El código de seguridad se guarda tal cual: distingue mayúsculas.
-- Un valor ya guardado no se reescribe, y un e-CF con estado final no cambia.
CREATE OR REPLACE FUNCTION billing_ecf_record_sent(
    p_company_id UUID,
    p_actor UUID,
    p_ecf_id UUID,
    p_security_code TEXT,
    p_signed_text TEXT,
    p_signed_at TIMESTAMPTZ,
    p_qr_url TEXT,
    p_internal_track TEXT
) RETURNS VOID AS $$
DECLARE
    v_lock RECORD;
BEGIN
    SELECT * INTO v_lock FROM public.billing_lock_ecf(p_company_id, p_actor, p_ecf_id);
    IF (v_lock.o_ecf).dgii_status IN ('aceptado', 'condicional', 'rechazado') THEN
        RETURN;
    END IF;
    IF (v_lock.o_ecf).provider_phase NOT IN ('enviando', 'ambiguo', 'enviado') THEN
        RAISE EXCEPTION 'Este e-CF no se estaba enviando.';
    END IF;
    UPDATE public.ecf_invoices SET
        provider_phase = 'enviado',
        dgii_status = CASE WHEN dgii_status = 'pendiente' THEN 'enviado' ELSE dgii_status END,
        security_code = COALESCE(security_code, NULLIF(p_security_code, '')),
        provider_signed_date = COALESCE(provider_signed_date, NULLIF(p_signed_text, '')),
        sign_date = COALESCE(sign_date, p_signed_at),
        qr_code_url = COALESCE(qr_code_url, public.billing_ecf_safe_qr(NULLIF(p_qr_url, ''))),
        provider_track_id = COALESCE(provider_track_id, NULLIF(p_internal_track, '')),
        provider_error = NULL
    WHERE id = p_ecf_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Tiempo agotado, error de red o 5xx: no se sabe si llegó. No se reenvía a ciegas.
-- Si una consulta ya encontró el documento mientras tanto, se queda como está.
CREATE OR REPLACE FUNCTION billing_ecf_mark_ambiguous(p_company_id UUID, p_actor UUID, p_ecf_id UUID, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
    v_lock RECORD;
BEGIN
    SELECT * INTO v_lock FROM public.billing_lock_ecf(p_company_id, p_actor, p_ecf_id);
    IF (v_lock.o_ecf).provider_phase = 'enviado' THEN
        RETURN;
    END IF;
    IF (v_lock.o_ecf).provider_phase NOT IN ('enviando', 'ambiguo') THEN
        RAISE EXCEPTION 'Este e-CF no se estaba enviando.';
    END IF;
    UPDATE public.ecf_invoices SET provider_phase = 'ambiguo', provider_error = p_reason WHERE id = p_ecf_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- El proveedor confirmó que no lo conoce: solo entonces se permite reenviar lo guardado.
-- Se exige una espera porque un envío que agotó el tiempo aún podría estar procesándose.
CREATE OR REPLACE FUNCTION billing_ecf_confirm_not_received(p_company_id UUID, p_actor UUID, p_ecf_id UUID)
RETURNS VOID AS $$
DECLARE
    v_lock RECORD;
BEGIN
    SELECT * INTO v_lock FROM public.billing_lock_ecf(p_company_id, p_actor, p_ecf_id);
    IF (v_lock.o_ecf).provider_phase NOT IN ('enviando', 'ambiguo') THEN
        RAISE EXCEPTION 'Este e-CF no tiene un envío pendiente de confirmar.';
    END IF;
    IF (v_lock.o_ecf).last_sent_at > now() - interval '5 minutes' THEN
        RAISE EXCEPTION 'Espera unos minutos desde el último envío antes de darlo por no recibido.';
    END IF;
    UPDATE public.ecf_invoices SET provider_phase = 'reservado', provider_error = NULL WHERE id = p_ecf_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Un reenvío que el proveedor rechazó sin registrarlo. Lo guardado ya salió antes, así que eso no
-- prueba que el proveedor no lo tenga: el número no se libera y queda listo para volver a verificar.
CREATE OR REPLACE FUNCTION billing_ecf_send_refused(
    p_company_id UUID,
    p_actor UUID,
    p_ecf_id UUID,
    p_reason TEXT,
    p_send_attempt INT
) RETURNS VOID AS $$
DECLARE
    v_lock RECORD;
BEGIN
    SELECT * INTO v_lock FROM public.billing_lock_ecf(p_company_id, p_actor, p_ecf_id);
    IF (v_lock.o_ecf).provider_phase = 'enviando' AND (v_lock.o_ecf).send_attempts = p_send_attempt THEN
        UPDATE public.ecf_invoices SET provider_phase = 'reservado', provider_error = p_reason WHERE id = p_ecf_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Interna: devuelve el número a la bolsa de reutilizables.
CREATE OR REPLACE FUNCTION billing_ecf_release_number(p_ecf public.ecf_invoices)
RETURNS VOID AS $$
BEGIN
    IF p_ecf.sequence_id IS NOT NULL THEN
        INSERT INTO public.ecf_released_numbers (company_id, environment, prefix, encf, sequence_id)
        VALUES (
            p_ecf.company_id,
            CASE p_ecf.environment WHEN 'PROD' THEN 'prod' WHEN 'CERT' THEN 'cert' ELSE 'test' END,
            p_ecf.ecf_type, p_ecf.encf, p_ecf.sequence_id
        ) ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fallo definitivo conocido antes de que nada llegara al proveedor: vuelve a borrador.
-- Desde 'enviando' solo libera el intento que sabe que su propio envío falló y trae su número;
-- cualquier otro 'enviando' es un resultado desconocido y se resuelve con Verificar.
-- p_park aparta el número fuera de la bolsa, para que la siguiente reserva siga con otro.
CREATE OR REPLACE FUNCTION billing_release_ecf(
    p_company_id UUID,
    p_actor UUID,
    p_ecf_id UUID,
    p_reason TEXT,
    p_messages JSONB DEFAULT '[]'::jsonb,
    p_send_attempt INT DEFAULT NULL,
    p_park BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_lock RECORD;
    v_phase TEXT;
BEGIN
    SELECT * INTO v_lock FROM public.billing_lock_ecf(p_company_id, p_actor, p_ecf_id);
    v_phase := (v_lock.o_ecf).provider_phase;
    IF v_phase = 'enviando' THEN
        IF p_send_attempt IS DISTINCT FROM (v_lock.o_ecf).send_attempts THEN
            RAISE EXCEPTION 'Este e-CF se está enviando o su envío no terminó: verifica su estado.';
        END IF;
    ELSIF v_phase <> 'reservado' THEN
        RAISE EXCEPTION 'Este e-CF pudo haber llegado al proveedor: verifica su estado.';
    END IF;
    IF (v_lock.o_inv).status <> 'en_proceso' THEN
        RAISE EXCEPTION 'El comprobante no está en proceso.';
    END IF;

    UPDATE public.ecf_invoices SET
        dgii_status = 'rechazado',
        provider_phase = 'no_enviado',
        provider_error = p_reason,
        dgii_messages = COALESCE(p_messages, '[]'::jsonb),
        -- Apartado: no consta que el número esté libre, y la reserva lo salta si está en el rango.
        secuencia_utilizada = CASE WHEN p_park THEN NULL ELSE FALSE END,
        number_parked_at = CASE WHEN p_park THEN now() END
    WHERE id = p_ecf_id;

    IF NOT p_park THEN
        PERFORM public.billing_ecf_release_number(v_lock.o_ecf);
    END IF;
    PERFORM public.billing_return_to_draft((v_lock.o_inv).id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Interna: por qué una respuesta del proveedor no prueba nada sobre el envío vigente. La consulta
-- es por e-NCF, y el proveedor conserva el documento anterior de un número reutilizado hasta
-- que un POST lo reemplaza. Nulo si la respuesta se puede aplicar.
--   sin_envio: este registro aún no salió.
--   anterior: su última actualización es previa al envío vigente. Se descuenta el desfase de relojes,
--     salvo en un número reutilizado sin confirmar: ahí esos minutos pueden ser del documento rechazado.
--   sin_prueba: sin fecha, sin monto para comparar, o con el seguimiento de un intento ya rechazado.
--     Un POST confirmado ya reemplazó al documento anterior: si lo que llega es posterior al envío,
--     es este envío aunque el proveedor conserve el internalTrackId (el tipo 32 no trae otro dato).
--   no_coincide: el total o el comprador difieren de lo guardado.
CREATE OR REPLACE FUNCTION billing_ecf_snapshot_problem(
    p_ecf public.ecf_invoices,
    p_updated_at TIMESTAMPTZ,
    p_track_id TEXT,
    p_internal_track TEXT,
    p_doc_total NUMERIC,
    p_doc_buyer TEXT
) RETURNS TEXT AS $$
DECLARE
    v_track TEXT := NULLIF(p_track_id, '');
    v_internal TEXT := NULLIF(p_internal_track, '');
    v_sent_total NUMERIC;
    v_sent_buyer TEXT;
    v_doc_buyer TEXT := NULLIF(regexp_replace(COALESCE(p_doc_buyer, ''), '[^0-9]', '', 'g'), '');
BEGIN
    IF p_ecf.send_attempts = 0 OR p_ecf.last_sent_at IS NULL THEN
        RETURN 'sin_envio';
    END IF;
    IF p_updated_at IS NULL THEN
        RETURN 'sin_prueba';
    END IF;
    IF p_updated_at < p_ecf.last_sent_at - interval '2 minutes' THEN
        RETURN 'anterior';
    END IF;
    IF p_ecf.provider_phase <> 'enviado' AND p_updated_at < p_ecf.last_sent_at AND EXISTS (
        SELECT 1 FROM public.ecf_invoices e
        WHERE e.company_id = p_ecf.company_id AND e.encf = p_ecf.encf AND e.environment = p_ecf.environment
          AND e.id <> p_ecf.id AND e.dgii_status = 'rechazado' AND e.send_attempts > 0
    ) THEN
        RETURN 'anterior';
    END IF;

    -- No se documenta si un reenvío conserva internalTrackId: si trae un TrackId de la DGII
    -- distinto, ese es el que prueba que se trata de otro envío.
    IF EXISTS (
        SELECT 1 FROM public.ecf_invoices e
        WHERE e.company_id = p_ecf.company_id AND e.encf = p_ecf.encf AND e.environment = p_ecf.environment
          AND e.id <> p_ecf.id AND e.dgii_status = 'rechazado'
          AND (
              e.track_id = v_track
              OR (
                  NOT (p_ecf.provider_phase = 'enviado' AND p_updated_at >= p_ecf.last_sent_at)
                  AND e.provider_track_id = v_internal
                  AND (v_track IS NULL OR e.track_id IS NULL)
              )
          )
    ) THEN
        RETURN 'sin_prueba';
    END IF;

    -- Sin confirmación del POST, lo encontrado se compara con lo guardado antes de creerlo.
    IF p_ecf.provider_phase <> 'enviado' THEN
        IF p_doc_total IS NULL THEN
            RETURN 'sin_prueba';
        END IF;
        v_sent_total := (p_ecf.provider_payload #>> '{ECF,Encabezado,Totales,MontoTotal}')::numeric;
        v_sent_buyer := NULLIF(regexp_replace(COALESCE(p_ecf.provider_payload #>> '{ECF,Encabezado,Comprador,RNCComprador}', ''), '[^0-9]', '', 'g'), '');
        IF round(p_doc_total, 2) IS DISTINCT FROM round(v_sent_total, 2)
            -- El QR de consumo no trae comprador: la falta del dato no es una diferencia.
            OR (v_doc_buyer IS NOT NULL AND v_doc_buyer IS DISTINCT FROM v_sent_buyer)
        THEN
            RETURN 'no_coincide';
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = '';

-- Segunda fase. Idempotente: un estado final no cambia, y los efectos se aplican una sola vez.
-- Un estado no final (o nulo, que solo anota la consulta) deja la factura en proceso, y una
-- respuesta que no prueba ser de este envío no surte ningún efecto: se devuelve en 'ignored'.
CREATE OR REPLACE FUNCTION billing_apply_ecf_status(
    p_company_id UUID,
    p_actor UUID,
    p_ecf_id UUID,
    p_status TEXT,
    p_messages JSONB DEFAULT NULL,
    p_secuencia_utilizada BOOLEAN DEFAULT NULL,
    p_track_id TEXT DEFAULT NULL,
    p_status_code TEXT DEFAULT NULL,
    p_security_code TEXT DEFAULT NULL,
    p_signed_text TEXT DEFAULT NULL,
    p_signed_at TIMESTAMPTZ DEFAULT NULL,
    p_qr_url TEXT DEFAULT NULL,
    p_internal_track TEXT DEFAULT NULL,
    p_updated_at TIMESTAMPTZ DEFAULT NULL,
    p_doc_total NUMERIC DEFAULT NULL,
    p_doc_buyer TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_lock RECORD;
    v_ecf public.ecf_invoices%ROWTYPE;
    v_inv public.invoices%ROWTYPE;
    v_status TEXT := lower(trim(COALESCE(p_status, '')));
    v_final BOOLEAN;
    v_balance NUMERIC;
    v_new_status TEXT;
    v_applied BOOLEAN := FALSE;
    v_problem TEXT;
BEGIN
    SELECT * INTO v_lock FROM public.billing_lock_ecf(p_company_id, p_actor, p_ecf_id);
    v_ecf := v_lock.o_ecf;
    v_inv := v_lock.o_inv;
    v_final := v_ecf.dgii_status IN ('aceptado', 'condicional', 'rechazado');

    UPDATE public.ecf_invoices SET checked_at = now() WHERE id = p_ecf_id;

    IF v_status = '' THEN
        RETURN jsonb_build_object('applied', FALSE, 'dgii_status', v_ecf.dgii_status, 'invoice_status', v_inv.status);
    END IF;

    v_problem := public.billing_ecf_snapshot_problem(v_ecf, p_updated_at, p_track_id, p_internal_track, p_doc_total, p_doc_buyer);
    IF v_problem IS NOT NULL THEN
        IF v_problem = 'no_coincide' THEN
            UPDATE public.ecf_invoices SET
                provider_error = 'El proveedor tiene con este e-NCF un documento con otro total o comprador. No se aplicó su estado.'
            WHERE id = p_ecf_id;
        END IF;
        RETURN jsonb_build_object('applied', FALSE, 'ignored', v_problem, 'dgii_status', v_ecf.dgii_status, 'invoice_status', v_inv.status);
    END IF;

    -- Lo que el proveedor devuelve puede completar un registro al que le falte, incluso ya final.
    UPDATE public.ecf_invoices SET
        security_code = COALESCE(security_code, NULLIF(p_security_code, '')),
        provider_signed_date = COALESCE(provider_signed_date, NULLIF(p_signed_text, '')),
        sign_date = COALESCE(sign_date, p_signed_at),
        qr_code_url = COALESCE(qr_code_url, public.billing_ecf_safe_qr(NULLIF(p_qr_url, ''))),
        provider_track_id = COALESCE(provider_track_id, NULLIF(p_internal_track, '')),
        track_id = COALESCE(NULLIF(p_track_id, ''), track_id)
    WHERE id = p_ecf_id;

    IF v_final THEN
        RETURN jsonb_build_object('applied', FALSE, 'dgii_status', v_ecf.dgii_status, 'invoice_status', v_inv.status);
    END IF;

    IF v_inv.status <> 'en_proceso' THEN
        RAISE EXCEPTION 'El comprobante no está en proceso.';
    END IF;

    IF v_status IN ('aceptado', 'aceptado condicional') THEN
        v_balance := CASE WHEN v_inv.fiscal_type = '34' THEN 0 ELSE v_inv.amount_due END;
        v_new_status := CASE WHEN v_inv.fiscal_type <> '34' AND v_balance = 0 THEN 'pagada' ELSE 'emitida' END;

        UPDATE public.ecf_invoices SET
            dgii_status = CASE v_status WHEN 'aceptado' THEN 'aceptado' ELSE 'condicional' END,
            provider_status = p_status,
            provider_phase = 'enviado',
            dgii_messages = COALESCE(p_messages, dgii_messages),
            dgii_status_code = COALESCE(p_status_code, dgii_status_code),
            secuencia_utilizada = COALESCE(p_secuencia_utilizada, TRUE),
            provider_error = NULL
        WHERE id = p_ecf_id;

        UPDATE public.invoices SET status = v_new_status, balance_due = v_balance WHERE id = v_inv.id;

        IF v_inv.fiscal_type = '34' THEN
            PERFORM 1 FROM public.invoices WHERE id = v_inv.modifies_invoice_id FOR UPDATE;
            UPDATE public.invoices SET
                credited_amount = credited_amount + v_inv.total,
                credited_due = credited_due + v_inv.amount_due
            WHERE id = v_inv.modifies_invoice_id;
            PERFORM public.billing_refresh_balance(v_inv.modifies_invoice_id);
        END IF;
        v_applied := TRUE;

    ELSIF v_status = 'rechazado' THEN
        UPDATE public.ecf_invoices SET
            dgii_status = 'rechazado',
            provider_status = p_status,
            provider_phase = 'enviado',
            dgii_messages = COALESCE(p_messages, dgii_messages),
            dgii_status_code = COALESCE(p_status_code, dgii_status_code),
            secuencia_utilizada = p_secuencia_utilizada,
            provider_error = NULL
        WHERE id = p_ecf_id;

        -- Sin el dato no se sabe si la DGII lo consumió: se da por usado.
        IF p_secuencia_utilizada IS FALSE THEN
            PERFORM public.billing_ecf_release_number(v_ecf);
        END IF;
        PERFORM public.billing_return_to_draft(v_inv.id);
        v_applied := TRUE;

    ELSE
        -- En Cola, Enviado a la DGII, En Proceso, Error, No encontrado: el proveedor lo tiene,
        -- pero no hay respuesta final de la DGII. Se muestra tal cual y se sigue esperando.
        UPDATE public.ecf_invoices SET
            provider_status = p_status,
            provider_phase = 'enviado',
            dgii_status = CASE WHEN dgii_status = 'pendiente' THEN 'enviado' ELSE dgii_status END,
            dgii_messages = COALESCE(p_messages, dgii_messages),
            provider_error = NULL
        WHERE id = p_ecf_id;
    END IF;

    SELECT status INTO v_new_status FROM public.invoices WHERE id = v_inv.id;
    RETURN jsonb_build_object(
        'applied', v_applied,
        'dgii_status', (SELECT dgii_status FROM public.ecf_invoices WHERE id = p_ecf_id),
        'invoice_status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ¿Queda algún número para este tipo en este ambiente? Los liberados no son legibles desde la aplicación.
CREATE OR REPLACE FUNCTION billing_ecf_has_number(p_company_id UUID, p_prefix TEXT, p_environment TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM public.billing_require(p_company_id, ARRAY['finance.view', 'receivables.view', 'finance.create', 'ecf.emit', 'config.manage']);
    RETURN EXISTS (
        SELECT 1 FROM public.fiscal_sequences s
        WHERE s.company_id = p_company_id AND s.prefix = p_prefix AND s.is_active
          AND s.environment = p_environment
          AND (s.expires_on IS NULL OR s.expires_on >= public.billing_today())
          AND (
              s.next_number <= s.end_number
              OR EXISTS (
                  SELECT 1 FROM public.ecf_released_numbers r
                  WHERE r.sequence_id = s.id AND r.environment = p_environment
              )
          )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- ---------------------------------------------------------------------------
-- 7. Credenciales del proveedor: el texto cifrado nunca llega al navegador
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION billing_save_provider_credentials(
    p_company_id UUID,
    p_environment TEXT,
    p_ciphertext TEXT,
    p_email_hint TEXT
) RETURNS VOID AS $$
BEGIN
    PERFORM public.billing_require(p_company_id, ARRAY['config.manage']);
    IF COALESCE(p_ciphertext, '') = '' THEN
        RAISE EXCEPTION 'Faltan las credenciales.';
    END IF;
    INSERT INTO public.billing_provider_credentials (company_id, environment, ciphertext, email_hint, updated_by)
    VALUES (p_company_id, p_environment, p_ciphertext, p_email_hint, auth.uid())
    ON CONFLICT (company_id, environment, provider) DO UPDATE SET
        ciphertext = EXCLUDED.ciphertext,
        email_hint = EXCLUDED.email_hint,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION billing_read_provider_credentials(p_company_id UUID, p_environment TEXT)
RETURNS TEXT AS $$
DECLARE
    v_ciphertext TEXT;
BEGIN
    PERFORM public.billing_require(p_company_id, ARRAY['ecf.emit', 'finance.create']);
    SELECT ciphertext INTO v_ciphertext FROM public.billing_provider_credentials
    WHERE company_id = p_company_id AND environment = p_environment;
    RETURN v_ciphertext;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION billing_provider_credentials_status(p_company_id UUID, p_environment TEXT)
RETURNS TABLE (configured BOOLEAN, email_hint TEXT) AS $$
BEGIN
    PERFORM public.billing_require(p_company_id, ARRAY['finance.view', 'receivables.view', 'finance.create', 'ecf.emit', 'config.manage']);
    RETURN QUERY
    SELECT TRUE, c.email_hint FROM public.billing_provider_credentials c
    WHERE c.company_id = p_company_id AND c.environment = p_environment;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- ---------------------------------------------------------------------------
-- 8. Lo que está en proceso no es ingreso ni cuenta por cobrar
-- ---------------------------------------------------------------------------
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
            WHERE i.status NOT IN ('borrador', 'anulada', 'en_proceso')
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

CREATE OR REPLACE FUNCTION billing_invoiced_by_concept(p_company_id UUID)
RETURNS TABLE (item_type TEXT, amount NUMERIC) AS $$
    SELECT
        it.item_type,
        SUM(it.amount * COALESCE(i.exchange_rate, 1) * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END)
    FROM public.invoice_items it
    JOIN public.invoices i ON i.id = it.invoice_id
    WHERE i.company_id = p_company_id
      AND i.status NOT IN ('borrador', 'anulada', 'en_proceso')
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
           AND i.status NOT IN ('borrador', 'anulada', 'en_proceso')),
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
           AND i.status NOT IN ('borrador', 'anulada', 'en_proceso'));
$$ LANGUAGE sql STABLE SET search_path = '';

-- Una nota de crédito puede pasar del saldo abierto: lo cobrado de más queda a favor del cliente.
-- El saldo no baja de cero, así que se calcula aparte, y nunca es más de lo que el cliente pagó.
-- Se muestra en la factura y en CxC; devolverlo o aplicarlo a otro comprobante aún se hace por fuera.
CREATE OR REPLACE FUNCTION billing_customer_credits(p_company_id UUID)
RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    ncf TEXT,
    client_id UUID,
    client_name TEXT,
    currency TEXT,
    amount NUMERIC,
    amount_dop NUMERIC
) AS $$
    SELECT i.id, i.invoice_number, i.ncf, i.client_id,
        COALESCE(NULLIF(i.buyer_snapshot->>'name', ''), 'Consumidor final'),
        i.currency,
        c.amount,
        round(c.amount * COALESCE(i.exchange_rate, 1), 2)
    FROM public.invoices i
    CROSS JOIN LATERAL (
        SELECT LEAST(i.paid_amount, i.paid_amount + i.credited_due - i.amount_due) AS amount
    ) c
    WHERE i.company_id = p_company_id
      AND i.status NOT IN ('borrador', 'anulada', 'en_proceso')
      AND i.fiscal_type <> '34'
      AND c.amount > 0
    ORDER BY i.issue_date, i.invoice_number;
$$ LANGUAGE sql STABLE SET search_path = '';

CREATE OR REPLACE VIEW view_financial_kpis AS
SELECT
    c.id AS company_id,
    c.name AS company_name,
    c.rnc AS company_rnc,
    COALESCE(inv.total_invoiced, 0.00) AS total_invoiced,
    COALESCE(inv.total_ecf_invoiced, 0.00) AS total_ecf_invoiced,
    COALESCE(pay.total_collected, 0.00) AS total_collected,
    COALESCE(inv.total_itbis, 0.00) AS total_itbis,
    COALESCE(inv.total_outstanding, 0.00) AS total_outstanding,
    COALESCE(exp.total_expenses, 0.00) AS total_expenses,
    COALESCE(exp.total_expenses_itbis, 0.00) AS total_expenses_itbis,
    (COALESCE(inv.total_invoiced, 0.00) - COALESCE(exp.total_expenses, 0.00)) AS net_profit,
    CASE
        WHEN COALESCE(inv.total_invoiced, 0.00) > 0 THEN
            ROUND(((COALESCE(inv.total_invoiced, 0.00) - COALESCE(exp.total_expenses, 0.00)) / inv.total_invoiced) * 100, 2)
        ELSE 0.00
    END AS operational_margin_percentage
FROM companies c
LEFT JOIN (
    SELECT
        i.company_id,
        SUM(i.total * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END) FILTER (WHERE i.status NOT IN ('borrador', 'anulada', 'en_proceso')) AS total_invoiced,
        SUM(i.total * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END) FILTER (
            WHERE i.status NOT IN ('borrador', 'anulada', 'en_proceso')
            AND (i.ncf LIKE 'E%' OR EXISTS (
                SELECT 1 FROM ecf_invoices ei
                WHERE ei.invoice_id = i.id
                AND ei.dgii_status NOT IN ('rechazado', 'anulado')
            ))
        ) AS total_ecf_invoiced,
        SUM(i.itbis * CASE WHEN i.fiscal_type = '34' THEN -1 ELSE 1 END) FILTER (WHERE i.status NOT IN ('borrador', 'anulada', 'en_proceso')) AS total_itbis,
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
    COALESCE(inv.total_billed, 0.00) AS total_billed,
    COALESCE(inv.fees_billed, 0.00) AS fees_billed,
    COALESCE(inv.other_billed, 0.00) AS other_billed,
    COALESCE(exp.total_expenses, 0.00) AS total_expenses,
    COALESCE(exp.judicial_fees, 0.00) AS judicial_expenses,
    COALESCE(exp.cadastral_fees, 0.00) AS cadastral_expenses,
    COALESCE(exp.notary_fees, 0.00) AS notary_expenses,
    COALESCE(exp.expert_fees, 0.00) AS expert_expenses,
    COALESCE(exp.travel_fees, 0.00) AS travel_expenses,
    COALESCE(exp.other_expenses, 0.00) AS other_expenses,
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
    WHERE i.case_id IS NOT NULL AND i.status NOT IN ('borrador', 'anulada', 'en_proceso')
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

ALTER VIEW view_financial_kpis SET (security_invoker = true);
ALTER VIEW view_case_profitability SET (security_invoker = true);

-- Una nota de crédito en proceso aún no rebaja el saldo, pero ya compromete ese monto:
-- cobrarlo dejaría al cliente con el dinero pagado y el crédito a la vez.
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
    v_pending_credit NUMERIC;
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
    SELECT COALESCE(SUM(n.amount_due), 0) INTO v_pending_credit FROM public.invoices n
    WHERE n.modifies_invoice_id = p_invoice_id AND n.fiscal_type = '34' AND n.status = 'en_proceso';
    IF v_pending_credit > 0 AND p_amount > v_inv.balance_due - v_pending_credit THEN
        RAISE EXCEPTION 'Hay notas de crédito en proceso en la DGII por %: de este comprobante solo se puede cobrar % hasta que la DGII responda.',
            v_pending_credit, GREATEST(0, v_inv.balance_due - v_pending_credit);
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

-- El listado de cobros también rotula los e-CF de prueba: cambia la forma del resultado.
DROP FUNCTION IF EXISTS billing_list_payments(uuid, uuid, text, text, int, int);
CREATE FUNCTION billing_list_payments(
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
    dgii_environment TEXT,
    client_id UUID,
    client_name TEXT,
    total_count BIGINT
) AS $$
    SELECT
        p.id, p.receipt_number, p.payment_date, p.payment_method, p.reference_number, p.bank_name,
        p.amount, p.currency::text, p.voided_at, p.void_reason,
        inv.id, inv.invoice_number, inv.ncf, inv.dgii_environment, p.client_id,
        COALESCE(NULLIF(inv.buyer_snapshot->>'name', ''), 'Consumidor final'),
        COUNT(*) OVER ()
    FROM public.payments p
    LEFT JOIN LATERAL (
        SELECT i.id, i.invoice_number, i.ncf, i.dgii_environment, i.buyer_snapshot
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
-- 9. Permisos de las funciones nuevas
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_fn TEXT;
BEGIN
    -- Internas: solo se invocan desde las demás funciones.
    FOREACH v_fn IN ARRAY ARRAY[
        'billing_check_issuable(public.invoices)',
        'billing_return_to_draft(uuid)',
        'billing_lock_ecf(uuid, uuid, uuid)',
        'billing_ecf_release_number(public.ecf_invoices)',
        'billing_ecf_safe_qr(text)',
        'billing_ecf_snapshot_problem(public.ecf_invoices, timestamptz, text, text, numeric, text)',
        'billing_guard_settings_environment()'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', v_fn);
    END LOOP;

    -- Afirman qué respondió el proveedor: solo el servidor, tras comprobar al usuario.
    FOREACH v_fn IN ARRAY ARRAY[
        'billing_ecf_store_payload(uuid, uuid, uuid, text)',
        'billing_ecf_begin_send(uuid, uuid, uuid)',
        'billing_ecf_record_sent(uuid, uuid, uuid, text, text, timestamptz, text, text)',
        'billing_ecf_mark_ambiguous(uuid, uuid, uuid, text)',
        'billing_ecf_confirm_not_received(uuid, uuid, uuid)',
        'billing_ecf_send_refused(uuid, uuid, uuid, text, int)',
        'billing_release_ecf(uuid, uuid, uuid, text, jsonb, int, boolean)',
        'billing_apply_ecf_status(uuid, uuid, uuid, text, jsonb, boolean, text, text, text, text, timestamptz, text, text, timestamptz, numeric, text)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', v_fn);
    END LOOP;

    FOREACH v_fn IN ARRAY ARRAY[
        'billing_reserve_ecf(uuid)',
        'billing_list_payments(uuid, uuid, text, text, int, int)',
        'billing_customer_credits(uuid)',
        'billing_ecf_has_number(uuid, text, text)',
        'billing_save_provider_credentials(uuid, text, text, text)',
        'billing_read_provider_credentials(uuid, text)',
        'billing_provider_credentials_status(uuid, text)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', v_fn);
    END LOOP;
END $$;
