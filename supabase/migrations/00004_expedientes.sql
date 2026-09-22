-- Migración 4: Expedientes y tareas

CREATE TABLE IF NOT EXISTS service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO service_areas (company_id, name, code) VALUES
(NULL, 'Legal', 'LEG'),
(NULL, 'Agrimensura', 'AGR'),
(NULL, 'Inmobiliaria', 'INM');

CREATE TABLE IF NOT EXISTS case_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    current_version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_type_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_type_id UUID NOT NULL REFERENCES case_types(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    workflow_definition JSONB,
    checklist_definition JSONB,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (case_type_id, version_number)
);

CREATE TABLE IF NOT EXISTS numbering_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    area_id UUID REFERENCES service_areas(id) ON DELETE CASCADE,
    prefix TEXT,
    include_year BOOLEAN DEFAULT TRUE,
    include_area BOOLEAN DEFAULT TRUE,
    pad_length INT DEFAULT 4,
    current_value BIGINT DEFAULT 0,
    UNIQUE (company_id, area_id)
);

CREATE OR REPLACE FUNCTION generate_case_number(p_company_id UUID, p_area_id UUID)
RETURNS TEXT AS $$
DECLARE
    seq_record RECORD;
    new_val BIGINT;
    year_str TEXT;
    area_code TEXT;
    final_number TEXT;
BEGIN
    SELECT * INTO seq_record FROM numbering_sequences 
    WHERE company_id = p_company_id AND (area_id = p_area_id OR area_id IS NULL)
    ORDER BY area_id NULLS LAST LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO numbering_sequences (company_id, area_id, prefix)
        VALUES (p_company_id, p_area_id, 'EXP') RETURNING * INTO seq_record;
    END IF;

    new_val := seq_record.current_value + 1;
    UPDATE numbering_sequences SET current_value = new_val WHERE id = seq_record.id;

    final_number := COALESCE(seq_record.prefix, 'EXP');

    IF seq_record.include_area THEN
        SELECT code INTO area_code FROM service_areas WHERE id = p_area_id;
        final_number := final_number || '-' || COALESCE(area_code, 'GEN');
    END IF;

    IF seq_record.include_year THEN
        year_str := to_char(now(), 'YYYY');
        final_number := final_number || '-' || year_str;
    END IF;

    final_number := final_number || '-' || LPAD(new_val::TEXT, seq_record.pad_length, '0');
    
    RETURN final_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TABLE IF NOT EXISTS participant_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO participant_types (company_id, name, code) VALUES
(NULL, 'Cliente Principal', 'cliente_principal'),
(NULL, 'Representante', 'representante'),
(NULL, 'Comprador', 'comprador'),
(NULL, 'Vendedor', 'vendedor'),
(NULL, 'Propietario', 'propietario'),
(NULL, 'Copropietario', 'copropietario'),
(NULL, 'Empleador', 'empleador'),
(NULL, 'Empleado', 'empleado'),
(NULL, 'Abogado', 'abogado'),
(NULL, 'Agrimensor', 'agrimensor'),
(NULL, 'Proveedor', 'proveedor'),
(NULL, 'Tercero', 'tercero'),
(NULL, 'Testigo', 'testigo'),
(NULL, 'Contacto', 'contacto'),
(NULL, 'Otro', 'otro');

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    area_id UUID NOT NULL REFERENCES service_areas(id),
    case_type_id UUID NOT NULL REFERENCES case_types(id),
    case_type_version_id UUID REFERENCES case_type_versions(id),
    case_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('borrador','abierto','en_proceso','pendiente_cliente','pendiente_tercero','pendiente_institucion','en_revision','completado','suspendido','cancelado','cerrado')) DEFAULT 'borrador',
    current_stage_id UUID,
    responsible_id UUID REFERENCES profiles(id),
    supervisor_id UUID REFERENCES profiles(id),
    priority TEXT CHECK (priority IN ('baja','normal','alta','urgente')) DEFAULT 'normal',
    opened_at TIMESTAMPTZ,
    expected_close_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (company_id, case_number)
);

CREATE INDEX IF NOT EXISTS idx_cases_company_client ON cases(company_id, client_id);
CREATE INDEX IF NOT EXISTS idx_cases_responsible ON cases(responsible_id);

CREATE TABLE IF NOT EXISTS case_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    participant_type_id UUID NOT NULL REFERENCES participant_types(id),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (case_id, client_id, participant_type_id)
);

CREATE TABLE IF NOT EXISTS case_stage_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    stage_definition JSONB,
    stage_name TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    status TEXT CHECK (status IN ('pendiente', 'en_progreso', 'completado', 'cancelado')) DEFAULT 'pendiente',
    responsible_id UUID REFERENCES profiles(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expected_duration_days INT,
    sla_deadline TIMESTAMPTZ,
    is_extraordinary BOOLEAN DEFAULT FALSE,
    extraordinary_reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cases ADD CONSTRAINT fk_current_stage FOREIGN KEY (current_stage_id) REFERENCES case_stage_instances(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS case_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    stage_instance_id UUID REFERENCES case_stage_instances(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    responsible_id UUID REFERENCES profiles(id),
    priority TEXT CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')) DEFAULT 'normal',
    status TEXT CHECK (status IN ('pendiente', 'en_progreso', 'completado', 'cancelado')) DEFAULT 'pendiente',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    status TEXT CHECK (status IN ('pendiente','solicitado','recibido','rechazado','aprobado','no_aplica')) DEFAULT 'pendiente',
    document_id UUID,
    due_date TIMESTAMPTZ,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_cases BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at_case_stage_instances BEFORE UPDATE ON case_stage_instances FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at_case_tasks BEFORE UPDATE ON case_tasks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at_case_checklist_items BEFORE UPDATE ON case_checklist_items FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
