"use client";

import { useEffect, useState } from "react";
import { listClientsAction } from "../actions/client-actions";

export default function ClientList() {
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    listClientsAction().then(res => {
      if (res.success) setClients(res.data);
    });
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
        <input type="text" placeholder="Buscar cliente..." className="border border-slate-300 rounded px-3 py-1.5 text-sm w-64" />
        <select className="border border-slate-300 rounded px-3 py-1.5 text-sm">
          <option value="">Todos los tipos</option>
          <option value="FISICA">Persona Física</option>
          <option value="JURIDICA">Persona Jurídica</option>
        </select>
      </div>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre / Razón Social</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 text-sm">
          {clients.map(client => (
            <tr key={client.id}>
              <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                {client.type === "FISICA" ? `${client.nombres} ${client.apellidos}` : client.razonSocial}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${client.type === 'FISICA' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {client.type === "FISICA" ? "Física" : "Jurídica"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                {client.email}<br/>{client.telefono}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href={`/clientes/${client.id}`} className="text-slate-600 hover:text-slate-900">Ver Detalles</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
