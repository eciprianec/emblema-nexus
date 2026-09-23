-- Migración 16: Agrimensura, Catastro y Expedientes Catastrales (JI / DNMC - Fase 6)

-- 1. Parcelas y Terrenos Catastrales
CREATE TABLE IF NOT EXISTS cadastral_parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    designation TEXT NOT NULL, -- Ej: Parcela 15-Ref, D.C. 03
    title_number TEXT, -- Matrícula o Número de Título del Registro de Títulos
    cadastral_district TEXT NOT NULL, -- Distrito Catastral (D.C.)
    portion_number TEXT,
    solar_number TEXT,
    block_number TEXT,
    province TEXT NOT NULL,
    municipality TEXT NOT NULL,
    sector TEXT,
    address TEXT,
    area_m2 NUMERIC(15, 2) NOT NULL,
    area_tareas NUMERIC(15, 2) GENERATED ALWAYS AS (ROUND(area_m2 / 628.86, 2)) STORED, -- 1 Tarea dominicana = 628.86 m2
    perimeter_m NUMERIC(15, 2),
    utm_zone TEXT DEFAULT '19N',
    datum TEXT DEFAULT 'WGS84',
    centroid_lat NUMERIC(10, 7),
    centroid_lng NUMERIC(10, 7),
    centroid_utm_north NUMERIC(15, 3),
    centroid_utm_east NUMERIC(15, 3),
    polygon_geometry JSONB DEFAULT '{"type": "Polygon", "coordinates": []}'::jsonb, -- GeoJSON estándar
    boundaries JSONB DEFAULT '{"norte": "", "sur": "", "este": "", "oeste": ""}'::jsonb, -- Colindancias oficiales
    status TEXT DEFAULT 'en_proceso' CHECK (status IN ('en_proceso', 'sometido_dnmc', 'observado', 'aprobado_dnmc', 'titulado', 'rechazado')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcels_company ON cadastral_parcels(company_id);
CREATE INDEX IF NOT EXISTS idx_parcels_case ON cadastral_parcels(case_id);
CREATE INDEX IF NOT EXISTS idx_parcels_client ON cadastral_parcels(client_id);
CREATE INDEX IF NOT EXISTS idx_parcels_designation ON cadastral_parcels(company_id, designation);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON cadastral_parcels(company_id, status);

-- 2. Expedientes Catastrales ante la Dirección Nacional de Mensuras Catastrales (DNMC)
CREATE TABLE IF NOT EXISTS cadastral_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES cadastral_parcels(id) ON DELETE SET NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('deslinde', 'subdivision', 'refundicion', 'urbanizacion', 'actualizacion_parcelaria', 'saneamiento', 'replanteo', 'modificacion_parcelaria', 'otro')),
    dnmc_file_number TEXT, -- Ej: E-2024-MC-0492
    regional_directorate TEXT NOT NULL CHECK (regional_directorate IN ('central', 'norte', 'este', 'noreste', 'suroeste')),
    surveyor_id UUID REFERENCES profiles(id),
    codia_number TEXT, -- Número de Colegiatura CODIA del agrimensor a cargo
    authorization_date DATE, -- Fecha del Oficio de Designación de Agrimensor
    field_work_date DATE, -- Fecha fijada para la Mensura de Campo
    newspaper_publication_date DATE, -- Publicación de Aviso en periódico de circulación nacional
    submission_date DATE, -- Fecha de presentación/depósito ante la DNMC
    current_stage TEXT NOT NULL CHECK (current_stage IN ('solicitud_autorizacion', 'aviso_publicacion', 'trabajos_campo', 'elaboracion_planos', 'sometido_dnmc', 'revision_tecnica', 'oficio_observacion', 'aprobado_dnmc', 'en_tribunal_tierras', 'en_registro_titulos', 'concluido_titulado')),
    approval_date DATE,
    approval_resolution_number TEXT,
    rejection_reason TEXT,
    observation_details TEXT,
    observation_due_date DATE, -- Plazo legal para subsanar observaciones
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cadastral_files_company ON cadastral_files(company_id);
CREATE INDEX IF NOT EXISTS idx_cadastral_files_case ON cadastral_files(case_id);
CREATE INDEX IF NOT EXISTS idx_cadastral_files_parcel ON cadastral_files(parcel_id);
CREATE INDEX IF NOT EXISTS idx_cadastral_files_dnmc ON cadastral_files(company_id, dnmc_file_number);
CREATE INDEX IF NOT EXISTS idx_cadastral_files_stage ON cadastral_files(company_id, current_stage);

-- 3. Vértices y Puntos Topográficos de la Parcela
CREATE TABLE IF NOT EXISTS survey_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parcel_id UUID NOT NULL REFERENCES cadastral_parcels(id) ON DELETE CASCADE,
    point_name TEXT NOT NULL, -- P1, P2, EST-1, GPS-01
    point_type TEXT DEFAULT 'vertice_lindero' CHECK (point_type IN ('vertice_lindero', 'estacion_referencia', 'punto_control_cors', 'detalle_fisico', 'arbol_mojon', 'canal_rio', 'calle_camino')),
    utm_north NUMERIC(15, 3) NOT NULL, -- Norte Y (m)
    utm_east NUMERIC(15, 3) NOT NULL, -- Este X (m)
    elevation NUMERIC(10, 3) DEFAULT 0.000, -- Cota Z (m)
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    order_index INT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_points_parcel ON survey_points(parcel_id, order_index);

-- 4. Jornadas de Campo, Brigadas y Equipos Topográficos
CREATE TABLE IF NOT EXISTS survey_field_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cadastral_file_id UUID NOT NULL REFERENCES cadastral_files(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    chief_surveyor_id UUID REFERENCES profiles(id),
    equipment_type TEXT NOT NULL CHECK (equipment_type IN ('gps_gnss_rtk', 'estacion_total', 'nivel_optico', 'dron_fotogrametrico', 'mixto')),
    equipment_model TEXT, -- Ej: Trimble R12i GNSS, Leica TS06 Plus
    calibration_certificate_number TEXT,
    base_station_point TEXT, -- Ej: Estación CORS SD01
    weather_conditions TEXT,
    witness_attendees JSONB DEFAULT '[]'::jsonb, -- Colindantes y testigos presentes en el levantamiento
    linear_closure_error NUMERIC(10, 4), -- Error de cierre lineal (m)
    angular_closure_error NUMERIC(10, 4), -- Error de cierre angular (segundos)
    status TEXT DEFAULT 'completada' CHECK (status IN ('programada', 'en_curso', 'completada', 'reprogramada_lluvia', 'suspendida_conflicto')),
    field_notes TEXT,
    raw_file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_sessions_file ON survey_field_sessions(cadastral_file_id);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_date ON survey_field_sessions(company_id, session_date);

-- Triggers de actualización
CREATE TRIGGER set_updated_at_cadastral_parcels
BEFORE UPDATE ON cadastral_parcels
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_cadastral_files
BEFORE UPDATE ON cadastral_files
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Habilitar RLS
ALTER TABLE cadastral_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadastral_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_field_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "tenant_boundary_cadastral_parcels" ON cadastral_parcels
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "cadastral_parcels_all" ON cadastral_parcels FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_cadastral_files" ON cadastral_files
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "cadastral_files_all" ON cadastral_files FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_survey_points" ON survey_points
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "survey_points_all" ON survey_points FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "tenant_boundary_survey_field_sessions" ON survey_field_sessions
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "survey_field_sessions_all" ON survey_field_sessions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
