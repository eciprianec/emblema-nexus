import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type CadastralFileRow =
  Database["public"]["Tables"]["cadastral_files"]["Row"];
export type CadastralFileInsert =
  Database["public"]["Tables"]["cadastral_files"]["Insert"];
export type CadastralFileUpdate =
  Database["public"]["Tables"]["cadastral_files"]["Update"];

type CadastralParcelRow =
  Database["public"]["Tables"]["cadastral_parcels"]["Row"];

export type CadastralOperationType = CadastralFileRow["operation_type"];
export type RegionalDirectorate = CadastralFileRow["regional_directorate"];
export type CadastralStage = CadastralFileRow["current_stage"];

export interface CreateCadastralFileInput {
  case_id: string;
  operation_type: CadastralOperationType;
  regional_directorate: RegionalDirectorate;
  parcel_id?: string | null;
  dnmc_file_number?: string | null;
  surveyor_id?: string | null;
  codia_number?: string | null;
  authorization_date?: string | null;
  field_work_date?: string | null;
  newspaper_publication_date?: string | null;
  submission_date?: string | null;
  current_stage?: CadastralStage;
  approval_date?: string | null;
  approval_resolution_number?: string | null;
  rejection_reason?: string | null;
  observation_details?: string | null;
  observation_due_date?: string | null;
  created_by?: string | null;
}

export type UpdateCadastralFileInput = Partial<CreateCadastralFileInput>;

export interface AdvanceStageResolutionData {
  resolutionNumber?: string;
  approvalDate?: string;
  observationDetails?: string;
  observationDueDate?: string;
  observationDueDays?: number;
  rejectionReason?: string;
  submissionDate?: string;
  notes?: string;
}

export interface GetCadastralFilesFilters {
  caseId?: string;
  regional?: string;
  stage?: string;
  operationType?: string;
  surveyorId?: string;
  search?: string;
}

export interface CadastralFileWithDetails extends CadastralFileRow {
  parcel?: CadastralParcelRow | null;
  surveyor?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  field_sessions?: Database["public"]["Tables"]["survey_field_sessions"]["Row"][];
}

export interface CadastralFilesSummary {
  total: number;
  inProgress: number; // En preparación/campo/planos
  submitted: number; // Sometido o en revisión técnica
  observed: number; // Oficio de observación activo
  approved: number; // Aprobado DNMC o etapas registrales posteriores
  expiringSoon: number; // Observaciones con plazo <= 15 días o vencidas
  byStage: Record<CadastralStage, number>;
  byOperation: Record<CadastralOperationType, number>;
  byRegional: Record<RegionalDirectorate, number>;
}

export class CadastralFileService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Genera un número correlativo formal para el expediente catastral si no fue provisto.
   * Formato: DNMC-{REGIONAL}-{AÑO}-{SECUENCIA} (ej. DNMC-CEN-2026-00014)
   */
  private async generateCorrelativeNumber(
    supabase: any,
    companyId: string,
    regional: RegionalDirectorate
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const regionalCodeMap: Record<RegionalDirectorate, string> = {
      central: "CEN",
      norte: "NOR",
      este: "EST",
      noreste: "NORE",
      suroeste: "SURO",
    };
    const prefix = `DNMC-${regionalCodeMap[regional] || "GEN"}-${currentYear}`;

    const { count, error } = await (
      supabase.from("cadastral_files" as any) as any
    )
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .ilike("dnmc_file_number", `${prefix}%`);

    if (error) {
      console.warn("Error al consultar correlativo de expediente DNMC:", error);
    }

    const nextSeq = ((count || 0) + 1).toString().padStart(5, "0");
    return `${prefix}-${nextSeq}`;
  }

  /**
   * Obtiene la lista de expedientes catastrales aplicando filtros y adjuntando
   * información de la parcela, caso y agrimensor colegiado.
   */
  async getCadastralFiles(
    companyId: string,
    filters?: GetCadastralFilesFilters
  ): Promise<CadastralFileWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("cadastral_files" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }
    if (filters?.regional) {
      query = query.eq("regional_directorate", filters.regional);
    }
    if (filters?.stage) {
      query = query.eq("current_stage", filters.stage);
    }
    if (filters?.operationType) {
      query = query.eq("operation_type", filters.operationType);
    }
    if (filters?.surveyorId) {
      query = query.eq("surveyor_id", filters.surveyorId);
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `dnmc_file_number.ilike.${term},codia_number.ilike.${term},approval_resolution_number.ilike.${term}`
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data: rawFiles, error } = await query;
    if (error) {
      console.error("Error al obtener expedientes catastrales:", error);
      throw error;
    }

    if (!rawFiles || rawFiles.length === 0) {
      return [];
    }

    // Cargar relaciones en lote para máxima eficiencia y robustez
    const parcelIds = Array.from(
      new Set(rawFiles.map((f: any) => f.parcel_id).filter(Boolean))
    );
    const caseIds = Array.from(
      new Set(rawFiles.map((f: any) => f.case_id).filter(Boolean))
    );
    const surveyorIds = Array.from(
      new Set(rawFiles.map((f: any) => f.surveyor_id).filter(Boolean))
    );

    const parcelsMap = new Map<string, any>();
    if (parcelIds.length > 0) {
      const { data: pData } = await (
        supabase.from("cadastral_parcels" as any) as any
      )
        .select("*")
        .in("id", parcelIds);
      (pData || []).forEach((p: any) => parcelsMap.set(p.id, p));
    }

    const casesMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: cData } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .in("id", caseIds);
      (cData || []).forEach((c: any) => casesMap.set(c.id, c));
    }

    const surveyorsMap = new Map<string, any>();
    if (surveyorIds.length > 0) {
      const { data: sData } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name, email, phone, avatar_url")
        .in("id", surveyorIds);
      (sData || []).forEach((s: any) => surveyorsMap.set(s.id, s));
    }

    return rawFiles.map((f: any) => ({
      ...f,
      parcel: f.parcel_id ? parcelsMap.get(f.parcel_id) ?? null : null,
      case: f.case_id ? casesMap.get(f.case_id) ?? null : null,
      surveyor: f.surveyor_id ? surveyorsMap.get(f.surveyor_id) ?? null : null,
    }));
  }

  /**
   * Recupera un expediente catastral por ID con todos los detalles de su parcela,
   * agrimensor responsable, caso judicial/inmobiliario y sesiones de campo.
   */
  async getCadastralFileById(
    companyId: string,
    id: string
  ): Promise<CadastralFileWithDetails | null> {
    const supabase = await this.getClient();

    const { data: file, error: fileError } = await (
      supabase.from("cadastral_files" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (fileError) {
      console.error(`Error al obtener expediente catastral ${id}:`, fileError);
      throw fileError;
    }

    if (!file) {
      return null;
    }

    // Cargar parcela
    let parcelData: CadastralParcelRow | null = null;
    if (file.parcel_id) {
      const { data: p } = await (
        supabase.from("cadastral_parcels" as any) as any
      )
        .select("*")
        .eq("id", file.parcel_id)
        .maybeSingle();
      if (p) parcelData = p as CadastralParcelRow;
    }

    // Cargar agrimensor a cargo
    let surveyorData: any = null;
    if (file.surveyor_id) {
      const { data: s } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name, email, phone, avatar_url")
        .eq("id", file.surveyor_id)
        .maybeSingle();
      if (s) surveyorData = s;
    }

    // Cargar caso
    let caseData: any = null;
    if (file.case_id) {
      const { data: c } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .eq("id", file.case_id)
        .maybeSingle();
      if (c) caseData = c;
    }

    // Cargar sesiones de campo
    const { data: sessions } = await (
      supabase.from("survey_field_sessions" as any) as any
    )
      .select("*")
      .eq("cadastral_file_id", id)
      .order("session_date", { ascending: false });

    return {
      ...(file as CadastralFileRow),
      parcel: parcelData,
      surveyor: surveyorData,
      case: caseData,
      field_sessions: (sessions || []) as any,
    };
  }

  /**
   * Registra un nuevo expediente catastral con numeración correlativa automática o número DNMC.
   */
  async createCadastralFile(
    companyId: string,
    data: CreateCadastralFileInput
  ): Promise<CadastralFileRow> {
    const supabase = await this.getClient();

    if (!data.case_id) {
      throw new Error("El ID del caso (case_id) es obligatorio para vincular el expediente catastral");
    }

    if (!data.operation_type) {
      throw new Error("El tipo de operación catastral (operation_type) es obligatorio");
    }

    if (!data.regional_directorate) {
      throw new Error("La Dirección Regional de Mensuras Catastrales (regional_directorate) es obligatoria");
    }

    // Asignar o autogenerar el número oficial de expediente
    let fileNumber = data.dnmc_file_number?.trim();
    if (!fileNumber) {
      fileNumber = await this.generateCorrelativeNumber(
        supabase,
        companyId,
        data.regional_directorate
      );
    }

    const insertPayload: CadastralFileInsert = {
      company_id: companyId,
      case_id: data.case_id,
      parcel_id: data.parcel_id ?? null,
      operation_type: data.operation_type,
      regional_directorate: data.regional_directorate,
      dnmc_file_number: fileNumber,
      surveyor_id: data.surveyor_id ?? null,
      codia_number: data.codia_number?.trim() ?? null,
      authorization_date: data.authorization_date ?? null,
      field_work_date: data.field_work_date ?? null,
      newspaper_publication_date: data.newspaper_publication_date ?? null,
      submission_date: data.submission_date ?? null,
      current_stage: data.current_stage || "solicitud_autorizacion",
      approval_date: data.approval_date ?? null,
      approval_resolution_number: data.approval_resolution_number ?? null,
      rejection_reason: data.rejection_reason ?? null,
      observation_details: data.observation_details ?? null,
      observation_due_date: data.observation_due_date ?? null,
      created_by: data.created_by ?? null,
    };

    const { data: created, error } = await (
      supabase.from("cadastral_files" as any) as any
    )
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error al registrar expediente catastral:", error);
      throw error;
    }

    return created as CadastralFileRow;
  }

  /**
   * Hace avanzar la etapa del expediente catastral conforme al procedimiento de la DNMC
   * (Ley 108-05 de Registro Inmobiliario y Reglamento General de Mensuras Catastrales).
   * 
   * Maneja efectos colaterales en la parcela asociada:
   * - 'sometido_dnmc': fija fecha de depósito y actualiza estado de parcela.
   * - 'oficio_observacion': fija detalles de observación y plazo legal de 60 días (o el indicado).
   * - 'aprobado_dnmc': fija resolución aprobatoria y actualiza estado de parcela.
   * - 'concluido_titulado': marca la parcela como titulada.
   */
  async advanceStage(
    companyId: string,
    id: string,
    nextStage: CadastralStage,
    resolutionData?: AdvanceStageResolutionData
  ): Promise<CadastralFileRow> {
    const supabase = await this.getClient();

    // 1. Obtener expediente actual
    const { data: currentFile, error: fetchError } = await (
      supabase.from("cadastral_files" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !currentFile) {
      throw new Error(`Expediente catastral no encontrado (ID: ${id})`);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const updatePayload: CadastralFileUpdate = {
      current_stage: nextStage,
      updated_at: new Date().toISOString(),
    };

    let newParcelStatus: Database["public"]["Tables"]["cadastral_parcels"]["Row"]["status"] | null = null;

    switch (nextStage) {
      case "sometido_dnmc": {
        updatePayload.submission_date =
          resolutionData?.submissionDate ||
          currentFile.submission_date ||
          todayStr;
        newParcelStatus = "sometido_dnmc";
        break;
      }

      case "oficio_observacion": {
        updatePayload.observation_details =
          resolutionData?.observationDetails ||
          currentFile.observation_details ||
          "Oficio de observación emitido por la Dirección Regional de Mensuras Catastrales";

        // Plazo legal de subsanación: por defecto 60 días según Ley 108-05
        if (resolutionData?.observationDueDate) {
          updatePayload.observation_due_date = resolutionData.observationDueDate;
        } else {
          const daysToAdd = resolutionData?.observationDueDays ?? 60;
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + daysToAdd);
          updatePayload.observation_due_date = dueDate.toISOString().split("T")[0];
        }
        newParcelStatus = "observado";
        break;
      }

      case "aprobado_dnmc": {
        updatePayload.approval_date =
          resolutionData?.approvalDate ||
          currentFile.approval_date ||
          todayStr;
        if (resolutionData?.resolutionNumber) {
          updatePayload.approval_resolution_number =
            resolutionData.resolutionNumber;
        }
        newParcelStatus = "aprobado_dnmc";
        break;
      }

      case "concluido_titulado": {
        newParcelStatus = "titulado";
        break;
      }

      default: {
        // En revision técnica u otras etapas intermedias
        if (nextStage === "revision_tecnica") {
          newParcelStatus = "sometido_dnmc";
        }
        break;
      }
    }

    if (resolutionData?.rejectionReason) {
      updatePayload.rejection_reason = resolutionData.rejectionReason;
    }

    // 2. Actualizar el expediente catastral
    const { data: updated, error: updateError } = await (
      supabase.from("cadastral_files" as any) as any
    )
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error(`Error al avanzar etapa del expediente ${id}:`, updateError);
      throw updateError;
    }

    // 3. Si hay parcela asociada y cambio de estado correspondiente, actualizar la parcela
    if (currentFile.parcel_id && newParcelStatus) {
      const { error: parcelError } = await (
        supabase.from("cadastral_parcels" as any) as any
      )
        .update({
          status: newParcelStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", currentFile.parcel_id);

      if (parcelError) {
        console.warn(
          `Aviso al sincronizar estado de la parcela ${currentFile.parcel_id}:`,
          parcelError
        );
      }
    }

    return updated as CadastralFileRow;
  }

  /**
   * Obtiene un resumen integral de los expedientes catastrales:
   * en trámite, aprobados, observados y con vencimiento de plazo legal próximo o superado.
   */
  async getCadastralFilesSummary(
    companyId: string
  ): Promise<CadastralFilesSummary> {
    const supabase = await this.getClient();

    const { data, error } = await (
      supabase.from("cadastral_files" as any) as any
    )
      .select(
        "id, current_stage, operation_type, regional_directorate, observation_due_date"
      )
      .eq("company_id", companyId);

    if (error) {
      console.error("Error al obtener resumen de expedientes catastrales:", error);
      throw error;
    }

    const files = data || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fifteenDaysFromNow = new Date(today);
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

    let inProgress = 0;
    let submitted = 0;
    let observed = 0;
    let approved = 0;
    let expiringSoon = 0;

    const byStage: Record<CadastralStage, number> = {
      solicitud_autorizacion: 0,
      aviso_publicacion: 0,
      trabajos_campo: 0,
      elaboracion_planos: 0,
      sometido_dnmc: 0,
      revision_tecnica: 0,
      oficio_observacion: 0,
      aprobado_dnmc: 0,
      en_tribunal_tierras: 0,
      en_registro_titulos: 0,
      concluido_titulado: 0,
    };

    const byOperation: Record<CadastralOperationType, number> = {
      deslinde: 0,
      subdivision: 0,
      refundicion: 0,
      urbanizacion: 0,
      actualizacion_parcelaria: 0,
      saneamiento: 0,
      replanteo: 0,
      modificacion_parcelaria: 0,
      otro: 0,
    };

    const byRegional: Record<RegionalDirectorate, number> = {
      central: 0,
      norte: 0,
      este: 0,
      noreste: 0,
      suroeste: 0,
    };

    for (const f of files) {
      const stage = f.current_stage as CadastralStage;
      if (stage && byStage[stage] !== undefined) {
        byStage[stage]++;
      }

      const op = f.operation_type as CadastralOperationType;
      if (op && byOperation[op] !== undefined) {
        byOperation[op]++;
      }

      const reg = f.regional_directorate as RegionalDirectorate;
      if (reg && byRegional[reg] !== undefined) {
        byRegional[reg]++;
      }

      // Clasificación por macrogrupos
      if (
        stage === "solicitud_autorizacion" ||
        stage === "aviso_publicacion" ||
        stage === "trabajos_campo" ||
        stage === "elaboracion_planos"
      ) {
        inProgress++;
      } else if (stage === "sometido_dnmc" || stage === "revision_tecnica") {
        submitted++;
      } else if (stage === "oficio_observacion") {
        observed++;

        // Chequear si el plazo de subsanación vence pronto (<= 15 días) o ya está vencido
        if (f.observation_due_date) {
          const dueDate = new Date(f.observation_due_date);
          if (dueDate <= fifteenDaysFromNow) {
            expiringSoon++;
          }
        }
      } else if (
        stage === "aprobado_dnmc" ||
        stage === "en_tribunal_tierras" ||
        stage === "en_registro_titulos" ||
        stage === "concluido_titulado"
      ) {
        approved++;
      }
    }

    return {
      total: files.length,
      inProgress,
      submitted,
      observed,
      approved,
      expiringSoon,
      byStage,
      byOperation,
      byRegional,
    };
  }
}

export const cadastralFileService = new CadastralFileService();
