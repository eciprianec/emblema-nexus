import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  PropertyContractRow,
  PropertyContractInsert,
  PropertyContractUpdate,
  ContractType,
  ContractStatus,
} from "@/types/database.types";

export interface CreateContractInput {
  property_id: string;
  contract_number?: string;
  contract_type: ContractType;
  status?: ContractStatus;
  lessor_client_id?: string | null;
  tenant_client_id?: string | null;
  case_id?: string | null;
  start_date: string;
  end_date?: string | null;
  currency?: "USD" | "DOP";
  amount: number;
  deposit_amount?: number | null;
  deposit_months?: number;
  payment_frequency?: string;
  late_fee_percentage?: number;
  grace_period_days?: number;
  terms_conditions?: string | null;
  document_url?: string | null;
  created_by?: string | null;
}

export type UpdateContractInput = Partial<CreateContractInput>;

export interface GetContractsFilters {
  propertyId?: string;
  contractType?: string;
  status?: string;
  search?: string;
  lessorClientId?: string;
  tenantClientId?: string;
  caseId?: string;
}

export interface PropertyContractWithDetails extends PropertyContractRow {
  property?: {
    id: string;
    code: string;
    title: string;
    property_type: string;
    address_sector: string;
    address_municipality: string;
  } | null;
  lessor?: {
    id: string;
    client_type: string;
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    rnc: string | null;
    cedula: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  tenant?: {
    id: string;
    client_type: string;
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    rnc: string | null;
    cedula: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface LateFeeCalculationResult {
  originalAmount: number;
  dueDate: string;
  referenceDate: string;
  daysLate: number;
  gracePeriodDays: number;
  feePercentage: number;
  isOverdue: boolean;
  gracePeriodExpired: boolean;
  lateFeeAmount: number;
  totalAmountDue: number;
  statusText: string;
}

export class PropertyContractService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Genera un número correlativo para el contrato inmobiliario (ej: 'CON-2026-001').
   */
  private async generateContractNumber(
    supabase: any,
    companyId: string
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `CON-${currentYear}-`;

    const { data, error } = await (supabase.from("property_contracts" as any) as any)
      .select("contract_number")
      .eq("company_id", companyId)
      .ilike("contract_number", `${prefix}%`);

    if (error) {
      console.warn("Advertencia al consultar correlativo de contratos:", error);
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      for (const row of data) {
        const numPart = (row.contract_number || "").replace(prefix, "");
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed >= nextNumber) {
          nextNumber = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  }

  /**
   * Hidrata las relaciones de los contratos inmobiliarios (propiedad, arrendador/propietario, inquilino/comprador, caso, creador).
   */
  private async hydrateContracts(
    supabase: any,
    contracts: PropertyContractRow[]
  ): Promise<PropertyContractWithDetails[]> {
    if (!contracts || contracts.length === 0) return [];

    const propertyIds = Array.from(
      new Set(contracts.map((c) => c.property_id).filter(Boolean))
    );
    const clientIds = Array.from(
      new Set([
        ...contracts.map((c) => c.lessor_client_id).filter(Boolean),
        ...contracts.map((c) => c.tenant_client_id).filter(Boolean),
      ] as string[])
    );
    const caseIds = Array.from(
      new Set(contracts.map((c) => c.case_id).filter(Boolean) as string[])
    );
    const creatorIds = Array.from(
      new Set(contracts.map((c) => c.created_by).filter(Boolean) as string[])
    );

    const propertiesMap = new Map<string, any>();
    if (propertyIds.length > 0) {
      const { data: props } = await (supabase.from("properties" as any) as any)
        .select("id, code, title, property_type, address_sector, address_municipality")
        .in("id", propertyIds);
      (props || []).forEach((p: any) => propertiesMap.set(p.id, p));
    }

    const clientsMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const { data: clients } = await (supabase.from("clients" as any) as any)
        .select("id, client_type, first_name, last_name, business_name, rnc, cedula, phone, email")
        .in("id", clientIds);
      (clients || []).forEach((c: any) => clientsMap.set(c.id, c));
    }

    const casesMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: cases } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .in("id", caseIds);
      (cases || []).forEach((c: any) => casesMap.set(c.id, c));
    }

    const creatorsMap = new Map<string, any>();
    if (creatorIds.length > 0) {
      const { data: creators } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name")
        .in("id", creatorIds);
      (creators || []).forEach((c: any) => creatorsMap.set(c.id, c));
    }

    return contracts.map((con) => ({
      ...con,
      property: propertiesMap.get(con.property_id) ?? null,
      lessor: con.lessor_client_id
        ? clientsMap.get(con.lessor_client_id) ?? null
        : null,
      tenant: con.tenant_client_id
        ? clientsMap.get(con.tenant_client_id) ?? null
        : null,
      case: con.case_id ? casesMap.get(con.case_id) ?? null : null,
      creator: con.created_by ? creatorsMap.get(con.created_by) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de contratos inmobiliarios con filtros opcionales.
   */
  async getContracts(
    companyId: string,
    filters?: GetContractsFilters
  ): Promise<PropertyContractWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("property_contracts" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.propertyId) {
      query = query.eq("property_id", filters.propertyId);
    }
    if (filters?.contractType) {
      query = query.eq("contract_type", filters.contractType);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.lessorClientId) {
      query = query.eq("lessor_client_id", filters.lessorClientId);
    }
    if (filters?.tenantClientId) {
      query = query.eq("tenant_client_id", filters.tenantClientId);
    }
    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `contract_number.ilike.${term},terms_conditions.ilike.${term}`
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error al consultar contratos inmobiliarios:", error);
      throw new Error(`Error al consultar contratos: ${error.message}`);
    }

    return this.hydrateContracts(supabase, (data as PropertyContractRow[]) || []);
  }

  /**
   * Obtiene un contrato inmobiliario por ID con sus entidades relacionadas.
   */
  async getContractById(
    companyId: string,
    id: string
  ): Promise<PropertyContractWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (
      supabase.from("property_contracts" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`Error al consultar contrato ${id}:`, error);
      throw new Error(`Error al consultar el contrato: ${error.message}`);
    }

    if (!data) return null;

    const hydrated = await this.hydrateContracts(supabase, [
      data as PropertyContractRow,
    ]);
    return hydrated[0] ?? null;
  }

  /**
   * Crea un nuevo contrato inmobiliario.
   */
  async createContract(
    companyId: string,
    data: CreateContractInput
  ): Promise<PropertyContractRow> {
    const supabase = await this.getClient();

    const contractNumber =
      data.contract_number ||
      (await this.generateContractNumber(supabase, companyId));

    const insertData: PropertyContractInsert = {
      company_id: companyId,
      property_id: data.property_id,
      contract_number: contractNumber,
      contract_type: data.contract_type,
      status: data.status ?? "vigente",
      lessor_client_id: data.lessor_client_id ?? null,
      tenant_client_id: data.tenant_client_id ?? null,
      case_id: data.case_id ?? null,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      currency: data.currency ?? "USD",
      amount: data.amount,
      deposit_amount:
        data.deposit_amount !== undefined ? data.deposit_amount : null,
      deposit_months:
        data.deposit_months !== undefined ? data.deposit_months : 2,
      payment_frequency: data.payment_frequency ?? "mensual",
      late_fee_percentage:
        data.late_fee_percentage !== undefined ? data.late_fee_percentage : 5.0,
      grace_period_days:
        data.grace_period_days !== undefined ? data.grace_period_days : 5,
      terms_conditions: data.terms_conditions ?? null,
      document_url: data.document_url ?? null,
      created_by: data.created_by ?? null,
    };

    const { data: created, error } = await (
      supabase.from("property_contracts" as any) as any
    )
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      console.error("Error al registrar contrato inmobiliario:", error);
      throw new Error(`Error al registrar el contrato: ${error.message}`);
    }

    return created as PropertyContractRow;
  }

  /**
   * Actualiza el estado de un contrato inmobiliario ('borrador', 'vigente', 'vencido', 'resuelto', 'cancelado').
   */
  async updateContractStatus(
    companyId: string,
    id: string,
    status: ContractStatus | string
  ): Promise<PropertyContractRow> {
    const supabase = await this.getClient();

    const { data: updated, error } = await (
      supabase.from("property_contracts" as any) as any
    )
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error(`Error al actualizar estado del contrato ${id}:`, error);
      throw new Error(`Error al actualizar estado del contrato: ${error.message}`);
    }

    return updated as PropertyContractRow;
  }

  /**
   * Calcula la mora y recargos por atraso según fecha de vencimiento, días de gracia y porcentaje pactado.
   *
   * @param amount Monto mensual de renta o cuota contratada.
   * @param dueDate Fecha de vencimiento exigible (YYYY-MM-DD).
   * @param graceDays Días de gracia sin recargo (por defecto 5 días según práctica inmobiliaria dominicana).
   * @param feePercentage Porcentaje de mora aplicable (por defecto 5.00%).
   * @param referenceDate Fecha de corte/cálculo opcional (por defecto la fecha actual).
   */
  calculateLateFee(
    amount: number,
    dueDate: string,
    graceDays: number = 5,
    feePercentage: number = 5.0,
    referenceDate?: string
  ): LateFeeCalculationResult {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const ref = referenceDate ? new Date(referenceDate) : new Date();
    ref.setHours(0, 0, 0, 0);

    const diffTime = ref.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysLate = Math.max(0, diffDays);

    const isOverdue = daysLate > 0;
    const gracePeriodExpired = daysLate > graceDays;

    let lateFeeAmount = 0;
    if (gracePeriodExpired) {
      lateFeeAmount = Math.round(amount * (feePercentage / 100) * 100) / 100;
    }

    const totalAmountDue = Math.round((amount + lateFeeAmount) * 100) / 100;

    let statusText = "Al día";
    if (gracePeriodExpired) {
      statusText = `Vencido con ${daysLate} días de atraso. Aplica penalidad por mora de ${feePercentage}% (${lateFeeAmount.toFixed(2)})`;
    } else if (isOverdue) {
      statusText = `En período de gracia (${daysLate} de ${graceDays} días permitidos)`;
    }

    return {
      originalAmount: amount,
      dueDate,
      referenceDate: ref.toISOString().split("T")[0],
      daysLate,
      gracePeriodDays: graceDays,
      feePercentage,
      isOverdue,
      gracePeriodExpired,
      lateFeeAmount,
      totalAmountDue,
      statusText,
    };
  }

  /**
   * Obtiene los contratos vigentes que están próximos a vencer dentro del rango de días especificado.
   * @param companyId Identificador de la empresa.
   * @param days Días límite a futuro para considerar próximo a vencer (por defecto 30 días).
   */
  async getExpiringContracts(
    companyId: string,
    days: number = 30
  ): Promise<PropertyContractWithDetails[]> {
    const supabase = await this.getClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const limit = new Date(today);
    limit.setDate(limit.getDate() + days);
    const limitStr = limit.toISOString().split("T")[0];

    const { data, error } = await (
      supabase.from("property_contracts" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "vigente")
      .not("end_date", "is", null)
      .gte("end_date", todayStr)
      .lte("end_date", limitStr)
      .order("end_date", { ascending: true });

    if (error) {
      console.error("Error al obtener contratos próximos a vencer:", error);
      throw new Error(
        `Error al consultar contratos próximos a vencer: ${error.message}`
      );
    }

    return this.hydrateContracts(supabase, (data as PropertyContractRow[]) || []);
  }
}

export const propertyContractService = new PropertyContractService();
