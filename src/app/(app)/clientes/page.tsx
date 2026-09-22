import ClientList from "@/features/clients/components/ClientList";

export default function ClientesPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Directorio de Clientes</h1>
        <a href="/clientes/nuevo" className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800">
          + Nuevo Cliente
        </a>
      </div>
      <ClientList />
    </div>
  );
}
