import { redirect } from "next/navigation";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

/** Estas pantallas son una simulación: con e-CF reales por proveedor, mostrarían que no hay ninguno. */
export default async function EcfSimulationLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getBillingContext();
  if (ctx.status === "ready" && ctx.can.view) {
    const settings = await new BillingService(ctx).getSettings();
    if (settings?.emission_mode === "ecf_proveedor") redirect("/finanzas/facturas");
  }
  return children;
}
