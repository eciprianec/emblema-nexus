"use client";

import { useEffect, useState } from "react";
import { listCasesAction } from "../actions/case-actions";
import Link from "next/link";

export function CaseList() {
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    listCasesAction().then(res => {
      if (res.success) setCases(res.data);
    });
  }, []);

  const getStatusBadge = (estado: string) => {
    switch(estado) {
      case 'EN_PROCESO': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">En Proceso</span>;
      case 'PENDIENTE': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">Pendiente</span>;
      default: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">{estado}</span>;
    }
  };

  const getAreaBadge = (area: string) => {
    return <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{area}</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mt-6">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
        <input type="text" placeholder="Buscar por número o título..." className="border border-slate-300 rounded px-3 py-1.5 text-sm w-64" />
        <select className="border border-slate-300 rounded px-3 py-1.5 text-sm">
          <option value="">Todas las Áreas</option>
          <option value="LEGAL">Legal</option>
          <option value="AGRIMENSURA">Agrimensura</option>
          <option value="INMOBILIARIA">Inmobiliaria</option>
        </select>
      </div>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Número / Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Área</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Responsable</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 text-sm">
          {cases.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                <p className="text-base font-medium text-slate-700">No hay expedientes registrados</p>
                <p className="text-sm mt-1">Haga clic en "+ Nuevo Expediente" para crear el primero.</p>
              </td>
            </tr>
          ) : (
            cases.map(c => (
              <tr key={c.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{c.numero}</div>
                  <div className="text-slate-500 text-xs">{c.titulo}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getAreaBadge(c.area)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(c.estado)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                  {c.responsable}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/expedientes/${c.id}`} className="text-slate-600 hover:text-slate-900">Ver Ficha</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
