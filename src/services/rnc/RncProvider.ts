import "server-only";

/**
 * RncProvider — Interfaz para consulta de RNC (§10).
 * 
 * NO acoplar el sistema a una API pública de DGII que no existe oficialmente.
 * La arquitectura permite múltiples fuentes:
 * - Fuente oficial (si se hace disponible)
 * - Listado oficial importado
 * - Proveedor API futuro
 * - Consulta manual
 */

import { createClient } from "@/lib/supabase/server";

export interface RncResult {
  rnc: string;
  businessName: string;
  tradeName: string | null;
  status: string | null;
  economicActivity: string | null;
  taxRegime: string | null;
  source: string;
  verifiedAt: string;
  rawData?: Record<string, unknown>;
}

export interface IRncProvider {
  /** Nombre del proveedor */
  readonly name: string;

  /** Verificar si el proveedor está disponible */
  isAvailable(): Promise<boolean>;

  /** Consultar datos de un RNC */
  lookup(rnc: string): Promise<RncResult | null>;
}

/**
 * Proveedor manual — Busca en la tabla local rnc_records.
 */
export class RncLocalProvider implements IRncProvider {
  readonly name = "Base de datos local";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async lookup(rnc: string): Promise<RncResult | null> {
    const supabase = await createClient();

    const clean = rnc.replace(/[-\s]/g, "");
    const { data } = (await supabase
      .from("rnc_records" as any)
      .select("*")
      .eq("rnc", clean)
      .single()) as { data: any; error: any };

    if (!data) return null;

    return {
      rnc: data.rnc,
      businessName: data.business_name,
      tradeName: data.trade_name,
      status: data.status,
      economicActivity: data.economic_activity,
      taxRegime: data.tax_regime,
      source: "local",
      verifiedAt: data.verified_at ?? new Date().toISOString(),
      rawData: data.raw_data as Record<string, unknown> | undefined,
    };
  }
}

/**
 * Obtener proveedor de RNC configurado.
 * Se puede extender con proveedores API externos en el futuro.
 */
export function getRncProvider(): IRncProvider {
  return new RncLocalProvider();
}

/**
 * Validar formato de RNC dominicano.
 */
export function isValidRncFormat(rnc: string): boolean {
  const clean = rnc.replace(/[-\s]/g, "");
  return clean.length === 9 && /^\d{9}$/.test(clean);
}
