import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface TeamMemberProductivity {
  userId: string;
  userName: string;
  userPhone: string | null;
  userType: string | null;
  totalCases: number;
  completedCases: number;
  activeCases: number;
  totalTasks: number;
  completedTasks: number;
  tasksOnTime: number;
  tasksLate: number;
  tasksOverduePending: number;
  totalOverdue: number;
  onTimeRate: number; // Porcentaje de tareas completadas a tiempo
}

export interface TeamProductivitySummary {
  companyId: string;
  teamMembersCount: number;
  totalCases: number;
  totalCompletedCases: number;
  totalActiveCases: number;
  totalTasks: number;
  totalCompletedTasks: number;
  totalTasksOnTime: number;
  totalTasksOverdue: number;
  globalOnTimeRate: number;
  members: TeamMemberProductivity[];
}

export interface CadastralAreaMetrics {
  totalParcels: number;
  totalAreaM2: number;
  totalAreaTareas: number;
  byStatus: {
    status: string;
    label: string;
    parcelsCount: number;
    areaM2: number;
    areaTareas: number;
  }[];
}

export interface CadastralBiMetricsResult {
  companyId: string;
  areaMetrics: CadastralAreaMetrics;
  filesSummary: {
    totalFiles: number;
    activeFiles: number;
    approvedFiles: number;
    observedFiles: number;
    averageApprovalDays: number;
  };
  byRegional: {
    regional: string;
    label: string;
    count: number;
    approvedCount: number;
  }[];
  byOperationType: {
    operationType: string;
    label: string;
    count: number;
  }[];
  byStage: {
    stage: string;
    label: string;
    count: number;
  }[];
  urgentObservations: {
    fileId: string;
    dnmcFileNumber: string | null;
    regional: string;
    surveyorName: string | null;
    observationDueDate: string;
    daysRemaining: number;
  }[];
}

export interface RealEstateBiMetricsResult {
  companyId: string;
  inventory: {
    totalProperties: number;
    availableProperties: number;
    reservedProperties: number;
    underContractProperties: number;
    soldProperties: number;
    rentedProperties: number;
    totalSaleValueUsd: number;
    totalSaleValueDop: number;
    totalRentalValueUsd: number;
    totalRentalValueDop: number;
    byType: {
      type: string;
      label: string;
      count: number;
    }[];
  };
  showingsAndConversion: {
    totalShowings: number;
    completedShowings: number;
    offersMade: number;
    conversionRate: number; // (offersMade / completedShowings) * 100
  };
  contracts: {
    totalContracts: number;
    activeContracts: number;
    transactedVolumeUsd: number;
    transactedVolumeDop: number;
    averageContractAmountUsd: number;
    averageContractAmountDop: number;
    byType: {
      type: string;
      label: string;
      count: number;
      volumeUsd: number;
      volumeDop: number;
    }[];
  };
  commissions: {
    totalCommissionsGenerated: number;
    totalCommissionsPaid: number;
    totalCommissionsPending: number;
    totalTaxWithheldIsr: number; // 10% retención ISR
    totalNetAmount: number;
  };
}

/**
 * Servicio de Business Intelligence Operativo (Fase 9)
 * Emblema Nexus — República Dominicana
 *
 * Provee analítica y métricas avanzadas para:
 * 1. Productividad del Equipo Legal y Técnico (casos, tareas a tiempo, plazos vencidos).
 * 2. Operaciones de Agrimensura y Catastro (superficie en Tareas/m², regionales DNMC, tiempos de aprobación).
 * 3. Gestión Inmobiliaria y Bienes Raíces (inventario, tasa de conversión visitas-ofertas, comisiones e ISR).
 */
export class OperationalBiService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  private round(val: number, decimals = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((val + Number.EPSILON) * factor) / factor;
  }

  /**
   * Obtiene la productividad de los miembros del equipo a partir de la vista analítica.
   */
  async getTeamProductivity(companyId: string): Promise<TeamProductivitySummary> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase
      .from("view_operational_productivity" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .order("completed_tasks", { ascending: false });

    if (error) {
      console.error("Error al consultar productividad del equipo:", error);
      throw new Error(`Error en productividad del equipo: ${error.message}`);
    }

    const members: TeamMemberProductivity[] = (data || []).map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name || "Colaborador",
      userPhone: row.user_phone,
      userType: row.user_type,
      totalCases: Number(row.total_cases || 0),
      completedCases: Number(row.completed_cases || 0),
      activeCases: Number(row.active_cases || 0),
      totalTasks: Number(row.total_tasks || 0),
      completedTasks: Number(row.completed_tasks || 0),
      tasksOnTime: Number(row.tasks_on_time || 0),
      tasksLate: Number(row.tasks_late || 0),
      tasksOverduePending: Number(row.tasks_overdue_pending || 0),
      totalOverdue: Number(row.total_overdue || 0),
      onTimeRate: Number(row.on_time_rate || 0),
    }));

    let totalCases = 0;
    let totalCompletedCases = 0;
    let totalActiveCases = 0;
    let totalTasks = 0;
    let totalCompletedTasks = 0;
    let totalTasksOnTime = 0;
    let totalTasksOverdue = 0;

    for (const m of members) {
      totalCases += m.totalCases;
      totalCompletedCases += m.completedCases;
      totalActiveCases += m.activeCases;
      totalTasks += m.totalTasks;
      totalCompletedTasks += m.completedTasks;
      totalTasksOnTime += m.tasksOnTime;
      totalTasksOverdue += m.totalOverdue;
    }

    const globalOnTimeRate =
      totalCompletedTasks > 0
        ? this.round((totalTasksOnTime / totalCompletedTasks) * 100)
        : 0;

    return {
      companyId,
      teamMembersCount: members.length,
      totalCases,
      totalCompletedCases,
      totalActiveCases,
      totalTasks,
      totalCompletedTasks,
      totalTasksOnTime,
      totalTasksOverdue,
      globalOnTimeRate,
      members,
    };
  }

  /**
   * Obtiene métricas de Business Intelligence para Agrimensura y Catastro ante la DNMC.
   */
  async getCadastralBiMetrics(companyId: string): Promise<CadastralBiMetricsResult> {
    const supabase = await this.getClient();
    const today = new Date();

    // 1. Parcelas y superficies en m² y Tareas
    const { data: parcels, error: parcelErr } = await (supabase
      .from("cadastral_parcels" as any) as any)
      .select("id, area_m2, area_tareas, status")
      .eq("company_id", companyId);

    if (parcelErr) {
      console.error("Error al consultar parcelas:", parcelErr);
      throw new Error(`Error en métricas catastrales: ${parcelErr.message}`);
    }

    let totalAreaM2 = 0;
    let totalAreaTareas = 0;

    const parcelStatusLabels: Record<string, string> = {
      en_proceso: "En Levantamiento / Proceso",
      sometido_dnmc: "Sometido a DNMC",
      observado: "Observado Técnicamente",
      aprobado_dnmc: "Aprobado por DNMC",
      titulado: "Titulado con Matrícula",
      rechazado: "Rechazado",
    };

    const parcelStatusMap = new Map<
      string,
      { parcelsCount: number; areaM2: number; areaTareas: number }
    >();

    for (const p of parcels || []) {
      const m2 = Number(p.area_m2 || 0);
      const tar = Number(p.area_tareas || m2 / 628.86);
      totalAreaM2 += m2;
      totalAreaTareas += tar;

      const st = p.status || "en_proceso";
      const current = parcelStatusMap.get(st) || {
        parcelsCount: 0,
        areaM2: 0,
        areaTareas: 0,
      };
      current.parcelsCount += 1;
      current.areaM2 += m2;
      current.areaTareas += tar;
      parcelStatusMap.set(st, current);
    }

    const byStatus = Array.from(parcelStatusMap.entries()).map(([status, val]) => ({
      status,
      label: parcelStatusLabels[status] || status,
      parcelsCount: val.parcelsCount,
      areaM2: this.round(val.areaM2),
      areaTareas: this.round(val.areaTareas),
    }));

    // 2. Expedientes catastrales ante la DNMC
    const { data: files, error: fileErr } = await (supabase
      .from("cadastral_files" as any) as any)
      .select(`
        id,
        dnmc_file_number,
        regional_directorate,
        operation_type,
        current_stage,
        submission_date,
        approval_date,
        observation_due_date,
        surveyor:profiles(first_name, last_name)
      `)
      .eq("company_id", companyId);

    if (fileErr) {
      console.error("Error al consultar expedientes catastrales:", fileErr);
      throw new Error(`Error en expedientes catastrales: ${fileErr.message}`);
    }

    const regionalLabels: Record<string, string> = {
      central: "Regional Central (Santo Domingo / Distrito Nacional)",
      norte: "Regional Norte (Santiago)",
      este: "Regional Este (El Seibo)",
      noreste: "Regional Noreste (San Francisco de Macorís)",
      suroeste: "Regional Suroeste (Barahona)",
    };

    const operationLabels: Record<string, string> = {
      deslinde: "Deslinde",
      subdivision: "Subdivisión",
      refundicion: "Refundición",
      urbanizacion: "Urbanización",
      actualizacion_parcelaria: "Actualización Parcelaria",
      saneamiento: "Saneamiento",
      replanteo: "Replanteo",
      modificacion_parcelaria: "Modificación Parcelaria",
      otro: "Otro",
    };

    const stageLabels: Record<string, string> = {
      solicitud_autorizacion: "Solicitud de Autorización",
      aviso_publicacion: "Aviso de Publicación",
      trabajos_campo: "Trabajos de Campo",
      elaboracion_planos: "Elaboración de Planos",
      sometido_dnmc: "Sometido a DNMC",
      revision_tecnica: "En Revisión Técnica",
      oficio_observacion: "Con Oficio de Observación",
      aprobado_dnmc: "Aprobado por DNMC",
      en_tribunal_tierras: "En Tribunal de Tierras",
      en_registro_titulos: "En Registro de Títulos",
      concluido_titulado: "Concluido y Titulado",
    };

    const regionalMap = new Map<string, { count: number; approvedCount: number }>();
    const operationMap = new Map<string, number>();
    const stageMap = new Map<string, number>();

    let totalApprovalDays = 0;
    let approvedFilesCount = 0;
    let observedFilesCount = 0;
    let activeFilesCount = 0;
    const urgentObservations: CadastralBiMetricsResult["urgentObservations"] = [];

    for (const f of files || []) {
      const reg = f.regional_directorate || "central";
      const op = f.operation_type || "deslinde";
      const stg = f.current_stage || "sometido_dnmc";

      // Regional
      const rItem = regionalMap.get(reg) || { count: 0, approvedCount: 0 };
      rItem.count += 1;
      if (stg === "aprobado_dnmc" || stg === "concluido_titulado") {
        rItem.approvedCount += 1;
      }
      regionalMap.set(reg, rItem);

      // Operación
      operationMap.set(op, (operationMap.get(op) || 0) + 1);

      // Etapa
      stageMap.set(stg, (stageMap.get(stg) || 0) + 1);

      if (stg === "aprobado_dnmc" || stg === "concluido_titulado") {
        approvedFilesCount++;
        if (f.submission_date && f.approval_date) {
          const sub = new Date(f.submission_date);
          const app = new Date(f.approval_date);
          const diffDays = Math.max(0, Math.floor((app.getTime() - sub.getTime()) / (1000 * 60 * 60 * 24)));
          totalApprovalDays += diffDays;
        }
      } else {
        activeFilesCount++;
      }

      if (stg === "oficio_observacion") {
        observedFilesCount++;
        if (f.observation_due_date) {
          const due = new Date(f.observation_due_date);
          const daysRemaining = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const surveyorName = f.surveyor
            ? [f.surveyor.first_name, f.surveyor.last_name].filter(Boolean).join(" ")
            : null;

          urgentObservations.push({
            fileId: f.id,
            dnmcFileNumber: f.dnmc_file_number,
            regional: regionalLabels[reg] || reg,
            surveyorName,
            observationDueDate: f.observation_due_date,
            daysRemaining,
          });
        }
      }
    }

    const averageApprovalDays =
      approvedFilesCount > 0 ? Math.round(totalApprovalDays / approvedFilesCount) : 0;

    urgentObservations.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      companyId,
      areaMetrics: {
        totalParcels: (parcels || []).length,
        totalAreaM2: this.round(totalAreaM2),
        totalAreaTareas: this.round(totalAreaTareas),
        byStatus,
      },
      filesSummary: {
        totalFiles: (files || []).length,
        activeFiles: activeFilesCount,
        approvedFiles: approvedFilesCount,
        observedFiles: observedFilesCount,
        averageApprovalDays,
      },
      byRegional: Array.from(regionalMap.entries()).map(([regional, val]) => ({
        regional,
        label: regionalLabels[regional] || regional,
        count: val.count,
        approvedCount: val.approvedCount,
      })),
      byOperationType: Array.from(operationMap.entries()).map(([operationType, count]) => ({
        operationType,
        label: operationLabels[operationType] || operationType,
        count,
      })),
      byStage: Array.from(stageMap.entries()).map(([stage, count]) => ({
        stage,
        label: stageLabels[stage] || stage,
        count,
      })),
      urgentObservations: urgentObservations.slice(0, 10),
    };
  }

  /**
   * Obtiene métricas de Business Intelligence Inmobiliario y Corretaje.
   */
  async getRealEstateBiMetrics(companyId: string): Promise<RealEstateBiMetricsResult> {
    const supabase = await this.getClient();

    // 1. Propiedades
    const { data: properties, error: propErr } = await (supabase
      .from("properties" as any) as any)
      .select("id, property_type, listing_type, status, currency, sale_price, rental_price")
      .eq("company_id", companyId);

    if (propErr) {
      console.error("Error consultando propiedades:", propErr);
      throw new Error(`Error en BI inmobiliario: ${propErr.message}`);
    }

    const propTypeLabels: Record<string, string> = {
      apartamento: "Apartamento",
      casa: "Casa",
      villa: "Villa",
      solar_terreno: "Solar / Terreno",
      local_comercial: "Local Comercial",
      nave_industrial: "Nave Industrial",
      oficina: "Oficina",
      edificio: "Edificio",
      finca: "Finca",
    };

    let availableProperties = 0;
    let reservedProperties = 0;
    let underContractProperties = 0;
    let soldProperties = 0;
    let rentedProperties = 0;
    let totalSaleValueUsd = 0;
    let totalSaleValueDop = 0;
    let totalRentalValueUsd = 0;
    let totalRentalValueDop = 0;

    const propTypeCountMap = new Map<string, number>();

    for (const p of properties || []) {
      const st = p.status || "disponible";
      if (st === "disponible") availableProperties++;
      else if (st === "reservada") reservedProperties++;
      else if (st === "bajo_contrato") underContractProperties++;
      else if (st === "vendida") soldProperties++;
      else if (st === "alquilada") rentedProperties++;

      const pType = p.property_type || "apartamento";
      propTypeCountMap.set(pType, (propTypeCountMap.get(pType) || 0) + 1);

      const curr = p.currency || "USD";
      if (p.sale_price) {
        if (curr === "USD") totalSaleValueUsd += Number(p.sale_price);
        else totalSaleValueDop += Number(p.sale_price);
      }
      if (p.rental_price) {
        if (curr === "USD") totalRentalValueUsd += Number(p.rental_price);
        else totalRentalValueDop += Number(p.rental_price);
      }
    }

    const byType = Array.from(propTypeCountMap.entries()).map(([type, count]) => ({
      type,
      label: propTypeLabels[type] || type,
      count,
    }));

    // 2. Citas y Visitas (Showings)
    const { data: showings, error: showErr } = await (supabase
      .from("property_showings" as any) as any)
      .select("id, status, offer_made")
      .eq("company_id", companyId);

    if (showErr) {
      console.error("Error consultando citas inmobiliarias:", showErr);
    }

    let totalShowings = (showings || []).length;
    let completedShowings = 0;
    let offersMade = 0;

    for (const s of showings || []) {
      if (s.status === "completada") completedShowings++;
      if (s.offer_made) offersMade++;
    }

    const conversionRate =
      completedShowings > 0
        ? this.round((offersMade / completedShowings) * 100)
        : 0;

    // 3. Contratos Inmobiliarios
    const { data: contracts, error: conErr } = await (supabase
      .from("property_contracts" as any) as any)
      .select("id, contract_type, status, currency, amount")
      .eq("company_id", companyId);

    if (conErr) {
      console.error("Error consultando contratos inmobiliarios:", conErr);
    }

    const contractTypeLabels: Record<string, string> = {
      alquiler: "Alquiler",
      promesa_venta: "Promesa de Venta",
      opcion_compra: "Opción a Compra",
      administracion: "Administración Inmobiliaria",
    };

    let activeContracts = 0;
    let transactedVolumeUsd = 0;
    let transactedVolumeDop = 0;
    let contractsCountUsd = 0;
    let contractsCountDop = 0;

    const contractTypeMap = new Map<
      string,
      { count: number; volumeUsd: number; volumeDop: number }
    >();

    for (const c of contracts || []) {
      if (c.status === "vigente") activeContracts++;

      const cType = c.contract_type || "alquiler";
      const amt = Number(c.amount || 0);
      const curr = c.currency || "USD";

      const item = contractTypeMap.get(cType) || { count: 0, volumeUsd: 0, volumeDop: 0 };
      item.count += 1;

      if (curr === "USD") {
        transactedVolumeUsd += amt;
        contractsCountUsd += 1;
        item.volumeUsd += amt;
      } else {
        transactedVolumeDop += amt;
        contractsCountDop += 1;
        item.volumeDop += amt;
      }
      contractTypeMap.set(cType, item);
    }

    const byContractType = Array.from(contractTypeMap.entries()).map(([type, val]) => ({
      type,
      label: contractTypeLabels[type] || type,
      count: val.count,
      volumeUsd: this.round(val.volumeUsd),
      volumeDop: this.round(val.volumeDop),
    }));

    const averageContractAmountUsd =
      contractsCountUsd > 0 ? this.round(transactedVolumeUsd / contractsCountUsd) : 0;
    const averageContractAmountDop =
      contractsCountDop > 0 ? this.round(transactedVolumeDop / contractsCountDop) : 0;

    // 4. Comisiones de Corretaje y Retención Fiscal ISR
    const { data: commissions, error: comErr } = await (supabase
      .from("broker_commissions" as any) as any)
      .select("id, commission_amount, tax_withholding, net_amount, status")
      .eq("company_id", companyId);

    if (comErr) {
      console.error("Error consultando comisiones:", comErr);
    }

    let totalCommissionsGenerated = 0;
    let totalCommissionsPaid = 0;
    let totalCommissionsPending = 0;
    let totalTaxWithheldIsr = 0;
    let totalNetAmount = 0;

    for (const comm of commissions || []) {
      const gross = Number(comm.commission_amount || 0);
      const tax = Number(comm.tax_withholding || 0);
      const net = Number(comm.net_amount || 0);

      totalCommissionsGenerated += gross;
      totalTaxWithheldIsr += tax;
      totalNetAmount += net;

      if (comm.status === "pagada") {
        totalCommissionsPaid += gross;
      } else if (comm.status === "pendiente" || comm.status === "aprobada") {
        totalCommissionsPending += gross;
      }
    }

    return {
      companyId,
      inventory: {
        totalProperties: (properties || []).length,
        availableProperties,
        reservedProperties,
        underContractProperties,
        soldProperties,
        rentedProperties,
        totalSaleValueUsd: this.round(totalSaleValueUsd),
        totalSaleValueDop: this.round(totalSaleValueDop),
        totalRentalValueUsd: this.round(totalRentalValueUsd),
        totalRentalValueDop: this.round(totalRentalValueDop),
        byType,
      },
      showingsAndConversion: {
        totalShowings,
        completedShowings,
        offersMade,
        conversionRate,
      },
      contracts: {
        totalContracts: (contracts || []).length,
        activeContracts,
        transactedVolumeUsd: this.round(transactedVolumeUsd),
        transactedVolumeDop: this.round(transactedVolumeDop),
        averageContractAmountUsd,
        averageContractAmountDop,
        byType: byContractType,
      },
      commissions: {
        totalCommissionsGenerated: this.round(totalCommissionsGenerated),
        totalCommissionsPaid: this.round(totalCommissionsPaid),
        totalCommissionsPending: this.round(totalCommissionsPending),
        totalTaxWithheldIsr: this.round(totalTaxWithheldIsr),
        totalNetAmount: this.round(totalNetAmount),
      },
    };
  }
}

export const operationalBiService = new OperationalBiService();
