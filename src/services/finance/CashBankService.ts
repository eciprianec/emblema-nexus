import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logAuditEntry } from "@/services/audit/AuditService";
import { roundMoney } from "./InvoiceService";

export type BankAccountRow = Database["public"]["Tables"]["bank_accounts"]["Row"];
export type BankAccountInsert = Database["public"]["Tables"]["bank_accounts"]["Insert"];
export type BankAccountUpdate = Database["public"]["Tables"]["bank_accounts"]["Update"];

export type CashRegisterRow = Database["public"]["Tables"]["cash_registers"]["Row"];
export type CashRegisterInsert = Database["public"]["Tables"]["cash_registers"]["Insert"];
export type CashRegisterUpdate = Database["public"]["Tables"]["cash_registers"]["Update"];

export interface CreateBankAccountInput {
  bankName?: string;
  bank_name?: string;
  accountNumber?: string;
  account_number?: string;
  accountType?: "corriente" | "ahorros";
  account_type?: "corriente" | "ahorros";
  currency?: "DOP" | "USD";
  initialBalance?: number;
  initial_balance?: number;
  currentBalance?: number;
  current_balance?: number;
  isActive?: boolean;
  is_active?: boolean;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  bank_name?: string;
  accountNumber?: string;
  account_number?: string;
  accountType?: "corriente" | "ahorros";
  account_type?: "corriente" | "ahorros";
  currency?: "DOP" | "USD";
  currentBalance?: number;
  current_balance?: number;
  isActive?: boolean;
  is_active?: boolean;
}

export interface CreateCashRegisterInput {
  name: string;
  currency?: "DOP" | "USD";
  initialBalance?: number;
  initial_balance?: number;
  currentBalance?: number;
  current_balance?: number;
  responsibleId?: string | null;
  responsible_id?: string | null;
  status?: "abierta" | "cerrada";
}

export interface UpdateCashRegisterInput {
  name?: string;
  currency?: "DOP" | "USD";
  currentBalance?: number;
  current_balance?: number;
  responsibleId?: string | null;
  responsible_id?: string | null;
  status?: "abierta" | "cerrada";
}

export interface CashRegisterWithDetails extends CashRegisterRow {
  responsible?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
}

export interface CashBankSummary {
  totalBankBalanceDOP: number;
  totalBankBalanceUSD: number;
  totalCashBalanceDOP: number;
  totalCashBalanceUSD: number;
  totalLiquidityDOP: number;
  totalLiquidityUSD: number;
  bankAccountsCount: number;
  cashRegistersCount: number;
  activeCashRegistersCount: number;
}

export class CashBankService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  // ==========================================
  // CUENTAS BANCARIAS
  // ==========================================

  /**
   * Obtiene la lista de cuentas bancarias de la empresa.
   */
  async getBankAccounts(
    companyId: string,
    onlyActive: boolean = false
  ): Promise<BankAccountRow[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("bank_accounts" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (onlyActive) {
      query = query.eq("is_active", true);
    }

    query = query.order("created_at", { ascending: true });

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener cuentas bancarias:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Obtiene una cuenta bancaria por ID.
   */
  async getBankAccountById(
    companyId: string,
    id: string
  ): Promise<BankAccountRow | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("bank_accounts" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener cuenta bancaria por ID:", error);
      throw error;
    }

    return data ?? null;
  }

  /**
   * Registra una nueva cuenta bancaria.
   */
  async createBankAccount(
    companyId: string,
    data: CreateBankAccountInput
  ): Promise<BankAccountRow> {
    const supabase = await this.getClient();

    const bankName = data.bank_name ?? data.bankName;
    if (!bankName || !bankName.trim()) {
      throw new Error("El nombre de la entidad bancaria es obligatorio.");
    }

    const accountNumber = data.account_number ?? data.accountNumber;
    if (!accountNumber || !accountNumber.trim()) {
      throw new Error("El número de cuenta bancaria es obligatorio.");
    }

    const initialBalance = roundMoney(
      Number(data.initial_balance ?? data.initialBalance ?? 0)
    );
    const currentBalance = roundMoney(
      Number(data.current_balance ?? data.currentBalance ?? initialBalance)
    );

    const insertPayload: BankAccountInsert = {
      company_id: companyId,
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      account_type: data.account_type ?? data.accountType ?? "corriente",
      currency: data.currency ?? "DOP",
      initial_balance: initialBalance,
      current_balance: currentBalance,
      is_active: data.is_active ?? data.isActive ?? true,
    };

    const { data: created, error } = await (supabase
      .from("bank_accounts" as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error al crear cuenta bancaria:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "bank_account",
        entityId: created.id,
        action: "create",
        newData: created,
        reason: `Cuenta bancaria creada: ${created.bank_name} (${created.account_number})`,
      });
    } catch (auditErr) {
      console.warn("Error en auditoría de cuenta bancaria:", auditErr);
    }

    return created;
  }

  /**
   * Actualiza una cuenta bancaria.
   */
  async updateBankAccount(
    companyId: string,
    id: string,
    data: UpdateBankAccountInput
  ): Promise<BankAccountRow> {
    const supabase = await this.getClient();

    const current = await this.getBankAccountById(companyId, id);
    if (!current) {
      throw new Error(`Cuenta bancaria con ID ${id} no encontrada.`);
    }

    const updatePayload: BankAccountUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (data.bankName !== undefined || data.bank_name !== undefined) {
      updatePayload.bank_name = (data.bank_name ?? data.bankName)!.trim();
    }
    if (data.accountNumber !== undefined || data.account_number !== undefined) {
      updatePayload.account_number = (data.account_number ?? data.accountNumber)!.trim();
    }
    if (data.accountType !== undefined || data.account_type !== undefined) {
      updatePayload.account_type = data.account_type ?? data.accountType;
    }
    if (data.currency !== undefined) {
      updatePayload.currency = data.currency;
    }
    if (data.currentBalance !== undefined || data.current_balance !== undefined) {
      updatePayload.current_balance = roundMoney(
        Number(data.current_balance ?? data.currentBalance)
      );
    }
    if (data.isActive !== undefined || data.is_active !== undefined) {
      updatePayload.is_active = data.is_active ?? data.isActive;
    }

    const { data: updated, error } = await (supabase
      .from("bank_accounts" as any) as any)
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar cuenta bancaria:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "bank_account",
        entityId: id,
        action: "update",
        oldData: current as any,
        newData: updated,
        reason: `Cuenta bancaria ${current.bank_name} actualizada`,
      });
    } catch (auditErr) {
      console.warn("Error en auditoría de cuenta bancaria:", auditErr);
    }

    return updated;
  }

  /**
   * Elimina una cuenta bancaria.
   */
  async deleteBankAccount(companyId: string, id: string): Promise<void> {
    const supabase = await this.getClient();

    const current = await this.getBankAccountById(companyId, id);
    if (!current) {
      throw new Error(`Cuenta bancaria con ID ${id} no encontrada.`);
    }

    const { error } = await (supabase.from("bank_accounts" as any) as any)
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar cuenta bancaria:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "bank_account",
        entityId: id,
        action: "delete",
        oldData: current as any,
        reason: `Cuenta bancaria eliminada: ${current.bank_name} (${current.account_number})`,
      });
    } catch (auditErr) {
      console.warn("Error en auditoría de cuenta bancaria:", auditErr);
    }
  }

  // ==========================================
  // CAJAS CHICAS
  // ==========================================

  /**
   * Carga detalles de responsables para cajas chicas.
   */
  private async hydrateCashRegisters(
    supabase: any,
    registers: CashRegisterRow[]
  ): Promise<CashRegisterWithDetails[]> {
    if (!registers || registers.length === 0) return [];

    const userIds = Array.from(
      new Set(registers.map((r) => r.responsible_id).filter(Boolean) as string[])
    );

    const profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name, avatar_url")
        .in("id", userIds);
      (profiles || []).forEach((p: any) => profilesMap.set(p.id, p));
    }

    return registers.map((r) => ({
      ...r,
      responsible: r.responsible_id ? profilesMap.get(r.responsible_id) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de cajas chicas.
   */
  async getCashRegisters(
    companyId: string,
    status?: "abierta" | "cerrada"
  ): Promise<CashRegisterWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("cash_registers" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: true });

    const { data, error } = await query;
    if (error) {
      console.error("Error al consultar cajas chicas:", error);
      throw error;
    }

    return this.hydrateCashRegisters(supabase, data || []);
  }

  /**
   * Obtiene el detalle de una caja chica por ID.
   */
  async getCashRegisterById(
    companyId: string,
    id: string
  ): Promise<CashRegisterWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("cash_registers" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener caja chica por ID:", error);
      throw error;
    }

    if (!data) return null;

    const hydrated = await this.hydrateCashRegisters(supabase, [data]);
    return hydrated[0] ?? null;
  }

  /**
   * Crea una nueva caja chica.
   */
  async createCashRegister(
    companyId: string,
    data: CreateCashRegisterInput
  ): Promise<CashRegisterWithDetails> {
    const supabase = await this.getClient();

    if (!data.name || !data.name.trim()) {
      throw new Error("El nombre de la caja chica es obligatorio.");
    }

    const initialBalance = roundMoney(
      Number(data.initial_balance ?? data.initialBalance ?? 0)
    );
    const currentBalance = roundMoney(
      Number(data.current_balance ?? data.currentBalance ?? initialBalance)
    );

    const insertPayload: CashRegisterInsert = {
      company_id: companyId,
      name: data.name.trim(),
      currency: data.currency ?? "DOP",
      initial_balance: initialBalance,
      current_balance: currentBalance,
      responsible_id: data.responsible_id ?? data.responsibleId ?? null,
      status: data.status ?? "abierta",
    };

    const { data: created, error } = await (supabase
      .from("cash_registers" as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error al crear caja chica:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "cash_register",
        entityId: created.id,
        action: "create",
        newData: created,
        reason: `Caja chica creada: ${created.name}`,
      });
    } catch (auditErr) {
      console.warn("Error en auditoría de caja chica:", auditErr);
    }

    const full = await this.getCashRegisterById(companyId, created.id);
    if (!full) {
      throw new Error("No se pudo recuperar la caja chica creada.");
    }
    return full;
  }

  /**
   * Actualiza una caja chica.
   */
  async updateCashRegister(
    companyId: string,
    id: string,
    data: UpdateCashRegisterInput
  ): Promise<CashRegisterWithDetails> {
    const supabase = await this.getClient();

    const current = await this.getCashRegisterById(companyId, id);
    if (!current) {
      throw new Error(`Caja chica con ID ${id} no encontrada.`);
    }

    const updatePayload: CashRegisterUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.currency !== undefined) updatePayload.currency = data.currency;
    if (data.currentBalance !== undefined || data.current_balance !== undefined) {
      updatePayload.current_balance = roundMoney(
        Number(data.current_balance ?? data.currentBalance)
      );
    }
    if (data.responsibleId !== undefined || data.responsible_id !== undefined) {
      updatePayload.responsible_id = data.responsible_id ?? data.responsibleId;
    }
    if (data.status !== undefined) updatePayload.status = data.status;

    const { error } = await (supabase.from("cash_registers" as any) as any)
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al actualizar caja chica:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "cash_register",
        entityId: id,
        action: "update",
        oldData: current as any,
        newData: updatePayload as any,
        reason: `Caja chica ${current.name} actualizada`,
      });
    } catch (auditErr) {
      console.warn("Error en auditoría de caja chica:", auditErr);
    }

    const updated = await this.getCashRegisterById(companyId, id);
    if (!updated) {
      throw new Error("No se pudo recuperar la caja chica actualizada.");
    }
    return updated;
  }

  /**
   * Cierra una caja chica.
   */
  async closeCashRegister(
    companyId: string,
    id: string
  ): Promise<CashRegisterWithDetails> {
    return this.updateCashRegister(companyId, id, { status: "cerrada" });
  }

  /**
   * Reapertura una caja chica.
   */
  async reopenCashRegister(
    companyId: string,
    id: string
  ): Promise<CashRegisterWithDetails> {
    return this.updateCashRegister(companyId, id, { status: "abierta" });
  }

  // ==========================================
  // RESUMEN CONSOLIDADO DE CAJA Y BANCOS
  // ==========================================

  /**
   * Obtiene el resumen de liquidez consolidada:
   * Total en bancos por moneda (DOP, USD), total en cajas chicas, y liquidez disponible.
   */
  async getCashBankSummary(companyId: string): Promise<CashBankSummary> {
    const supabase = await this.getClient();

    const [banksRes, cashRes] = await Promise.all([
      (supabase.from("bank_accounts" as any) as any)
        .select("currency, current_balance, is_active")
        .eq("company_id", companyId),
      (supabase.from("cash_registers" as any) as any)
        .select("currency, current_balance, status")
        .eq("company_id", companyId),
    ]);

    if (banksRes.error) {
      console.error("Error al obtener balance bancario:", banksRes.error);
      throw banksRes.error;
    }
    if (cashRes.error) {
      console.error("Error al obtener balance de cajas:", cashRes.error);
      throw cashRes.error;
    }

    let totalBankBalanceDOP = 0;
    let totalBankBalanceUSD = 0;
    let totalCashBalanceDOP = 0;
    let totalCashBalanceUSD = 0;
    let activeCashRegistersCount = 0;

    for (const bank of banksRes.data || []) {
      const bal = roundMoney(Number(bank.current_balance || 0));
      if (bank.currency === "USD") {
        totalBankBalanceUSD = roundMoney(totalBankBalanceUSD + bal);
      } else {
        totalBankBalanceDOP = roundMoney(totalBankBalanceDOP + bal);
      }
    }

    for (const cash of cashRes.data || []) {
      const bal = roundMoney(Number(cash.current_balance || 0));
      if (cash.status === "abierta") {
        activeCashRegistersCount++;
      }
      if (cash.currency === "USD") {
        totalCashBalanceUSD = roundMoney(totalCashBalanceUSD + bal);
      } else {
        totalCashBalanceDOP = roundMoney(totalCashBalanceDOP + bal);
      }
    }

    const totalLiquidityDOP = roundMoney(totalBankBalanceDOP + totalCashBalanceDOP);
    const totalLiquidityUSD = roundMoney(totalBankBalanceUSD + totalCashBalanceUSD);

    return {
      totalBankBalanceDOP,
      totalBankBalanceUSD,
      totalCashBalanceDOP,
      totalCashBalanceUSD,
      totalLiquidityDOP,
      totalLiquidityUSD,
      bankAccountsCount: (banksRes.data || []).length,
      cashRegistersCount: (cashRes.data || []).length,
      activeCashRegistersCount,
    };
  }
}

export const cashBankService = new CashBankService();
