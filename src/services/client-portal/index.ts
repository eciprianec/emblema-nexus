/**
 * Módulo de Portal de Clientes, Consultas Externas y Tracking de Expedientes (Fase 8)
 * Emblema Nexus — República Dominicana
 *
 * Provee la lógica de negocio y servicios para:
 * - Autenticación al portal sin contraseña (Magic PIN y Token de acceso permanente).
 * - Dashboard integral para clientes (casos activos, facturación e-CF, requerimientos documentales).
 * - Consulta y seguimiento público de expedientes mediante códigos alfanuméricos únicos.
 * - Recepción de consultas externas y conversión automática a clientes y expedientes.
 * - Requerimientos de documentación al cliente y validación de entregas.
 */

export * from "./PortalAuthService";
export * from "./ClientPortalService";
export * from "./TrackingService";
export * from "./InquiryService";
export * from "./DocumentRequestService";
