-- Migración 19: Reportes Avanzados, Business Intelligence y Exportaciones Fiscales DGII (Fase 9)
-- Emblema Nexus — República Dominicana

-- 1. Catálogo de Definiciones de Reportes
CREATE TABLE IF NOT EXISTS report_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- 'DGII_606', 'DGII_607', 'DGII_608', 'CASE_PROFITABILITY', 'TEAM_PRODUCTIVITY', 'CADASTRAL_SUMMARY', 'REAL_ESTATE_BI'
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('fiscal_dgii', 'financiero', 'operativo', 'agrimensura', 'inmobiliario')),
    default_params JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_report_definitions_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_report_definitions_company ON report_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_code ON report_definitions(company_id, code);
CREATE INDEX IF NOT EXISTS idx_report_definitions_category ON report_definitions(company_id, category);

-- 2. Historial de Reportes Generados y Exportaciones
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    report_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    period_start DATE NULL,
    period_end DATE NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('csv', 'txt', 'excel', 'json', 'pdf')),
    status VARCHAR(30) NOT NULL DEFAULT 'completado' CHECK (status IN ('generando', 'completado', 'fallido')),
    data_payload JSONB NULL, -- Resumen estructurado del reporte
    file_url VARCHAR(500) NULL,
    created_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_company ON generated_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_code ON generated_reports(company_id, report_code);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created ON generated_reports(company_id, created_at DESC);

-- Triggers de actualización
CREATE TRIGGER set_updated_at_report_definitions
BEFORE UPDATE ON report_definitions
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Habilitar RLS
ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS Multitenant
CREATE POLICY "tenant_boundary_report_definitions" ON report_definitions
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "report_definitions_all" ON report_definitions
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_generated_reports" ON generated_reports
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "generated_reports_all" ON generated_reports
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);


-- 3. Vistas Analíticas de Business Intelligence

-- Vista 1: Consolidado de KPIs Financieros por Empresa
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
        SUM(i.total) FILTER (WHERE i.status NOT IN ('borrador', 'anulada')) AS total_invoiced,
        SUM(i.total) FILTER (
            WHERE i.status NOT IN ('borrador', 'anulada') 
            AND (i.ncf LIKE 'E%' OR EXISTS (
                SELECT 1 FROM ecf_invoices ei 
                WHERE ei.invoice_id = i.id 
                AND ei.dgii_status NOT IN ('rechazado', 'anulado')
            ))
        ) AS total_ecf_invoiced,
        SUM(i.itbis) FILTER (WHERE i.status NOT IN ('borrador', 'anulada')) AS total_itbis,
        SUM(i.balance_due) FILTER (WHERE i.status IN ('emitida', 'parcialmente_pagada', 'vencida')) AS total_outstanding
    FROM invoices i
    GROUP BY i.company_id
) inv ON inv.company_id = c.id
LEFT JOIN (
    SELECT 
        p.company_id,
        SUM(p.amount) AS total_collected
    FROM payments p
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
        SUM(i.total) AS total_billed,
        COALESCE(SUM(item_agg.fees_sum), 0.00) AS fees_billed,
        COALESCE(SUM(item_agg.other_sum), 0.00) AS other_billed
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


-- Vista 3: Productividad Operativa por Miembro del Equipo
CREATE OR REPLACE VIEW view_operational_productivity AS
SELECT 
    cm.company_id,
    p.id AS user_id,
    TRIM(CONCAT(p.first_name, ' ', COALESCE(p.last_name, ''))) AS user_name,
    p.phone AS user_phone,
    p.user_type,
    
    -- Expedientes asignados
    COALESCE(c_agg.total_cases, 0) AS total_cases,
    COALESCE(c_agg.completed_cases, 0) AS completed_cases,
    COALESCE(c_agg.active_cases, 0) AS active_cases,
    
    -- Tareas asignadas
    COALESCE(t_agg.total_tasks, 0) AS total_tasks,
    COALESCE(t_agg.completed_tasks, 0) AS completed_tasks,
    COALESCE(t_agg.tasks_on_time, 0) AS tasks_on_time,
    COALESCE(t_agg.tasks_late, 0) AS tasks_late,
    COALESCE(t_agg.tasks_overdue_pending, 0) AS tasks_overdue_pending,
    COALESCE(t_agg.total_overdue, 0) AS total_overdue,
    
    -- Tasa de cumplimiento a tiempo (%)
    CASE 
        WHEN COALESCE(t_agg.completed_tasks, 0) > 0 THEN
            ROUND((COALESCE(t_agg.tasks_on_time, 0)::NUMERIC / t_agg.completed_tasks::NUMERIC) * 100, 2)
        ELSE 0.00
    END AS on_time_rate
FROM company_members cm
JOIN profiles p ON p.id = cm.user_id
LEFT JOIN (
    SELECT 
        company_id,
        responsible_id,
        COUNT(*) AS total_cases,
        COUNT(*) FILTER (WHERE status IN ('completado', 'cerrado')) AS completed_cases,
        COUNT(*) FILTER (WHERE status NOT IN ('completado', 'cerrado', 'cancelado', 'borrador')) AS active_cases
    FROM cases
    WHERE responsible_id IS NOT NULL
    GROUP BY company_id, responsible_id
) c_agg ON c_agg.company_id = cm.company_id AND c_agg.responsible_id = p.id
LEFT JOIN (
    SELECT 
        company_id,
        responsible_id,
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'completado') AS completed_tasks,
        COUNT(*) FILTER (WHERE status = 'completado' AND (due_date IS NULL OR completed_at <= due_date)) AS tasks_on_time,
        COUNT(*) FILTER (WHERE status = 'completado' AND due_date IS NOT NULL AND completed_at > due_date) AS tasks_late,
        COUNT(*) FILTER (WHERE status NOT IN ('completado', 'cancelado') AND due_date IS NOT NULL AND due_date < now()) AS tasks_overdue_pending,
        COUNT(*) FILTER (
            (status NOT IN ('completado', 'cancelado') AND due_date IS NOT NULL AND due_date < now()) OR
            (status = 'completado' AND due_date IS NOT NULL AND completed_at > due_date)
        ) AS total_overdue
    FROM tasks
    WHERE responsible_id IS NOT NULL
    GROUP BY company_id, responsible_id
) t_agg ON t_agg.company_id = cm.company_id AND t_agg.responsible_id = p.id
WHERE cm.is_active = TRUE;


-- 4. Inserción de Definiciones de Reportes por Defecto para empresas existentes
DO $$
DECLARE
    comp RECORD;
BEGIN
    FOR comp IN SELECT id FROM companies LOOP
        INSERT INTO report_definitions (company_id, code, title, description, category, default_params)
        VALUES
        (
            comp.id,
            'DGII_606',
            'Formato 606: Compras de Bienes y Servicios',
            'Reporte mensual obligatorio para la DGII de costos y gastos con retenciones de ITBIS e ISR.',
            'fiscal_dgii',
            '{"format": "txt", "requires_period": true}'::jsonb
        ),
        (
            comp.id,
            'DGII_607',
            'Formato 607: Ventas y Operaciones',
            'Reporte mensual de ventas e ingresos facturados con NCF y retenciones recibidas.',
            'fiscal_dgii',
            '{"format": "txt", "requires_period": true}'::jsonb
        ),
        (
            comp.id,
            'DGII_608',
            'Formato 608: Comprobantes Fiscales Anulados',
            'Reporte oficial ante la DGII de números de comprobantes fiscales cancelados y motivo de anulación.',
            'fiscal_dgii',
            '{"format": "txt", "requires_period": true}'::jsonb
        ),
        (
            comp.id,
            'CASE_PROFITABILITY',
            'Rentabilidad y Márgenes por Expediente',
            'Análisis financiero por caso legal o catastral comparando honorarios facturados contra tasas y gastos directos.',
            'financiero',
            '{"format": "csv", "min_margin": 0}'::jsonb
        ),
        (
            comp.id,
            'TEAM_PRODUCTIVITY',
            'Productividad y Rendimiento del Equipo',
            'Métricas de desempeño de abogados, agrimensores y asesores: casos concluidos, tareas a tiempo y demoras.',
            'operativo',
            '{"format": "csv"}'::jsonb
        ),
        (
            comp.id,
            'CADASTRAL_SUMMARY',
            'Resumen Ejecutivo de Agrimensura y Catastro',
            'Superficie total en m² y Tareas, distribución de expedientes ante la DNMC por regional y tiempos de aprobación.',
            'agrimensura',
            '{"format": "csv"}'::jsonb
        ),
        (
            comp.id,
            'REAL_ESTATE_BI',
            'Business Intelligence Inmobiliario y Corretaje',
            'Métricas de conversión de citas a contratos, volumen transaccionado en USD/DOP y liquidación de comisiones.',
            'inmobiliario',
            '{"format": "csv"}'::jsonb
        )
        ON CONFLICT (company_id, code) DO NOTHING;
    END LOOP;
END;
$$;
