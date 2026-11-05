import "server-only";

import {
  CLIENT_ROW_COLUMNS,
  cleanSearchTerm,
  clientToRow,
  isUuid,
  rowToClient,
  type ClientRow,
} from "@/features/clients/mapping";
import type { ClientEditValues } from "@/features/clients/schemas/client-schema";
import { onlyDigits } from "@/features/clients/schemas/client-schema";
import type { Client, ClientType } from "@/features/clients/types";
import type { ReadyTenantContext } from "@/services/tenant/context";

export const CLIENT_PAGE_SIZE = 50;

export interface ClientFilters {
  search?: string;
  type?: ClientType;
  archived?: boolean;
  page?: number;
}

export interface ClientPage {
  clients: Client[];
  total: number;
  counts: { all: number; fisica: number; juridica: number };
}

function fail(error: { code?: string; message: string } | null): void {
  if (!error) return;
  if (error.code === "42501") {
    // RLS responde en inglés; el guardián de la tabla ya explica el motivo en español.
    throw new Error(error.message.includes("row-level security") ? "Tu rol no permite esta operación sobre clientes." : error.message);
  }
  throw new Error(error.message);
}

export class ClientService {
  constructor(private readonly ctx: ReadyTenantContext) {}

  private get db() {
    return this.ctx.db;
  }

  private get companyId() {
    return this.ctx.companyId;
  }

  async list(filters: ClientFilters = {}): Promise<ClientPage> {
    const page = Math.max(filters.page ?? 1, 1);
    const from = (page - 1) * CLIENT_PAGE_SIZE;

    const scoped = (columns: string, options?: { count: "exact"; head?: boolean }) => {
      const query = this.db.from("clients").select(columns, options).eq("company_id", this.companyId);
      return filters.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null).eq("is_active", true);
    };

    let query = scoped(CLIENT_ROW_COLUMNS, { count: "exact" });
    if (filters.type) {
      query = query.eq("client_type", filters.type === "FISICA" ? "persona_fisica" : "persona_juridica");
    }

    const term = cleanSearchTerm(filters.search);
    if (term) {
      // El RNC y la cédula se guardan sin guiones, pero se suelen escribir con ellos.
      const document = /^[0-9\s-]+$/.test(term) ? onlyDigits(term) : term;
      query = query.or(
        [
          `business_name.ilike.%${term}%`,
          `trade_name.ilike.%${term}%`,
          `first_name.ilike.%${term}%`,
          `last_name.ilike.%${term}%`,
          `email.ilike.%${term}%`,
          `phone.ilike.%${term}%`,
          `passport.ilike.%${term}%`,
          `rnc.ilike.%${document}%`,
          `cedula.ilike.%${document}%`,
        ].join(",")
      );
    }

    const [rows, all, fisica, juridica] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, from + CLIENT_PAGE_SIZE - 1),
      scoped("id", { count: "exact", head: true }),
      scoped("id", { count: "exact", head: true }).eq("client_type", "persona_fisica"),
      scoped("id", { count: "exact", head: true }).eq("client_type", "persona_juridica"),
    ]);
    fail(rows.error);
    fail(all.error);
    fail(fisica.error);
    fail(juridica.error);

    return {
      clients: ((rows.data ?? []) as unknown as ClientRow[]).map(rowToClient),
      total: rows.count ?? 0,
      counts: { all: all.count ?? 0, fisica: fisica.count ?? 0, juridica: juridica.count ?? 0 },
    };
  }

  /** Para los selectores de otras pantallas: activos y con los más recientes primero. */
  async listActive(): Promise<Client[]> {
    const { data, error } = await this.db
      .from("clients")
      .select(CLIENT_ROW_COLUMNS)
      .eq("company_id", this.companyId)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(1000);
    fail(error);
    return ((data ?? []) as unknown as ClientRow[]).map(rowToClient);
  }

  async get(id: string): Promise<Client | null> {
    if (!isUuid(id)) return null;
    const { data, error } = await this.db
      .from("clients")
      .select(CLIENT_ROW_COLUMNS)
      .eq("company_id", this.companyId)
      .eq("id", id)
      .maybeSingle();
    fail(error);
    return data ? rowToClient(data as unknown as ClientRow) : null;
  }

  async create(values: ClientEditValues): Promise<Client> {
    const { data, error } = await this.db
      .from("clients")
      .insert({ ...clientToRow(values), company_id: this.companyId, created_by: this.ctx.userId })
      .select(CLIENT_ROW_COLUMNS)
      .single();
    fail(error);
    return rowToClient(data as unknown as ClientRow);
  }

  async update(id: string, values: ClientEditValues): Promise<Client> {
    const { data, error } = await this.db
      .from("clients")
      .update(clientToRow(values))
      .eq("company_id", this.companyId)
      .eq("id", id)
      .select(CLIENT_ROW_COLUMNS)
      .maybeSingle();
    fail(error);
    // RLS no da error cuando no puede tocar la fila: simplemente no la afecta.
    if (!data) throw new Error("El cliente no existe o tu rol no permite editarlo.");
    return rowToClient(data as unknown as ClientRow);
  }

  /** Un cliente nunca se borra: sus facturas y cobros lo siguen referenciando. */
  async setArchived(id: string, archived: boolean): Promise<void> {
    const { data, error } = await this.db
      .from("clients")
      .update({ is_active: !archived, archived_at: archived ? new Date().toISOString() : null })
      .eq("company_id", this.companyId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    fail(error);
    if (!data) throw new Error("El cliente no existe o tu rol no permite archivarlo.");
  }
}
