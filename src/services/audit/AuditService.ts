import "server-only";

/**
 * AuditService — Servicio centralizado de auditoría (§121).
 * 
 * Registra quién hizo qué, cuándo y por qué.
 * Complementa el versionamiento (que registra cómo estaba el registro).
 */

import { createClient } from "@/lib/supabase/server";

export interface AuditEntry {
  id: number;
  company_id: string | null;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditFilters {
  companyId?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Registra una entrada en el log de auditoría.
 * Esto se usa además de los triggers automáticos para acciones
 * que requieren contexto adicional (motivo, IP, etc.)
 */
export async function logAuditEntry(entry: {
  companyId?: string;
  entityType: string;
  entityId: string;
  action: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const supabase = await createClient();

  // Calcular diff si hay old y new data
  let diff: Record<string, unknown> | null = null;
  if (entry.oldData && entry.newData) {
    diff = {};
    for (const key of Object.keys(entry.newData)) {
      if (
        JSON.stringify(entry.oldData[key]) !==
        JSON.stringify(entry.newData[key])
      ) {
        diff[key] = entry.newData[key];
      }
    }
  }

  // Insertar directamente en audit.logs usando RPC ya que es un esquema separado
  const { error } = await supabase.rpc("insert_audit_log", {
    p_company_id: entry.companyId ?? null,
    p_entity_type: entry.entityType,
    p_entity_id: entry.entityId,
    p_action: entry.action,
    p_old_data: (entry.oldData as any) ?? null,
    p_new_data: (entry.newData as any) ?? null,
    p_diff: (diff as any) ?? null,
    p_reason: entry.reason ?? null,
    p_ip_address: entry.ipAddress ?? null,
    p_user_agent: entry.userAgent ?? null,
  } as any);

  if (error) {
    // No lanzar error para no interrumpir la operación principal
    console.error("Error registrando auditoría:", error.message);
  }
}

/**
 * Consulta el log de auditoría con filtros.
 */
export async function queryAuditLog(
  filters: AuditFilters
): Promise<{ data: AuditEntry[]; total: number }> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Nota: audit.logs no está directamente accesible via el client SDK normal,
  // usamos una vista o RPC para consultar
  let query = supabase
    .from("audit_logs_view")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.companyId) {
    query = query.eq("company_id", filters.companyId);
  }
  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.entityId) {
    query = query.eq("entity_id", filters.entityId);
  }
  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Error consultando auditoría: ${error.message}`);
  }

  return {
    data: (data as AuditEntry[]) ?? [],
    total: count ?? 0,
  };
}
