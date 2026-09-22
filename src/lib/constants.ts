/**
 * Constantes globales de Emblema Nexus.
 * Plataforma Integral de Gestión Empresarial.
 */

// --- Identidad del producto ---
export const APP_NAME = "Emblema Nexus";
export const APP_SUBTITLE = "Plataforma Integral de Gestión Empresarial";
export const APP_DESCRIPTION =
  "Plataforma integral para gestión de servicios legales, agrimensura e inmobiliarios.";

// --- Zona horaria ---
export const DEFAULT_TIMEZONE = "America/Santo_Domingo";
export const DEFAULT_LOCALE = "es-DO";
export const DEFAULT_CURRENCY = "DOP";

// --- Estados de expediente ---
export const CASE_STATUSES = {
  borrador: { label: "Borrador", color: "slate" },
  abierto: { label: "Abierto", color: "blue" },
  en_proceso: { label: "En proceso", color: "amber" },
  pendiente_cliente: { label: "Pendiente cliente", color: "orange" },
  pendiente_tercero: { label: "Pendiente tercero", color: "orange" },
  pendiente_institucion: { label: "Pendiente institución", color: "orange" },
  en_revision: { label: "En revisión", color: "purple" },
  completado: { label: "Completado", color: "green" },
  suspendido: { label: "Suspendido", color: "red" },
  cancelado: { label: "Cancelado", color: "red" },
  cerrado: { label: "Cerrado", color: "slate" },
} as const;

export type CaseStatus = keyof typeof CASE_STATUSES;

// --- Prioridades ---
export const PRIORITIES = {
  baja: { label: "Baja", color: "slate" },
  normal: { label: "Normal", color: "blue" },
  alta: { label: "Alta", color: "amber" },
  urgente: { label: "Urgente", color: "red" },
} as const;

export type Priority = keyof typeof PRIORITIES;

// --- Estados de etapa ---
export const STAGE_STATUSES = {
  pendiente: { label: "Pendiente", color: "slate" },
  en_proceso: { label: "En proceso", color: "blue" },
  completado: { label: "Completado", color: "green" },
  omitido: { label: "Omitido", color: "amber" },
  bloqueado: { label: "Bloqueado", color: "red" },
} as const;

// --- Estados de tarea ---
export const TASK_STATUSES = {
  pendiente: { label: "Pendiente", color: "slate" },
  en_proceso: { label: "En proceso", color: "blue" },
  completado: { label: "Completado", color: "green" },
  cancelado: { label: "Cancelado", color: "red" },
} as const;

// --- Estados de checklist ---
export const CHECKLIST_STATUSES = {
  pendiente: { label: "Pendiente", color: "slate" },
  solicitado: { label: "Solicitado", color: "blue" },
  recibido: { label: "Recibido", color: "green" },
  rechazado: { label: "Rechazado", color: "red" },
  aprobado: { label: "Aprobado", color: "emerald" },
  no_aplica: { label: "No aplica", color: "gray" },
} as const;

// --- Tipos de cliente ---
export const CLIENT_TYPES = {
  persona_fisica: { label: "Persona física" },
  persona_juridica: { label: "Persona jurídica" },
} as const;

// --- Paginación ---
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
