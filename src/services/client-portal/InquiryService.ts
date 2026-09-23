import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ClientInquiryRow,
  ClientInquiryInsert,
  ClientInquiryUpdate,
  InquiryServiceType,
  InquiryStatus,
  ClientRow,
  ClientInsert,
} from "@/types/database.types";

export interface CreateInquiryInput {
  full_name: string;
  email: string;
  phone?: string | null;
  rnc_cedula?: string | null;
  service_type: InquiryServiceType;
  message: string;
  clientId?: string | null;
  caseId?: string | null;
}

export interface GetInquiriesFilters {
  status?: string;
  serviceType?: string;
  search?: string;
}

export interface ClientInquiryWithDetails extends ClientInquiryRow {
  client?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    client_type: string;
    email: string | null;
    phone: string | null;
  } | null;
  case?: {
    id: string;
    case_number: string;
    title: string;
    status: string;
  } | null;
}

export class InquiryService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    if (this.client) return this.client;
    try {
      return createAdminClient();
    } catch {
      return await createClient();
    }
  }

  /**
   * Crea una nueva consulta o solicitud externa de servicios.
   */
  async createInquiry(
    companyId: string,
    data: CreateInquiryInput
  ): Promise<ClientInquiryRow> {
    const supabase = await this.getClient();

    if (!data.full_name?.trim()) {
      throw new Error("El nombre completo es obligatorio.");
    }
    if (!data.email?.trim()) {
      throw new Error("El correo electrónico es obligatorio.");
    }
    if (!data.message?.trim()) {
      throw new Error("El mensaje o consulta es obligatorio.");
    }

    const validServices: InquiryServiceType[] = [
      "legal_inmobiliario",
      "deslinde_mensura",
      "compraventa",
      "constitucion_compania",
      "otro",
    ];

    if (!validServices.includes(data.service_type)) {
      throw new Error(
        `Tipo de servicio no válido. Debe ser uno de: ${validServices.join(", ")}`
      );
    }

    const { data: created, error } = await (supabase
      .from("client_inquiries" as any) as any)
      .insert({
        company_id: companyId,
        full_name: data.full_name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        rnc_cedula: data.rnc_cedula?.trim() || null,
        service_type: data.service_type,
        message: data.message.trim(),
        status: "nuevo",
        client_id: data.clientId || null,
        case_id: data.caseId || null,
      } as ClientInquiryInsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al registrar consulta externa: ${error.message}`);
    }

    return created as ClientInquiryRow;
  }

  /**
   * Obtiene la lista de consultas externas para la empresa con filtros opcionales.
   */
  async getInquiries(
    companyId: string,
    filters?: GetInquiriesFilters
  ): Promise<ClientInquiryWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("client_inquiries" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.serviceType) {
      query = query.eq("service_type", filters.serviceType);
    }

    if (filters?.search) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(
        `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term},rnc_cedula.ilike.${term},message.ilike.${term}`
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data: inquiries, error } = await query;

    if (error) {
      throw new Error(`Error al consultar solicitudes: ${error.message}`);
    }

    if (!inquiries || inquiries.length === 0) {
      return [];
    }

    // Hidratar con datos de cliente y expediente si existen
    const clientIds = Array.from(
      new Set(inquiries.map((i: any) => i.client_id).filter(Boolean))
    );
    const caseIds = Array.from(
      new Set(inquiries.map((i: any) => i.case_id).filter(Boolean))
    );

    let clientMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const { data: clients } = await (supabase
        .from("clients" as any) as any)
        .select("id, first_name, last_name, business_name, client_type, email, phone")
        .in("id", clientIds);
      if (clients) {
        clientMap = new Map(clients.map((c: any) => [c.id, c]));
      }
    }

    let caseMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: cases } = await (supabase
        .from("cases" as any) as any)
        .select("id, case_number, title, status")
        .in("id", caseIds);
      if (cases) {
        caseMap = new Map(cases.map((c: any) => [c.id, c]));
      }
    }

    return inquiries.map((inq: any) => ({
      ...inq,
      client: inq.client_id ? clientMap.get(inq.client_id) || null : null,
      case: inq.case_id ? caseMap.get(inq.case_id) || null : null,
    }));
  }

  /**
   * Actualiza el estado de una consulta (nuevo, contactado, en_cotizacion, convertido, descartado).
   */
  async updateInquiryStatus(
    companyId: string,
    id: string,
    status: InquiryStatus,
    notes?: string
  ): Promise<ClientInquiryRow> {
    const supabase = await this.getClient();

    const validStatuses: InquiryStatus[] = [
      "nuevo",
      "contactado",
      "en_cotizacion",
      "convertido",
      "descartado",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(
        `Estado no válido. Debe ser uno de: ${validStatuses.join(", ")}`
      );
    }

    const { data: currentInquiry, error: fetchError } = await (supabase
      .from("client_inquiries" as any) as any)
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (fetchError || !currentInquiry) {
      throw new Error("Consulta no encontrada en esta empresa.");
    }

    let updatedMessage = currentInquiry.message;
    if (notes && notes.trim()) {
      const timestamp = new Date().toLocaleDateString("es-DO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      updatedMessage = `${updatedMessage}\n\n[Nota ${timestamp}]: ${notes.trim()}`;
    }

    const { data: updated, error: updateError } = await (supabase
      .from("client_inquiries" as any) as any)
      .update({
        status,
        message: updatedMessage,
        updated_at: new Date().toISOString(),
      } as ClientInquiryUpdate)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Error al actualizar estado de la consulta: ${updateError.message}`);
    }

    return updated as ClientInquiryRow;
  }

  /**
   * Convierte una consulta externa en un cliente registrado en la base de datos de Emblema Nexus.
   */
  async convertInquiryToClient(
    companyId: string,
    inquiryId: string
  ): Promise<{ client: ClientRow; inquiry: ClientInquiryRow }> {
    const supabase = await this.getClient();

    // 1. Obtener la consulta
    const { data: inquiry, error: inquiryError } = await (supabase
      .from("client_inquiries" as any) as any)
      .select("*")
      .eq("id", inquiryId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (inquiryError || !inquiry) {
      throw new Error("Consulta no encontrada en esta empresa.");
    }

    // 2. Si ya está vinculada a un cliente, devolver el existente
    if (inquiry.client_id) {
      const { data: existingClient } = await (supabase
        .from("clients" as any) as any)
        .select("*")
        .eq("id", inquiry.client_id)
        .maybeSingle();

      if (existingClient) {
        return { client: existingClient as ClientRow, inquiry: inquiry as ClientInquiryRow };
      }
    }

    // 3. Determinar si es persona jurídica o física según RNC/Cédula y nombre
    const rawDoc = (inquiry.rnc_cedula || "").replace(/\D/g, "");
    const nameUpper = inquiry.full_name.toUpperCase();
    const hasCompanyKeywords =
      nameUpper.includes("SRL") ||
      nameUpper.includes("S.R.L") ||
      nameUpper.includes("EIRL") ||
      nameUpper.includes("E.I.R.L") ||
      nameUpper.includes("S.A.") ||
      nameUpper.includes("SAS") ||
      nameUpper.includes("CORP") ||
      nameUpper.includes("INC") ||
      nameUpper.includes("INMOBILIARIA") ||
      nameUpper.includes("CONSTRUCTORA");

    let isJuridica = false;
    let cedula: string | null = null;
    let rnc: string | null = null;

    if (rawDoc.length === 9 || hasCompanyKeywords) {
      isJuridica = true;
      rnc = rawDoc.length === 9 ? rawDoc : inquiry.rnc_cedula;
    } else if (rawDoc.length === 11) {
      isJuridica = false;
      cedula = rawDoc;
    } else if (inquiry.rnc_cedula) {
      cedula = inquiry.rnc_cedula;
    }

    let firstName: string | null = null;
    let lastName: string | null = null;
    let businessName: string | null = null;

    if (isJuridica) {
      businessName = inquiry.full_name.trim();
    } else {
      const parts = inquiry.full_name.trim().split(/\s+/);
      if (parts.length === 1) {
        firstName = parts[0];
        lastName = "";
      } else if (parts.length === 2) {
        firstName = parts[0];
        lastName = parts[1];
      } else {
        firstName = parts.slice(0, 2).join(" ");
        lastName = parts.slice(2).join(" ");
      }
    }

    // 4. Insertar cliente en la tabla clients
    const clientPayload: ClientInsert = {
      company_id: companyId,
      client_type: isJuridica ? "persona_juridica" : "persona_fisica",
      first_name: firstName,
      last_name: lastName,
      business_name: businessName,
      cedula,
      rnc,
      email: inquiry.email,
      phone: inquiry.phone,
      notes: `Cliente creado a partir de consulta externa web (#${inquiry.id.slice(0, 8)}). Servicio solicitado: ${inquiry.service_type}. Mensaje original: "${inquiry.message}"`,
      is_active: true,
    };

    const { data: newClient, error: clientCreateError } = await (supabase
      .from("clients" as any) as any)
      .insert(clientPayload)
      .select()
      .single();

    if (clientCreateError) {
      throw new Error(`Error al crear cliente a partir de la consulta: ${clientCreateError.message}`);
    }

    // 5. Actualizar la consulta con el client_id y estado "convertido"
    const { data: updatedInquiry, error: updateInquiryError } = await (supabase
      .from("client_inquiries" as any) as any)
      .update({
        client_id: newClient.id,
        status: "convertido",
        updated_at: new Date().toISOString(),
      } as ClientInquiryUpdate)
      .eq("id", inquiry.id)
      .select()
      .single();

    if (updateInquiryError) {
      throw new Error(`Error al actualizar estado de la consulta: ${updateInquiryError.message}`);
    }

    return {
      client: newClient as ClientRow,
      inquiry: updatedInquiry as ClientInquiryRow,
    };
  }
}

export const inquiryService = new InquiryService();
