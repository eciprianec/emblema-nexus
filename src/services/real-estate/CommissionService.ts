import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  BrokerCommissionRow,
  BrokerCommissionInsert,
  BrokerCommissionUpdate,
  BeneficiaryType,
  CommissionStatus,
} from "@/types/database.types";

export interface CommissionCalculationResult {
  dealAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  isIndividualAgent: boolean;
  taxWithholdingPercentage: number;
  taxWithholding: number;
  netAmount: number;
}

export interface CreateCommissionInput {
  property_id: string;
  contract_id?: string | null;
  invoice_id?: string | null;
  beneficiary_type: BeneficiaryType;
  agent_id?: string | null;
  external_broker_name?: string | null;
  external_broker_rnc?: string | null;
  total_deal_amount: number;
  commission_percentage: number;
  commission_amount?: number;
  tax_withholding?: number;
  net_amount?: number;
  status?: CommissionStatus;
  paid_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
}

export type UpdateCommissionInput = Partial<CreateCommissionInput>;

export interface GetCommissionsFilters {
  propertyId?: string;
  agentId?: string;
  contractId?: string;
  status?: string;
  beneficiaryType?: string;
  fromDate?: string;
  toDate?: string;
}

export interface BrokerCommissionWithDetails extends BrokerCommissionRow {
  property?: {
    id: string;
    code: string;
    title: string;
    property_type: string;
  } | null;
  contract?: {
    id: string;
    contract_number: string;
    contract_type: string;
    amount: number;
    currency: string;
  } | null;
  agent?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  invoice?: {
    id: string;
    invoice_number: string;
    ncf: string | null;
    total: number;
  } | null;
}

export interface CommissionsSummary {
  totalDealsAmount: number;
  totalGenerated: number;
  totalPaid: number;
  totalPending: number;
  totalTaxWithheld: number;
  totalNetAmount: number;
  counts: {
    total: number;
    pendiente: number;
    aprobada: number;
    pagada: number;
    cancelada: number;
  };
  amountsByStatus: {
    pendiente: number;
    aprobada: number;
    pagada: number;
    cancelada: number;
  };
}

export class CommissionService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Calcula la comisión de corretaje, retención de ISR (10% si persona física) y monto neto a pagar.
   *
   * Normativa Rep. Dominicana: Código Tributario Ley 11-92 Art. 309 y normas DGII
   * Retención del 10% del Impuesto Sobre la Renta (ISR) para servicios profesionales y comisiones a personas físicas.
   * Las empresas jurídicas no sufren retención de ISR si emiten NCF fiscal válido (B01).
   *
   * @param dealAmount Monto total de la transacción (venta o valor del contrato).
   * @param percentage Porcentaje acordado de comisión (ej: 5.0 para 5%).
   * @param isIndividualAgent True si el beneficiario es persona física (agente interno, corredor independiente).
   */
  calculateCommission(
    dealAmount: number,
    percentage: number,
    isIndividualAgent: boolean
  ): CommissionCalculationResult {
    const commissionAmount =
      Math.round(dealAmount * (percentage / 100) * 100) / 100;
    const taxWithholdingPercentage = isIndividualAgent ? 10.0 : 0.0;
    const taxWithholding = isIndividualAgent
      ? Math.round(commissionAmount * 0.1 * 100) / 100
      : 0.0;
    const netAmount = Math.round((commissionAmount - taxWithholding) * 100) / 100;

    return {
      dealAmount,
      commissionPercentage: percentage,
      commissionAmount,
      isIndividualAgent,
      taxWithholdingPercentage,
      taxWithholding,
      netAmount,
    };
  }

  /**
   * Hidrata las relaciones de las comisiones (propiedad, contrato, agente y factura).
   */
  private async hydrateCommissions(
    supabase: any,
    commissions: BrokerCommissionRow[]
  ): Promise<BrokerCommissionWithDetails[]> {
    if (!commissions || commissions.length === 0) return [];

    const propertyIds = Array.from(
      new Set(commissions.map((c) => c.property_id).filter(Boolean))
    );
    const contractIds = Array.from(
      new Set(commissions.map((c) => c.contract_id).filter(Boolean) as string[])
    );
    const agentIds = Array.from(
      new Set(commissions.map((c) => c.agent_id).filter(Boolean) as string[])
    );
    const invoiceIds = Array.from(
      new Set(commissions.map((c) => c.invoice_id).filter(Boolean) as string[])
    );

    const propertiesMap = new Map<string, any>();
    if (propertyIds.length > 0) {
      const { data: props } = await (supabase.from("properties" as any) as any)
        .select("id, code, title, property_type")
        .in("id", propertyIds);
      (props || []).forEach((p: any) => propertiesMap.set(p.id, p));
    }

    const contractsMap = new Map<string, any>();
    if (contractIds.length > 0) {
      const { data: cons } = await (
        supabase.from("property_contracts" as any) as any
      )
        .select("id, contract_number, contract_type, amount, currency")
        .in("id", contractIds);
      (cons || []).forEach((c: any) => contractsMap.set(c.id, c));
    }

    const agentsMap = new Map<string, any>();
    if (agentIds.length > 0) {
      const { data: agents } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name, avatar_url, phone")
        .in("id", agentIds);
      (agents || []).forEach((a: any) => agentsMap.set(a.id, a));
    }

    const invoicesMap = new Map<string, any>();
    if (invoiceIds.length > 0) {
      const { data: invs } = await (supabase.from("invoices" as any) as any)
        .select("id, invoice_number, ncf, total")
        .in("id", invoiceIds);
      (invs || []).forEach((i: any) => invoicesMap.set(i.id, i));
    }

    return commissions.map((com) => ({
      ...com,
      property: propertiesMap.get(com.property_id) ?? null,
      contract: com.contract_id ? contractsMap.get(com.contract_id) ?? null : null,
      agent: com.agent_id ? agentsMap.get(com.agent_id) ?? null : null,
      invoice: com.invoice_id ? invoicesMap.get(com.invoice_id) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de comisiones con filtros opcionales.
   */
  async getCommissions(
    companyId: string,
    filters?: GetCommissionsFilters
  ): Promise<BrokerCommissionWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("broker_commissions" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.propertyId) {
      query = query.eq("property_id", filters.propertyId);
    }
    if (filters?.agentId) {
      query = query.eq("agent_id", filters.agentId);
    }
    if (filters?.contractId) {
      query = query.eq("contract_id", filters.contractId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.beneficiaryType) {
      query = query.eq("beneficiary_type", filters.beneficiaryType);
    }
    if (filters?.fromDate) {
      query = query.gte("created_at", filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte("created_at", filters.toDate);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener comisiones:", error);
      throw new Error(`Error al consultar comisiones: ${error.message}`);
    }

    return this.hydrateCommissions(
      supabase,
      (data as BrokerCommissionRow[]) || []
    );
  }

  /**
   * Obtiene una liquidación de comisión por ID.
   */
  async getCommissionById(
    companyId: string,
    id: string
  ): Promise<BrokerCommissionWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (
      supabase.from("broker_commissions" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`Error al consultar comisión ${id}:`, error);
      throw new Error(`Error al consultar comisión: ${error.message}`);
    }

    if (!data) return null;

    const hydrated = await this.hydrateCommissions(supabase, [
      data as BrokerCommissionRow,
    ]);
    return hydrated[0] ?? null;
  }

  /**
   * Crea una nueva liquidación de comisión para agente o corredor.
   * Si no se indican los montos calculados, se computan automáticamente aplicando la retención correspondiente.
   */
  async createCommission(
    companyId: string,
    data: CreateCommissionInput
  ): Promise<BrokerCommissionRow> {
    const supabase = await this.getClient();

    let commissionAmount = data.commission_amount;
    let taxWithholding = data.tax_withholding;
    let netAmount = data.net_amount;

    if (
      commissionAmount === undefined ||
      taxWithholding === undefined ||
      netAmount === undefined
    ) {
      const isIndividual =
        data.beneficiary_type === "agente_interno" ||
        data.beneficiary_type === "colaborador" ||
        (data.beneficiary_type === "corredor_externo" &&
          (!data.external_broker_rnc ||
            data.external_broker_rnc.replace(/\D/g, "").length === 11));

      const calc = this.calculateCommission(
        data.total_deal_amount,
        data.commission_percentage,
        isIndividual
      );

      commissionAmount = commissionAmount ?? calc.commissionAmount;
      taxWithholding = taxWithholding ?? calc.taxWithholding;
      netAmount = netAmount ?? calc.netAmount;
    }

    const insertData: BrokerCommissionInsert = {
      company_id: companyId,
      property_id: data.property_id,
      contract_id: data.contract_id ?? null,
      invoice_id: data.invoice_id ?? null,
      beneficiary_type: data.beneficiary_type,
      agent_id: data.agent_id ?? null,
      external_broker_name: data.external_broker_name ?? null,
      external_broker_rnc: data.external_broker_rnc ?? null,
      total_deal_amount: data.total_deal_amount,
      commission_percentage: data.commission_percentage,
      commission_amount: commissionAmount,
      tax_withholding: taxWithholding ?? 0.0,
      net_amount: netAmount,
      status: data.status ?? "pendiente",
      paid_date: data.paid_date ?? null,
      payment_method: data.payment_method ?? null,
      notes: data.notes ?? null,
    };

    const { data: created, error } = await (
      supabase.from("broker_commissions" as any) as any
    )
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      console.error("Error al registrar comisión:", error);
      throw new Error(`Error al registrar la comisión: ${error.message}`);
    }

    return created as BrokerCommissionRow;
  }

  /**
   * Actualiza el estado de una comisión ('pendiente', 'aprobada', 'pagada', 'cancelada').
   * Si se marca como 'pagada', actualiza la fecha y método de pago.
   */
  async updateCommissionStatus(
    companyId: string,
    id: string,
    status: CommissionStatus | string,
    paidDate?: string,
    paymentMethod?: string
  ): Promise<BrokerCommissionRow> {
    const supabase = await this.getClient();

    const updatePayload: BrokerCommissionUpdate = {
      status: status as CommissionStatus,
      updated_at: new Date().toISOString(),
    };

    if (status === "pagada") {
      updatePayload.paid_date =
        paidDate || new Date().toISOString().split("T")[0];
      if (paymentMethod) {
        updatePayload.payment_method = paymentMethod;
      }
    }

    const { data: updated, error } = await (
      supabase.from("broker_commissions" as any) as any
    )
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error(`Error al actualizar estado de comisión ${id}:`, error);
      throw new Error(`Error al actualizar estado de la comisión: ${error.message}`);
    }

    return updated as BrokerCommissionRow;
  }

  /**
   * Obtiene el resumen consolidado de comisiones inmobiliarias:
   * Total generado, total pagado, pendiente de liquidación y retenciones fiscales acumuladas.
   */
  async getCommissionsSummary(companyId: string): Promise<CommissionsSummary> {
    const supabase = await this.getClient();

    const { data, error } = await (
      supabase.from("broker_commissions" as any) as any
    )
      .select("total_deal_amount, commission_amount, tax_withholding, net_amount, status")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error al calcular resumen de comisiones:", error);
      throw new Error(
        `Error al calcular resumen de comisiones: ${error.message}`
      );
    }

    const commissions = (data as BrokerCommissionRow[]) || [];

    let totalDealsAmount = 0;
    let totalGenerated = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalTaxWithheld = 0;
    let totalNetAmount = 0;

    const counts = {
      total: commissions.length,
      pendiente: 0,
      aprobada: 0,
      pagada: 0,
      cancelada: 0,
    };

    const amountsByStatus: Record<string, number> = {
      pendiente: 0,
      aprobada: 0,
      pagada: 0,
      cancelada: 0,
    };

    for (const c of commissions) {
      const deal = Number(c.total_deal_amount) || 0;
      const comm = Number(c.commission_amount) || 0;
      const tax = Number(c.tax_withholding) || 0;
      const net = Number(c.net_amount) || 0;
      const st = c.status;

      totalDealsAmount += deal;
      totalGenerated += comm;
      totalTaxWithheld += tax;
      totalNetAmount += net;

      if (st in counts) {
        counts[st as 'pendiente' | 'aprobada' | 'pagada' | 'cancelada']++;
      }
      if (st in amountsByStatus) {
        amountsByStatus[st] += net;
      }

      if (st === "pagada") {
        totalPaid += net;
      } else if (st === "pendiente" || st === "aprobada") {
        totalPending += net;
      }
    }

    return {
      totalDealsAmount: Math.round(totalDealsAmount * 100) / 100,
      totalGenerated: Math.round(totalGenerated * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      totalTaxWithheld: Math.round(totalTaxWithheld * 100) / 100,
      totalNetAmount: Math.round(totalNetAmount * 100) / 100,
      counts,
      amountsByStatus: {
        pendiente: Math.round(amountsByStatus.pendiente * 100) / 100,
        aprobada: Math.round(amountsByStatus.aprobada * 100) / 100,
        pagada: Math.round(amountsByStatus.pagada * 100) / 100,
        cancelada: Math.round(amountsByStatus.cancelada * 100) / 100,
      },
    };
  }
}

export const commissionService = new CommissionService();
