import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ReportDefinitionRow,
  GeneratedReportRow,
  ReportCategory,
  ReportFormat,
} from "@/types/database.types";
import { dgiiReportService } from "./DgiiReportService";
import { financialBiService } from "./FinancialBiService";
import { operationalBiService } from "./OperationalBiService";
import { exportService } from "./ExportService";

export interface GenerateReportParams {
  period?: string; // YYYYMM o YYYY-MM
  startDate?: string;
  endDate?: string;
  format?: ReportFormat;
  limit?: number;
  minMargin?: number;
  [key: string]: any;
}

export interface GenerateReportResult {
  reportRecord: GeneratedReportRow;
  exportContent?: string; // Contenido CSV o TXT generado
  dataPayload: any; // Datos estructurados del reporte
}

/**
 * Catálogo maestro de definiciones de reportes por defecto
 */
const DEFAULT_REPORT_DEFINITIONS: {
  code: string;
  title: string;
  description: string;
  category: ReportCategory;
  default_params: Record<string, any>;
}[] = [
  {
    code: "DGII_606",
    title: "Formato 606: Compras de Bienes y Servicios",
    description:
      "Reporte fiscal mensual obligatorio ante la DGII de costos, gastos y compras con los 11 tipos oficiales y retenciones de ITBIS/ISR.",
    category: "fiscal_dgii",
    default_params: { format: "txt", requires_period: true },
  },
  {
    code: "DGII_607",
    title: "Formato 607: Ventas y Operaciones",
    description:
      "Reporte mensual ante la DGII de facturación con NCF (B01, B02, e-CF), retenciones recibidas y formas oficiales de cobro.",
    category: "fiscal_dgii",
    default_params: { format: "txt", requires_period: true },
  },
  {
    code: "DGII_608",
    title: "Formato 608: Comprobantes Fiscales Anulados",
    description:
      "Reporte de NCF tradicionales y electrónicos anulados con tipo y motivo de anulación oficial.",
    category: "fiscal_dgii",
    default_params: { format: "txt", requires_period: true },
  },
  {
    code: "CASE_PROFITABILITY",
    title: "Rentabilidad y Márgenes por Expediente",
    description:
      "Análisis de rentabilidad individual por caso legal o catastral: honorarios facturados vs gastos directos (tasas judiciales, notariales, peritajes).",
    category: "financiero",
    default_params: { format: "csv", min_margin: 0 },
  },
  {
    code: "TEAM_PRODUCTIVITY",
    title: "Productividad y Rendimiento del Equipo",
    description:
      "Desempeño de abogados, agrimensores y asesores inmobiliarios: expedientes concluidos, tareas a tiempo y plazos vencidos.",
    category: "operativo",
    default_params: { format: "csv" },
  },
  {
    code: "CADASTRAL_SUMMARY",
    title: "Resumen Ejecutivo de Agrimensura y Catastro",
    description:
      "Superficie total medida en m² y Tareas, expedientes ante la DNMC por regional y tiempos promedio de aprobación técnica.",
    category: "agrimensura",
    default_params: { format: "csv" },
  },
  {
    code: "REAL_ESTATE_BI",
    title: "Business Intelligence Inmobiliario y Corretaje",
    description:
      "Métricas de conversión de visitas a ofertas, volumen transaccionado en USD/DOP y liquidación de comisiones con retención ISR.",
    category: "inmobiliario",
    default_params: { format: "csv" },
  },
];

/**
 * Servicio Orquestador de Reportes y Business Intelligence (Fase 9)
 * Emblema Nexus — República Dominicana
 *
 * Administra el catálogo de reportes, ejecuta la generación de informes fiscales DGII
 * y de analítica de negocio, y almacena el histórico de reportes generados.
 */
export class ReportService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Garantiza que una empresa tenga sembradas las definiciones de reportes estándar.
   */
  async seedDefaultReportDefinitions(companyId: string): Promise<void> {
    const supabase = await this.getClient();

    for (const def of DEFAULT_REPORT_DEFINITIONS) {
      await (supabase.from("report_definitions" as any) as any)
        .upsert(
          {
            company_id: companyId,
            code: def.code,
            title: def.title,
            description: def.description,
            category: def.category,
            default_params: def.default_params,
          },
          { onConflict: "company_id, code" }
        );
    }
  }

  /**
   * Obtiene el catálogo de definiciones de reportes disponibles para la empresa.
   */
  async getReportDefinitions(
    companyId: string,
    category?: ReportCategory
  ): Promise<ReportDefinitionRow[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("report_definitions" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error consultando definiciones de reportes:", error);
      throw new Error(`Error al listar reportes: ${error.message}`);
    }

    // Si la empresa aún no tiene definiciones, sembrarlas automáticamente
    if (!data || data.length === 0) {
      await this.seedDefaultReportDefinitions(companyId);
      const { data: seededData } = await query;
      return (seededData as ReportDefinitionRow[]) || [];
    }

    return (data as ReportDefinitionRow[]) || [];
  }

  /**
   * Obtiene una definición de reporte por su código único.
   */
  async getReportDefinitionByCode(
    companyId: string,
    code: string
  ): Promise<ReportDefinitionRow | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase
      .from("report_definitions" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error(`Error consultando reporte ${code}:`, error);
      return null;
    }

    if (!data) {
      // Verificar si es un reporte por defecto y sembrarlo
      await this.seedDefaultReportDefinitions(companyId);
      const { data: retryData } = await (supabase
        .from("report_definitions" as any) as any)
        .select("*")
        .eq("company_id", companyId)
        .eq("code", code)
        .maybeSingle();
      return (retryData as ReportDefinitionRow) || null;
    }

    return data as ReportDefinitionRow;
  }

  /**
   * Orquesta la generación de cualquier reporte del sistema y registra
   * la ejecución en el historial `generated_reports`.
   */
  async generateReport(
    companyId: string,
    reportCode: string,
    params: GenerateReportParams = {},
    userId?: string
  ): Promise<GenerateReportResult> {
    const supabase = await this.getClient();

    // Obtener definición o datos de respaldo
    const def = await this.getReportDefinitionByCode(companyId, reportCode);
    const title = def?.title || `Reporte ${reportCode}`;
    const format: ReportFormat = params.format || (def?.default_params as any)?.format || "csv";

    // Determinar período
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    const periodStr = params.period || currentPeriod;

    let periodStart: string | null = params.startDate || null;
    let periodEnd: string | null = params.endDate || null;
    let dataPayload: any = null;
    let exportContent: string | undefined = undefined;

    // Despacho según el código de reporte
    switch (reportCode.toUpperCase()) {
      case "DGII_607": {
        const rep = await dgiiReportService.generateReport607(companyId, periodStr);
        periodStart = rep.startDate;
        periodEnd = rep.endDate;
        dataPayload = rep;

        if (format === "txt") {
          exportContent = dgiiReportService.exportDgiiTxt(
            rep.rows,
            "607",
            rep.companyRnc,
            rep.period
          );
        } else if (format === "csv") {
          exportContent = exportService.exportToCsv(rep.rows, [
            { key: "rncCedulaPasaporte", label: "RNC / Cédula / Pasaporte" },
            { key: "tipoIdentificacion", label: "Tipo Identificación" },
            { key: "ncf", label: "NCF" },
            { key: "tipoIngreso", label: "Tipo Ingreso" },
            { key: "fechaComprobante", label: "Fecha Comprobante" },
            { key: "montoFacturado", label: "Monto Facturado" },
            { key: "itbisFacturado", label: "ITBIS Facturado" },
            { key: "formaCobro", label: "Forma de Cobro" },
            { key: "clienteNombre", label: "Cliente" },
            { key: "numeroFactura", label: "Número Factura" },
          ]);
        }
        break;
      }

      case "DGII_606": {
        const rep = await dgiiReportService.generateReport606(companyId, periodStr);
        periodStart = rep.startDate;
        periodEnd = rep.endDate;
        dataPayload = rep;

        if (format === "txt") {
          exportContent = dgiiReportService.exportDgiiTxt(
            rep.rows,
            "606",
            rep.companyRnc,
            rep.period
          );
        } else if (format === "csv") {
          exportContent = exportService.exportToCsv(rep.rows, [
            { key: "rncCedula", label: "RNC / Cédula" },
            { key: "tipoIdentificacion", label: "Tipo Id" },
            { key: "tipoBienesServiciosComprados", label: "Tipo Costo/Gasto DGII" },
            { key: "ncf", label: "NCF" },
            { key: "fechaComprobante", label: "Fecha Comprobante" },
            { key: "fechaPago", label: "Fecha Pago" },
            { key: "montoFacturadoServicios", label: "Monto Servicios" },
            { key: "montoFacturadoBienes", label: "Monto Bienes" },
            { key: "totalMontoFacturado", label: "Total Facturado" },
            { key: "itbisFacturado", label: "ITBIS Facturado" },
            { key: "formaPago", label: "Forma de Pago" },
            { key: "proveedorNombre", label: "Proveedor" },
            { key: "categoriaInterna", label: "Categoría Interna" },
          ]);
        }
        break;
      }

      case "DGII_608": {
        const rep = await dgiiReportService.generateReport608(companyId, periodStr);
        periodStart = rep.startDate;
        periodEnd = rep.endDate;
        dataPayload = rep;

        if (format === "txt") {
          exportContent = dgiiReportService.exportDgiiTxt(
            rep.rows,
            "608",
            rep.companyRnc,
            rep.period
          );
        } else if (format === "csv") {
          exportContent = exportService.exportToCsv(rep.rows, [
            { key: "ncf", label: "NCF Anulado" },
            { key: "fechaComprobante", label: "Fecha Comprobante" },
            { key: "tipoAnulacion", label: "Tipo Anulación DGII" },
            { key: "motivoTexto", label: "Motivo" },
            { key: "numeroFactura", label: "Factura" },
          ]);
        }
        break;
      }

      case "CASE_PROFITABILITY": {
        const rep = await financialBiService.getCaseProfitability(companyId, {
          limit: params.limit,
          minMargin: params.minMargin,
        });
        dataPayload = rep;

        if (format === "csv") {
          exportContent = exportService.exportToCsv(rep.items, [
            { key: "caseNumber", label: "Número de Expediente" },
            { key: "caseTitle", label: "Título del Caso" },
            { key: "clientName", label: "Cliente" },
            { key: "responsibleName", label: "Responsable" },
            { key: "areaName", label: "Área de Práctica" },
            { key: "totalBilled", label: "Total Facturado (DOP)" },
            { key: "feesBilled", label: "Honorarios (DOP)" },
            { key: "totalExpenses", label: "Gastos Directos (DOP)" },
            { key: "judicialExpenses", label: "Tasas Judiciales (DOP)" },
            { key: "cadastralExpenses", label: "Tasas Catastrales (DOP)" },
            { key: "notaryExpenses", label: "Gastos Notariales (DOP)" },
            { key: "expertExpenses", label: "Peritajes (DOP)" },
            { key: "netProfit", label: "Beneficio Neto (DOP)" },
            { key: "marginPercentage", label: "Margen (%)" },
          ]);
        }
        break;
      }

      case "TEAM_PRODUCTIVITY": {
        const rep = await operationalBiService.getTeamProductivity(companyId);
        dataPayload = rep;

        if (format === "csv") {
          exportContent = exportService.exportToCsv(rep.members, [
            { key: "userName", label: "Colaborador" },
            { key: "userType", label: "Rol / Tipo" },
            { key: "userPhone", label: "Teléfono" },
            { key: "totalCases", label: "Total Casos Asignados" },
            { key: "completedCases", label: "Casos Concluidos" },
            { key: "activeCases", label: "Casos Activos" },
            { key: "totalTasks", label: "Total Tareas Asignadas" },
            { key: "completedTasks", label: "Tareas Completadas" },
            { key: "tasksOnTime", label: "Tareas a Tiempo" },
            { key: "tasksLate", label: "Tareas con Retraso" },
            { key: "totalOverdue", label: "Demoras Totales" },
            { key: "onTimeRate", label: "Tasa a Tiempo (%)" },
          ]);
        }
        break;
      }

      case "CADASTRAL_SUMMARY": {
        const rep = await operationalBiService.getCadastralBiMetrics(companyId);
        dataPayload = rep;

        if (format === "csv") {
          exportContent = exportService.exportToCsv(rep.areaMetrics.byStatus, [
            { key: "label", label: "Estado de la Parcela" },
            { key: "parcelsCount", label: "Cantidad de Parcelas" },
            { key: "areaM2", label: "Área Total (m²)" },
            { key: "areaTareas", label: "Área Total (Tareas)" },
          ]);
        }
        break;
      }

      case "REAL_ESTATE_BI": {
        const rep = await operationalBiService.getRealEstateBiMetrics(companyId);
        dataPayload = rep;

        if (format === "csv") {
          exportContent = exportService.exportToCsv(rep.inventory.byType, [
            { key: "label", label: "Tipo de Propiedad" },
            { key: "count", label: "Cantidad" },
          ]);
        }
        break;
      }

      default:
        throw new Error(`Código de reporte no reconocido: "${reportCode}".`);
    }

    if (format === "json" && !exportContent) {
      exportContent = exportService.exportToJson(dataPayload);
    }

    // Registrar en la tabla `generated_reports`
    const { data: record, error: insertError } = await (supabase
      .from("generated_reports" as any) as any)
      .insert({
        company_id: companyId,
        report_code: reportCode.toUpperCase(),
        title,
        period_start: periodStart,
        period_end: periodEnd,
        format,
        status: "completado",
        data_payload: dataPayload,
        file_url: null,
        created_by: userId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error al registrar reporte generado:", insertError);
      throw new Error(`Error al guardar reporte generado: ${insertError.message}`);
    }

    return {
      reportRecord: record as GeneratedReportRow,
      exportContent,
      dataPayload,
    };
  }

  /**
   * Obtiene el historial de reportes generados.
   */
  async getGeneratedReports(
    companyId: string,
    options?: { limit?: number; reportCode?: string }
  ): Promise<GeneratedReportRow[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("generated_reports" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (options?.reportCode) {
      query = query.eq("report_code", options.reportCode.toUpperCase());
    }

    if (options?.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al consultar reportes generados:", error);
      throw new Error(`Error al listar historial de reportes: ${error.message}`);
    }

    return (data as GeneratedReportRow[]) || [];
  }

  /**
   * Obtiene un reporte generado específico por ID.
   */
  async getGeneratedReportById(
    companyId: string,
    reportId: string
  ): Promise<GeneratedReportRow | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase
      .from("generated_reports" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", reportId)
      .maybeSingle();

    if (error) {
      console.error("Error consultando reporte generado:", error);
      return null;
    }

    return (data as GeneratedReportRow) || null;
  }

  /**
   * Elimina un reporte del historial.
   */
  async deleteGeneratedReport(
    companyId: string,
    reportId: string
  ): Promise<boolean> {
    const supabase = await this.getClient();

    const { error } = await (supabase
      .from("generated_reports" as any) as any)
      .delete()
      .eq("company_id", companyId)
      .eq("id", reportId);

    if (error) {
      console.error("Error al eliminar reporte generado:", error);
      throw new Error(`Error al eliminar reporte: ${error.message}`);
    }

    return true;
  }
}

export const reportService = new ReportService();
