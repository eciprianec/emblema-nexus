import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { EcfSigner } from "./EcfSigner";
import { logAuditEntry } from "@/services/audit/AuditService";

export type EcfReceptionRow = Database["public"]["Tables"]["ecf_receptions"]["Row"];
export type EcfReceptionInsert = Database["public"]["Tables"]["ecf_receptions"]["Insert"];
export type EcfReceptionUpdate = Database["public"]["Tables"]["ecf_receptions"]["Update"];

export interface ReceptionFilters {
  status?: "pendiente" | "aprobado" | "rechazado";
  emitterRnc?: string;
  encf?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CommercialApprovalXmlParams {
  receiverRnc: string;
  emitterRnc: string;
  encf: string;
  status: "aprobado" | "rechazado";
  reason?: string;
  approvalDate?: string | Date;
}

export class EcfCommercialService {
  /**
   * Extrae el contenido de una etiqueta XML simple mediante expresión regular segura.
   */
  private static extractXmlTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Normaliza una fecha dominicana (DD-MM-YYYY) o ISO a formato YYYY-MM-DD para la base de datos.
   */
  private static normalizeToIsoDate(dateStr?: string | null): string {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    const trimmed = dateStr.trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split("-");
      return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Procesa y registra un comprobante electrónico (e-CF) recibido de un proveedor en XML.
   */
  public static async receiveEcf(
    companyId: string,
    xmlContent: string,
    customClient?: SupabaseClient<Database>
  ): Promise<EcfReceptionRow> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    // 1. Extraer metadatos obligatorios del XML del proveedor
    const emitterRncRaw = this.extractXmlTag(xmlContent, "RNCEmisor");
    const emitterName = this.extractXmlTag(xmlContent, "RazonSocialEmisor") || "PROVEEDOR NO IDENTIFICADO";
    const encf = this.extractXmlTag(xmlContent, "eNCF");
    const tipoeCF = this.extractXmlTag(xmlContent, "TipoeCF") || "31";
    const fechaEmision = this.extractXmlTag(xmlContent, "FechaEmision");
    const montoTotalStr = this.extractXmlTag(xmlContent, "MontoTotal") || "0";
    const totalItbisStr = this.extractXmlTag(xmlContent, "TotalITBIS") || "0";

    if (!emitterRncRaw || !encf) {
      throw new Error(
        "El archivo XML recibido no contiene las etiquetas mínimas obligatorias (<RNCEmisor>, <eNCF>)."
      );
    }

    const emitterRnc = emitterRncRaw.replace(/[^0-9]/g, "");
    const ecfType = encf.startsWith("E") ? encf.substring(0, 3) : `E${tipoeCF}`;
    const issueDate = this.normalizeToIsoDate(fechaEmision);
    const totalAmount = parseFloat(montoTotalStr) || 0;
    const itbisAmount = parseFloat(totalItbisStr) || 0;

    // Calcular código de seguridad del documento recibido
    const securityCode = EcfSigner.computeSecurityCode(xmlContent);

    // 2. Verificar si el comprobante ya fue registrado previamente para evitar duplicados
    const { data: existing } = await db
      .from("ecf_receptions")
      .select("*")
      .eq("company_id", companyId)
      .eq("emitter_rnc", emitterRnc)
      .eq("encf", encf)
      .maybeSingle();

    if (existing) {
      return existing as EcfReceptionRow;
    }

    // 3. Insertar nuevo registro en ecf_receptions
    const { data: newReception, error: insertError } = await db
      .from("ecf_receptions")
      .insert({
        company_id: companyId,
        emitter_rnc: emitterRnc,
        emitter_name: emitterName,
        encf,
        ecf_type: ecfType,
        issue_date: issueDate,
        total_amount: totalAmount,
        itbis_amount: itbisAmount,
        security_code: securityCode,
        commercial_status: "pendiente",
        xml_received: xmlContent,
      })
      .select()
      .single();

    if (insertError || !newReception) {
      throw new Error(`Error al registrar e-CF recibido: ${insertError?.message || "Error desconocido"}`);
    }

    const row = newReception as EcfReceptionRow;

    // 4. Registro en el log de auditoría
    await logAuditEntry({
      companyId,
      entityType: "ecf_receptions",
      entityId: row.id,
      action: "RECEIVE_ECF",
      newData: {
        emitter_rnc: emitterRnc,
        encf,
        total_amount: totalAmount,
      },
    });

    return row;
  }

  /**
   * Emite la Aprobación Comercial B2B para un comprobante electrónico recibido.
   */
  public static async approveCommercialReception(
    companyId: string,
    receptionId: string,
    customClient?: SupabaseClient<Database>
  ): Promise<{ reception: EcfReceptionRow; approvalXml: string }> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    // 1. Obtener la recepción
    const { data: reception, error: fetchError } = await db
      .from("ecf_receptions")
      .select("*")
      .eq("id", receptionId)
      .eq("company_id", companyId)
      .single();

    if (fetchError || !reception) {
      throw new Error(`Comprobante recibido con ID ${receptionId} no encontrado.`);
    }

    const recRow = reception as EcfReceptionRow;

    // 2. Obtener RNC de la empresa compradora
    const { data: config } = await db
      .from("ecf_configs")
      .select("rnc")
      .eq("company_id", companyId)
      .single();

    const receiverRnc = (config as { rnc?: string } | null)?.rnc || "";

    // 3. Generar XML de Aprobación Comercial conforme a DGII
    const approvalXml = this.generateCommercialApprovalXml({
      receiverRnc,
      emitterRnc: recRow.emitter_rnc,
      encf: recRow.encf,
      status: "aprobado",
      approvalDate: new Date(),
    });

    // 4. Actualizar estado en base de datos
    const { data: updated, error: updateError } = await db
      .from("ecf_receptions")
      .update({
        commercial_status: "aprobado",
        commercial_rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receptionId)
      .eq("company_id", companyId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(`Error al actualizar la aprobación comercial: ${updateError?.message}`);
    }

    const updatedRow = updated as EcfReceptionRow;

    // 5. Auditoría
    await logAuditEntry({
      companyId,
      entityType: "ecf_receptions",
      entityId: receptionId,
      action: "APPROVE_COMMERCIAL_RECEPTION",
      oldData: { commercial_status: recRow.commercial_status },
      newData: { commercial_status: "aprobado" },
    });

    return { reception: updatedRow, approvalXml };
  }

  /**
   * Emite el Rechazo Comercial B2B para un comprobante electrónico recibido con motivo fundado.
   */
  public static async rejectCommercialReception(
    companyId: string,
    receptionId: string,
    reason: string,
    customClient?: SupabaseClient<Database>
  ): Promise<{ reception: EcfReceptionRow; rejectionXml: string }> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    if (!reason || reason.trim().length === 0) {
      throw new Error("Debe especificar el motivo o razón del rechazo comercial del comprobante.");
    }

    // 1. Obtener la recepción
    const { data: reception, error: fetchError } = await db
      .from("ecf_receptions")
      .select("*")
      .eq("id", receptionId)
      .eq("company_id", companyId)
      .single();

    if (fetchError || !reception) {
      throw new Error(`Comprobante recibido con ID ${receptionId} no encontrado.`);
    }

    const recRow = reception as EcfReceptionRow;

    // 2. Obtener RNC de la empresa compradora
    const { data: config } = await db
      .from("ecf_configs")
      .select("rnc")
      .eq("company_id", companyId)
      .single();

    const receiverRnc = (config as { rnc?: string } | null)?.rnc || "";

    // 3. Generar XML de Rechazo Comercial
    const rejectionXml = this.generateCommercialApprovalXml({
      receiverRnc,
      emitterRnc: recRow.emitter_rnc,
      encf: recRow.encf,
      status: "rechazado",
      reason: reason.trim(),
      approvalDate: new Date(),
    });

    // 4. Actualizar en base de datos
    const { data: updated, error: updateError } = await db
      .from("ecf_receptions")
      .update({
        commercial_status: "rechazado",
        commercial_rejection_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", receptionId)
      .eq("company_id", companyId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(`Error al actualizar el rechazo comercial: ${updateError?.message}`);
    }

    const updatedRow = updated as EcfReceptionRow;

    // 5. Auditoría
    await logAuditEntry({
      companyId,
      entityType: "ecf_receptions",
      entityId: receptionId,
      action: "REJECT_COMMERCIAL_RECEPTION",
      oldData: { commercial_status: recRow.commercial_status },
      newData: { commercial_status: "rechazado", reason },
    });

    return { reception: updatedRow, rejectionXml };
  }

  /**
   * Obtiene la lista de comprobantes electrónicos recibidos con filtros de consulta.
   */
  public static async getReceivedEcfs(
    companyId: string,
    filters?: ReceptionFilters,
    customClient?: SupabaseClient<Database>
  ): Promise<{ data: EcfReceptionRow[]; total: number }> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    let query = db
      .from("ecf_receptions")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("commercial_status", filters.status);
    }
    if (filters?.emitterRnc) {
      query = query.ilike("emitter_rnc", `%${filters.emitterRnc.replace(/[^0-9]/g, "")}%`);
    }
    if (filters?.encf) {
      query = query.ilike("encf", `%${filters.encf.trim()}%`);
    }
    if (filters?.fromDate) {
      query = query.gte("issue_date", filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte("issue_date", filters.toDate);
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Error al consultar e-CF recibidos: ${error.message}`);
    }

    return {
      data: (data || []) as EcfReceptionRow[],
      total: count || 0,
    };
  }

  /**
   * Construye el documento XML de Aprobación o Rechazo Comercial B2B conforme a DGII.
   */
  public static generateCommercialApprovalXml(params: CommercialApprovalXmlParams): string {
    const estadoCod = params.status === "aprobado" ? "1" : "2"; // 1: Aprobado, 2: Rechazado
    const d = params.approvalDate ? new Date(params.approvalDate) : new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const fechaHora = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<AprobacionComercial xmlns="http://www.dgii.gov.do/ecf/v1.0">\n`;
    xml += `  <Encabezado>\n`;
    xml += `    <RNCReceptor>${params.receiverRnc.replace(/[^0-9]/g, "")}</RNCReceptor>\n`;
    xml += `    <RNCEmisor>${params.emitterRnc.replace(/[^0-9]/g, "")}</RNCEmisor>\n`;
    xml += `    <eNCF>${params.encf.trim()}</eNCF>\n`;
    xml += `    <EstadoAprobacion>${estadoCod}</EstadoAprobacion>\n`;
    if (params.status === "rechazado" && params.reason) {
      const escapedReason = params.reason
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      xml += `    <MotivoRechazo>${escapedReason}</MotivoRechazo>\n`;
    }
    xml += `    <FechaHoraAprobacion>${fechaHora}</FechaHoraAprobacion>\n`;
    xml += `  </Encabezado>\n`;
    xml += `</AprobacionComercial>`;

    return xml;
  }
}
