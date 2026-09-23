import "server-only";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  CaseTrackingTokenRow,
  CaseTrackingTokenInsert,
  CaseTrackingTokenUpdate,
} from "@/types/database.types";

export interface PublicStageInfo {
  id: string;
  stage_name: string;
  sort_order: number;
  status: "pendiente" | "en_progreso" | "completado" | "cancelado";
  started_at: string | null;
  completed_at: string | null;
}

export interface PublicDocumentInfo {
  id: string;
  name: string;
  original_filename: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface PublicCaseTrackingData {
  tracking_code: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  opened_at: string | null;
  expected_close_at: string | null;
  closed_at: string | null;
  area_name?: string | null;
  progress_percentage: number;
  views_count: number;
  allow_document_download: boolean;
  stages: PublicStageInfo[];
  documents: PublicDocumentInfo[];
}

export class TrackingService {
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
   * Genera un código de seguimiento alfanumérico amigable (ej: TRK-2026-X89B2).
   */
  private generateTrackingCode(): string {
    const year = new Date().getFullYear();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin O, 0, I, 1 para evitar confusiones
    let suffix = "";
    for (let i = 0; i < 5; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      suffix += chars[randomIndex];
    }
    return `TRK-${year}-${suffix}`;
  }

  /**
   * Obtiene o genera un token de seguimiento público para un expediente.
   */
  async getOrCreateTrackingCode(
    companyId: string,
    caseId: string,
    allowDocumentDownload = false
  ): Promise<CaseTrackingTokenRow> {
    const supabase = await this.getClient();

    // 1. Verificar si ya existe token registrado para este caso
    const { data: existing, error: searchError } = await (supabase
      .from("case_tracking_tokens" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("case_id", caseId)
      .maybeSingle();

    if (searchError) {
      throw new Error(`Error al buscar token de seguimiento: ${searchError.message}`);
    }

    if (existing) {
      return existing as CaseTrackingTokenRow;
    }

    // 2. Verificar que el expediente exista y pertenezca a la empresa
    const { data: caseRecord, error: caseError } = await (supabase
      .from("cases" as any) as any)
      .select("id")
      .eq("id", caseId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (caseError || !caseRecord) {
      throw new Error("El expediente especificado no existe o no pertenece a esta empresa.");
    }

    // 3. Crear nuevo código único
    let trackingCode = this.generateTrackingCode();
    let attempts = 0;

    while (attempts < 5) {
      const { data: duplicate } = await (supabase
        .from("case_tracking_tokens" as any) as any)
        .select("id")
        .eq("tracking_code", trackingCode)
        .maybeSingle();

      if (!duplicate) break;
      trackingCode = this.generateTrackingCode();
      attempts++;
    }

    const { data: created, error: insertError } = await (supabase
      .from("case_tracking_tokens" as any) as any)
      .insert({
        company_id: companyId,
        case_id: caseId,
        tracking_code: trackingCode,
        is_public: true,
        allow_document_download: allowDocumentDownload,
        views_count: 0,
      } as CaseTrackingTokenInsert)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error al generar código de seguimiento: ${insertError.message}`);
    }

    return created as CaseTrackingTokenRow;
  }

  /**
   * Consulta pública de estado de expediente y sus hitos mediante código de seguimiento.
   */
  async getCaseByTrackingCode(
    trackingCode: string
  ): Promise<PublicCaseTrackingData | null> {
    if (!trackingCode || typeof trackingCode !== "string") {
      return null;
    }

    const supabase = await this.getClient();
    const cleanCode = trackingCode.trim().toUpperCase();

    // 1. Obtener token de seguimiento
    const { data: tokenRecord, error: tokenError } = await (supabase
      .from("case_tracking_tokens" as any) as any)
      .select("*")
      .eq("tracking_code", cleanCode)
      .eq("is_public", true)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      return null;
    }

    // Incrementar contador de visualizaciones de forma asíncrona
    this.incrementTrackingViews(cleanCode).catch((err) =>
      console.error("Error al registrar visualización de tracking:", err)
    );

    // 2. Obtener datos del expediente
    const { data: caseRecord, error: caseError } = await (supabase
      .from("cases" as any) as any)
      .select(`
        id,
        case_number,
        title,
        description,
        status,
        priority,
        opened_at,
        expected_close_at,
        closed_at,
        area_id
      `)
      .eq("id", tokenRecord.case_id)
      .maybeSingle();

    if (caseError || !caseRecord) {
      return null;
    }

    // Obtener nombre del área de servicio si existe
    let areaName: string | null = null;
    if (caseRecord.area_id) {
      const { data: area } = await (supabase
        .from("service_areas" as any) as any)
        .select("name")
        .eq("id", caseRecord.area_id)
        .maybeSingle();
      if (area) areaName = area.name;
    }

    // 3. Obtener hitos / etapas del expediente
    const { data: stagesData, error: stagesError } = await (supabase
      .from("case_stage_instances" as any) as any)
      .select("id, stage_name, sort_order, status, started_at, completed_at")
      .eq("case_id", tokenRecord.case_id)
      .order("sort_order", { ascending: true });

    const stages: PublicStageInfo[] = (stagesData || []).map((s: any) => ({
      id: s.id,
      stage_name: s.stage_name,
      sort_order: s.sort_order,
      status: s.status,
      started_at: s.started_at,
      completed_at: s.completed_at,
    }));

    // Calcular porcentaje de progreso
    let progressPercentage = 0;
    if (stages.length > 0) {
      const completedCount = stages.filter((s) => s.status === "completado").length;
      progressPercentage = Math.round((completedCount / stages.length) * 100);
    } else {
      switch (caseRecord.status) {
        case "completado":
        case "cerrado":
          progressPercentage = 100;
          break;
        case "en_revision":
          progressPercentage = 80;
          break;
        case "en_proceso":
        case "pendiente_cliente":
        case "pendiente_tercero":
        case "pendiente_institucion":
          progressPercentage = 45;
          break;
        case "abierto":
          progressPercentage = 15;
          break;
        default:
          progressPercentage = 0;
      }
    }

    // 4. Si está permitida la descarga de documentos, obtener los documentos aprobados o firmados
    let documents: PublicDocumentInfo[] = [];
    if (tokenRecord.allow_document_download) {
      const { data: docsData } = await (supabase
        .from("documents" as any) as any)
        .select("id, name, original_filename, mime_type, file_size, created_at, status")
        .eq("case_id", tokenRecord.case_id)
        .neq("status", "obsoleto")
        .order("created_at", { ascending: false });

      if (docsData) {
        documents = docsData.map((d: any) => ({
          id: d.id,
          name: d.name,
          original_filename: d.original_filename,
          mime_type: d.mime_type,
          file_size: d.file_size ? Number(d.file_size) : null,
          created_at: d.created_at,
        }));
      }
    }

    return {
      tracking_code: tokenRecord.tracking_code,
      case_number: caseRecord.case_number,
      title: caseRecord.title,
      description: caseRecord.description,
      status: caseRecord.status,
      priority: caseRecord.priority,
      opened_at: caseRecord.opened_at,
      expected_close_at: caseRecord.expected_close_at,
      closed_at: caseRecord.closed_at,
      area_name: areaName,
      progress_percentage: progressPercentage,
      views_count: (tokenRecord.views_count || 0) + 1,
      allow_document_download: !!tokenRecord.allow_document_download,
      stages,
      documents,
    };
  }

  /**
   * Incrementa el contador de visualizaciones del tracking público.
   */
  async incrementTrackingViews(trackingCode: string): Promise<void> {
    const supabase = await this.getClient();
    const cleanCode = trackingCode.trim().toUpperCase();

    const { data: record } = await (supabase
      .from("case_tracking_tokens" as any) as any)
      .select("id, views_count")
      .eq("tracking_code", cleanCode)
      .maybeSingle();

    if (!record) return;

    await (supabase.from("case_tracking_tokens" as any) as any)
      .update({
        views_count: (record.views_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as CaseTrackingTokenUpdate)
      .eq("id", record.id);
  }
}

export const trackingService = new TrackingService();
