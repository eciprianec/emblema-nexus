-- Migración 13: Agenda, Tareas, Asistentes y Notificaciones (Fase 3)

-- 1. Tabla de Eventos de Calendario
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT CHECK (event_type IN ('audiencia', 'cita_cliente', 'mensura_campo', 'vencimiento_plazo', 'reunion_interna', 'otro')) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    location TEXT,
    virtual_meeting_url TEXT,
    status TEXT CHECK (status IN ('programado', 'en_proceso', 'completado', 'suspendido', 'cancelado', 'reprogramado')) DEFAULT 'programado',
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    reminder_minutes INT DEFAULT 60,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON calendar_events(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_case ON calendar_events(case_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(company_id, start_time, end_time);

-- 2. Tabla de Asistentes al Evento
CREATE TABLE IF NOT EXISTS calendar_event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pendiente', 'confirmado', 'rechazado')) DEFAULT 'pendiente',
    is_organizer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON calendar_event_attendees(user_id);

-- 3. Tabla de Tareas Centralizadas
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    stage_instance_id UUID REFERENCES case_stage_instances(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    responsible_id UUID REFERENCES profiles(id),
    supervisor_id UUID REFERENCES profiles(id),
    priority TEXT CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')) DEFAULT 'normal',
    status TEXT CHECK (status IN ('pendiente', 'en_proceso', 'en_revision', 'completado', 'cancelado')) DEFAULT 'pendiente',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    checklist JSONB,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_responsible ON tasks(responsible_id);
CREATE INDEX IF NOT EXISTS idx_tasks_case ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(company_id, due_date);

-- 4. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT CHECK (notification_type IN ('tarea', 'plazo', 'audiencia', 'expediente', 'documento', 'sistema')) DEFAULT 'sistema',
    entity_type TEXT,
    entity_id UUID,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Triggers de actualización
CREATE TRIGGER set_updated_at_calendar_events
BEFORE UPDATE ON calendar_events
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_tasks
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Habilitar RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS Calendar
CREATE POLICY "tenant_boundary_calendar_events" ON calendar_events
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "calendar_events_select" ON calendar_events
    FOR SELECT TO authenticated
    USING (has_permission(company_id, 'calendar.view'));

CREATE POLICY "calendar_events_insert" ON calendar_events
    FOR INSERT TO authenticated
    WITH CHECK (has_permission(company_id, 'calendar.create'));

CREATE POLICY "calendar_events_update" ON calendar_events
    FOR UPDATE TO authenticated
    USING (has_permission(company_id, 'calendar.edit'))
    WITH CHECK (has_permission(company_id, 'calendar.edit'));

CREATE POLICY "calendar_events_delete" ON calendar_events
    FOR DELETE TO authenticated
    USING (has_permission(company_id, 'calendar.delete'));

-- Políticas RLS Tareas
CREATE POLICY "tenant_boundary_tasks" ON tasks
    AS RESTRICTIVE TO authenticated
    USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "tasks_select" ON tasks
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT TO authenticated
    WITH CHECK (TRUE);

CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE TO authenticated
    USING (TRUE);

CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE TO authenticated
    USING (TRUE);

-- Políticas RLS Notificaciones (cada usuario ve sus propias notificaciones)
CREATE POLICY "notifications_user_policy" ON notifications
    FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));
