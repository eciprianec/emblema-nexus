import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { CompanySelect } from "@/features/billing/components/CompanySelect";
import { Pager, parsePage } from "@/features/billing/components/Pager";
import ClientList from "@/features/clients/components/ClientList";
import { CLIENT_PAGE_SIZE, ClientService } from "@/services/clients/ClientService";
import { getClientsContext } from "@/services/clients/context";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; archivados?: string; pagina?: string }>;
}) {
  const ctx = await getClientsContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} area="clients" />;
  if (!ctx.can.view) return <NoPermission what="ver los clientes" />;

  const { q, tipo, archivados, pagina } = await searchParams;
  const type = tipo === "FISICA" || tipo === "JURIDICA" ? tipo : undefined;
  const archived = archivados === "1";
  const page = parsePage(pagina);

  const { clients, total, counts } = await new ClientService(ctx).list({ search: q, type, archived, page });

  return (
    <div className="space-y-4 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Directorio de clientes</h1>
        <CompanySelect companies={ctx.companies} value={ctx.companyId} label="Empresa" />
      </div>
      <ClientList clients={clients} counts={counts} filters={{ q, tipo: type, archivados: archived }} can={ctx.can} />
      <Pager
        path="/clientes"
        params={{ q, tipo: type, archivados: archived ? "1" : undefined }}
        page={page}
        pageSize={CLIENT_PAGE_SIZE}
        total={total}
      />
    </div>
  );
}
