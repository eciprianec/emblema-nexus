import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface Dgii607Row {
  rncCedulaPasaporte: string;
  tipoIdentificacion: "1" | "2" | "3" | "";
  ncf: string;
  ncfModificado?: string;
  tipoIngreso: string; // '01' Operaciones, '02' Financiero, etc.
  fechaComprobante: string; // YYYYMMDD
  fechaRetencion?: string; // YYYYMMDD
  montoFacturado: number;
  itbisFacturado: number;
  itbisRetenidoPorTerceros: number;
  itbisPercibido: number;
  retencionRentaPorTerceros: number; // ISR retenido
  isrPercibido: number;
  impuestoSelectivoConsumo: number;
  otrosImpuestosTasas: number;
  montoPropinaLegal: number;
  formaCobro: string; // '01' Efectivo, '02' Cheque/Transferencia, '03' Tarjeta, '04' Crédito, '07' Mixto
  // Metadatos auxiliares de visualización
  clienteNombre?: string;
  numeroFactura?: string;
}

export interface Dgii607ReportResult {
  reportType: "607";
  companyId: string;
  companyRnc: string;
  companyName: string;
  period: string; // YYYYMM
  startDate: string;
  endDate: string;
  totalRecords: number;
  totalMontoFacturado: number;
  totalItbisFacturado: number;
  totalItbisRetenido: number;
  totalIsrRetenido: number;
  rows: Dgii607Row[];
}

export interface Dgii606Row {
  rncCedula: string;
  tipoIdentificacion: "1" | "2";
  tipoBienesServiciosComprados: string; // '01' a '11'
  ncf: string;
  ncfModificado?: string;
  fechaComprobante: string; // YYYYMMDD
  fechaPago?: string; // YYYYMMDD
  montoFacturadoServicios: number;
  montoFacturadoBienes: number;
  totalMontoFacturado: number;
  itbisFacturado: number;
  itbisRetenido: number;
  itbisSujetoAProporcionalidad: number;
  itbisLlevadoAlCosto: number;
  itbisPorAdelantar: number;
  itbisPercibidoEnCompras: number;
  tipoRetencionIsr?: string;
  montoRetencionRenta: number;
  isrPercibidoEnCompras: number;
  impuestoSelectivoConsumo: number;
  otrosImpuestosTasas: number;
  montoPropinaLegal: number;
  formaPago: string; // '01' a '07'
  // Metadatos auxiliares
  proveedorNombre?: string;
  numeroGasto?: string;
  categoriaInterna?: string;
}

export interface Dgii606ReportResult {
  reportType: "606";
  companyId: string;
  companyRnc: string;
  companyName: string;
  period: string; // YYYYMM
  startDate: string;
  endDate: string;
  totalRecords: number;
  totalMontoFacturado: number;
  totalServicios: number;
  totalBienes: number;
  totalItbisFacturado: number;
  totalItbisRetenido: number;
  totalIsrRetenido: number;
  rows: Dgii606Row[];
}

export interface Dgii608Row {
  ncf: string;
  fechaComprobante: string; // YYYYMMDD
  tipoAnulacion: string; // '01' a '10'
  motivoTexto?: string;
  numeroFactura?: string;
}

export interface Dgii608ReportResult {
  reportType: "608";
  companyId: string;
  companyRnc: string;
  companyName: string;
  period: string; // YYYYMM
  startDate: string;
  endDate: string;
  totalRecords: number;
  rows: Dgii608Row[];
}

/**
 * Servicio de Reportes Fiscales de la Dirección General de Impuestos Internos (DGII)
 * Emblema Nexus — República Dominicana
 *
 * Implementa con estricto apego las normativas de la DGII para:
 * - Formato 607: Reporte Mensual de Ventas y Operaciones
 * - Formato 606: Reporte Mensual de Compras de Bienes y Servicios
 * - Formato 608: Reporte de Comprobantes Fiscales Anulados
 * - Generador oficial de archivos TXT delimitados por pipe (|) para la Oficina Virtual (OFV).
 */
export class DgiiReportService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Normaliza un período en formatos 'YYYYMM' o 'YYYY-MM' a un objeto con fechas de inicio y fin.
   */
  private parsePeriod(periodStr: string): {
    periodYYYYMM: string;
    startDate: string;
    endDate: string;
    year: number;
    month: number;
  } {
    const cleaned = periodStr.replace(/[^0-9]/g, "");
    if (cleaned.length < 6) {
      throw new Error(
        `Período inválido: "${periodStr}". Debe tener el formato YYYYMM o YYYY-MM (ej: 202609 o 2026-09).`
      );
    }

    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10);

    if (month < 1 || month > 12) {
      throw new Error(`Mes inválido en el período: ${month}. Debe ser entre 01 y 12.`);
    }

    const monthPadded = month.toString().padStart(2, "0");
    const periodYYYYMM = `${year}${monthPadded}`;

    // Último día del mes
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${monthPadded}-01`;
    const endDate = `${year}-${monthPadded}-${lastDay.toString().padStart(2, "0")}`;

    return { periodYYYYMM, startDate, endDate, year, month };
  }

  /**
   * Limpia un documento de identidad eliminando guiones, espacios y caracteres especiales.
   */
  private cleanIdentification(doc: string | null | undefined): string {
    if (!doc) return "";
    return doc.replace(/[^0-9A-Za-z]/g, "").trim();
  }

  /**
   * Convierte una fecha ISO (YYYY-MM-DD o TIMESTAMPTZ) a formato DGII YYYYMMDD.
   */
  private formatDgiiDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "";
    const clean = dateStr.slice(0, 10).replace(/-/g, "");
    return clean.length === 8 ? clean : "";
  }

  /**
   * Determina el tipo de identificación según la DGII:
   * 1 = RNC (9 dígitos)
   * 2 = Cédula de Identidad y Electoral (11 dígitos)
   * 3 = Pasaporte / Documento Extranjero
   */
  private determineIdType(doc: string): "1" | "2" | "3" | "" {
    if (!doc) return "";
    const clean = doc.replace(/[^0-9]/g, "");
    if (clean.length === 9) return "1";
    if (clean.length === 11) return "2";
    return "3";
  }

  /**
   * Genera el Formato 607: Ventas y Operaciones para un período fiscal determinado.
   */
  async generateReport607(
    companyId: string,
    period: string
  ): Promise<Dgii607ReportResult> {
    const supabase = await this.getClient();
    const { periodYYYYMM, startDate, endDate } = this.parsePeriod(period);

    // 1. Obtener datos de la empresa emisora
    const { data: company, error: compError } = await (supabase
      .from("companies" as any) as any)
      .select("id, name, rnc")
      .eq("id", companyId)
      .single();

    if (compError || !company) {
      throw new Error(`Empresa no encontrada con ID: ${companyId}`);
    }

    const companyRnc = this.cleanIdentification(company.rnc);

    // 2. Consultar facturas emitidas en el período fiscal
    // Se excluyen borradores y facturas anuladas
    const { data: invoices, error: invError } = await (supabase
      .from("invoices" as any) as any)
      .select(`
        id,
        invoice_number,
        ncf_type,
        ncf,
        issue_date,
        currency,
        exchange_rate,
        subtotal,
        itbis,
        discount,
        total,
        paid_amount,
        balance_due,
        status,
        client:clients(
          id,
          client_type,
          first_name,
          last_name,
          business_name,
          rnc,
          cedula,
          passport
        ),
        payment_applications(
          amount_applied,
          payment:payments(
            payment_method,
            payment_date
          )
        )
      `)
      .eq("company_id", companyId)
      .gte("issue_date", startDate)
      .lte("issue_date", endDate)
      .not("status", "in", '("borrador","anulada")')
      .order("issue_date", { ascending: true });

    if (invError) {
      console.error("Error al consultar facturas para reporte 607:", invError);
      throw new Error(`Error al generar Reporte 607: ${invError.message}`);
    }

    const rows: Dgii607Row[] = [];
    let totalMontoFacturado = 0;
    let totalItbisFacturado = 0;
    let totalItbisRetenido = 0;
    let totalIsrRetenido = 0;

    for (const inv of invoices || []) {
      const client = inv.client;
      let rawId = "";
      let idType: "1" | "2" | "3" | "" = "";

      if (client) {
        if (client.rnc && client.rnc.trim()) {
          rawId = this.cleanIdentification(client.rnc);
          idType = "1";
        } else if (client.cedula && client.cedula.trim()) {
          rawId = this.cleanIdentification(client.cedula);
          idType = "2";
        } else if (client.passport && client.passport.trim()) {
          rawId = client.passport.trim();
          idType = "3";
        }
      }

      // Si no tiene identificación y es NCF de consumo final (B02 / E32)
      const ncfVal = (inv.ncf || inv.invoice_number || "").trim();
      if (!idType && rawId) {
        idType = this.determineIdType(rawId);
      }

      // Nombre del cliente para visualización
      let clientName = "Consumidor Final";
      if (client) {
        if (client.business_name && client.business_name.trim()) {
          clientName = client.business_name.trim();
        } else {
          clientName = [client.first_name, client.last_name].filter(Boolean).join(" ").trim() || "Cliente";
        }
      }

      // Determinación de la forma de cobro oficial DGII:
      // 01: Efectivo, 02: Cheque/Transferencia, 03: Tarjeta, 04: A Crédito, 07: Mixto
      let formaCobro = "04"; // Por defecto a crédito si tiene saldo
      const apps = inv.payment_applications || [];
      if (apps.length > 0) {
        const methods = new Set<string>();
        for (const app of apps) {
          const m = app.payment?.payment_method;
          if (m) methods.add(m);
        }

        if (methods.size > 1) {
          formaCobro = "07"; // Mixto
        } else if (methods.size === 1) {
          const method = Array.from(methods)[0];
          if (method === "efectivo") formaCobro = "01";
          else if (method === "transferencia" || method === "cheque") formaCobro = "02";
          else if (method === "tarjeta") formaCobro = "03";
          else formaCobro = "02";
        }
      } else if (Number(inv.balance_due) <= 0 && Number(inv.paid_amount) > 0) {
        formaCobro = "02"; // Pagado por transferencia
      } else {
        formaCobro = "04"; // A crédito
      }

      // Monto facturado e ITBIS
      const subtotalMonto = Math.round((Number(inv.subtotal) + Number.EPSILON) * 100) / 100;
      const itbisMonto = Math.round((Number(inv.itbis) + Number.EPSILON) * 100) / 100;
      const totalMonto = Math.round((Number(inv.total) + Number.EPSILON) * 100) / 100;

      totalMontoFacturado = Math.round((totalMontoFacturado + totalMonto) * 100) / 100;
      totalItbisFacturado = Math.round((totalItbisFacturado + itbisMonto) * 100) / 100;

      rows.push({
        rncCedulaPasaporte: rawId,
        tipoIdentificacion: idType,
        ncf: ncfVal,
        tipoIngreso: "01", // 01 = Ingresos por operaciones regulares (honorarios legales/técnicos)
        fechaComprobante: this.formatDgiiDate(inv.issue_date),
        montoFacturado: totalMonto,
        itbisFacturado: itbisMonto,
        itbisRetenidoPorTerceros: 0.0,
        itbisPercibido: 0.0,
        retencionRentaPorTerceros: 0.0,
        isrPercibido: 0.0,
        impuestoSelectivoConsumo: 0.0,
        otrosImpuestosTasas: 0.0,
        montoPropinaLegal: 0.0,
        formaCobro,
        clienteNombre: clientName,
        numeroFactura: inv.invoice_number,
      });
    }

    return {
      reportType: "607",
      companyId,
      companyRnc,
      companyName: company.name,
      period: periodYYYYMM,
      startDate,
      endDate,
      totalRecords: rows.length,
      totalMontoFacturado,
      totalItbisFacturado,
      totalItbisRetenido,
      totalIsrRetenido,
      rows,
    };
  }

  /**
   * Genera el Formato 606: Compras de Bienes y Servicios con los 11 tipos oficiales de costos/gastos.
   */
  async generateReport606(
    companyId: string,
    period: string
  ): Promise<Dgii606ReportResult> {
    const supabase = await this.getClient();
    const { periodYYYYMM, startDate, endDate } = this.parsePeriod(period);

    // 1. Obtener datos de la empresa compradora
    const { data: company, error: compError } = await (supabase
      .from("companies" as any) as any)
      .select("id, name, rnc")
      .eq("id", companyId)
      .single();

    if (compError || !company) {
      throw new Error(`Empresa no encontrada con ID: ${companyId}`);
    }

    const companyRnc = this.cleanIdentification(company.rnc);

    // 2. Consultar gastos registrados en el período fiscal
    const { data: expenses, error: expError } = await (supabase
      .from("expenses" as any) as any)
      .select(`
        id,
        expense_number,
        supplier_name,
        supplier_rnc,
        ncf,
        expense_date,
        category,
        description,
        amount,
        itbis_paid,
        total_amount,
        currency,
        payment_status
      `)
      .eq("company_id", companyId)
      .gte("expense_date", startDate)
      .lte("expense_date", endDate)
      .order("expense_date", { ascending: true });

    if (expError) {
      console.error("Error al consultar gastos para reporte 606:", expError);
      throw new Error(`Error al generar Reporte 606: ${expError.message}`);
    }

    const rows: Dgii606Row[] = [];
    let totalMontoFacturado = 0;
    let totalServicios = 0;
    let totalBienes = 0;
    let totalItbisFacturado = 0;
    let totalItbisRetenido = 0;
    let totalIsrRetenido = 0;

    for (const exp of expenses || []) {
      const supplierDoc = this.cleanIdentification(exp.supplier_rnc);
      const idType: "1" | "2" = supplierDoc.length === 9 ? "1" : "2";

      // Mapeo riguroso a los 11 tipos oficiales de costos y gastos de la DGII:
      // 01: Gastos de Personal
      // 02: Gastos por Trabajos, Suministros y Servicios (Honorarios, Asesorías, Notariales)
      // 03: Arrendamientos
      // 04: Gastos de Activos Fijos
      // 05: Gastos de Representación
      // 06: Otras Deducciones Admitidas (Viáticos, Servicios Básicos, Oficina)
      // 07: Gastos Financieros
      // 08: Gastos Extraordinarios
      // 09: Compras y Gastos que Formarán Parte del Costo de Venta (Tasas Judiciales y Catastrales DNMC)
      // 10: Adquisiciones de Activos
      // 11: Gastos de Seguros
      let tipoGasto = "06"; // Default otras deducciones
      let isServicio = true;

      switch (exp.category) {
        case "tasas_judiciales":
        case "tasas_catastrales":
          tipoGasto = "09"; // Costo directo imputable al expediente/operación
          isServicio = true;
          break;
        case "gastos_notariales":
        case "honorarios_externos":
        case "peritajes":
          tipoGasto = "02"; // Trabajos, suministros y servicios profesionales
          isServicio = true;
          break;
        case "servicios_basicos":
        case "suministros_oficina":
        case "viaticos_combustible":
          tipoGasto = "06"; // Otras deducciones admitidas
          isServicio = exp.category !== "suministros_oficina";
          break;
        default:
          tipoGasto = "06";
          isServicio = true;
      }

      const montoNeto = Math.round((Number(exp.amount) + Number.EPSILON) * 100) / 100;
      const itbisNeto = Math.round((Number(exp.itbis_paid || 0) + Number.EPSILON) * 100) / 100;
      const totalNeto = Math.round((Number(exp.total_amount) + Number.EPSILON) * 100) / 100;

      const montoServicios = isServicio ? montoNeto : 0.0;
      const montoBienes = isServicio ? 0.0 : montoNeto;

      totalMontoFacturado = Math.round((totalMontoFacturado + totalNeto) * 100) / 100;
      totalServicios = Math.round((totalServicios + montoServicios) * 100) / 100;
      totalBienes = Math.round((totalBienes + montoBienes) * 100) / 100;
      totalItbisFacturado = Math.round((totalItbisFacturado + itbisNeto) * 100) / 100;

      // Forma de pago: 01 Efectivo, 02 Transferencia, 04 A crédito
      const formaPago = exp.payment_status === "pagado" ? "02" : "04";
      const fechaPago = exp.payment_status === "pagado" ? this.formatDgiiDate(exp.expense_date) : "";

      rows.push({
        rncCedula: supplierDoc || companyRnc,
        tipoIdentificacion: idType,
        tipoBienesServiciosComprados: tipoGasto,
        ncf: (exp.ncf || `B01${exp.expense_number.replace(/[^0-9]/g, "").padStart(8, "0")}`).trim(),
        fechaComprobante: this.formatDgiiDate(exp.expense_date),
        fechaPago,
        montoFacturadoServicios: montoServicios,
        montoFacturadoBienes: montoBienes,
        totalMontoFacturado: totalNeto,
        itbisFacturado: itbisNeto,
        itbisRetenido: 0.0,
        itbisSujetoAProporcionalidad: 0.0,
        itbisLlevadoAlCosto: 0.0,
        itbisPorAdelantar: itbisNeto,
        itbisPercibidoEnCompras: 0.0,
        montoRetencionRenta: 0.0,
        isrPercibidoEnCompras: 0.0,
        impuestoSelectivoConsumo: 0.0,
        otrosImpuestosTasas: 0.0,
        montoPropinaLegal: 0.0,
        formaPago,
        proveedorNombre: exp.supplier_name || "Proveedor General",
        numeroGasto: exp.expense_number,
        categoriaInterna: exp.category,
      });
    }

    return {
      reportType: "606",
      companyId,
      companyRnc,
      companyName: company.name,
      period: periodYYYYMM,
      startDate,
      endDate,
      totalRecords: rows.length,
      totalMontoFacturado,
      totalServicios,
      totalBienes,
      totalItbisFacturado,
      totalItbisRetenido,
      totalIsrRetenido,
      rows,
    };
  }

  /**
   * Genera el Formato 608: Comprobantes Fiscales Anulados.
   */
  async generateReport608(
    companyId: string,
    period: string
  ): Promise<Dgii608ReportResult> {
    const supabase = await this.getClient();
    const { periodYYYYMM, startDate, endDate } = this.parsePeriod(period);

    // 1. Obtener datos de la empresa
    const { data: company, error: compError } = await (supabase
      .from("companies" as any) as any)
      .select("id, name, rnc")
      .eq("id", companyId)
      .single();

    if (compError || !company) {
      throw new Error(`Empresa no encontrada con ID: ${companyId}`);
    }

    const companyRnc = this.cleanIdentification(company.rnc);

    // 2. Facturas tradicionales anuladas
    const { data: voidInvoices, error: invError } = await (supabase
      .from("invoices" as any) as any)
      .select("id, invoice_number, ncf, issue_date, notes, status")
      .eq("company_id", companyId)
      .eq("status", "anulada")
      .gte("issue_date", startDate)
      .lte("issue_date", endDate);

    if (invError) {
      console.error("Error al consultar facturas anuladas para 608:", invError);
      throw new Error(`Error al generar Reporte 608: ${invError.message}`);
    }

    // 3. Comprobantes e-CF anulados
    const { data: voidEcfs, error: ecfError } = await (supabase
      .from("ecf_invoices" as any) as any)
      .select("id, encf, dgii_status, created_at")
      .eq("company_id", companyId)
      .eq("dgii_status", "anulado")
      .gte("created_at", `${startDate}T00:00:00Z`)
      .lte("created_at", `${endDate}T23:59:59Z`);

    if (ecfError) {
      console.error("Error al consultar e-CF anulados para 608:", ecfError);
    }

    const rows: Dgii608Row[] = [];
    const seenNcfs = new Set<string>();

    for (const inv of voidInvoices || []) {
      const ncfVal = (inv.ncf || "").trim();
      if (ncfVal && !seenNcfs.has(ncfVal)) {
        seenNcfs.add(ncfVal);
        rows.push({
          ncf: ncfVal,
          fechaComprobante: this.formatDgiiDate(inv.issue_date),
          tipoAnulacion: "04", // 04 = Corrección de la información (estándar habitual)
          motivoTexto: inv.notes || "Factura anulada por corrección de datos",
          numeroFactura: inv.invoice_number,
        });
      }
    }

    for (const ecf of voidEcfs || []) {
      const encfVal = (ecf.encf || "").trim();
      if (encfVal && !seenNcfs.has(encfVal)) {
        seenNcfs.add(encfVal);
        rows.push({
          ncf: encfVal,
          fechaComprobante: this.formatDgiiDate(ecf.created_at),
          tipoAnulacion: "04",
          motivoTexto: "Comprobante electrónico anulado ante la DGII",
        });
      }
    }

    return {
      reportType: "608",
      companyId,
      companyRnc,
      companyName: company.name,
      period: periodYYYYMM,
      startDate,
      endDate,
      totalRecords: rows.length,
      rows,
    };
  }

  /**
   * Genera el formato oficial de texto plano delimitado por pipe (|)
   * requerido para la carga en la Oficina Virtual (OFV) de la DGII.
   *
   * Formato de Cabecera DGII:
   *   {reportType}|{rncCompany}|{periodYYYYMM}|{cantRegistros}
   *
   * Formato de Registros DGII:
   *   Valores separados por pipe sin separadores de miles y fechas YYYYMMDD.
   */
  exportDgiiTxt(
    rows: any[],
    reportType: "606" | "607" | "608",
    rncCompany: string,
    period: string
  ): string {
    const cleanRnc = this.cleanIdentification(rncCompany);
    const { periodYYYYMM } = this.parsePeriod(period);
    const totalCount = rows.length;

    // Línea 1: Encabezado oficial OFV DGII
    const headerLine = `${reportType}|${cleanRnc}|${periodYYYYMM}|${totalCount}`;
    const lines: string[] = [headerLine];

    const fmtNum = (n: number | null | undefined): string => {
      if (n === null || n === undefined || isNaN(n)) return "0.00";
      return n.toFixed(2);
    };

    if (reportType === "607") {
      for (const r of rows as Dgii607Row[]) {
        // Estructura oficial 607: 17 columnas
        // 1. RNC/Cédula/Pasaporte
        // 2. Tipo Id (1, 2, 3 o vacío)
        // 3. NCF
        // 4. NCF Modificado
        // 5. Tipo Ingreso
        // 6. Fecha Comprobante (YYYYMMDD)
        // 7. Fecha Retención
        // 8. Monto Facturado
        // 9. ITBIS Facturado
        // 10. ITBIS Retenido por Terceros
        // 11. ITBIS Percibido
        // 12. Retención Renta por Terceros
        // 13. ISR Percibido
        // 14. Impuesto Selectivo al Consumo
        // 15. Otros Impuestos/Tasas
        // 16. Monto Propina Legal
        // 17. Forma de Cobro
        const fields = [
          r.rncCedulaPasaporte || "",
          r.tipoIdentificacion || "",
          r.ncf || "",
          r.ncfModificado || "",
          r.tipoIngreso || "01",
          r.fechaComprobante || "",
          r.fechaRetencion || "",
          fmtNum(r.montoFacturado),
          fmtNum(r.itbisFacturado),
          fmtNum(r.itbisRetenidoPorTerceros),
          fmtNum(r.itbisPercibido),
          fmtNum(r.retencionRentaPorTerceros),
          fmtNum(r.isrPercibido),
          fmtNum(r.impuestoSelectivoConsumo),
          fmtNum(r.otrosImpuestosTasas),
          fmtNum(r.montoPropinaLegal),
          r.formaCobro || "01",
        ];
        lines.push(fields.join("|"));
      }
    } else if (reportType === "606") {
      for (const r of rows as Dgii606Row[]) {
        // Estructura oficial 606: 23 columnas
        // 1. RNC/Cédula
        // 2. Tipo Id (1, 2)
        // 3. Tipo Bienes/Servicios Comprados (01-11)
        // 4. NCF
        // 5. NCF Modificado
        // 6. Fecha Comprobante (YYYYMMDD)
        // 7. Fecha Pago (YYYYMMDD)
        // 8. Monto Facturado en Servicios
        // 9. Monto Facturado en Bienes
        // 10. Total Monto Facturado
        // 11. ITBIS Facturado
        // 12. ITBIS Retenido
        // 13. ITBIS Sujeto a Proporcionalidad
        // 14. ITBIS Llevado al Costo
        // 15. ITBIS por Adelantar
        // 16. ITBIS Percibido en Compras
        // 17. Tipo de Retención en ISR
        // 18. Monto Retención Renta
        // 19. ISR Percibido en Compras
        // 20. Impuesto Selectivo al Consumo
        // 21. Otros Impuestos/Tasas
        // 22. Monto Propina Legal
        // 23. Forma de Pago
        const fields = [
          r.rncCedula || "",
          r.tipoIdentificacion || "1",
          r.tipoBienesServiciosComprados || "02",
          r.ncf || "",
          r.ncfModificado || "",
          r.fechaComprobante || "",
          r.fechaPago || "",
          fmtNum(r.montoFacturadoServicios),
          fmtNum(r.montoFacturadoBienes),
          fmtNum(r.totalMontoFacturado),
          fmtNum(r.itbisFacturado),
          fmtNum(r.itbisRetenido),
          fmtNum(r.itbisSujetoAProporcionalidad),
          fmtNum(r.itbisLlevadoAlCosto),
          fmtNum(r.itbisPorAdelantar),
          fmtNum(r.itbisPercibidoEnCompras),
          r.tipoRetencionIsr || "",
          fmtNum(r.montoRetencionRenta),
          fmtNum(r.isrPercibidoEnCompras),
          fmtNum(r.impuestoSelectivoConsumo),
          fmtNum(r.otrosImpuestosTasas),
          fmtNum(r.montoPropinaLegal),
          r.formaPago || "01",
        ];
        lines.push(fields.join("|"));
      }
    } else if (reportType === "608") {
      for (const r of rows as Dgii608Row[]) {
        // Estructura oficial 608: 3 columnas
        // 1. NCF
        // 2. Fecha Comprobante (YYYYMMDD)
        // 3. Tipo de Anulación (01 a 10)
        const fields = [
          r.ncf || "",
          r.fechaComprobante || "",
          r.tipoAnulacion || "04",
        ];
        lines.push(fields.join("|"));
      }
    }

    // Retornar líneas separadas por CRLF estándar para la Oficina Virtual DGII
    return lines.join("\r\n") + "\r\n";
  }
}

export const dgiiReportService = new DgiiReportService();
