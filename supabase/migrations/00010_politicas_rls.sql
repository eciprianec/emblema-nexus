-- Migración 10: Políticas RLS

CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT company_id 
    FROM company_members 
    WHERE user_id = (SELECT auth.uid()) AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION has_permission(p_company_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_has_perm BOOLEAN;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    -- Chequear en user_permissions
    SELECT granted INTO v_has_perm
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = v_user_id AND up.company_id = p_company_id AND p.key = p_permission_key;
    
    IF v_has_perm IS NOT NULL THEN
        RETURN v_has_perm;
    END IF;
    
    -- Chequear en role_permissions
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = v_user_id AND ur.company_id = p_company_id AND p.key = p_permission_key
    ) INTO v_has_perm;
    
    RETURN v_has_perm;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION is_admin(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = (SELECT auth.uid()) 
          AND ur.company_id = p_company_id
          AND r.name = 'Administrador'
          AND r.is_system = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Habilitar RLS en todas las tablas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_stage_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_type_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Miembros pueden ver sus empresas" ON companies FOR SELECT USING (id IN (SELECT get_user_company_ids()));
CREATE POLICY "Admins pueden editar sus empresas" ON companies FOR UPDATE USING (is_admin(id));

CREATE POLICY "Ver propio perfil" ON profiles FOR SELECT USING (id = (SELECT auth.uid()));
CREATE POLICY "Admins ven perfiles de su empresa" ON profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM company_members cm1 
        JOIN company_members cm2 ON cm1.company_id = cm2.company_id 
        WHERE cm1.user_id = (SELECT auth.uid()) AND cm2.user_id = profiles.id AND is_admin(cm1.company_id)
    )
);

CREATE POLICY "Ver miembros de su empresa" ON company_members FOR SELECT USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Ver roles empresa y sistema" ON roles FOR SELECT USING (company_id IN (SELECT get_user_company_ids()) OR company_id IS NULL);

CREATE POLICY "Ver permisos de rol empresa y sistema" ON role_permissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id AND (r.company_id IN (SELECT get_user_company_ids()) OR r.company_id IS NULL))
);

CREATE POLICY "Admins manejan roles de usuario de su empresa" ON user_roles USING (is_admin(company_id));
CREATE POLICY "Admins manejan permisos de usuario de su empresa" ON user_permissions USING (is_admin(company_id));

-- Restricción estricta (RESTRICTIVE) a nivel de empresa
CREATE POLICY "Tenant isolation for clients" ON clients AS RESTRICTIVE USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Permissive perms for clients" ON clients AS PERMISSIVE FOR ALL USING (has_permission(company_id, 'clients.view'));

CREATE POLICY "Tenant isolation for cases" ON cases AS RESTRICTIVE USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Permissive perms for cases" ON cases AS PERMISSIVE FOR ALL USING (has_permission(company_id, 'cases.view'));

-- Políticas que heredan de cases/company
CREATE POLICY "Hereda de company_id" ON case_participants FOR ALL USING (case_id IN (SELECT id FROM cases WHERE cases.id = case_participants.case_id AND company_id IN (SELECT get_user_company_ids())));
CREATE POLICY "Hereda de company_id cs" ON case_stage_instances FOR ALL USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Hereda de company_id ct" ON case_tasks FOR ALL USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Hereda de company_id cci" ON case_checklist_items FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Ver areas config" ON service_areas FOR SELECT USING (company_id IN (SELECT get_user_company_ids()) OR company_id IS NULL);
CREATE POLICY "Ver tipos de caso" ON case_types FOR SELECT USING (company_id IN (SELECT get_user_company_ids()) OR company_id IS NULL);
CREATE POLICY "Ver versiones caso" ON case_type_versions FOR SELECT USING (
    EXISTS (SELECT 1 FROM case_types ct WHERE ct.id = case_type_versions.case_type_id AND (ct.company_id IN (SELECT get_user_company_ids()) OR ct.company_id IS NULL))
);

CREATE POLICY "Ver tipos participante" ON participant_types FOR SELECT USING (company_id IN (SELECT get_user_company_ids()) OR company_id IS NULL);

CREATE POLICY "Ver revisiones empresa" ON entity_revisions FOR SELECT USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Ver snapshots empresa" ON snapshots FOR SELECT USING (company_id IN (SELECT get_user_company_ids()));
