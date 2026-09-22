-- Migración 2: Permisos y roles

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE (user_id, role_id, company_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE,
    UNIQUE (user_id, permission_id, company_id)
);

-- Permisos iniciales
INSERT INTO permissions (key, module, action) VALUES
('clients.view', 'clients', 'view'), ('clients.create', 'clients', 'create'), ('clients.edit', 'clients', 'edit'), ('clients.archive', 'clients', 'archive'),
('cases.view', 'cases', 'view'), ('cases.create', 'cases', 'create'), ('cases.edit', 'cases', 'edit'), ('cases.assign', 'cases', 'assign'), ('cases.close', 'cases', 'close'), ('cases.reopen', 'cases', 'reopen'),
('documents.view', 'documents', 'view'), ('documents.upload', 'documents', 'upload'), ('documents.download', 'documents', 'download'), ('documents.edit', 'documents', 'edit'), ('documents.delete', 'documents', 'delete'),
('finance.view', 'finance', 'view'), ('finance.create', 'finance', 'create'), ('finance.edit', 'finance', 'edit'), ('finance.void', 'finance', 'void'),
('receivables.view', 'receivables', 'view'), ('receivables.create', 'receivables', 'create'), ('receivables.collect', 'receivables', 'collect'), ('receivables.void', 'receivables', 'void'),
('payables.view', 'payables', 'view'), ('payables.create', 'payables', 'create'), ('payables.pay', 'payables', 'pay'), ('payables.void', 'payables', 'void'),
('ecf.view', 'ecf', 'view'), ('ecf.create', 'ecf', 'create'), ('ecf.emit', 'ecf', 'emit'), ('ecf.cancel', 'ecf', 'cancel'),
('reports.view', 'reports', 'view'), ('reports.export', 'reports', 'export'),
('users.view', 'users', 'view'), ('users.create', 'users', 'create'), ('users.edit', 'users', 'edit'),
('roles.manage', 'roles', 'manage'),
('permissions.manage', 'permissions', 'manage'),
('config.manage', 'config', 'manage'),
('version.view', 'version', 'view'), ('version.compare', 'version', 'compare'), ('version.restore', 'version', 'restore'), ('version.create_snapshot', 'version', 'create_snapshot'), ('version.manage_important', 'version', 'manage_important'),
('audit.view', 'audit', 'view'),
('calendar.view', 'calendar', 'view'), ('calendar.create', 'calendar', 'create'), ('calendar.edit', 'calendar', 'edit'), ('calendar.delete', 'calendar', 'delete'),
('notifications.view', 'notifications', 'view'), ('notifications.manage', 'notifications', 'manage'),
('vendors.view', 'vendors', 'view'), ('vendors.create', 'vendors', 'create'), ('vendors.edit', 'vendors', 'edit'), ('vendors.archive', 'vendors', 'archive'),
('properties.view', 'properties', 'view'), ('properties.create', 'properties', 'create'), ('properties.edit', 'properties', 'edit'), ('properties.archive', 'properties', 'archive'),
('templates.view', 'templates', 'view'), ('templates.create', 'templates', 'create'), ('templates.edit', 'templates', 'edit'), ('templates.delete', 'templates', 'delete')
ON CONFLICT (key) DO NOTHING;

-- Roles del sistema
INSERT INTO roles (company_id, name, is_system) VALUES
(NULL, 'Administrador', TRUE),
(NULL, 'Gerente', TRUE),
(NULL, 'Abogado', TRUE),
(NULL, 'Agrimensor', TRUE),
(NULL, 'Agente Inmobiliario', TRUE),
(NULL, 'Contabilidad', TRUE),
(NULL, 'Secretaria', TRUE),
(NULL, 'Asistente', TRUE),
(NULL, 'Cliente Portal', TRUE);

DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM roles WHERE name = 'Administrador' AND is_system = TRUE;
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_id, id FROM permissions ON CONFLICT DO NOTHING;
END $$;
