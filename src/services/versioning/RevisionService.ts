import "server-only";

/**
 * RevisionService — Servicio genérico de versionamiento de entidades (§118).
 * 
 * Permite versionar cualquier entidad del sistema sin duplicar lógica.
 * Cada modificación crea una nueva revisión con snapshot completo.
 * Las restauraciones NUNCA borran el historial — crean una nueva versión.
 */

import { createClient } from "@/lib/supabase/server";

export type OperationType =
  | "create"
  | "update"
  | "restore"
  | "archive"
  | "cancel"
  | "status_change";

export interface Revision {
  id: string;
  entity_type: string;
  entity_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  operation_type: OperationType;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RevisionDiff {
  field: string;
  before: unknown;
  after: unknown;
}

/**
 * Crea una nueva revisión de una entidad.
 */
export async function createRevision(
  entityType: string,
  entityId: string,
  snapshot: Record<string, unknown>,
  operationType: OperationType,
  reason?: string
): Promise<void> {
  const supabase = await createClient();

  // Obtener el número de versión más alto actual
  const { data: lastRevision } = (await supabase
    .from("entity_revisions" as any)
    .select("version_number")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single()) as { data: any; error: any };

  const nextVersion = (lastRevision?.version_number ?? 0) + 1;

  const { error } = await supabase.from("entity_revisions" as any).insert({
    entity_type: entityType,
    entity_id: entityId,
    version_number: nextVersion,
    snapshot: snapshot as any,
    operation_type: operationType,
    reason: reason ?? null,
  } as any);

  if (error) {
    throw new Error(`Error creando revisión: ${error.message}`);
  }
}

/**
 * Obtiene todas las revisiones de una entidad.
 */
export async function getRevisions(
  entityType: string,
  entityId: string
): Promise<Revision[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("entity_revisions")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error(`Error obteniendo revisiones: ${error.message}`);
  }

  return (data as Revision[]) ?? [];
}

/**
 * Obtiene una revisión específica por número de versión.
 */
export async function getRevision(
  entityType: string,
  entityId: string,
  versionNumber: number
): Promise<Revision | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("entity_revisions")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("version_number", versionNumber)
    .single();

  if (error) {
    return null;
  }

  return data as Revision;
}

/**
 * Compara dos versiones de una entidad y retorna las diferencias.
 * §33, §119, §148 — Vista "Qué cambió"
 */
export function compareRevisions(
  oldSnapshot: Record<string, unknown>,
  newSnapshot: Record<string, unknown>
): RevisionDiff[] {
  const diffs: RevisionDiff[] = [];
  const allKeys = new Set([
    ...Object.keys(oldSnapshot),
    ...Object.keys(newSnapshot),
  ]);

  for (const key of allKeys) {
    // Ignorar campos técnicos
    if (["updated_at", "created_at", "id"].includes(key)) continue;

    const oldVal = oldSnapshot[key];
    const newVal = newSnapshot[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({
        field: key,
        before: oldVal,
        after: newVal,
      });
    }
  }

  return diffs;
}

/**
 * Restaura una entidad a una versión anterior.
 * §34, §107 — REGLA FUNDAMENTAL: Restaurar NUNCA borra el presente.
 * Siempre crea una NUEVA versión basada en la versión restaurada.
 */
export async function restoreRevision(
  entityType: string,
  entityId: string,
  versionNumber: number,
  reason: string
): Promise<Record<string, unknown>> {
  const revision = await getRevision(entityType, entityId, versionNumber);

  if (!revision) {
    throw new Error(
      `Versión ${versionNumber} no encontrada para ${entityType}:${entityId}`
    );
  }

  // Crear nueva versión con los datos restaurados
  await createRevision(
    entityType,
    entityId,
    revision.snapshot,
    "restore",
    `Restaurado desde versión ${versionNumber}. Motivo: ${reason}`
  );

  return revision.snapshot;
}
