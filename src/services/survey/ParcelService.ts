import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  TAREA_M2,
  utm19NToLatLng,
  latLngToUtm19N,
  validateUtm19NBounds,
} from "./coordinateUtils";

export type CadastralParcelRow =
  Database["public"]["Tables"]["cadastral_parcels"]["Row"];
export type CadastralParcelInsert =
  Database["public"]["Tables"]["cadastral_parcels"]["Insert"];
export type CadastralParcelUpdate =
  Database["public"]["Tables"]["cadastral_parcels"]["Update"];
export type CadastralParcelStatus = CadastralParcelRow["status"];

type SurveyPointRow =
  Database["public"]["Tables"]["survey_points"]["Row"];
type CadastralFileRow =
  Database["public"]["Tables"]["cadastral_files"]["Row"];

export interface CreateParcelInput {
  designation: string;
  cadastral_district: string;
  province: string;
  municipality: string;
  area_m2: number;
  area_tareas?: number | null;
  perimeter_m?: number | null;
  case_id?: string | null;
  client_id?: string | null;
  title_number?: string | null;
  portion_number?: string | null;
  solar_number?: string | null;
  block_number?: string | null;
  sector?: string | null;
  address?: string | null;
  utm_zone?: string | null;
  datum?: string | null;
  centroid_lat?: number | null;
  centroid_lng?: number | null;
  centroid_utm_north?: number | null;
  centroid_utm_east?: number | null;
  polygon_geometry?: Record<string, unknown> | null;
  boundaries?: Record<string, unknown> | null;
  status?: CadastralParcelStatus;
  notes?: string | null;
  created_by?: string | null;
}

export type UpdateParcelInput = Partial<CreateParcelInput>;

export interface GetParcelsFilters {
  caseId?: string;
  clientId?: string;
  status?: string;
  province?: string;
  search?: string;
}

export interface ParcelWithDetails extends CadastralParcelRow {
  survey_points: SurveyPointRow[];
  cadastral_file: CadastralFileRow | null;
  cadastral_files?: CadastralFileRow[];
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  client?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
}

export interface ParcelsSummary {
  total: number;
  totalAreaM2: number;
  totalAreaTareas: number;
  byStatus: Record<CadastralParcelStatus, number>;
  enProceso: number;
  sometidoDnmc: number;
  observado: number;
  aprobadoDnmc: number;
  titulado: number;
  rechazado: number;
}

export class ParcelService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Obtiene la lista de parcelas catastrales aplicando filtros opcionales.
   */
  async getParcels(
    companyId: string,
    filters?: GetParcelsFilters
  ): Promise<CadastralParcelRow[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("cadastral_parcels" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }
    if (filters?.clientId) {
      query = query.eq("client_id", filters.clientId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.province) {
      query = query.ilike("province", `%${filters.province}%`);
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `designation.ilike.${term},title_number.ilike.${term},cadastral_district.ilike.${term},municipality.ilike.${term},sector.ilike.${term}`
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener parcelas:", error);
      throw error;
    }

    return (data || []) as CadastralParcelRow[];
  }

  /**
   * Recupera una parcela por ID junto a sus vértices topográficos ordenados,
   * su expediente catastral DNMC vinculado y relaciones de caso / cliente.
   */
  async getParcelById(
    companyId: string,
    id: string
  ): Promise<ParcelWithDetails | null> {
    const supabase = await this.getClient();

    // 1. Obtener la parcela
    const { data: parcel, error: parcelError } = await (
      supabase.from("cadastral_parcels" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (parcelError) {
      console.error(`Error al obtener parcela ${id}:`, parcelError);
      throw parcelError;
    }

    if (!parcel) {
      return null;
    }

    // 2. Obtener puntos topográficos ordenados por order_index
    const { data: points, error: pointsError } = await (
      supabase.from("survey_points" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("parcel_id", id)
      .order("order_index", { ascending: true });

    if (pointsError) {
      console.error(`Error al obtener puntos de la parcela ${id}:`, pointsError);
    }

    // 3. Obtener expedientes catastrales asociados a esta parcela
    const { data: cadastralFiles, error: filesError } = await (
      supabase.from("cadastral_files" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("parcel_id", id)
      .order("created_at", { ascending: false });

    if (filesError) {
      console.error(
        `Error al obtener expedientes de la parcela ${id}:`,
        filesError
      );
    }

    // 4. Obtener información del caso si existe
    let caseData: { id: string; case_number: string; title: string } | null =
      null;
    if (parcel.case_id) {
      const { data: c } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .eq("id", parcel.case_id)
        .maybeSingle();
      if (c) caseData = c;
    }

    // 5. Obtener información del cliente si existe
    let clientData: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      company_name?: string | null;
    } | null = null;
    if (parcel.client_id) {
      const { data: cl } = await (supabase.from("clients" as any) as any)
        .select("id, first_name, last_name, company_name")
        .eq("id", parcel.client_id)
        .maybeSingle();
      if (cl) clientData = cl;
    }

    const files = (cadastralFiles || []) as CadastralFileRow[];
    const primaryFile = files.length > 0 ? files[0] : null;

    return {
      ...(parcel as CadastralParcelRow),
      survey_points: (points || []) as SurveyPointRow[],
      cadastral_file: primaryFile,
      cadastral_files: files,
      case: caseData,
      client: clientData,
    };
  }

  /**
   * Crea una nueva parcela catastral.
   * - Calcula automáticamente `area_tareas` (area_m2 / 628.86).
   * - Valida límites de coordenadas UTM 19N dentro de la República Dominicana.
   * - Sincroniza coordenadas proyectadas y geográficas.
   * - Estructura el GeoJSON inicial si no se suministra polígono.
   */
  async createParcel(
    companyId: string,
    data: CreateParcelInput
  ): Promise<CadastralParcelRow> {
    const supabase = await this.getClient();

    if (!data.designation || !data.designation.trim()) {
      throw new Error("La designación de la parcela es obligatoria (ej. 'Parcela 12-A')");
    }

    if (data.area_m2 <= 0) {
      throw new Error("El área en metros cuadrados (área_m2) debe ser mayor a 0");
    }

    // Cálculo automático de tareas dominicanas (1 Tarea = 628.86 m²)
    const areaTareas =
      data.area_tareas ?? Number((data.area_m2 / TAREA_M2).toFixed(4));

    let centroidUtmNorth = data.centroid_utm_north ?? null;
    let centroidUtmEast = data.centroid_utm_east ?? null;
    let centroidLat = data.centroid_lat ?? null;
    let centroidLng = data.centroid_lng ?? null;

    // Validación de límites territoriales UTM 19N República Dominicana
    if (centroidUtmEast !== null && centroidUtmNorth !== null) {
      const boundsCheck = validateUtm19NBounds(centroidUtmEast, centroidUtmNorth);
      if (!boundsCheck.valid) {
        throw new Error(boundsCheck.reason);
      }

      // Si no se proporcionaron Lat/Lng geográficas, derivarlas de UTM 19N
      if (centroidLat === null || centroidLng === null) {
        const latLng = utm19NToLatLng(centroidUtmEast, centroidUtmNorth);
        centroidLat = latLng.latitude;
        centroidLng = latLng.longitude;
      }
    } else if (centroidLat !== null && centroidLng !== null) {
      // Si se proporcionó Lat/Lng pero no UTM, derivar UTM 19N
      const utm = latLngToUtm19N(centroidLat, centroidLng);
      centroidUtmEast = utm.utmEast;
      centroidUtmNorth = utm.utmNorth;
    }

    // Estructurar GeoJSON inicial si no se suministró polígono
    let polygonGeometry = data.polygon_geometry ?? null;
    if (!polygonGeometry) {
      if (centroidLng !== null && centroidLat !== null) {
        polygonGeometry = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [centroidLng, centroidLat],
          },
          properties: {
            designation: data.designation,
            area_m2: data.area_m2,
            area_tareas: areaTareas,
            utm_zone: data.utm_zone || "19N",
            datum: data.datum || "WGS84",
          },
        };
      } else {
        polygonGeometry = {
          type: "Polygon",
          coordinates: [],
        };
      }
    }

    const insertPayload: CadastralParcelInsert = {
      company_id: companyId,
      case_id: data.case_id ?? null,
      client_id: data.client_id ?? null,
      designation: data.designation.trim(),
      title_number: data.title_number ?? null,
      cadastral_district: data.cadastral_district.trim(),
      portion_number: data.portion_number ?? null,
      solar_number: data.solar_number ?? null,
      block_number: data.block_number ?? null,
      province: data.province.trim(),
      municipality: data.municipality.trim(),
      sector: data.sector ?? null,
      address: data.address ?? null,
      area_m2: data.area_m2,
      area_tareas: areaTareas,
      perimeter_m: data.perimeter_m ?? null,
      utm_zone: data.utm_zone || "19N",
      datum: data.datum || "WGS84",
      centroid_lat: centroidLat,
      centroid_lng: centroidLng,
      centroid_utm_north: centroidUtmNorth,
      centroid_utm_east: centroidUtmEast,
      polygon_geometry: polygonGeometry as any,
      boundaries: (data.boundaries as any) ?? null,
      status: data.status || "en_proceso",
      notes: data.notes ?? null,
      created_by: data.created_by ?? null,
    };

    const { data: created, error } = await (
      supabase.from("cadastral_parcels" as any) as any
    )
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error al crear parcela catastral:", error);
      throw error;
    }

    return created as CadastralParcelRow;
  }

  /**
   * Actualiza los datos de una parcela catastral.
   * Recalcula automáticamente tareas y valida coordenadas si son modificadas.
   */
  async updateParcel(
    companyId: string,
    id: string,
    data: UpdateParcelInput
  ): Promise<CadastralParcelRow> {
    const supabase = await this.getClient();

    const updatePayload: CadastralParcelUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (data.designation !== undefined) {
      updatePayload.designation = data.designation.trim();
    }
    if (data.cadastral_district !== undefined) {
      updatePayload.cadastral_district = data.cadastral_district.trim();
    }
    if (data.province !== undefined) {
      updatePayload.province = data.province.trim();
    }
    if (data.municipality !== undefined) {
      updatePayload.municipality = data.municipality.trim();
    }
    if (data.sector !== undefined) {
      updatePayload.sector = data.sector;
    }
    if (data.address !== undefined) {
      updatePayload.address = data.address;
    }
    if (data.title_number !== undefined) {
      updatePayload.title_number = data.title_number;
    }
    if (data.portion_number !== undefined) {
      updatePayload.portion_number = data.portion_number;
    }
    if (data.solar_number !== undefined) {
      updatePayload.solar_number = data.solar_number;
    }
    if (data.block_number !== undefined) {
      updatePayload.block_number = data.block_number;
    }
    if (data.case_id !== undefined) {
      updatePayload.case_id = data.case_id;
    }
    if (data.client_id !== undefined) {
      updatePayload.client_id = data.client_id;
    }
    if (data.status !== undefined) {
      updatePayload.status = data.status;
    }
    if (data.notes !== undefined) {
      updatePayload.notes = data.notes;
    }
    if (data.boundaries !== undefined) {
      updatePayload.boundaries = data.boundaries as any;
    }
    if (data.polygon_geometry !== undefined) {
      updatePayload.polygon_geometry = data.polygon_geometry as any;
    }
    if (data.perimeter_m !== undefined) {
      updatePayload.perimeter_m = data.perimeter_m;
    }
    if (data.utm_zone !== undefined) {
      updatePayload.utm_zone = data.utm_zone;
    }
    if (data.datum !== undefined) {
      updatePayload.datum = data.datum;
    }

    // Manejo de áreas
    if (data.area_m2 !== undefined) {
      if (data.area_m2 <= 0) {
        throw new Error("El área en m² debe ser un número positivo");
      }
      updatePayload.area_m2 = data.area_m2;
      updatePayload.area_tareas =
        data.area_tareas ?? Number((data.area_m2 / TAREA_M2).toFixed(4));
    } else if (data.area_tareas !== undefined) {
      updatePayload.area_tareas = data.area_tareas;
    }

    // Manejo de coordenadas
    let newUtmEast = data.centroid_utm_east;
    let newUtmNorth = data.centroid_utm_north;
    let newLat = data.centroid_lat;
    let newLng = data.centroid_lng;

    if (newUtmEast !== undefined && newUtmNorth !== undefined) {
      if (newUtmEast !== null && newUtmNorth !== null) {
        const boundsCheck = validateUtm19NBounds(newUtmEast, newUtmNorth);
        if (!boundsCheck.valid) {
          throw new Error(boundsCheck.reason);
        }
        if (newLat === undefined || newLng === undefined) {
          const latLng = utm19NToLatLng(newUtmEast, newUtmNorth);
          newLat = latLng.latitude;
          newLng = latLng.longitude;
        }
      }
      updatePayload.centroid_utm_east = newUtmEast;
      updatePayload.centroid_utm_north = newUtmNorth;
      if (newLat !== undefined) updatePayload.centroid_lat = newLat;
      if (newLng !== undefined) updatePayload.centroid_lng = newLng;
    } else if (newLat !== undefined && newLng !== undefined) {
      if (newLat !== null && newLng !== null) {
        const utm = latLngToUtm19N(newLat, newLng);
        updatePayload.centroid_utm_east = utm.utmEast;
        updatePayload.centroid_utm_north = utm.utmNorth;
      }
      updatePayload.centroid_lat = newLat;
      updatePayload.centroid_lng = newLng;
    }

    const { data: updated, error } = await (
      supabase.from("cadastral_parcels" as any) as any
    )
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error al actualizar parcela ${id}:`, error);
      throw error;
    }

    return updated as CadastralParcelRow;
  }

  /**
   * Elimina una parcela catastral y sus vértices asociados.
   */
  async deleteParcel(companyId: string, id: string): Promise<void> {
    const supabase = await this.getClient();

    // Eliminar puntos topográficos asociados
    const { error: pointsError } = await (
      supabase.from("survey_points" as any) as any
    )
      .delete()
      .eq("company_id", companyId)
      .eq("parcel_id", id);

    if (pointsError) {
      console.warn(
        `Aviso al eliminar puntos asociados a la parcela ${id}:`,
        pointsError
      );
    }

    // Eliminar parcela
    const { error } = await (supabase.from("cadastral_parcels" as any) as any)
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error(`Error al eliminar parcela catastral ${id}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene un resumen cuantitativo de las parcelas de la empresa:
   * cantidad total, m² totales, tareas totales y desglose por estado catastral.
   */
  async getParcelsSummary(companyId: string): Promise<ParcelsSummary> {
    const supabase = await this.getClient();

    const { data, error } = await (
      supabase.from("cadastral_parcels" as any) as any
    )
      .select("id, status, area_m2, area_tareas")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error al obtener resumen de parcelas:", error);
      throw error;
    }

    const parcels = data || [];
    let totalAreaM2 = 0;
    let totalAreaTareas = 0;

    const byStatus: Record<CadastralParcelStatus, number> = {
      en_proceso: 0,
      sometido_dnmc: 0,
      observado: 0,
      aprobado_dnmc: 0,
      titulado: 0,
      rechazado: 0,
    };

    for (const p of parcels) {
      const areaM2 = Number(p.area_m2) || 0;
      const areaTareas =
        p.area_tareas !== null && p.area_tareas !== undefined
          ? Number(p.area_tareas)
          : Number((areaM2 / TAREA_M2).toFixed(4));

      totalAreaM2 += areaM2;
      totalAreaTareas += areaTareas;

      const st = p.status as CadastralParcelStatus;
      if (st && byStatus[st] !== undefined) {
        byStatus[st]++;
      } else {
        byStatus.en_proceso++;
      }
    }

    return {
      total: parcels.length,
      totalAreaM2: Number(totalAreaM2.toFixed(2)),
      totalAreaTareas: Number(totalAreaTareas.toFixed(4)),
      byStatus,
      enProceso: byStatus.en_proceso,
      sometidoDnmc: byStatus.sometido_dnmc,
      observado: byStatus.observado,
      aprobadoDnmc: byStatus.aprobado_dnmc,
      titulado: byStatus.titulado,
      rechazado: byStatus.rechazado,
    };
  }
}

export const parcelService = new ParcelService();
