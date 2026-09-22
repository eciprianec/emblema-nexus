import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logAuditEntry } from "@/services/audit/AuditService";
import { roundMoney } from "./InvoiceService";

export type ExpenseCategory =
  | "tasas_judiciales"
  | "tasas_catastrales"
  | "gastos_notariales"
  | "peritajes"
  | "viaticos_combustible"
  | "suministros_oficina"
  | "servicios_basicos"
  | "honorarios_externos"
  | "otro";

export type ExpensePaymentStatus = "pendiente" | "pagado" | "reembolsado";

export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];
export type ExpenseUpdate = Database["public"]["Tables"]["expenses"]["Update"];

export interface CreateExpenseInput {
  caseId?: string | null;
  case_id?: string | null;
  supplierName?: string | null;
  supplier_name?: string | null;
  supplierRnc?: string | null;
  supplier_rnc?: string | null;
  ncf?: string | null;
  expenseDate?: string;
  expense_date?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  itbisPaid?: number;
  itbis_paid?: number;
  currency?: "DOP" | "USD";
  paymentStatus?: ExpensePaymentStatus;
  payment_status?: ExpensePaymentStatus;
  isBillableToClient?: boolean;
  is_billable_to_client?: boolean;
  isReimbursed?: boolean;
  is_reimbursed?: boolean;
  createdBy?: string | null;
  created_by?: string | null;
}

export interface GetExpensesFilters {
  caseId?: string;
  category?: string;
  status?: string;
  isBillable?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseWithDetails extends ExpenseRow {
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
}

export interface ExpensesSummary {
  totalGastos: number;
  totalPagado: number;
  totalPendiente: number;
  totalReembolsado: number;
  totalFacturable: number;
  totalItbisPagado: number;
  cantidadGastos: number;
  gastosPorCategoria: Record<ExpenseCategory, number>;
}

export class ExpenseService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Genera el siguiente número correlativo para gastos: GAS-YYYY-XXXX
   */
  async generateNextExpenseNumber(companyId: string): Promise<string> {
    const supabase = await this.getClient();
    const currentYear = new Date().getFullYear();
    const prefix = `GAS-${currentYear}-`;

    const { data, error } = await (supabase.from("expenses" as any) as any)
      .select("expense_number")
      .eq("company_id", companyId)
      .ilike("expense_number", `${prefix}%`)
      .order("expense_number", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error al consultar secuencia de gastos:", error);
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      for (const row of data) {
        const numPart = row.expense_number.replace(prefix, "");
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed >= nextNumber) {
          nextNumber = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  /**
   * Carga los datos del caso vinculado para una lista de gastos.
   */
  private async hydrateExpenses(
    supabase: any,
    companyId: string,
    rawExpenses: ExpenseRow[]
  ): Promise<ExpenseWithDetails[]> {
    if (!rawExpenses || rawExpenses.length === 0) return [];

    const caseIds = Array.from(
      new Set(rawExpenses.map((e) => e.case_id).filter(Boolean) as string[])
    );

    const casesMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: casesData } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .in("id", caseIds);
      (casesData || []).forEach((c: any) => casesMap.set(c.id, c));
    }

    return rawExpenses.map((e) => ({
      ...e,
      case: e.case_id ? casesMap.get(e.case_id) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de gastos aplicando filtros opcionales.
   */
  async getExpenses(
    companyId: string,
    filters?: GetExpensesFilters
  ): Promise<ExpenseWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("expenses" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }
    if (filters?.status) {
      query = query.eq("payment_status", filters.status);
    }
    if (filters?.isBillable !== undefined) {
      query = query.eq("is_billable_to_client", filters.isBillable);
    }
    if (filters?.startDate) {
      query = query.gte("expense_date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("expense_date", filters.endDate);
    }
    if (filters?.search) {
      const s = filters.search.trim();
      query = query.or(
        `expense_number.ilike.%${s}%,description.ilike.%${s}%,supplier_name.ilike.%${s}%,ncf.ilike.%${s}%`
      );
    }

    query = query.order("expense_date", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error al consultar gastos:", error);
      throw error;
    }

    return this.hydrateExpenses(supabase, companyId, data || []);
  }

  /**
   * Obtiene un gasto por ID con el expediente vinculado.
   */
  async getExpenseById(
    companyId: string,
    id: string
  ): Promise<ExpenseWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("expenses" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener gasto por ID:", error);
      throw error;
    }

    if (!data) return null;

    const hydrated = await this.hydrateExpenses(supabase, companyId, [data]);
    return hydrated[0] ?? null;
  }

  /**
   * Crea un nuevo gasto con generación correlativa GAS-YYYY-XXXX.
   */
  async createExpense(
    companyId: string,
    data: CreateExpenseInput
  ): Promise<ExpenseWithDetails> {
    const supabase = await this.getClient();

    if (!data.description || !data.description.trim()) {
      throw new Error("La descripción del gasto es obligatoria.");
    }

    const baseAmount = roundMoney(Number(data.amount || 0));
    if (baseAmount <= 0) {
      throw new Error("El monto del gasto debe ser mayor a 0.");
    }

    const itbisPaid = roundMoney(
      Number(data.itbis_paid ?? data.itbisPaid ?? 0)
    );
    const totalAmount = roundMoney(baseAmount + itbisPaid);

    const expenseNumber = await this.generateNextExpenseNumber(companyId);

    const expenseDate =
      data.expense_date ??
      data.expenseDate ??
      new Date().toISOString().split("T")[0];

    const paymentStatus: ExpensePaymentStatus =
      data.payment_status ?? data.paymentStatus ?? "pendiente";

    const isBillable =
      data.is_billable_to_client ?? data.isBillableToClient ?? false;
    const isReimbursed =
      data.is_reimbursed ??
      data.isReimbursed ??
      paymentStatus === "reembolsado";

    const insertPayload: ExpenseInsert = {
      company_id: companyId,
      expense_number: expenseNumber,
      case_id: data.case_id ?? data.caseId ?? null,
      supplier_name: data.supplier_name ?? data.supplierName ?? null,
      supplier_rnc: data.supplier_rnc ?? data.supplierRnc ?? null,
      ncf: data.ncf ?? null,
      expense_date: expenseDate,
      category: data.category,
      description: data.description.trim(),
      amount: baseAmount,
      itbis_paid: itbisPaid,
      total_amount: totalAmount,
      currency: data.currency ?? "DOP",
      payment_status: paymentStatus,
      is_billable_to_client: isBillable,
      is_reimbursed: isReimbursed,
      created_by: data.created_by ?? data.createdBy ?? null,
    };

    const { data: createdExpense, error: insertError } = await (supabase
      .from("expenses" as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Error al registrar gasto:", insertError);
      throw insertError;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "expense",
        entityId: createdExpense.id,
        action: "create",
        newData: createdExpense,
        reason: `Gasto ${expenseNumber} registrado (${data.category}) por RD$ ${totalAmount.toFixed(
          2
        )}`,
      });
    } catch (auditErr) {
      console.warn("Error al registrar auditoría de gasto:", auditErr);
    }

    const fullExpense = await this.getExpenseById(companyId, createdExpense.id);
    if (!fullExpense) {
      throw new Error("No se pudo recuperar el gasto recién creado.");
    }
    return fullExpense;
  }

  /**
   * Actualiza el estado de pago del gasto ('pendiente' | 'pagado' | 'reembolsado').
   */
  async updateExpenseStatus(
    companyId: string,
    id: string,
    status: ExpensePaymentStatus
  ): Promise<ExpenseWithDetails> {
    const supabase = await this.getClient();

    const current = await this.getExpenseById(companyId, id);
    if (!current) {
      throw new Error(`Gasto con ID ${id} no encontrado.`);
    }

    const updatePayload: ExpenseUpdate = {
      payment_status: status,
      is_reimbursed: status === "reembolsado" ? true : current.is_reimbursed,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase.from("expenses" as any) as any)
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al actualizar estado del gasto:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "expense",
        entityId: id,
        action: "status_change",
        oldData: { payment_status: current.payment_status },
        newData: { payment_status: status },
        reason: `Cambio de estado del gasto ${current.expense_number} a ${status}`,
      });
    } catch (auditErr) {
      console.warn("Error en auditoría de gasto:", auditErr);
    }

    const updated = await this.getExpenseById(companyId, id);
    if (!updated) {
      throw new Error("No se pudo recuperar el gasto actualizado.");
    }
    return updated;
  }

  /**
   * Elimina un gasto por ID.
   */
  async deleteExpense(companyId: string, id: string): Promise<void> {
    const supabase = await this.getClient();

    const current = await this.getExpenseById(companyId, id);
    if (!current) {
      throw new Error(`Gasto con ID ${id} no encontrado.`);
    }

    const { error } = await (supabase.from("expenses" as any) as any)
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar gasto:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "expense",
        entityId: id,
        action: "delete",
        oldData: current as any,
        reason: `Eliminación del gasto ${current.expense_number}`,
      });
    } catch (auditErr) {
      console.warn("Error al registrar auditoría de eliminación de gasto:", auditErr);
    }
  }

  /**
   * Obtiene un resumen cuantitativo y financiero de gastos:
   * Total de gastos, pagados, pendientes, reembolsados, facturables y desglose por categoría.
   */
  async getExpensesSummary(
    companyId: string,
    caseId?: string
  ): Promise<ExpensesSummary> {
    const supabase = await this.getClient();

    let query = (supabase.from("expenses" as any) as any)
      .select("category, total_amount, itbis_paid, payment_status, is_billable_to_client")
      .eq("company_id", companyId);

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener resumen de gastos:", error);
      throw error;
    }

    let totalGastos = 0;
    let totalPagado = 0;
    let totalPendiente = 0;
    let totalReembolsado = 0;
    let totalFacturable = 0;
    let totalItbisPagado = 0;

    const gastosPorCategoria: Record<ExpenseCategory, number> = {
      tasas_judiciales: 0,
      tasas_catastrales: 0,
      gastos_notariales: 0,
      peritajes: 0,
      viaticos_combustible: 0,
      suministros_oficina: 0,
      servicios_basicos: 0,
      honorarios_externos: 0,
      otro: 0,
    };

    for (const exp of data || []) {
      const amount = roundMoney(Number(exp.total_amount || 0));
      const itbis = roundMoney(Number(exp.itbis_paid || 0));

      totalGastos = roundMoney(totalGastos + amount);
      totalItbisPagado = roundMoney(totalItbisPagado + itbis);

      if (exp.payment_status === "pagado") {
        totalPagado = roundMoney(totalPagado + amount);
      } else if (exp.payment_status === "pendiente") {
        totalPendiente = roundMoney(totalPendiente + amount);
      } else if (exp.payment_status === "reembolsado") {
        totalReembolsado = roundMoney(totalReembolsado + amount);
      }

      if (exp.is_billable_to_client) {
        totalFacturable = roundMoney(totalFacturable + amount);
      }

      const cat = exp.category as ExpenseCategory;
      if (gastosPorCategoria[cat] !== undefined) {
        gastosPorCategoria[cat] = roundMoney(gastosPorCategoria[cat] + amount);
      } else {
        gastosPorCategoria.otro = roundMoney(gastosPorCategoria.otro + amount);
      }
    }

    return {
      totalGastos,
      totalPagado,
      totalPendiente,
      totalReembolsado,
      totalFacturable,
      totalItbisPagado,
      cantidadGastos: (data || []).length,
      gastosPorCategoria,
    };
  }
}

export const expenseService = new ExpenseService();
