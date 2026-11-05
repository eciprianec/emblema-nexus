import "server-only";

import { getTenantContext, type ReadyTenantContext, type TenantContext } from "@/services/tenant/context";

export interface ClientPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  archive: boolean;
}

export type ClientsContext =
  | Exclude<TenantContext, { status: "ready" }>
  | (ReadyTenantContext & { can: ClientPermissions });

export async function getClientsContext(): Promise<ClientsContext> {
  const tenant = await getTenantContext();
  if (tenant.status !== "ready") return tenant;

  const { has } = tenant;
  const [view, create, edit, archive] = await Promise.all([
    has("clients.view"),
    has("clients.create"),
    has("clients.edit"),
    has("clients.archive"),
  ]);

  return { ...tenant, can: { view, create, edit, archive } };
}

export type ReadyClientsContext = Extract<ClientsContext, { status: "ready" }>;
