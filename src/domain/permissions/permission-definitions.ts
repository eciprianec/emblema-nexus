/**
 * Definiciones de permisos del sistema Emblema Nexus.
 * Cada permiso tiene el formato: modulo.accion
 */

export const PERMISSIONS = {
  // --- Clientes ---
  CLIENTS_VIEW: "clients.view",
  CLIENTS_CREATE: "clients.create",
  CLIENTS_EDIT: "clients.edit",
  CLIENTS_ARCHIVE: "clients.archive",

  // --- Expedientes ---
  CASES_VIEW: "cases.view",
  CASES_CREATE: "cases.create",
  CASES_EDIT: "cases.edit",
  CASES_ASSIGN: "cases.assign",
  CASES_CLOSE: "cases.close",
  CASES_REOPEN: "cases.reopen",

  // --- Documentos ---
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_DOWNLOAD: "documents.download",
  DOCUMENTS_EDIT: "documents.edit",
  DOCUMENTS_DELETE: "documents.delete",

  // --- Finanzas ---
  FINANCE_VIEW: "finance.view",
  FINANCE_CREATE: "finance.create",
  FINANCE_EDIT: "finance.edit",
  FINANCE_VOID: "finance.void",

  // --- Cuentas por Cobrar ---
  RECEIVABLES_VIEW: "receivables.view",
  RECEIVABLES_CREATE: "receivables.create",
  RECEIVABLES_COLLECT: "receivables.collect",
  RECEIVABLES_VOID: "receivables.void",

  // --- Cuentas por Pagar ---
  PAYABLES_VIEW: "payables.view",
  PAYABLES_CREATE: "payables.create",
  PAYABLES_PAY: "payables.pay",
  PAYABLES_VOID: "payables.void",

  // --- e-CF / DGII ---
  ECF_VIEW: "ecf.view",
  ECF_CREATE: "ecf.create",
  ECF_EMIT: "ecf.emit",
  ECF_CANCEL: "ecf.cancel",

  // --- Reportes ---
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  // --- Usuarios ---
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",

  // --- Roles y permisos ---
  ROLES_MANAGE: "roles.manage",
  PERMISSIONS_MANAGE: "permissions.manage",

  // --- Configuración ---
  CONFIG_MANAGE: "config.manage",

  // --- Versionamiento ---
  VERSION_VIEW: "version.view",
  VERSION_COMPARE: "version.compare",
  VERSION_RESTORE: "version.restore",
  VERSION_CREATE_SNAPSHOT: "version.create_snapshot",
  VERSION_MANAGE_IMPORTANT: "version.manage_important",

  // --- Auditoría ---
  AUDIT_VIEW: "audit.view",

  // --- Agenda ---
  CALENDAR_VIEW: "calendar.view",
  CALENDAR_CREATE: "calendar.create",
  CALENDAR_EDIT: "calendar.edit",
  CALENDAR_DELETE: "calendar.delete",

  // --- Notificaciones ---
  NOTIFICATIONS_VIEW: "notifications.view",
  NOTIFICATIONS_MANAGE: "notifications.manage",

  // --- Proveedores ---
  VENDORS_VIEW: "vendors.view",
  VENDORS_CREATE: "vendors.create",
  VENDORS_EDIT: "vendors.edit",
  VENDORS_ARCHIVE: "vendors.archive",

  // --- Propiedades ---
  PROPERTIES_VIEW: "properties.view",
  PROPERTIES_CREATE: "properties.create",
  PROPERTIES_EDIT: "properties.edit",
  PROPERTIES_ARCHIVE: "properties.archive",

  // --- Plantillas ---
  TEMPLATES_VIEW: "templates.view",
  TEMPLATES_CREATE: "templates.create",
  TEMPLATES_EDIT: "templates.edit",
  TEMPLATES_DELETE: "templates.delete",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Módulos del sistema con sus permisos agrupados.
 */
export const PERMISSION_MODULES = {
  clients: {
    label: "Clientes",
    permissions: [
      PERMISSIONS.CLIENTS_VIEW,
      PERMISSIONS.CLIENTS_CREATE,
      PERMISSIONS.CLIENTS_EDIT,
      PERMISSIONS.CLIENTS_ARCHIVE,
    ],
  },
  cases: {
    label: "Expedientes",
    permissions: [
      PERMISSIONS.CASES_VIEW,
      PERMISSIONS.CASES_CREATE,
      PERMISSIONS.CASES_EDIT,
      PERMISSIONS.CASES_ASSIGN,
      PERMISSIONS.CASES_CLOSE,
      PERMISSIONS.CASES_REOPEN,
    ],
  },
  documents: {
    label: "Documentos",
    permissions: [
      PERMISSIONS.DOCUMENTS_VIEW,
      PERMISSIONS.DOCUMENTS_UPLOAD,
      PERMISSIONS.DOCUMENTS_DOWNLOAD,
      PERMISSIONS.DOCUMENTS_EDIT,
      PERMISSIONS.DOCUMENTS_DELETE,
    ],
  },
  finance: {
    label: "Finanzas",
    permissions: [
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_CREATE,
      PERMISSIONS.FINANCE_EDIT,
      PERMISSIONS.FINANCE_VOID,
    ],
  },
  receivables: {
    label: "Cuentas por Cobrar",
    permissions: [
      PERMISSIONS.RECEIVABLES_VIEW,
      PERMISSIONS.RECEIVABLES_CREATE,
      PERMISSIONS.RECEIVABLES_COLLECT,
      PERMISSIONS.RECEIVABLES_VOID,
    ],
  },
  payables: {
    label: "Cuentas por Pagar",
    permissions: [
      PERMISSIONS.PAYABLES_VIEW,
      PERMISSIONS.PAYABLES_CREATE,
      PERMISSIONS.PAYABLES_PAY,
      PERMISSIONS.PAYABLES_VOID,
    ],
  },
  ecf: {
    label: "Facturación Electrónica",
    permissions: [
      PERMISSIONS.ECF_VIEW,
      PERMISSIONS.ECF_CREATE,
      PERMISSIONS.ECF_EMIT,
      PERMISSIONS.ECF_CANCEL,
    ],
  },
  reports: {
    label: "Reportes",
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT],
  },
  users: {
    label: "Usuarios",
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT,
    ],
  },
  admin: {
    label: "Administración",
    permissions: [
      PERMISSIONS.ROLES_MANAGE,
      PERMISSIONS.PERMISSIONS_MANAGE,
      PERMISSIONS.CONFIG_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
  versioning: {
    label: "Versionamiento",
    permissions: [
      PERMISSIONS.VERSION_VIEW,
      PERMISSIONS.VERSION_COMPARE,
      PERMISSIONS.VERSION_RESTORE,
      PERMISSIONS.VERSION_CREATE_SNAPSHOT,
      PERMISSIONS.VERSION_MANAGE_IMPORTANT,
    ],
  },
  calendar: {
    label: "Agenda",
    permissions: [
      PERMISSIONS.CALENDAR_VIEW,
      PERMISSIONS.CALENDAR_CREATE,
      PERMISSIONS.CALENDAR_EDIT,
      PERMISSIONS.CALENDAR_DELETE,
    ],
  },
  vendors: {
    label: "Proveedores",
    permissions: [
      PERMISSIONS.VENDORS_VIEW,
      PERMISSIONS.VENDORS_CREATE,
      PERMISSIONS.VENDORS_EDIT,
      PERMISSIONS.VENDORS_ARCHIVE,
    ],
  },
  properties: {
    label: "Propiedades",
    permissions: [
      PERMISSIONS.PROPERTIES_VIEW,
      PERMISSIONS.PROPERTIES_CREATE,
      PERMISSIONS.PROPERTIES_EDIT,
      PERMISSIONS.PROPERTIES_ARCHIVE,
    ],
  },
  templates: {
    label: "Plantillas",
    permissions: [
      PERMISSIONS.TEMPLATES_VIEW,
      PERMISSIONS.TEMPLATES_CREATE,
      PERMISSIONS.TEMPLATES_EDIT,
      PERMISSIONS.TEMPLATES_DELETE,
    ],
  },
} as const;
