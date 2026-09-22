import { CaseDetail } from "@/features/cases/components/CaseDetail";
import Link from "next/link";

export default async function ExpedienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link href="/expedientes" className="text-sm text-slate-500 hover:text-slate-800 mb-2 inline-block">
            ← Volver a Expedientes
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Ficha del Expediente</h1>
        </div>
        <div className="space-x-2">
          <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 border border-slate-300">
            Imprimir Resumen
          </button>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800">
            Editar Expediente
          </button>
        </div>
      </div>
      <CaseDetail caseId={resolvedParams.id} />
    </div>
  );
}
