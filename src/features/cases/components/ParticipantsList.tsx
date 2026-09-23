"use client";

import { useState } from "react";

export function ParticipantsList({ caseId }: { caseId: string }) {
  const [participants] = useState<Array<{ id: number; name: string; role: string; contact: string }>>([]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-slate-900">Participantes del Expediente</h3>
        <button className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-800">
          + Agregar Participante
        </button>
      </div>
      
      <div className="border border-slate-200 rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contacto</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {participants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                  No hay participantes registrados en este expediente.
                </td>
              </tr>
            ) : (
              participants.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">{p.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.contact}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <button className="text-red-600 hover:text-red-800 text-xs">Remover</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
