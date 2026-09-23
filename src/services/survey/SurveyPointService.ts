import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  utm19NToLatLng,
  calculatePolygonMetricsFromCoords,
  type PolygonMetrics,
} from "./coordinateUtils";

export type SurveyPointRow =
  Database["public"]["Tables"]["survey_points"]["Row"];
export type SurveyPointInsert =
  Database["public"]["Tables"]["survey_points"]["Insert"];
export type SurveyPointUpdate =
  Database["public"]["Tables"]["survey_points"]["Update"];

export type PointType = SurveyPointRow["point_type"];

export type CoordinateFileFormat = "PNEZD" | "PENZD" | "CSV";

export interface ParsedSurveyPoint {
  pointName: string;
  utmNorth: number;
  utmEast: number;
  elevation: number | null;
  latitude: number | null;
  longitude: number | null;
  pointType: PointType;
  description: string | null;
  orderIndex: number;
}

export class SurveyPointService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Clasifica automáticamente el tipo de punto topográfico según el código o descripción
   * común utilizado por agrimensores en la República Dominicana.
   */
  private inferPointType(codeOrDesc: string, pointName: string): PointType {
    const raw = `${codeOrDesc} ${pointName}`.toLowerCase().trim();

    if (raw.includes("cors") || raw.includes("gnss_base") || raw.includes("c-")) {
      return "punto_control_cors";
    }
    if (
      raw.includes("est") ||
      raw.includes("base") ||
      raw.includes("ref") ||
      raw.includes("bm") ||
      raw.includes("delta")
    ) {
      return "estacion_referencia";
    }
    if (
      raw.includes("moj") ||
      raw.includes("mojon") ||
      raw.includes("arbol") ||
      raw.includes("clav") ||
      raw.includes("clavo") ||
      raw.includes("varilla") ||
      raw.includes("hito") ||
      raw.includes("tubo")
    ) {
      return "arbol_mojon";
    }
    if (
      raw.includes("rio") ||
      raw.includes("canal") ||
      raw.includes("quebrada") ||
      raw.includes("arroyo") ||
      raw.includes("costa") ||
      raw.includes("mar") ||
      raw.includes("playa")
    ) {
      return "canal_rio";
    }
    if (
      raw.includes("calle") ||
      raw.includes("camino") ||
      raw.includes("carret") ||
      raw.includes("acera") ||
      raw.includes("via") ||
      raw.includes("eje") ||
      raw.includes("trocha")
    ) {
      return "calle_camino";
    }
    if (
      raw.includes("esq") ||
      raw.includes("poste") ||
      raw.includes("muro") ||
      raw.includes("verja") ||
      raw.includes("pared") ||
      raw.includes("edif") ||
      raw.includes("casa") ||
      raw.includes("construc")
    ) {
      return "detalle_fisico";
    }

    return "vertice_lindero";
  }

  /**
   * Parsea archivos de texto plano o CSV procedentes de Estaciones Totales (Leica, Trimble,
   * Topcon, South, Sokkia) o colectores de datos GPS/GNSS RTK.
   * 
   * Formatos soportados:
   * - PNEZD: Punto, Norte, Este, Elevación (Z), Descripción
   * - PENZD: Punto, Este, Norte, Elevación (Z), Descripción
   * - CSV: Detección inteligente de encabezados o delimitadores (coma, punto y coma, tabulador, espacios).
   */
  parseCoordinateFile(
    content: string,
    format: CoordinateFileFormat = "PNEZD"
  ): ParsedSurveyPoint[] {
    if (!content || !content.trim()) {
      return [];
    }

    const lines = content.split(/\r?\n/);
    const parsedPoints: ParsedSurveyPoint[] = [];

    // Mapeo dinámico de columnas si se detecta cabecera en CSV
    let detectedPenzd = format === "PENZD";
    let isHeaderProcessed = false;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineNum = lineIdx + 1;
      const rawLine = lines[lineIdx].trim();

      // Ignorar líneas vacías y comentarios de estaciones totales
      if (
        !rawLine ||
        rawLine.startsWith("#") ||
        rawLine.startsWith("//") ||
        rawLine.startsWith(";") ||
        rawLine.startsWith("/*")
      ) {
        continue;
      }

      // Detectar delimitador adecuado
      let tokens: string[] = [];
      if (rawLine.includes(",")) {
        tokens = rawLine.split(",");
      } else if (rawLine.includes(";")) {
        tokens = rawLine.split(";");
      } else if (rawLine.includes("\t")) {
        tokens = rawLine.split("\t");
      } else {
        // Delimitado por espacios múltiples o simples
        tokens = rawLine.split(/\s+/);
      }

      tokens = tokens.map((t) => t.trim()).filter((t) => t.length > 0);
      if (tokens.length < 3) {
        continue; // Línea incompleta o separador sin datos
      }

      const lowerFirst = tokens[0].toLowerCase();
      const lowerSecond = tokens[1]?.toLowerCase() || "";
      const lowerThird = tokens[2]?.toLowerCase() || "";

      // Detección y descarte de cabeceras textuales
      const isHeaderLine =
        lowerFirst.includes("punto") ||
        lowerFirst.includes("point") ||
        lowerFirst === "pt" ||
        lowerFirst === "p" ||
        lowerSecond.includes("norte") ||
        lowerSecond.includes("north") ||
        lowerSecond.includes("este") ||
        lowerSecond.includes("east");

      if (isHeaderLine) {
        if (!isHeaderProcessed && format === "CSV") {
          // Si en la cabecera 'este' o 'east' aparece antes de 'norte' o 'north'
          if (
            (lowerSecond.includes("este") || lowerSecond.includes("east")) &&
            (lowerThird.includes("norte") || lowerThird.includes("north"))
          ) {
            detectedPenzd = true;
          }
          isHeaderProcessed = true;
        }
        continue;
      }

      const pointName = tokens[0];
      let colA = parseFloat(tokens[1]);
      let colB = parseFloat(tokens[2]);
      const elevationStr = tokens[3];
      const description = tokens.slice(4).join(" ").trim() || null;

      if (isNaN(colA) || isNaN(colB)) {
        throw new Error(
          `Línea ${lineNum}: Coordenadas inválidas encontradas ("${rawLine}")`
        );
      }

      let utmNorth: number;
      let utmEast: number;

      // Heurística de validación territorial dominicana en UTM Zona 19N:
      // El Norte territorial de RD oscila entre ~1,900,000 y 2,250,000 m (7 dígitos).
      // El Este territorial oscila entre ~150,000 y 650,000 m (6 dígitos).
      if (format === "CSV" && !isHeaderProcessed) {
        if (colA < 1000000 && colB > 1000000) {
          // colA es Este, colB es Norte
          utmEast = colA;
          utmNorth = colB;
        } else if (colA > 1000000 && colB < 1000000) {
          // colA es Norte, colB es Este
          utmNorth = colA;
          utmEast = colB;
        } else if (detectedPenzd) {
          utmEast = colA;
          utmNorth = colB;
        } else {
          utmNorth = colA;
          utmEast = colB;
        }
      } else if (detectedPenzd) {
        utmEast = colA;
        utmNorth = colB;
      } else {
        utmNorth = colA;
        utmEast = colB;
      }

      const elevation =
        elevationStr !== undefined && elevationStr !== "" && !isNaN(parseFloat(elevationStr))
          ? parseFloat(elevationStr)
          : null;

      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const latLng = utm19NToLatLng(utmEast, utmNorth);
        latitude = latLng.latitude;
        longitude = latLng.longitude;
      } catch {
        // En caso de que no pueda proyectarse, lat/lng queda nulo
      }

      const pointType = this.inferPointType(description || "", pointName);

      parsedPoints.push({
        pointName,
        utmNorth: Number(utmNorth.toFixed(3)),
        utmEast: Number(utmEast.toFixed(3)),
        elevation: elevation !== null ? Number(elevation.toFixed(3)) : null,
        latitude,
        longitude,
        pointType,
        description,
        orderIndex: parsedPoints.length + 1,
      });
    }

    return parsedPoints;
  }

  /**
   * Calcula las métricas del polígono topográfico:
   * - Superficie en m² y tareas dominicanas por la fórmula de Gauss / Shoelace.
   * - Perímetro euclidiano en metros.
   * - Centroide geométrico en UTM 19N y Lat/Lng.
   */
  calculatePolygonMetrics(
    points: Array<
      | { utmNorth: number; utmEast: number }
      | { utm_north: number; utm_east: number }
      | ParsedSurveyPoint
      | SurveyPointRow
    >
  ): PolygonMetrics {
    const normalized = points.map((p) => {
      const north = "utmNorth" in p ? p.utmNorth : (p as any).utm_north;
      const east = "utmEast" in p ? p.utmEast : (p as any).utm_east;
      return {
        utmNorth: Number(north),
        utmEast: Number(east),
      };
    });
    return calculatePolygonMetricsFromCoords(normalized);
  }

  /**
   * Guarda los vértices de la parcela en `survey_points` y reconstruye automáticamente
   * el polígono GeoJSON y el centroide en `cadastral_parcels`.
   */
  async savePointsToParcel(
    companyId: string,
    parcelId: string,
    points: ParsedSurveyPoint[]
  ): Promise<{ points: SurveyPointRow[]; metrics: PolygonMetrics }> {
    const supabase = await this.getClient();

    if (!points || points.length === 0) {
      throw new Error("Debe proporcionar al menos un punto topográfico");
    }

    // 1. Validar que la parcela exista y pertenezca a la empresa
    const { data: parcel, error: parcelError } = await (
      supabase.from("cadastral_parcels" as any) as any
    )
      .select("id, designation")
      .eq("company_id", companyId)
      .eq("id", parcelId)
      .maybeSingle();

    if (parcelError || !parcel) {
      throw new Error(`Parcela no encontrada o no pertenece a la empresa (ID: ${parcelId})`);
    }

    // 2. Calcular métricas poligonales
    const metrics = this.calculatePolygonMetrics(points);

    // 3. Estructurar polígono GeoJSON conforme a especificación RFC 7946
    // [lng, lat] para coordenadas geográficas
    const geoJsonRing: [number, number][] = points.map((p) => {
      let lng = p.longitude;
      let lat = p.latitude;
      if (lng === null || lat === null) {
        const converted = utm19NToLatLng(p.utmEast, p.utmNorth);
        lng = converted.longitude;
        lat = converted.latitude;
      }
      return [lng, lat];
    });

    // Cerrar el anillo si hay al menos 3 vértices
    if (geoJsonRing.length >= 3) {
      const first = geoJsonRing[0];
      const last = geoJsonRing[geoJsonRing.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        geoJsonRing.push([first[0], first[1]]);
      }
    }

    const geoJsonPolygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [geoJsonRing],
      },
      properties: {
        parcel_id: parcelId,
        designation: parcel.designation,
        area_m2: metrics.areaM2,
        area_tareas: metrics.areaTareas,
        perimeter_m: metrics.perimeterM,
        centroid_utm_north: metrics.centroidUtmNorth,
        centroid_utm_east: metrics.centroidUtmEast,
        vertex_count: points.length,
        utm_zone: "19N",
        datum: "WGS84",
      },
    };

    // 4. Limpiar vértices anteriores de la parcela
    const { error: deleteError } = await (
      supabase.from("survey_points" as any) as any
    )
      .delete()
      .eq("company_id", companyId)
      .eq("parcel_id", parcelId);

    if (deleteError) {
      console.error(`Error al limpiar puntos anteriores de la parcela ${parcelId}:`, deleteError);
      throw deleteError;
    }

    // 5. Insertar los nuevos puntos con su secuencia
    const pointsToInsert: SurveyPointInsert[] = points.map((p, idx) => ({
      company_id: companyId,
      parcel_id: parcelId,
      point_name: p.pointName || `V-${idx + 1}`,
      point_type: p.pointType || "vertice_lindero",
      utm_north: p.utmNorth,
      utm_east: p.utmEast,
      elevation: p.elevation ?? null,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      order_index: p.orderIndex || idx + 1,
      description: p.description ?? null,
    }));

    const { data: insertedPoints, error: insertError } = await (
      supabase.from("survey_points" as any) as any
    )
      .insert(pointsToInsert)
      .select()
      .order("order_index", { ascending: true });

    if (insertError) {
      console.error(`Error al insertar puntos de la parcela ${parcelId}:`, insertError);
      throw insertError;
    }

    // 6. Actualizar métricas y geometría en la parcela
    const { error: updateParcelError } = await (
      supabase.from("cadastral_parcels" as any) as any
    )
      .update({
        area_m2: metrics.areaM2,
        area_tareas: metrics.areaTareas,
        perimeter_m: metrics.perimeterM,
        centroid_utm_north: metrics.centroidUtmNorth,
        centroid_utm_east: metrics.centroidUtmEast,
        centroid_lat: metrics.centroidLat,
        centroid_lng: metrics.centroidLng,
        polygon_geometry: geoJsonPolygon as any,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", parcelId);

    if (updateParcelError) {
      console.error(`Error al actualizar geometría de la parcela ${parcelId}:`, updateParcelError);
      throw updateParcelError;
    }

    return {
      points: (insertedPoints || []) as SurveyPointRow[],
      metrics,
    };
  }

  /**
   * Obtiene todos los puntos de una parcela ordenados por su índice topográfico.
   */
  async getPointsByParcel(
    companyId: string,
    parcelId: string
  ): Promise<SurveyPointRow[]> {
    const supabase = await this.getClient();

    const { data, error } = await (
      supabase.from("survey_points" as any) as any
    )
      .select("*")
      .eq("company_id", companyId)
      .eq("parcel_id", parcelId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error(`Error al obtener puntos de la parcela ${parcelId}:`, error);
      throw error;
    }

    return (data || []) as SurveyPointRow[];
  }
}

export const surveyPointService = new SurveyPointService();
