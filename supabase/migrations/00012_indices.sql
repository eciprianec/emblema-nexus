-- Migración 12: Índices para rendimiento de RLS y búsquedas

CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);

CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company ON user_roles(company_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company ON user_permissions(company_id);

CREATE INDEX IF NOT EXISTS idx_cases_company ON cases(company_id);
CREATE INDEX IF NOT EXISTS idx_case_participants_case ON case_participants(case_id);
CREATE INDEX IF NOT EXISTS idx_case_stage_instances_case ON case_stage_instances(case_id);
CREATE INDEX IF NOT EXISTS idx_case_stage_instances_company ON case_stage_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_case ON case_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_company ON case_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_case_checklist_items_case ON case_checklist_items(case_id);
CREATE INDEX IF NOT EXISTS idx_case_checklist_items_company ON case_checklist_items(company_id);

CREATE INDEX IF NOT EXISTS idx_service_areas_company ON service_areas(company_id);
CREATE INDEX IF NOT EXISTS idx_case_types_company ON case_types(company_id);
CREATE INDEX IF NOT EXISTS idx_case_type_versions_type ON case_type_versions(case_type_id);
CREATE INDEX IF NOT EXISTS idx_participant_types_company ON participant_types(company_id);
