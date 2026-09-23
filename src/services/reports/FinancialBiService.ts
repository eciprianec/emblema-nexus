import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface FinancialKpisResult {
  companyId: string;
  companyName: string;
  companyRnc?: string | null;
  period?: { start: string; end: string } | null;
  totalInvoiced: number;
  totalEcfInvoiced: number;
  totalCollected: number;
  totalItbis: number;
  totalOutstanding: number;
  totalExpenses: number;
  totalExpensesItbis: number;
  netProfit: number;
  operationalMarginPercentage: number;
  collectionRate: number; // Recaudos / Facturado (%)
}

export interface CaseProfitabilityItem {
  caseId: string;
  companyId: string;
  caseNumber: string;
  caseTitle: string;
  caseStatus: string;
  priority: string | null;
  clientId: string | null;
  clientName: string | null;
  clientBusinessName: string | null;
  clientRnc: string | null;
  clientCedula: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  areaName: string | null;
  areaCode: string | null;
  totalBilled: number;
  feesBilled: number;
  otherBilled: number;
  totalExpenses: number;
  judicialExpenses: number;
  cadastralExpenses: number;
  notaryExpenses: number;
  expertExpenses: number;
  travelExpenses: number;
  otherExpenses: number;
  netProfit: number;
  marginPercentage: number;
}

export interface CaseProfitabilitySummary {
  totalCasesEvaluated: number;
  totalBilledAllCases: number;
  totalExpensesAllCases: number;
  netProfitAllCases: number;
  averageMarginPercentage: number;
  profitableCasesCount: number;
  unprofitableCasesCount: number;
  items: CaseProfitabilityItem[];
}

export interface AgingBucketSummary {
  corriente: number;
  dias1a30: number;
  dias31a60: number;
  dias61a90: number;
  masDe90: number;
  totalCartera: number;
}

export interface TopDebtorItem {
  clientId: string;
  clientName: string;
  clientDoc: string | null;
  totalBalanceDue: number;
  invoiceCount: number;
  oldestDueDate: string;
  maxDaysOverdue: number;
}

export interface AgingSummaryResult {
  companyId: string;
  asOfDate: string;
  buckets: AgingBucketSummary;
  totalClientesConSaldo: number;
  topDebtors: TopDebtorItem[];
}

/**
 * Servicio de Business Intelligence Financiero (Fase 9)
 * Emblema Nexus — República Dominicana
 *
 * Provee KPIs de facturación, rentabilidad por caso (ingresos vs gastos directos)
 * y análisis de antigüedad de saldos en cuentas por cobrar.
 */
export class FinancialBiService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Obtiene los KPIs financieros consolidados por empresa.
   * Si se especifica un período, filtra facturas, pagos y gastos por rango de fechas.
   */
  async getFinancialKpis(
    companyId: string,
    period?: { start: string; end: string }
  ): Promise<FinancialKpisResult> {
    const supabase = await this.getClient();

    // 1. Obtener datos de la empresa
    const { data: company, error: compError } = await (supabase
      .from("companies" as any) as any)
      .select("id, name, rnc")
      .eq("id", companyId)
      .single();

    if (compError || !company) {
      throw new Error(`Empresa no encontrada con ID: ${companyId}`);
    }

    // Si no hay filtro de fechas, consultar directamente la vista analítica optimizada
    if (!period || (!period.start && !period.end)) {
      const { data: viewData, error: viewError } = await (supabase
        .from("view_financial_kpis" as any) as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (!viewError && viewData) {
        const totalInvoiced = Number(viewData.total_invoiced || 0);
        const totalCollected = Number(viewData.total_collected || 0);
        const collectionRate =
          totalInvoiced > 0
            ? this.roundMoney((totalCollected / totalInvoiced) * 100)
            : 0;

        return {
          companyId,
          companyName: company.name,
          companyRnc: company.rnc,
          period: null,
          totalInvoiced,
          totalEcfInvoiced: Number(viewData.total_ecf_invoiced || 0),
          totalCollected,
          totalItbis: Number(viewData.total_itbis || 0),
          totalOutstanding: Number(viewData.total_outstanding || 0),
          totalExpenses: Number(viewData.total_expenses || 0),
          totalExpensesItbis: Number(viewData.total_expenses_itbis || 0),
          netProfit: Number(viewData.net_profit || 0),
          operationalMarginPercentage: Number(viewData.operational_margin_percentage || 0),
          collectionRate,
        };
      }
    }

    // Si hay filtro de fechas o la vista no retornó datos
    const start = period?.start || "1970-01-01";
    const end = period?.end || "2099-12-31";

    // Facturas en el período
    let invQuery = (supabase.from("invoices" as any) as any)
      .select("id, total, itbis, balance_due, ncf, status, issue_date")
      .eq("company_id", companyId)
      .not("status", "in", '("borrador","anulada")')
      .gte("issue_date", start)
      .lte("issue_date", end);

    const { data: invoices, error: invErr } = await invQuery;
    if (invErr) throw new Error(`Error consultando facturas: ${invErr.message}`);

    let totalInvoiced = 0;
    let totalEcfInvoiced = 0;
    let totalItbis = 0;
    let totalOutstanding = 0;

    for (const inv of invoices || []) {
      const tot = Number(inv.total || 0);
      const itb = Number(inv.itbis || 0);
      const bal = Number(inv.balance_due || 0);

      totalInvoiced += tot;
      totalItbis += itb;
      if (["emitida", "parcialmente_pagada", "vencida"].includes(inv.status)) {
        totalOutstanding += bal;
      }
      if (inv.ncf && inv.ncf.startsWith("E")) {
        totalEcfInvoiced += tot;
      }
    }

    // Pagos en el período
    const { data: payments, error: payErr } = await (supabase
      .from("payments" as any) as any)
      .select("amount")
      .eq("company_id", companyId)
      .gte("payment_date", start)
      .lte("payment_date", end);

    if (payErr) throw new Error(`Error consultando cobros: ${payErr.message}`);
    const totalCollected = (payments || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

    // Gastos en el período
    const { data: expenses, error: expErr } = await (supabase
      .from("expenses" as any) as any)
      .select("total_amount, itbis_paid")
      .eq("company_id", companyId)
      .gte("expense_date", start)
      .lte("expense_date", end);

    if (expErr) throw new Error(`Error consultando gastos: ${expErr.message}`);
    let totalExpenses = 0;
    let totalExpensesItbis = 0;
    for (const exp of expenses || []) {
      totalExpenses += Number(exp.total_amount || 0);
      totalExpensesItbis += Number(exp.itbis_paid || 0);
    }

    totalInvoiced = this.roundMoney(totalInvoiced);
    totalEcfInvoiced = this.roundMoney(totalEcfInvoiced);
    const collectedRounded = this.roundMoney(totalCollected);
    totalItbis = this.roundMoney(totalItbis);
    totalOutstanding = this.roundMoney(totalOutstanding);
    totalExpenses = this.roundMoney(totalExpenses);
    totalExpensesItbis = this.roundMoney(totalExpensesItbis);

    const netProfit = this.roundMoney(totalInvoiced - totalExpenses);
    const operationalMarginPercentage =
      totalInvoiced > 0 ? this.roundMoney((netProfit / totalInvoiced) * 100) : 0;
    const collectionRate =
      totalInvoiced > 0 ? this.roundMoney((collectedRounded / totalInvoiced) * 100) : 0;

    return {
      companyId,
      companyName: company.name,
      companyRnc: company.rnc,
      period: period ? { start, end } : null,
      totalInvoiced,
      totalEcfInvoiced,
      totalCollected: collectedRounded,
      totalItbis,
      totalOutstanding,
      totalExpenses,
      totalExpensesItbis,
      netProfit,
      operationalMarginPercentage,
      collectionRate,
    };
  }

  /**
   * Obtiene el análisis de rentabilidad individual y consolidada por expediente.
   */
  async getCaseProfitability(
    companyId: string,
    options?: { limit?: number; minMargin?: number }
  ): Promise<CaseProfitabilitySummary> {
    const supabase = await this.getClient();

    let query = (supabase.from("view_case_profitability" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .order("net_profit", { ascending: false });

    if (options?.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al consultar rentabilidad de casos:", error);
      throw new Error(`Error en rentabilidad por expediente: ${error.message}`);
    }

    let items: CaseProfitabilityItem[] = (data || []).map((row: any) => ({
      caseId: row.case_id,
      companyId: row.company_id,
      caseNumber: row.case_number,
      caseTitle: row.case_title,
      caseStatus: row.case_status,
      priority: row.priority,
      clientId: row.client_id,
      clientName: row.client_name,
      clientBusinessName: row.client_business_name,
      clientRnc: row.client_rnc,
      clientCedula: row.client_cedula,
      responsibleId: row.responsible_id,
      responsibleName: row.responsible_name,
      areaName: row.area_name,
      areaCode: row.area_code,
      totalBilled: Number(row.total_billed || 0),
      feesBilled: Number(row.fees_billed || 0),
      otherBilled: Number(row.other_billed || 0),
      totalExpenses: Number(row.total_expenses || 0),
      judicialExpenses: Number(row.judicial_expenses || 0),
      cadastralExpenses: Number(row.cadastral_expenses || 0),
      notaryExpenses: Number(row.notary_expenses || 0),
      expertExpenses: Number(row.expert_expenses || 0),
      travelExpenses: Number(row.travel_expenses || 0),
      otherExpenses: Number(row.other_expenses || 0),
      netProfit: Number(row.net_profit || 0),
      marginPercentage: Number(row.margin_percentage || 0),
    }));

    if (options?.minMargin !== undefined) {
      items = items.filter((item) => item.marginPercentage >= (options.minMargin ?? 0));
    }

    let totalBilledAllCases = 0;
    let totalExpensesAllCases = 0;
    let totalMarginSum = 0;
    let profitableCasesCount = 0;
    let unprofitableCasesCount = 0;

    for (const item of items) {
      totalBilledAllCases += item.totalBilled;
      totalExpensesAllCases += item.totalExpenses;
      totalMarginSum += item.marginPercentage;
      if (item.netProfit >= 0) {
        profitableCasesCount++;
      } else {
        unprofitableCasesCount++;
      }
    }

    totalBilledAllCases = this.roundMoney(totalBilledAllCases);
    totalExpensesAllCases = this.roundMoney(totalExpensesAllCases);
    const netProfitAllCases = this.roundMoney(totalBilledAllCases - totalExpensesAllCases);
    const averageMarginPercentage =
      items.length > 0 ? this.roundMoney(totalMarginSum / items.length) : 0;

    return {
      totalCasesEvaluated: items.length,
      totalBilledAllCases,
      totalExpensesAllCases,
      netProfitAllCases,
      averageMarginPercentage,
      profitableCasesCount,
      unprofitableCasesCount,
      items,
    };
  }

  /**
   * Obtiene la cartera vencida consolidada por tramos (Aging Summary).
   */
  async getAgingSummary(companyId: string): Promise<AgingSummaryResult> {
    const supabase = await this.getClient();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const { data: invoices, error } = await (supabase
      .from("invoices" as any) as any)
      .select(`
        id,
        invoice_number,
        client_id,
        total,
        balance_due,
        due_date,
        status,
        client:clients(
          id,
          first_name,
          last_name,
          business_name,
          rnc,
          cedula
        )
      `)
      .eq("company_id", companyId)
      .in("status", ["emitida", "parcialmente_pagada", "vencida"])
      .gt("balance_due", 0)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error al consultar cartera vencida:", error);
      throw new Error(`Error al generar Aging Summary: ${error.message}`);
    }

    let corriente = 0;
    let dias1a30 = 0;
    let dias31a60 = 0;
    let dias61a90 = 0;
    let masDe90 = 0;

    const debtorsMap = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        clientDoc: string | null;
        totalBalanceDue: number;
        invoiceCount: number;
        oldestDueDate: string;
        maxDaysOverdue: number;
      }
    >();

    for (const inv of invoices || []) {
      const balance = Number(inv.balance_due || 0);
      if (balance <= 0) continue;

      const dueDate = new Date(inv.due_date);
      const diffMs = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) {
        corriente += balance;
      } else if (daysOverdue <= 30) {
        dias1a30 += balance;
      } else if (daysOverdue <= 60) {
        dias31a60 += balance;
      } else if (daysOverdue <= 90) {
        dias61a90 += balance;
      } else {
        masDe90 += balance;
      }

      // Agrupar por deudor
      const clientId = inv.client_id;
      const client = inv.client;
      let clientName = "Cliente";
      let clientDoc: string | null = null;

      if (client) {
        clientName =
          client.business_name?.trim() ||
          [client.first_name, client.last_name].filter(Boolean).join(" ").trim() ||
          "Cliente";
        clientDoc = client.rnc || client.cedula || null;
      }

      const existing = debtorsMap.get(clientId) || {
        clientId,
        clientName,
        clientDoc,
        totalBalanceDue: 0,
        invoiceCount: 0,
        oldestDueDate: inv.due_date,
        maxDaysOverdue: Math.max(0, daysOverdue),
      };

      existing.totalBalanceDue = this.roundMoney(existing.totalBalanceDue + balance);
      existing.invoiceCount += 1;
      if (inv.due_date < existing.oldestDueDate) {
        existing.oldestDueDate = inv.due_date;
      }
      if (daysOverdue > existing.maxDaysOverdue) {
        existing.maxDaysOverdue = daysOverdue;
      }

      debtorsMap.set(clientId, existing);
    }

    const totalCartera = this.roundMoney(
      corriente + dias1a30 + dias31a60 + dias61a90 + masDe90
    );

    const topDebtors = Array.from(debtorsMap.values())
      .sort((a, b) => b.totalBalanceDue - a.totalBalanceDue)
      .slice(0, 10);

    return {
      companyId,
      asOfDate: todayStr,
      buckets: {
        corriente: this.roundMoney(corriente),
        dias1a30: this.roundMoney(dias1a30),
        dias31a60: this.roundMoney(dias31a60),
        dias61a90: this.roundMoney(dias61a90),
        masDe90: this.roundMoney(masDe90),
        totalCartera,
      },
      totalClientesConSaldo: debtorsMap.size,
      topDebtors,
    };
  }
}

export const financialBiService = new FinancialBiService();
