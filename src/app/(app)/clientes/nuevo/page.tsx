import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { ClientForm } from "@/features/clients/components/ClientForm";
import { getClientsContext } from "@/services/clients/context";

export default async function NuevoClientePage() {
  const ctx = await getClientsContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} area="clients" />;
  if (!ctx.can.create) return <NoPermission what="crear clientes" />;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo Cliente</h1>
        <p className="text-slate-500 text-sm">Complete el formulario para registrar un nuevo cliente en el sistema.</p>
      </div>
      <ClientForm />
    </div>
  );
}
