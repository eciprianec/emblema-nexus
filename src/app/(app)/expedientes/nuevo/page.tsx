import { CaseWizard } from "@/features/cases/components/CaseWizard";

export default function NuevoExpedientePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo Expediente</h1>
        <p className="text-slate-500 text-sm">Siga el asistente para crear un nuevo expediente e inicializar su proceso.</p>
      </div>
      <CaseWizard />
    </div>
  );
}
