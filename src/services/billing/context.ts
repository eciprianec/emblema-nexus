import "server-only";

import { getTenantContext, type ReadyTenantContext, type TenantContext } from "@/services/tenant/context";

export { ACTIVE_COMPANY_COOKIE } from "@/services/tenant/context";

export interface BillingPermissions {
  view: boolean;
  create: boolean;
  void: boolean;
  collect: boolean;
  voidPayment: boolean;
  configure: boolean;
}

export type BillingContext =
  | Exclude<TenantContext, { status: "ready" }>
  | (ReadyTenantContext & { can: BillingPermissions });

/**
 * Resuelve quién factura y para qué empresa. Un comprobante fiscal necesita un
 * usuario identificable y las reglas de seguridad de la base de datos.
 */
export async function getBillingContext(): Promise<BillingContext> {
  const tenant = await getTenantContext();
  if (tenant.status !== "ready") return tenant;

  const { has } = tenant;
  const [view, create, edit, voidDoc, collect, voidReceivable, receivableView, configure, ecfEmit] = await Promise.all([
    has("finance.view"),
    has("finance.create"),
    has("finance.edit"),
    has("finance.void"),
    has("receivables.collect"),
    has("receivables.void"),
    has("receivables.view"),
    has("config.manage"),
    has("ecf.emit"),
  ]);

  return {
    ...tenant,
    can: {
      view: view || receivableView,
      create: create || edit || ecfEmit,
      void: voidDoc,
      collect: collect || create,
      voidPayment: voidReceivable || voidDoc,
      configure,
    },
  };
}

export type ReadyBillingContext = Extract<BillingContext, { status: "ready" }>;
