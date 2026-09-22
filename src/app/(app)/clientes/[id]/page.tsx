import { ClientDetail } from "@/features/clients/components/ClientDetail";
import Link from "next/link";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link href="/clientes" className="text-sm text-slate-500 hover:text-slate-800 mb-2 inline-block">
            ← Volver a Clientes
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Detalle del Cliente</h1>
        </div>
        <div>
          <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 border border-slate-300 mr-2">
            Editar
          </button>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800">
            Nuevo Expediente
          </button>
        </div>
      </div>
      <ClientDetail clientId={resolvedParams.id} />
    </div>
  );
}
