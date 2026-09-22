import "server-only";

/**
 * SnapshotService — Snapshots manuales de expedientes (§32, §120).
 * 
 * Un snapshot representa cómo estaba el expediente exactamente en un momento.
 * Los snapshots son INMUTABLES — no se pueden editar ni eliminar.
 */

import { createClient } from "@/lib/supabase/server";

export interface Snapshot {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  label: string | null;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

/**
 * Crear un snapshot manual de una entidad.
 */
export async function createSnapshot(
  companyId: string,
  entityType: string,
  entityId: string,
  data: Record<string, unknown>,
  label?: string
): Promise<Snapshot> {
  const supabase = await createClient();

  const { data: snapshot, error } = (await supabase
    .from("snapshots" as any)
    .insert({
      company_id: companyId,
      entity_type: entityType,
      entity_id: entityId,
      label: label ?? null,
      data: data as any,
    } as any)
    .select()
    .single()) as { data: any; error: any };

  if (error) {
    throw new Error(`Error creando snapshot: ${error.message}`);
  }

  return snapshot as Snapshot;
}

/**
 * Obtener todos los snapshots de una entidad.
 */
export async function getSnapshots(
  entityType: string,
  entityId: string
): Promise<Snapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("snapshots")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error obteniendo snapshots: ${error.message}`);
  }

  return (data as Snapshot[]) ?? [];
}

/**
 * Obtener un snapshot específico.
 */
export async function getSnapshot(snapshotId: string): Promise<Snapshot | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single();

  if (error) {
    return null;
  }

  return data as Snapshot;
}
