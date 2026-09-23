import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type SurveyFieldSessionRow =
  Database["public"]["Tables"]["survey_field_sessions"]["Row"];
export type SurveyFieldSessionInsert =
  Database["public"]["Tables"]["survey_field_sessions"]["Insert"];
export type SurveyFieldSessionUpdate =
  Database["public"]["Tables"]["survey_field_sessions"]["Update"];

export type EquipmentType = SurveyFieldSessionRow["equipment_type"];
export type FieldSessionStatus = SurveyFieldSessionRow["status"];

export interface CreateFieldSessionInput {
  cadastral_file_id: string;
  session_date: string;
  equipment_type: EquipmentType;
  chief_surveyor_id?: string | null;
  equipment_model?: string | null;
  calibration_certificate_number?: string | null;
  base_station_point?: string | null;
  weather_conditions?: string | null;
  witness_attendees?: Record<string, unknown> | Array<unknown> | null;
  linear_closure_error?: number | null;
  angular_closure_error?: number | null;
  status?: FieldSessionStatus;
  field_notes?: string | null;
  raw_file_url?: string | null;
}

export type UpdateFieldSessionInput = Partial<CreateFieldSessionInput>;

export interface FieldSessionWithDetails extends SurveyFieldSessionRow {
  cadastral_file?: {
    id: string;
    dnmc_file_number: string | null;
    operation_type: string;
    current_stage: string;
  } | null;
  chief_surveyor?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
}

export class FieldSessionService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Obtiene las jornadas de trabajo de campo con sus relaciones (expediente y agrimensor a cargo).
   */
  async getFieldSessions(
    companyId: string,
    cadastralFileId?: string
  ): Promise<FieldSessionWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("survey_field_sessions" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (cadastralFileId) {
      query = query.eq("cadastral_file_id", cadastralFileId);
    }

    query = query.order("session_date", { ascending: false });

    const { data: rawSessions, error } = await query;
    if (error) {
      console.error("Error al obtener jornadas de campo:", error);
      throw error;
    }

    if (!rawSessions || rawSessions.length === 0) {
      return [];
    }

    // Cargar expedientes y perfiles vinculados
    const fileIds = Array.from(
      new Set(rawSessions.map((s: any) => s.cadastral_file_id).filter(Boolean))
    );
    const surveyorIds = Array.from(
      new Set(rawSessions.map((s: any) => s.chief_surveyor_id).filter(Boolean))
    );

    const filesMap = new Map<string, any>();
    if (fileIds.length > 0) {
      const { data: fData } = await (
        supabase.from("cadastral_files" as any) as any
      )
        .select("id, dnmc_file_number, operation_type, current_stage")
        .in("id", fileIds);
      (fData || []).forEach((f: any) => filesMap.set(f.id, f));
    }

    const surveyorsMap = new Map<string, any>();
    if (surveyorIds.length > 0) {
      const { data: sData } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name, email, phone, avatar_url")
        .in("id", surveyorIds);
      (sData || []).forEach((s: any) => surveyorsMap.set(s.id, s));
    }

    return rawSessions.map((s: any) => ({
      ...s,
      cadastral_file: s.cadastral_file_id
        ? filesMap.get(s.cadastral_file_id) ?? null
        : null,
      chief_surveyor: s.chief_surveyor_id
        ? surveyorsMap.get(s.chief_surveyor_id) ?? null
        : null,
    }));
  }

  /**
   * Obtiene una jornada de campo por su ID con todos sus detalles.
   */
  async getFieldSessionById(
    companyId: string,
    id: string
  ): Promise<FieldSessionWithDetails | null> {
    const supabase = await this.getClient();

    const { data: session, error } = await (
      supabase.from("survey_field_sessions" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`Error al obtener jornada de campo ${id}:`, error);
      throw error;
    }

    if (!session) {
      return null;
    }

    let fileData: any = null;
    if (session.cadastral_file_id) {
      const { data: f } = await (
        supabase.from("cadastral_files" as any) as any
      )
        .select("id, dnmc_file_number, operation_type, current_stage")
        .eq("id", session.cadastral_file_id)
        .maybeSingle();
      if (f) fileData = f;
    }

    let surveyorData: any = null;
    if (session.chief_surveyor_id) {
      const { data: s } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name, email, phone, avatar_url")
        .eq("id", session.chief_surveyor_id)
        .maybeSingle();
      if (s) surveyorData = s;
    }

    return {
      ...(session as SurveyFieldSessionRow),
      cadastral_file: fileData,
      chief_surveyor: surveyorData,
    };
  }

  /**
   * Registra una nueva jornada de medición topográfica o geodésica.
   * Si el expediente catastral no tiene fecha de trabajos de campo, la sincroniza automáticamente.
   */
  async createFieldSession(
    companyId: string,
    data: CreateFieldSessionInput
  ): Promise<SurveyFieldSessionRow> {
    const supabase = await this.getClient();

    if (!data.cadastral_file_id) {
      throw new Error("El ID del expediente catastral (cadastral_file_id) es obligatorio");
    }

    if (!data.session_date) {
      throw new Error("La fecha de la jornada (session_date) es obligatoria");
    }

    if (!data.equipment_type) {
      throw new Error("El tipo de instrumental o equipo (equipment_type) es obligatorio");
    }

    const insertPayload: SurveyFieldSessionInsert = {
      company_id: companyId,
      cadastral_file_id: data.cadastral_file_id,
      session_date: data.session_date,
      equipment_type: data.equipment_type,
      chief_surveyor_id: data.chief_surveyor_id ?? null,
      equipment_model: data.equipment_model ?? null,
      calibration_certificate_number: data.calibration_certificate_number ?? null,
      base_station_point: data.base_station_point ?? null,
      weather_conditions: data.weather_conditions ?? null,
      witness_attendees: (data.witness_attendees as any) ?? null,
      linear_closure_error: data.linear_closure_error ?? null,
      angular_closure_error: data.angular_closure_error ?? null,
      status: data.status || "programada",
      field_notes: data.field_notes ?? null,
      raw_file_url: data.raw_file_url ?? null,
    };

    const { data: created, error } = await (
      supabase.from("survey_field_sessions" as any) as any
    )
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error al registrar jornada de campo:", error);
      throw error;
    }

    // Sincronizar fecha de trabajo de campo en el expediente catastral si aún no estaba fijada
    const { data: file } = await (
      supabase.from("cadastral_files" as any) as any
    )
      .select("id, field_work_date")
      .eq("id", data.cadastral_file_id)
      .maybeSingle();

    if (file && !file.field_work_date) {
      await (supabase.from("cadastral_files" as any) as any)
        .update({
          field_work_date: data.session_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.cadastral_file_id);
    }

    return created as SurveyFieldSessionRow;
  }

  /**
   * Actualiza el estado operativo de una jornada de campo (en curso, completada, suspendida, etc.).
   */
  async updateFieldSessionStatus(
    companyId: string,
    id: string,
    status: FieldSessionStatus,
    fieldNotes?: string
  ): Promise<SurveyFieldSessionRow> {
    const supabase = await this.getClient();

    const updatePayload: SurveyFieldSessionUpdate = {
      status,
    };

    if (fieldNotes !== undefined) {
      updatePayload.field_notes = fieldNotes;
    }

    const { data: updated, error } = await (
      supabase.from("survey_field_sessions" as any) as any
    )
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error al actualizar estado de jornada de campo ${id}:`, error);
      throw error;
    }

    return updated as SurveyFieldSessionRow;
  }

  /**
   * Elimina una jornada de campo.
   */
  async deleteFieldSession(companyId: string, id: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await (
      supabase.from("survey_field_sessions" as any) as any
    )
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error(`Error al eliminar jornada de campo ${id}:`, error);
      throw error;
    }
  }
}

export const fieldSessionService = new FieldSessionService();
