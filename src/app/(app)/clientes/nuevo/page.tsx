import { ClientForm } from "@/features/clients/components/ClientForm";

export default function NuevoClientePage() {
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
