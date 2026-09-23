import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  CaseRow,
  CaseStageInstanceRow,
  InvoiceRow,
  PaymentRow,
  ClientDocumentRequestRow,
} from "@/types/database.types";
import {
  DocumentRequestService,
  documentRequestService,
  type ClientDocumentRequestWithDetails,
} from "./DocumentRequestService";

export interface ClientDashboardCaseItem {
  id: string;
  case_number: string;
  title: string;
  status: string;
  priority: string;
  opened_at: string | null;
  expected_close_at: string | null;
  area_name?: string | null;
  current_stage_name?: string | null;
  progress_percentage: number;
}

export interface ClientDashboardPendingInvoice {
  id: string;
  invoice_number: string;
  ncf: string | null;
  issue_date: string;
  due_date: string;
  currency: string;
  total: number;
  balance_due: number;
  status: string;
}

export interface ClientDashboardSummary {
  activeCasesCount: number;
  activeCases: ClientDashboardCaseItem[];
  pendingInvoicesCount: number;
  pendingBalanceDOP: number;
  pendingBalanceUSD: number;
  pendingInvoices: ClientDashboardPendingInvoice[];
  pendingDocumentRequestsCount: number;
  pendingDocumentRequests: ClientDocumentRequestWithDetails[];
}

export interface ClientCaseSummary {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  opened_at: string | null;
  expected_close_at: string | null;
  closed_at: string | null;
  area_name: string | null;
  current_stage_name: string | null;
  progress_percentage: number;
  total_stages: number;
  completed_stages: number;
  tracking_code?: string | null;
  stages: {
    id: string;
    stage_name: string;
    sort_order: number;
    status: string;
    started_at: string | null;
    completed_at: string | null;
  }[];
}

export interface ClientCaseDetail extends ClientCaseSummary {
  tasks: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    completed_at: string | null;
  }[];
  documents: {
    id: string;
    name: string;
    original_filename: string;
    mime_type: string | null;
    file_size: number | null;
    current_version: number;
    status: string;
    created_at: string;
  }[];
  document_requests: ClientDocumentRequestWithDetails[];
}

export interface ClientInvoiceItem extends InvoiceRow {
  ecf?: {
    encf: string;
    ecf_type: string;
    security_code: string;
    qr_code_url: string | null;
    dgii_status: string;
  } | null;
}

export interface ClientInvoicesData {
  invoices: ClientInvoiceItem[];
  payments: PaymentRow[];
  totals: {
    totalBilledDOP: number;
    totalBilledUSD: number;
    totalBalanceDueDOP: number;
    totalBalanceDueUSD: number;
    totalPaidDOP: number;
    totalPaidUSD: number;
  };
}

export class ClientPortalService {
  constructor(
    private client?: SupabaseClient<Database>,
    private docRequestService: DocumentRequestService = documentRequestService
  ) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    if (this.client) return this.client;
    try {
      return createAdminClient();
    } catch {
      return await createClient();
    }
  }

  /**
   * Resumen general del dashboard del cliente:
   * - Casos activos y progreso
   * - Facturas pendientes de pago e importes adeudados
   * - Documentos y requerimientos pendientes de entrega
   */
  async getClientDashboard(
    companyId: string,
    clientId: string
  ): Promise<ClientDashboardSummary> {
    const supabase = await this.getClient();

    // 1. Obtener casos activos (no completados ni cerrados)
    const { data: casesData, error: casesError } = await (supabase
      .from("cases" as any) as any)
      .select(`
        id,
        case_number,
        title,
        status,
        priority,
        opened_at,
        expected_close_at,
        area_id,
        current_stage_id
      `)
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .not("status", "in", '("completado","cerrado","cancelado")')
      .order("created_at", { ascending: false });

    if (casesError) {
      throw new Error(`Error al consultar casos del cliente: ${casesError.message}`);
    }

    const cases = casesData || [];

    // Obtener áreas de servicio e hitos para calcular progreso de los casos activos
    const areaIds = Array.from(new Set(cases.map((c: any) => c.area_id).filter(Boolean)));
    let areaMap = new Map<string, string>();
    if (areaIds.length > 0) {
      const { data: areas } = await (supabase
        .from("service_areas" as any) as any)
        .select("id, name")
        .in("id", areaIds);
      if (areas) {
        areaMap = new Map(areas.map((a: any) => [a.id, a.name]));
      }
    }

    const caseIds = cases.map((c: any) => c.id);
    let stagesByCase = new Map<string, any[]>();
    if (caseIds.length > 0) {
      const { data: stages } = await (supabase
        .from("case_stage_instances" as any) as any)
        .select("case_id, id, stage_name, status, sort_order")
        .in("case_id", caseIds)
        .order("sort_order", { ascending: true });

      if (stages) {
        for (const st of stages) {
          const list = stagesByCase.get(st.case_id) || [];
          list.push(st);
          stagesByCase.set(st.case_id, list);
        }
      }
    }

    const activeCases: ClientDashboardCaseItem[] = cases.map((c: any) => {
      const stList = stagesByCase.get(c.id) || [];
      let progress = 0;
      let currentStageName: string | null = null;

      if (stList.length > 0) {
        const completed = stList.filter((s) => s.status === "completado").length;
        progress = Math.round((completed / stList.length) * 100);
        const inProgress = stList.find((s) => s.status === "en_progreso");
        currentStageName = inProgress?.stage_name || stList[0]?.stage_name;
      } else {
        progress = c.status === "en_proceso" ? 50 : 20;
      }

      return {
        id: c.id,
        case_number: c.case_number,
        title: c.title,
        status: c.status,
        priority: c.priority,
        opened_at: c.opened_at,
        expected_close_at: c.expected_close_at,
        area_name: c.area_id ? areaMap.get(c.area_id) || null : null,
        current_stage_name: currentStageName,
        progress_percentage: progress,
      };
    });

    // 2. Obtener facturas pendientes con saldo adeudado
    const { data: invoicesData, error: invoicesError } = await (supabase
      .from("invoices" as any) as any)
      .select("id, invoice_number, ncf, issue_date, due_date, currency, total, balance_due, status")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .gt("balance_due", 0)
      .not("status", "in", '("borrador","anulada","pagada")')
      .order("due_date", { ascending: true });

    if (invoicesError) {
      throw new Error(`Error al consultar facturas pendientes: ${invoicesError.message}`);
    }

    const pendingInvoicesList = invoicesData || [];
    let pendingBalanceDOP = 0;
    let pendingBalanceUSD = 0;

    for (const inv of pendingInvoicesList) {
      const balance = Number(inv.balance_due) || 0;
      if (inv.currency === "USD") {
        pendingBalanceUSD += balance;
      } else {
        pendingBalanceDOP += balance;
      }
    }

    const pendingInvoices: ClientDashboardPendingInvoice[] = pendingInvoicesList.map(
      (inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        ncf: inv.ncf,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        currency: inv.currency,
        total: Number(inv.total),
        balance_due: Number(inv.balance_due),
        status: inv.status,
      })
    );

    // 3. Obtener requerimientos de documentos pendientes de entrega
    const allDocRequests = await this.docRequestService.getDocumentRequestsByClient(
      companyId,
      clientId
    );
    const pendingDocRequests = allDocRequests.filter(
      (r) => r.status === "pendiente" || r.status === "rechazado"
    );

    return {
      activeCasesCount: activeCases.length,
      activeCases,
      pendingInvoicesCount: pendingInvoices.length,
      pendingBalanceDOP: Math.round(pendingBalanceDOP * 100) / 100,
      pendingBalanceUSD: Math.round(pendingBalanceUSD * 100) / 100,
      pendingInvoices,
      pendingDocumentRequestsCount: pendingDocRequests.length,
      pendingDocumentRequests: pendingDocRequests,
    };
  }

  /**
   * Listado de todos los expedientes del cliente con hitos y progreso.
   */
  async getClientCases(
    companyId: string,
    clientId: string
  ): Promise<ClientCaseSummary[]> {
    const supabase = await this.getClient();

    const { data: casesData, error: casesError } = await (supabase
      .from("cases" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (casesError) {
      throw new Error(`Error al consultar expedientes: ${casesError.message}`);
    }

    const cases: CaseRow[] = casesData || [];
    if (cases.length === 0) return [];

    const caseIds = cases.map((c) => c.id);

    // Obtener nombres de áreas
    const areaIds = Array.from(new Set(cases.map((c) => c.area_id).filter(Boolean)));
    let areaMap = new Map<string, string>();
    if (areaIds.length > 0) {
      const { data: areas } = await (supabase
        .from("service_areas" as any) as any)
        .select("id, name")
        .in("id", areaIds);
      if (areas) {
        areaMap = new Map(areas.map((a: any) => [a.id, a.name]));
      }
    }

    // Obtener tokens de tracking
    const { data: tokens } = await (supabase
      .from("case_tracking_tokens" as any) as any)
      .select("case_id, tracking_code")
      .in("case_id", caseIds);

    const trackingMap = new Map<string, string>();
    if (tokens) {
      for (const t of tokens) {
        trackingMap.set(t.case_id, t.tracking_code);
      }
    }

    // Obtener etapas / hitos
    const { data: stagesData } = await (supabase
      .from("case_stage_instances" as any) as any)
      .select("id, case_id, stage_name, sort_order, status, started_at, completed_at")
      .in("case_id", caseIds)
      .order("sort_order", { ascending: true });

    const stagesByCase = new Map<string, any[]>();
    if (stagesData) {
      for (const st of stagesData) {
        const list = stagesByCase.get(st.case_id) || [];
        list.push(st);
        stagesByCase.set(st.case_id, list);
      }
    }

    return cases.map((c) => {
      const caseStages = stagesByCase.get(c.id) || [];
      const totalStages = caseStages.length;
      const completedStages = caseStages.filter((s) => s.status === "completado").length;

      let progress = 0;
      if (totalStages > 0) {
        progress = Math.round((completedStages / totalStages) * 100);
      } else if (c.status === "completado" || c.status === "cerrado") {
        progress = 100;
      } else if (c.status === "en_proceso") {
        progress = 50;
      } else {
        progress = 15;
      }

      const inProgressStage = caseStages.find((s) => s.status === "en_progreso");
      const currentStageName = inProgressStage
        ? inProgressStage.stage_name
        : caseStages[0]?.stage_name || null;

      return {
        id: c.id,
        case_number: c.case_number,
        title: c.title,
        description: c.description,
        status: c.status,
        priority: c.priority,
        opened_at: c.opened_at,
        expected_close_at: c.expected_close_at,
        closed_at: c.closed_at,
        area_name: c.area_id ? areaMap.get(c.area_id) || null : null,
        current_stage_name: currentStageName,
        progress_percentage: progress,
        total_stages: totalStages,
        completed_stages: completedStages,
        tracking_code: trackingMap.get(c.id) || null,
        stages: caseStages.map((s) => ({
          id: s.id,
          stage_name: s.stage_name,
          sort_order: s.sort_order,
          status: s.status,
          started_at: s.started_at,
          completed_at: s.completed_at,
        })),
      };
    });
  }

  /**
   * Detalle exhaustivo de un expediente para el portal de clientes con hitos,
   * actuaciones (tareas), documentos y requerimientos pendientes.
   */
  async getClientCaseDetail(
    companyId: string,
    clientId: string,
    caseId: string
  ): Promise<ClientCaseDetail> {
    const supabase = await this.getClient();

    // 1. Validar propiedad y existencia del expediente
    const { data: caseRecord, error: caseError } = await (supabase
      .from("cases" as any) as any)
      .select("*")
      .eq("id", caseId)
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (caseError || !caseRecord) {
      throw new Error("Expediente no encontrado o no pertenece a este cliente.");
    }

    // 2. Obtener nombre del área
    let areaName: string | null = null;
    if (caseRecord.area_id) {
      const { data: area } = await (supabase
        .from("service_areas" as any) as any)
        .select("name")
        .eq("id", caseRecord.area_id)
        .maybeSingle();
      if (area) areaName = area.name;
    }

    // 3. Obtener token de tracking si existe
    const { data: tokenRecord } = await (supabase
      .from("case_tracking_tokens" as any) as any)
      .select("tracking_code")
      .eq("case_id", caseId)
      .eq("company_id", companyId)
      .maybeSingle();

    // 4. Obtener hitos / etapas
    const { data: stagesData } = await (supabase
      .from("case_stage_instances" as any) as any)
      .select("id, stage_name, sort_order, status, started_at, completed_at")
      .eq("case_id", caseId)
      .order("sort_order", { ascending: true });

    const stages = stagesData || [];
    const completedStages = stages.filter((s: any) => s.status === "completado").length;
    const progress =
      stages.length > 0
        ? Math.round((completedStages / stages.length) * 100)
        : caseRecord.status === "completado" || caseRecord.status === "cerrado"
        ? 100
        : 25;

    const inProgressStage = stages.find((s: any) => s.status === "en_progreso");
    const currentStageName = inProgressStage
      ? inProgressStage.stage_name
      : stages[0]?.stage_name || null;

    // 5. Obtener tareas / actuaciones del expediente
    const { data: tasksData } = await (supabase
      .from("case_tasks" as any) as any)
      .select("id, title, description, status, priority, due_date, completed_at")
      .eq("case_id", caseId)
      .order("due_date", { ascending: true, nullsFirst: false });

    const tasks = (tasksData || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      completed_at: t.completed_at,
    }));

    // 6. Obtener documentos públicos asociados al expediente
    const { data: docsData } = await (supabase
      .from("documents" as any) as any)
      .select("id, name, original_filename, mime_type, file_size, current_version, status, created_at")
      .eq("case_id", caseId)
      .neq("status", "obsoleto")
      .order("created_at", { ascending: false });

    const documents = (docsData || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      original_filename: d.original_filename,
      mime_type: d.mime_type,
      file_size: d.file_size ? Number(d.file_size) : null,
      current_version: d.current_version || 1,
      status: d.status,
      created_at: d.created_at,
    }));

    // 7. Obtener requerimientos de documentos para este expediente
    const docRequests = await this.docRequestService.getDocumentRequestsByCase(
      companyId,
      caseId
    );

    return {
      id: caseRecord.id,
      case_number: caseRecord.case_number,
      title: caseRecord.title,
      description: caseRecord.description,
      status: caseRecord.status,
      priority: caseRecord.priority,
      opened_at: caseRecord.opened_at,
      expected_close_at: caseRecord.expected_close_at,
      closed_at: caseRecord.closed_at,
      area_name: areaName,
      current_stage_name: currentStageName,
      progress_percentage: progress,
      total_stages: stages.length,
      completed_stages: completedStages,
      tracking_code: tokenRecord?.tracking_code || null,
      stages: stages.map((s: any) => ({
        id: s.id,
        stage_name: s.stage_name,
        sort_order: s.sort_order,
        status: s.status,
        started_at: s.started_at,
        completed_at: s.completed_at,
      })),
      tasks,
      documents,
      document_requests: docRequests,
    };
  }

  /**
   * Obtiene facturas con datos fiscales e-CF y recibos de pago del cliente.
   */
  async getClientInvoices(
    companyId: string,
    clientId: string
  ): Promise<ClientInvoicesData> {
    const supabase = await this.getClient();

    // 1. Obtener facturas emitidas
    const { data: invoicesData, error: invError } = await (supabase
      .from("invoices" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .neq("status", "borrador")
      .order("issue_date", { ascending: false });

    if (invError) {
      throw new Error(`Error al consultar facturas: ${invError.message}`);
    }

    const rawInvoices: InvoiceRow[] = invoicesData || [];
    const invoiceIds = rawInvoices.map((i) => i.id);

    // 2. Obtener datos de facturación electrónica e-CF
    let ecfMap = new Map<string, any>();
    if (invoiceIds.length > 0) {
      const { data: ecfData } = await (supabase
        .from("ecf_invoices" as any) as any)
        .select("invoice_id, encf, ecf_type, security_code, qr_code_url, dgii_status")
        .in("invoice_id", invoiceIds);

      if (ecfData) {
        ecfMap = new Map(ecfData.map((e: any) => [e.invoice_id, e]));
      }
    }

    const invoices: ClientInvoiceItem[] = rawInvoices.map((inv) => ({
      ...inv,
      ecf: ecfMap.get(inv.id) || null,
    }));

    // 3. Obtener recibos de pago realizados por el cliente
    const { data: paymentsData, error: payError } = await (supabase
      .from("payments" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("payment_date", { ascending: false });

    if (payError) {
      throw new Error(`Error al consultar recibos de pago: ${payError.message}`);
    }

    const payments: PaymentRow[] = paymentsData || [];

    // 4. Calcular totales fiscales y saldos
    let totalBilledDOP = 0;
    let totalBilledUSD = 0;
    let totalBalanceDueDOP = 0;
    let totalBalanceDueUSD = 0;
    let totalPaidDOP = 0;
    let totalPaidUSD = 0;

    for (const inv of invoices) {
      if (inv.currency === "USD") {
        totalBilledUSD += Number(inv.total) || 0;
        totalBalanceDueUSD += Number(inv.balance_due) || 0;
      } else {
        totalBilledDOP += Number(inv.total) || 0;
        totalBalanceDueDOP += Number(inv.balance_due) || 0;
      }
    }

    for (const p of payments) {
      if (p.currency === "USD") {
        totalPaidUSD += Number(p.amount) || 0;
      } else {
        totalPaidDOP += Number(p.amount) || 0;
      }
    }

    return {
      invoices,
      payments,
      totals: {
        totalBilledDOP: Math.round(totalBilledDOP * 100) / 100,
        totalBilledUSD: Math.round(totalBilledUSD * 100) / 100,
        totalBalanceDueDOP: Math.round(totalBalanceDueDOP * 100) / 100,
        totalBalanceDueUSD: Math.round(totalBalanceDueUSD * 100) / 100,
        totalPaidDOP: Math.round(totalPaidDOP * 100) / 100,
        totalPaidUSD: Math.round(totalPaidUSD * 100) / 100,
      },
    };
  }

  /**
   * Obtiene todos los requerimientos pendientes de entrega para un cliente.
   */
  async getClientDocumentRequests(
    companyId: string,
    clientId: string
  ): Promise<ClientDocumentRequestWithDetails[]> {
    return this.docRequestService.getDocumentRequestsByClient(companyId, clientId);
  }
}

export const clientPortalService = new ClientPortalService();
