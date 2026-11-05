import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { ClientDetail } from "@/features/clients/components/ClientDetail";
import { ClientFinanceTab } from "@/features/finance/components/ClientFinanceTab";
import { ClientService } from "@/services/clients/ClientService";
import { getClientsContext } from "@/services/clients/context";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getClientsContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} area="clients" />;
  if (!ctx.can.view) return <NoPermission what="ver los clientes" />;

  const { id } = await params;
  const client = await new ClientService(ctx).get(id);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/clientes" className="text-sm text-slate-500 hover:text-slate-800 mb-2 inline-block">
          ← Volver a Clientes
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Detalle del Cliente</h1>
      </div>
      {client ? (
        <ClientDetail client={client} canEdit={ctx.can.edit} financeTab={<ClientFinanceTab clientId={client.id} />} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center mt-6">
          <UserIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" aria-hidden />
          <h3 className="text-base font-semibold text-slate-900">Cliente no encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Este cliente no existe en la empresa activa. Los clientes guardados antes en el navegador no se migraron.
          </p>
          <Button asChild size="sm" className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs">
            <Link href="/clientes">← Volver a Directorio de Clientes</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
