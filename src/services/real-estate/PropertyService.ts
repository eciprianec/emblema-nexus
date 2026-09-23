import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  PropertyRow,
  PropertyInsert,
  PropertyUpdate,
  PropertyType,
  ListingType,
  PropertyStatus,
  Json,
} from "@/types/database.types";

export const TAREA_M2 = 628.86; // 1 tarea dominicana = 628.86 metros cuadrados

export interface CreatePropertyInput {
  code?: string;
  title: string;
  description?: string | null;
  property_type: PropertyType;
  listing_type: ListingType;
  status?: PropertyStatus;
  currency?: "USD" | "DOP";
  sale_price?: number | null;
  rental_price?: number | null;
  maintenance_fee?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  half_bathrooms?: number | null;
  parking_spots?: number | null;
  construction_area_m2?: number | null;
  land_area_m2?: number | null;
  land_area_tareas?: number | null;
  year_built?: number | null;
  levels?: number | null;
  furnished?: "no_amueblado" | "semi_amueblado" | "completamente_amueblado";
  amenities?: string[] | Json;
  address_province?: string;
  address_municipality?: string;
  address_sector?: string;
  address_street?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[] | Json;
  virtual_tour_url?: string | null;
  title_deed_number?: string | null;
  is_exclusive?: boolean;
  commission_percentage?: number;
  parcel_id?: string | null;
  case_id?: string | null;
  owner_client_id?: string | null;
  created_by?: string | null;
}

export type UpdatePropertyInput = Partial<CreatePropertyInput>;

export interface GetPropertiesFilters {
  propertyType?: string;
  listingType?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  sector?: string;
  search?: string;
  ownerClientId?: string;
  caseId?: string;
  parcelId?: string;
}

export interface PropertyWithDetails extends PropertyRow {
  parcel?: {
    id: string;
    designation: string;
    title_number: string | null;
    cadastral_district: string;
    area_m2: number;
    province: string;
    municipality: string;
  } | null;
  case?: {
    id: string;
    case_number: string;
    title: string;
    status: string;
  } | null;
  owner_client?: {
    id: string;
    client_type: "persona_fisica" | "persona_juridica";
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    rnc: string | null;
    cedula: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface PropertiesSummary {
  total: number;
  disponibles: number;
  reservadas: number;
  bajoContrato: number;
  vendidas: number;
  alquiladas: number;
  inactivas: number;
  totalPortfolioValueSale: number;
  totalPortfolioValueRental: number;
  totalPortfolioValue: number;
  byStatus: Record<PropertyStatus, number>;
  byType: Record<PropertyType, number>;
  byListingType: Record<ListingType, number>;
}

export class PropertyService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Genera un código correlativo para la propiedad (ej: 'PROP-2026-001').
   */
  private async generatePropertyCode(
    supabase: any,
    companyId: string
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PROP-${currentYear}-`;

    const { data, error } = await (supabase.from("properties" as any) as any)
      .select("code")
      .eq("company_id", companyId)
      .ilike("code", `${prefix}%`);

    if (error) {
      console.warn("Advertencia al consultar secuencia de propiedades:", error);
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      for (const row of data) {
        const numPart = (row.code || "").replace(prefix, "");
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed >= nextNumber) {
          nextNumber = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  }

  /**
   * Hidrata las relaciones de propiedades (parcela, expediente, cliente propietario, creador).
   */
  private async hydrateProperties(
    supabase: any,
    properties: PropertyRow[]
  ): Promise<PropertyWithDetails[]> {
    if (!properties || properties.length === 0) return [];

    const parcelIds = Array.from(
      new Set(properties.map((p) => p.parcel_id).filter(Boolean) as string[])
    );
    const caseIds = Array.from(
      new Set(properties.map((p) => p.case_id).filter(Boolean) as string[])
    );
    const clientIds = Array.from(
      new Set(properties.map((p) => p.owner_client_id).filter(Boolean) as string[])
    );
    const creatorIds = Array.from(
      new Set(properties.map((p) => p.created_by).filter(Boolean) as string[])
    );

    const parcelsMap = new Map<string, any>();
    if (parcelIds.length > 0) {
      const { data: parcels } = await (supabase.from("cadastral_parcels" as any) as any)
        .select("id, designation, title_number, cadastral_district, area_m2, province, municipality")
        .in("id", parcelIds);
      (parcels || []).forEach((p: any) => parcelsMap.set(p.id, p));
    }

    const casesMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: cases } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title, status")
        .in("id", caseIds);
      (cases || []).forEach((c: any) => casesMap.set(c.id, c));
    }

    const clientsMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const { data: clients } = await (supabase.from("clients" as any) as any)
        .select("id, client_type, first_name, last_name, business_name, rnc, cedula, phone, email")
        .in("id", clientIds);
      (clients || []).forEach((c: any) => clientsMap.set(c.id, c));
    }

    const creatorsMap = new Map<string, any>();
    if (creatorIds.length > 0) {
      const { data: creators } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name")
        .in("id", creatorIds);
      (creators || []).forEach((c: any) => creatorsMap.set(c.id, c));
    }

    return properties.map((prop) => ({
      ...prop,
      parcel: prop.parcel_id ? parcelsMap.get(prop.parcel_id) ?? null : null,
      case: prop.case_id ? casesMap.get(prop.case_id) ?? null : null,
      owner_client: prop.owner_client_id
        ? clientsMap.get(prop.owner_client_id) ?? null
        : null,
      creator: prop.created_by ? creatorsMap.get(prop.created_by) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de propiedades con filtros opcionales.
   */
  async getProperties(
    companyId: string,
    filters?: GetPropertiesFilters
  ): Promise<PropertyWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("properties" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.propertyType) {
      query = query.eq("property_type", filters.propertyType);
    }
    if (filters?.listingType) {
      query = query.eq("listing_type", filters.listingType);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.bedrooms !== undefined && filters.bedrooms !== null) {
      query = query.gte("bedrooms", filters.bedrooms);
    }
    if (filters?.sector) {
      query = query.ilike("address_sector", `%${filters.sector}%`);
    }
    if (filters?.ownerClientId) {
      query = query.eq("owner_client_id", filters.ownerClientId);
    }
    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }
    if (filters?.parcelId) {
      query = query.eq("parcel_id", filters.parcelId);
    }

    // Filtros de precio
    if (filters?.minPrice !== undefined && filters.minPrice !== null) {
      query = query.or(
        `sale_price.gte.${filters.minPrice},rental_price.gte.${filters.minPrice}`
      );
    }
    if (filters?.maxPrice !== undefined && filters.maxPrice !== null) {
      query = query.or(
        `sale_price.lte.${filters.maxPrice},rental_price.lte.${filters.maxPrice}`
      );
    }

    // Búsqueda textual amplia
    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `code.ilike.${term},title.ilike.${term},description.ilike.${term},address_sector.ilike.${term},address_municipality.ilike.${term},address_province.ilike.${term},address_street.ilike.${term}`
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener propiedades:", error);
      throw new Error(`Error al consultar propiedades: ${error.message}`);
    }

    return this.hydrateProperties(supabase, (data as PropertyRow[]) || []);
  }

  /**
   * Obtiene una propiedad específica por ID con sus entidades relacionadas.
   */
  async getPropertyById(
    companyId: string,
    id: string
  ): Promise<PropertyWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("properties" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`Error al consultar propiedad ${id}:`, error);
      throw new Error(`Error al consultar la propiedad: ${error.message}`);
    }

    if (!data) return null;

    const hydrated = await this.hydrateProperties(supabase, [data as PropertyRow]);
    return hydrated[0] ?? null;
  }

  /**
   * Registra una nueva propiedad en el inventario.
   */
  async createProperty(
    companyId: string,
    data: CreatePropertyInput
  ): Promise<PropertyRow> {
    const supabase = await this.getClient();

    const code = data.code || (await this.generatePropertyCode(supabase, companyId));

    const insertData: PropertyInsert = {
      company_id: companyId,
      code,
      title: data.title,
      description: data.description ?? null,
      property_type: data.property_type,
      listing_type: data.listing_type,
      status: data.status ?? "disponible",
      currency: data.currency ?? "USD",
      sale_price: data.sale_price !== undefined ? data.sale_price : null,
      rental_price: data.rental_price !== undefined ? data.rental_price : null,
      maintenance_fee:
        data.maintenance_fee !== undefined ? data.maintenance_fee : null,
      bedrooms: data.bedrooms !== undefined ? data.bedrooms : null,
      bathrooms: data.bathrooms !== undefined ? data.bathrooms : null,
      half_bathrooms:
        data.half_bathrooms !== undefined ? data.half_bathrooms : null,
      parking_spots: data.parking_spots !== undefined ? data.parking_spots : null,
      construction_area_m2:
        data.construction_area_m2 !== undefined ? data.construction_area_m2 : null,
      land_area_m2: data.land_area_m2 !== undefined ? data.land_area_m2 : null,
      year_built: data.year_built !== undefined ? data.year_built : null,
      levels: data.levels !== undefined ? data.levels : null,
      furnished: data.furnished ?? "no_amueblado",
      amenities: (data.amenities as Json) ?? [],
      address_province: data.address_province || "Santo Domingo",
      address_municipality: data.address_municipality || "Distrito Nacional",
      address_sector: data.address_sector || "Piantini",
      address_street: data.address_street ?? null,
      latitude: data.latitude !== undefined ? data.latitude : null,
      longitude: data.longitude !== undefined ? data.longitude : null,
      images: (data.images as Json) ?? [],
      virtual_tour_url: data.virtual_tour_url ?? null,
      title_deed_number: data.title_deed_number ?? null,
      is_exclusive: data.is_exclusive ?? false,
      commission_percentage:
        data.commission_percentage !== undefined ? data.commission_percentage : 5.0,
      parcel_id: data.parcel_id ?? null,
      case_id: data.case_id ?? null,
      owner_client_id: data.owner_client_id ?? null,
      created_by: data.created_by ?? null,
    };

    const { data: created, error } = await (
      supabase.from("properties" as any) as any
    )
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      console.error("Error al registrar propiedad:", error);
      throw new Error(`Error al registrar la propiedad: ${error.message}`);
    }

    return created as PropertyRow;
  }

  /**
   * Actualiza una propiedad existente.
   */
  async updateProperty(
    companyId: string,
    id: string,
    data: UpdatePropertyInput
  ): Promise<PropertyRow> {
    const supabase = await this.getClient();

    const updatePayload: PropertyUpdate = {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.property_type !== undefined && {
        property_type: data.property_type,
      }),
      ...(data.listing_type !== undefined && {
        listing_type: data.listing_type,
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.sale_price !== undefined && { sale_price: data.sale_price }),
      ...(data.rental_price !== undefined && {
        rental_price: data.rental_price,
      }),
      ...(data.maintenance_fee !== undefined && {
        maintenance_fee: data.maintenance_fee,
      }),
      ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
      ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms }),
      ...(data.half_bathrooms !== undefined && {
        half_bathrooms: data.half_bathrooms,
      }),
      ...(data.parking_spots !== undefined && {
        parking_spots: data.parking_spots,
      }),
      ...(data.construction_area_m2 !== undefined && {
        construction_area_m2: data.construction_area_m2,
      }),
      ...(data.land_area_m2 !== undefined && {
        land_area_m2: data.land_area_m2,
      }),
      ...(data.year_built !== undefined && { year_built: data.year_built }),
      ...(data.levels !== undefined && { levels: data.levels }),
      ...(data.furnished !== undefined && { furnished: data.furnished }),
      ...(data.amenities !== undefined && {
        amenities: data.amenities as Json,
      }),
      ...(data.address_province !== undefined && {
        address_province: data.address_province,
      }),
      ...(data.address_municipality !== undefined && {
        address_municipality: data.address_municipality,
      }),
      ...(data.address_sector !== undefined && {
        address_sector: data.address_sector,
      }),
      ...(data.address_street !== undefined && {
        address_street: data.address_street,
      }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.images !== undefined && { images: data.images as Json }),
      ...(data.virtual_tour_url !== undefined && {
        virtual_tour_url: data.virtual_tour_url,
      }),
      ...(data.title_deed_number !== undefined && {
        title_deed_number: data.title_deed_number,
      }),
      ...(data.is_exclusive !== undefined && {
        is_exclusive: data.is_exclusive,
      }),
      ...(data.commission_percentage !== undefined && {
        commission_percentage: data.commission_percentage,
      }),
      ...(data.parcel_id !== undefined && { parcel_id: data.parcel_id }),
      ...(data.case_id !== undefined && { case_id: data.case_id }),
      ...(data.owner_client_id !== undefined && {
        owner_client_id: data.owner_client_id,
      }),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await (
      supabase.from("properties" as any) as any
    )
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error(`Error al actualizar propiedad ${id}:`, error);
      throw new Error(`Error al actualizar la propiedad: ${error.message}`);
    }

    return updated as PropertyRow;
  }

  /**
   * Elimina una propiedad del inventario.
   */
  async deleteProperty(companyId: string, id: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await (supabase.from("properties" as any) as any)
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error(`Error al eliminar propiedad ${id}:`, error);
      throw new Error(`Error al eliminar la propiedad: ${error.message}`);
    }
  }

  /**
   * Obtiene el resumen de métricas del inventario inmobiliario:
   * total, disponibles, reservadas, bajo_contrato, alquiladas, vendidas, inactivas y valor de cartera.
   */
  async getPropertiesSummary(companyId: string): Promise<PropertiesSummary> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("properties" as any) as any)
      .select("status, property_type, listing_type, sale_price, rental_price, currency")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error al calcular resumen de propiedades:", error);
      throw new Error(`Error al obtener resumen de inventario: ${error.message}`);
    }

    const properties = (data as PropertyRow[]) || [];

    const byStatus: Record<PropertyStatus, number> = {
      disponible: 0,
      reservada: 0,
      bajo_contrato: 0,
      vendida: 0,
      alquilada: 0,
      inactiva: 0,
    };

    const byType: Record<PropertyType, number> = {
      apartamento: 0,
      casa: 0,
      villa: 0,
      solar_terreno: 0,
      local_comercial: 0,
      nave_industrial: 0,
      oficina: 0,
      edificio: 0,
      finca: 0,
    };

    const byListingType: Record<ListingType, number> = {
      venta: 0,
      alquiler: 0,
      alquiler_amueblado: 0,
      venta_o_alquiler: 0,
    };

    let totalPortfolioValueSale = 0;
    let totalPortfolioValueRental = 0;

    for (const p of properties) {
      const st = p.status as PropertyStatus;
      if (st && byStatus[st] !== undefined) {
        byStatus[st]++;
      }

      const tp = p.property_type as PropertyType;
      if (tp && byType[tp] !== undefined) {
        byType[tp]++;
      }

      const lt = p.listing_type as ListingType;
      if (lt && byListingType[lt] !== undefined) {
        byListingType[lt]++;
      }

      // Solo sumar al valor de cartera propiedades activas o en oferta
      if (st === "disponible" || st === "reservada" || st === "bajo_contrato") {
        if (p.sale_price) {
          totalPortfolioValueSale += Number(p.sale_price);
        }
        if (p.rental_price) {
          totalPortfolioValueRental += Number(p.rental_price);
        }
      }
    }

    return {
      total: properties.length,
      disponibles: byStatus.disponible,
      reservadas: byStatus.reservada,
      bajoContrato: byStatus.bajo_contrato,
      vendidas: byStatus.vendida,
      alquiladas: byStatus.alquilada,
      inactivas: byStatus.inactiva,
      totalPortfolioValueSale: Math.round(totalPortfolioValueSale * 100) / 100,
      totalPortfolioValueRental: Math.round(totalPortfolioValueRental * 100) / 100,
      totalPortfolioValue:
        Math.round((totalPortfolioValueSale + totalPortfolioValueRental) * 100) / 100,
      byStatus,
      byType,
      byListingType,
    };
  }
}

export const propertyService = new PropertyService();
