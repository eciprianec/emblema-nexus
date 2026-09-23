/**
 * Módulo de Reportes Avanzados, Business Intelligence y Exportaciones Fiscales DGII (Fase 9)
 * Emblema Nexus — República Dominicana
 *
 * Provee servicios integrales para:
 * - Generación de formatos fiscales oficiales DGII (606, 607, 608) y archivos planos TXT delimitados por pipe (|).
 * - Business Intelligence Financiero (KPIs consolidados, rentabilidad individual por expediente, cartera vencida Aging).
 * - Business Intelligence Operativo (productividad de abogados y agrimensores, métricas de mensura y catastro DNMC, inventario inmobiliario y comisiones).
 * - Generador de exportaciones a CSV con BOM UTF-8 (compatibilidad total con Excel en Windows) y JSON.
 * - Orquestador central del catálogo de reportes e histórico de ejecuciones.
 */

export * from "./ExportService";
export * from "./DgiiReportService";
export * from "./FinancialBiService";
export * from "./OperationalBiService";
export * from "./ReportService";
