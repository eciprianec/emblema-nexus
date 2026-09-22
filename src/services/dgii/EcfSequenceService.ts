import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { EcfDocType } from "./EcfXmlBuilder";

export type EcfSequenceRow = Database["public"]["Tables"]["ecf_sequences"]["Row"];
export type EcfSequenceInsert = Database["public"]["Tables"]["ecf_sequences"]["Insert"];
export type EcfSequenceUpdate = Database["public"]["Tables"]["ecf_sequences"]["Update"];

export interface NextEncfResult {
  encf: string;
  sequenceNumber: number;
  expirationDate: string;
  remaining: number;
}

export type EcfSequenceAlertLevel = "ok" | "warning" | "critical";

export interface EcfSequenceMetric {
  id: string;
  companyId: string;
  ecfType: EcfDocType;
  series: string | null;
  currentNumber: number;
  startNumber: number;
  endNumber: number;
  total: number;
  used: number;
  remaining: number;
  percentageRemaining: number;
  expirationDate: string;
  daysUntilExpiration: number;
  isExpired: boolean;
  isExhausted: boolean;
  isActive: boolean;
  alertLevel: EcfSequenceAlertLevel;
  alertMessage: string;
}

export interface CreateSequenceInput {
  ecfType: EcfDocType;
  startNumber: number;
  endNumber: number;
  currentNumber?: number;
  expirationDate: string; // ISO o YYYY-MM-DD
  series?: string | null;
  isActive?: boolean;
}

export class EcfSequenceService {
  /**
   * Formatea un e-NCF según la norma DGII (Prefijo 'E' + 2 dígitos de tipo + secuencia numérica rellenada con ceros).
   * Por ejemplo: E3100000001 (8 dígitos de secuencia) o E310000000001 (10 dígitos).
   */
  public static formatEncf(ecfType: string, sequenceNumber: number, padDigits: number = 8): string {
    const numericType = ecfType.replace(/^E/, "");
    const padded = String(sequenceNumber).padStart(padDigits, "0");
    return `E${numericType}${padded}`;
  }

  /**
   * Obtiene y avanza de forma atómica el siguiente e-NCF disponible para una empresa y tipo de comprobante.
   * Utiliza control de concurrencia optimista (optimistic locking) para evitar duplicación de secuencias fiscales.
   */
  public static async getNextEncf(
    companyId: string,
    ecfType: EcfDocType,
    customClient?: SupabaseClient<Database>
  ): Promise<NextEncfResult> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      // 1. Consultar la secuencia activa
      const { data: sequence, error: fetchError } = await db
        .from("ecf_sequences")
        .select("*")
        .eq("company_id", companyId)
        .eq("ecf_type", ecfType)
        .eq("is_active", true)
        .single();

      if (fetchError || !sequence) {
        throw new Error(
          `No se encontró una secuencia activa para el comprobante ${ecfType}. Configure la secuencia en el panel fiscal.`
        );
      }

      const seq = sequence as EcfSequenceRow;

      // 2. Verificar fecha de expiración autorizada por la DGII
      const expirationDate = new Date(seq.expiration_date);
      const today = new Date();
      // Eliminar horas para comparación estricta de fechas
      today.setHours(0, 0, 0, 0);

      if (expirationDate < today) {
        throw new Error(
          `La secuencia autorizada por la DGII para el tipo ${ecfType} ha vencido el ${seq.expiration_date}. Debe registrar una nueva autorización fiscal.`
        );
      }

      // 3. Verificar si la secuencia se ha agotado
      if (seq.current_number > seq.end_number) {
        throw new Error(
          `La secuencia autorizada para el tipo ${ecfType} se ha agotado. Rango autorizado: ${seq.start_number} al ${seq.end_number}.`
        );
      }

      const assignedNumber = seq.current_number;
      const nextNumber = assignedNumber + 1;

      // 4. Avance atómico con control de concurrencia optimista
      const { data: updated, error: updateError } = await db
        .from("ecf_sequences")
        .update({
          current_number: nextNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", seq.id)
        .eq("current_number", assignedNumber)
        .select()
        .single();

      if (updateError || !updated) {
        // Conflicto de concurrencia con otra transacción simultánea: reintentar
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
          continue;
        }
        throw new Error(
          `Conflicto concurrente al asignar la secuencia para el tipo ${ecfType}. Por favor intente de nuevo.`
        );
      }

      // 5. Determinar longitud de secuencia (8 dígitos según formato común o 10 si end_number > 99,999,999)
      const padDigits = seq.end_number > 99999999 ? 10 : 8;
      const encf = this.formatEncf(ecfType, assignedNumber, padDigits);
      const remaining = Math.max(0, seq.end_number - nextNumber + 1);

      return {
        encf,
        sequenceNumber: assignedNumber,
        expirationDate: seq.expiration_date,
        remaining,
      };
    }

    throw new Error(`No fue posible avanzar la secuencia fiscal para ${ecfType} tras ${maxRetries} intentos.`);
  }

  /**
   * Obtiene las métricas de disponibilidad y alertas preventivas de secuencias de e-CF.
   */
  public static async getSequenceMetrics(
    companyId: string,
    ecfType?: EcfDocType,
    customClient?: SupabaseClient<Database>
  ): Promise<EcfSequenceMetric[]> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    let query = db.from("ecf_sequences").select("*").eq("company_id", companyId);

    if (ecfType) {
      query = query.eq("ecf_type", ecfType);
    }

    const { data: sequences, error } = await query;

    if (error || !sequences) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (sequences as EcfSequenceRow[]).map((seq) => {
      const total = Math.max(1, seq.end_number - seq.start_number + 1);
      const used = Math.max(0, seq.current_number - seq.start_number);
      const remaining = Math.max(0, seq.end_number - seq.current_number + 1);
      const percentageRemaining = Math.max(0, Math.min(100, (remaining / total) * 100));

      const expDate = new Date(seq.expiration_date);
      expDate.setHours(0, 0, 0, 0);

      const diffTime = expDate.getTime() - today.getTime();
      const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const isExpired = daysUntilExpiration <= 0;
      const isExhausted = remaining <= 0;
      const isActive = seq.is_active ?? true;

      // Calcular nivel de alerta y mensaje
      let alertLevel: EcfSequenceAlertLevel = "ok";
      let alertMessage = "Secuencia operativa dentro de parámetros normales.";

      if (!isActive) {
        alertLevel = "warning";
        alertMessage = "Secuencia inactiva o deshabilitada manualmente.";
      } else if (isExpired) {
        alertLevel = "critical";
        alertMessage = `Secuencia vencida el ${seq.expiration_date}. No permite emitir nuevos e-CF.`;
      } else if (isExhausted) {
        alertLevel = "critical";
        alertMessage = `Secuencia totalmente agotada (0 disponibles). Requiere solicitar nuevos números en DGII.`;
      } else if (remaining <= 10 || percentageRemaining <= 5 || daysUntilExpiration <= 7) {
        alertLevel = "critical";
        alertMessage = `Alerta crítica: ${remaining} comprobantes restantes (${percentageRemaining.toFixed(1)}%) o vence en ${daysUntilExpiration} días.`;
      } else if (remaining <= 50 || percentageRemaining <= 15 || daysUntilExpiration <= 30) {
        alertLevel = "warning";
        alertMessage = `Alerta preventiva: Quedan ${remaining} comprobantes (${percentageRemaining.toFixed(1)}%). Vence en ${daysUntilExpiration} días.`;
      }

      return {
        id: seq.id,
        companyId: seq.company_id,
        ecfType: seq.ecf_type as EcfDocType,
        series: seq.series,
        currentNumber: seq.current_number,
        startNumber: seq.start_number,
        endNumber: seq.end_number,
        total,
        used,
        remaining,
        percentageRemaining: Math.round(percentageRemaining * 10) / 10,
        expirationDate: seq.expiration_date,
        daysUntilExpiration,
        isExpired,
        isExhausted,
        isActive,
        alertLevel,
        alertMessage,
      };
    });
  }

  /**
   * Crea una nueva secuencia de e-CF para la empresa.
   */
  public static async createSequence(
    companyId: string,
    input: CreateSequenceInput,
    customClient?: SupabaseClient<Database>
  ): Promise<EcfSequenceRow> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    const { data, error } = await db
      .from("ecf_sequences")
      .insert({
        company_id: companyId,
        ecf_type: input.ecfType,
        start_number: input.startNumber,
        end_number: input.endNumber,
        current_number: input.currentNumber ?? input.startNumber,
        expiration_date: input.expirationDate,
        series: input.series ?? null,
        is_active: input.isActive ?? true,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al registrar secuencia para ${input.ecfType}: ${error?.message || "Error desconocido"}`);
    }

    return data as EcfSequenceRow;
  }

  /**
   * Actualiza una secuencia de e-CF existente.
   */
  public static async updateSequence(
    companyId: string,
    sequenceId: string,
    updates: Partial<EcfSequenceUpdate>,
    customClient?: SupabaseClient<Database>
  ): Promise<EcfSequenceRow> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    const { data, error } = await db
      .from("ecf_sequences")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sequenceId)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al actualizar la secuencia ${sequenceId}: ${error?.message || "Error desconocido"}`);
    }

    return data as EcfSequenceRow;
  }
}
