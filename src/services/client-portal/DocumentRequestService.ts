import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ClientDocumentRequestRow,
  ClientDocumentRequestInsert,
  ClientDocumentRequestUpdate,
  DocumentRequestStatus,
} from "@/types/database.types";

export interface CreateDocumentRequestInput {
  client_id: string;
  case_id?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
}

export interface ClientDocumentRequestWithDetails extends ClientDocumentRequestRow {
  uploaded_document?: {
    id: string;
    name: string;
    original_filename: string;
    mime_type: string | null;
    file_size: number | null;
    created_at: string;
    status: string;
  } | null;
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  client?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    email: string | null;
  } | null;
}

export class DocumentRequestService {
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
   * Crea una nueva solicitud/requerimiento de documento a un cliente.
   */
  async createDocumentRequest(
    companyId: string,
    data: CreateDocumentRequestInput
  ): Promise<ClientDocumentRequestRow> {
    const supabase = await this.getClient();

    if (!data.client_id) {
      throw new Error("El ID del cliente es obligatorio.");
    }
    if (!data.title?.trim()) {
      throw new Error("El título o nombre del documento requerido es obligatorio.");
    }

    const { data: created, error } = await (supabase
      .from("client_document_requests" as any) as any)
      .insert({
        company_id: companyId,
        client_id: data.client_id,
        case_id: data.case_id || null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        status: "pendiente",
        due_date: data.due_date || null,
      } as ClientDocumentRequestInsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear requerimiento de documento: ${error.message}`);
    }

    return created as ClientDocumentRequestRow;
  }

  /**
   * Vincula un documento subido a la solicitud correspondiente y cambia el estado a 'subido'.
   */
  async uploadRequestedDocument(
    companyId: string,
    requestId: string,
    documentId: string
  ): Promise<ClientDocumentRequestRow> {
    const supabase = await this.getClient();

    // 1. Verificar existencia del requerimiento
    const { data: request, error: requestError } = await (supabase
      .from("client_document_requests" as any) as any)
      .select("id")
      .eq("id", requestId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (requestError || !request) {
      throw new Error("Requerimiento de documento no encontrado.");
    }

    // 2. Verificar existencia del documento
    const { data: document, error: docError } = await (supabase
      .from("documents" as any) as any)
      .select("id")
      .eq("id", documentId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (docError || !document) {
      throw new Error("Documento subido no encontrado en el sistema documental.");
    }

    // 3. Actualizar requerimiento
    const { data: updated, error: updateError } = await (supabase
      .from("client_document_requests" as any) as any)
      .update({
        uploaded_document_id: documentId,
        status: "subido",
        updated_at: new Date().toISOString(),
      } as ClientDocumentRequestUpdate)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Error al vincular documento al requerimiento: ${updateError.message}`);
    }

    return updated as ClientDocumentRequestRow;
  }

  /**
   * Revisa y aprueba o rechaza el documento subido por el cliente.
   */
  async reviewDocumentRequest(
    companyId: string,
    requestId: string,
    approved: boolean,
    notes?: string
  ): Promise<ClientDocumentRequestRow> {
    const supabase = await this.getClient();

    const { data: currentRequest, error: fetchError } = await (supabase
      .from("client_document_requests" as any) as any)
      .select("*")
      .eq("id", requestId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (fetchError || !currentRequest) {
      throw new Error("Requerimiento de documento no encontrado.");
    }

    const newStatus: DocumentRequestStatus = approved ? "revisado" : "rechazado";
    let updatedDescription = currentRequest.description || "";

    if (notes && notes.trim()) {
      const timestamp = new Date().toLocaleDateString("es-DO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const prefix = approved ? "Aprobado" : "Rechazado";
      updatedDescription = `${updatedDescription ? updatedDescription + "\n\n" : ""}[Revisión ${prefix} - ${timestamp}]: ${notes.trim()}`;
    }

    const { data: updated, error: updateError } = await (supabase
      .from("client_document_requests" as any) as any)
      .update({
        status: newStatus,
        description: updatedDescription || null,
        updated_at: new Date().toISOString(),
      } as ClientDocumentRequestUpdate)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Error al revisar requerimiento de documento: ${updateError.message}`);
    }

    return updated as ClientDocumentRequestRow;
  }

  /**
   * Obtiene todos los requerimientos de un cliente con detalles de los documentos vinculados.
   */
  async getDocumentRequestsByClient(
    companyId: string,
    clientId: string
  ): Promise<ClientDocumentRequestWithDetails[]> {
    const supabase = await this.getClient();

    const { data: requests, error } = await (supabase
      .from("client_document_requests" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Error al consultar requerimientos del cliente: ${error.message}`);
    }

    if (!requests || requests.length === 0) {
      return [];
    }

    return this.hydrateRequests(supabase, requests);
  }

  /**
   * Obtiene todos los requerimientos vinculados a un expediente específico.
   */
  async getDocumentRequestsByCase(
    companyId: string,
    caseId: string
  ): Promise<ClientDocumentRequestWithDetails[]> {
    const supabase = await this.getClient();

    const { data: requests, error } = await (supabase
      .from("client_document_requests" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("case_id", caseId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Error al consultar requerimientos del expediente: ${error.message}`);
    }

    if (!requests || requests.length === 0) {
      return [];
    }

    return this.hydrateRequests(supabase, requests);
  }

  private async hydrateRequests(
    supabase: any,
    requests: ClientDocumentRequestRow[]
  ): Promise<ClientDocumentRequestWithDetails[]> {
    const documentIds = Array.from(
      new Set(requests.map((r) => r.uploaded_document_id).filter(Boolean) as string[])
    );
    const caseIds = Array.from(
      new Set(requests.map((r) => r.case_id).filter(Boolean) as string[])
    );

    let docMap = new Map<string, any>();
    if (documentIds.length > 0) {
      const { data: docs } = await (supabase.from("documents" as any) as any)
        .select("id, name, original_filename, mime_type, file_size, created_at, status")
        .in("id", documentIds);
      if (docs) {
        docMap = new Map(
          docs.map((d: any) => [
            d.id,
            { ...d, file_size: d.file_size ? Number(d.file_size) : null },
          ])
        );
      }
    }

    let caseMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: cases } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .in("id", caseIds);
      if (cases) {
        caseMap = new Map(cases.map((c: any) => [c.id, c]));
      }
    }

    return requests.map((req) => ({
      ...req,
      uploaded_document: req.uploaded_document_id
        ? docMap.get(req.uploaded_document_id) || null
        : null,
      case: req.case_id ? caseMap.get(req.case_id) || null : null,
    }));
  }
}

export const documentRequestService = new DocumentRequestService();
