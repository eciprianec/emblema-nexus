import { redirect } from "next/navigation";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

/** Con e-CF reales por proveedor, la configuración que vale es la de Facturación. */
export default async function EcfConfigurationLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getBillingContext();
  if (ctx.status === "ready" && ctx.can.view) {
    const settings = await new BillingService(ctx).getSettings();
    if (settings?.emission_mode === "ecf_proveedor") redirect("/finanzas/facturas/configuracion");
  }
  return children;
}
