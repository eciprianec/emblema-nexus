import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  PropertyShowingRow,
  PropertyShowingInsert,
  PropertyShowingUpdate,
  ShowingStatus,
  ShowingInterestLevel,
} from "@/types/database.types";

export interface CreateShowingInput {
  property_id: string;
  client_id?: string | null;
  agent_id?: string | null;
  showing_date: string;
  status?: ShowingStatus;
  interest_level?: ShowingInterestLevel;
  feedback?: string | null;
  offer_made?: boolean;
  offer_amount?: number | null;
}

export type UpdateShowingInput = Partial<CreateShowingInput>;

export interface GetShowingsFilters {
  propertyId?: string;
  agentId?: string;
  clientId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PropertyShowingWithDetails extends PropertyShowingRow {
  property?: {
    id: string;
    code: string;
    title: string;
    property_type: string;
    sale_price: number | null;
    rental_price: number | null;
    currency: string;
    address_sector: string;
    address_municipality: string;
  } | null;
  client?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  agent?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    phone: string | null;
  } | null;
}

export class ShowingService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Hidrata las relaciones de las visitas/citas (propiedad, cliente, asesor/agente inmobiliario).
   */
  private async hydrateShowings(
    supabase: any,
    showings: PropertyShowingRow[]
  ): Promise<PropertyShowingWithDetails[]> {
    if (!showings || showings.length === 0) return [];

    const propertyIds = Array.from(
      new Set(showings.map((s) => s.property_id).filter(Boolean))
    );
    const clientIds = Array.from(
      new Set(showings.map((s) => s.client_id).filter(Boolean) as string[])
    );
    const agentIds = Array.from(
      new Set(showings.map((s) => s.agent_id).filter(Boolean) as string[])
    );

    const propertiesMap = new Map<string, any>();
    if (propertyIds.length > 0) {
      const { data: props } = await (supabase.from("properties" as any) as any)
        .select("id, code, title, property_type, sale_price, rental_price, currency, address_sector, address_municipality")
        .in("id", propertyIds);
      (props || []).forEach((p: any) => propertiesMap.set(p.id, p));
    }

    const clientsMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const { data: clients } = await (supabase.from("clients" as any) as any)
        .select("id, first_name, last_name, business_name, phone, email")
        .in("id", clientIds);
      (clients || []).forEach((c: any) => clientsMap.set(c.id, c));
    }

    const agentsMap = new Map<string, any>();
    if (agentIds.length > 0) {
      const { data: agents } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name, avatar_url, phone")
        .in("id", agentIds);
      (agents || []).forEach((a: any) => agentsMap.set(a.id, a));
    }

    return showings.map((s) => ({
      ...s,
      property: propertiesMap.get(s.property_id) ?? null,
      client: s.client_id ? clientsMap.get(s.client_id) ?? null : null,
      agent: s.agent_id ? agentsMap.get(s.agent_id) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de visitas/citas inmobiliarias según filtros opcionales.
   */
  async getShowings(
    companyId: string,
    filters?: GetShowingsFilters
  ): Promise<PropertyShowingWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("property_showings" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.propertyId) {
      query = query.eq("property_id", filters.propertyId);
    }
    if (filters?.agentId) {
      query = query.eq("agent_id", filters.agentId);
    }
    if (filters?.clientId) {
      query = query.eq("client_id", filters.clientId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.fromDate) {
      query = query.gte("showing_date", filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte("showing_date", filters.toDate);
    }

    query = query.order("showing_date", { ascending: true });

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener citas inmobiliarias:", error);
      throw new Error(`Error al consultar citas y visitas: ${error.message}`);
    }

    return this.hydrateShowings(supabase, (data as PropertyShowingRow[]) || []);
  }

  /**
   * Obtiene una cita específica por su ID.
   */
  async getShowingById(
    companyId: string,
    id: string
  ): Promise<PropertyShowingWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (
      supabase.from("property_showings" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`Error al consultar cita inmobiliaria ${id}:`, error);
      throw new Error(`Error al consultar la cita: ${error.message}`);
    }

    if (!data) return null;

    const hydrated = await this.hydrateShowings(supabase, [
      data as PropertyShowingRow,
    ]);
    return hydrated[0] ?? null;
  }

  /**
   * Agenda una nueva visita o cita inmobiliaria.
   */
  async createShowing(
    companyId: string,
    data: CreateShowingInput
  ): Promise<PropertyShowingRow> {
    const supabase = await this.getClient();

    const insertData: PropertyShowingInsert = {
      company_id: companyId,
      property_id: data.property_id,
      client_id: data.client_id ?? null,
      agent_id: data.agent_id ?? null,
      showing_date: data.showing_date,
      status: data.status ?? "programada",
      interest_level: data.interest_level ?? "medio",
      feedback: data.feedback ?? null,
      offer_made: data.offer_made ?? false,
      offer_amount: data.offer_amount !== undefined ? data.offer_amount : null,
    };

    const { data: created, error } = await (
      supabase.from("property_showings" as any) as any
    )
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      console.error("Error al registrar visita inmobiliaria:", error);
      throw new Error(`Error al registrar la cita: ${error.message}`);
    }

    return created as PropertyShowingRow;
  }

  /**
   * Actualiza los datos de una cita existente.
   */
  async updateShowing(
    companyId: string,
    id: string,
    data: UpdateShowingInput
  ): Promise<PropertyShowingRow> {
    const supabase = await this.getClient();

    const updatePayload: PropertyShowingUpdate = {
      ...(data.property_id !== undefined && { property_id: data.property_id }),
      ...(data.client_id !== undefined && { client_id: data.client_id }),
      ...(data.agent_id !== undefined && { agent_id: data.agent_id }),
      ...(data.showing_date !== undefined && {
        showing_date: data.showing_date,
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.interest_level !== undefined && {
        interest_level: data.interest_level,
      }),
      ...(data.feedback !== undefined && { feedback: data.feedback }),
      ...(data.offer_made !== undefined && { offer_made: data.offer_made }),
      ...(data.offer_amount !== undefined && {
        offer_amount: data.offer_amount,
      }),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await (
      supabase.from("property_showings" as any) as any
    )
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error(`Error al actualizar cita ${id}:`, error);
      throw new Error(`Error al actualizar la cita: ${error.message}`);
    }

    return updated as PropertyShowingRow;
  }

  /**
   * Registra la retroalimentación (feedback) del cliente, nivel de interés y oferta realizada tras la visita.
   * Cambia automáticamente el estado a 'completada' si estaba 'programada'.
   */
  async recordFeedback(
    companyId: string,
    id: string,
    feedback: string,
    interestLevel: ShowingInterestLevel | string,
    offerMade: boolean = false,
    offerAmount?: number
  ): Promise<PropertyShowingRow> {
    const supabase = await this.getClient();

    // Obtener estado actual
    const { data: current } = await (
      supabase.from("property_showings" as any) as any
    )
      .select("status")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    const newStatus =
      current?.status === "programada" ? "completada" : current?.status || "completada";

    const { data: updated, error } = await (
      supabase.from("property_showings" as any) as any
    )
      .update({
        feedback,
        interest_level: interestLevel as ShowingInterestLevel,
        offer_made: offerMade,
        offer_amount: offerAmount !== undefined ? offerAmount : null,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error(`Error al registrar feedback en visita ${id}:`, error);
      throw new Error(`Error al registrar retroalimentación: ${error.message}`);
    }

    return updated as PropertyShowingRow;
  }
}

export const showingService = new ShowingService();
