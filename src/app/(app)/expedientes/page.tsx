import { CaseList } from "@/features/cases/components/CaseList";

export default function ExpedientesPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Expedientes</h1>
        <a href="/expedientes/nuevo" className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800">
          + Nuevo Expediente
        </a>
      </div>
      <CaseList />
    </div>
  );
}
