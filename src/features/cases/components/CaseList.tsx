"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderKanban,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  User,
  Clock,
  CheckCircle2,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { useCaseStore } from "../store/useCaseStore";
import { Case, CaseArea, CaseStatus } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AREA_BADGES: Record<CaseArea, { label: string; color: string }> = {
  LEGAL: { label: "Legal", color: "bg-blue-100 text-blue-800 border-blue-200" },
  AGRIMENSURA: { label: "Agrimensura", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  INMOBILIARIA: { label: "Inmobiliaria", color: "bg-amber-100 text-amber-800 border-amber-200" },
};

const STATUS_BADGES: Record<CaseStatus, { label: string; color: string }> = {
  EN_PROCESO: { label: "En Proceso", color: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDIENTE: { label: "Pendiente", color: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETADO: { label: "Completado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELADO: { label: "Cancelado", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function CaseList() {
  const { cases, deleteCase } = useCaseStore();
  const [search, setSearch] = React.useState("");
  const [areaFilter, setAreaFilter] = React.useState<string>("TODAS");
  const [statusFilter, setStatusFilter] = React.useState<string>("TODOS");
  const [caseToDelete, setCaseToDelete] = React.useState<Case | null>(null);

  const filteredCases = React.useMemo(() => {
    return cases.filter((c) => {
      const matchSearch =
        search === "" ||
        c.numero.toLowerCase().includes(search.toLowerCase()) ||
        c.titulo.toLowerCase().includes(search.toLowerCase()) ||
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.responsable.toLowerCase().includes(search.toLowerCase());

      const matchArea = areaFilter === "TODAS" || c.area === areaFilter;
      const matchStatus = statusFilter === "TODOS" || c.estado === statusFilter;

      return matchSearch && matchArea && matchStatus;
    });
  }, [cases, search, areaFilter, statusFilter]);

  const handleDeleteConfirm = () => {
    if (!caseToDelete) return;
    deleteCase(caseToDelete.id);
    toast.success(`Expediente ${caseToDelete.numero} eliminado exitosamente.`);
    setCaseToDelete(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mt-6">
      {/* Barra de Filtros */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por número, título, cliente o responsable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8 border-slate-300 bg-white"
            />
          </div>

          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="text-xs h-8 rounded-md border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="TODAS">Todas las Áreas ({cases.length})</option>
            <option value="LEGAL">Legal ({cases.filter((c) => c.area === "LEGAL").length})</option>
            <option value="AGRIMENSURA">Agrimensura ({cases.filter((c) => c.area === "AGRIMENSURA").length})</option>
            <option value="INMOBILIARIA">Inmobiliaria ({cases.filter((c) => c.area === "INMOBILIARIA").length})</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs h-8 rounded-md border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="COMPLETADO">Completado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <Link href="/expedientes/nuevo">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" />
            + Nuevo Expediente
          </Button>
        </Link>
      </div>

      {/* Tabla de Expedientes */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Número / Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Área
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Responsable
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200 text-xs">
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <FolderKanban className="h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No hay expedientes registrados</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {search || areaFilter !== "TODAS" || statusFilter !== "TODOS"
                        ? "No se encontraron expedientes que coincidan con la búsqueda."
                        : "Haga clic en '+ Nuevo Expediente' para crear el primer caso y vincularlo a un cliente y responsable."}
                    </p>
                    <Link href="/expedientes/nuevo" className="mt-3">
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
                        + Crear Primer Expediente
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => {
                const areaInfo = AREA_BADGES[c.area] || { label: c.area, color: "bg-slate-100 text-slate-800" };
                const statusInfo = STATUS_BADGES[c.estado] || { label: c.estado, color: "bg-slate-100 text-slate-800" };

                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-mono font-bold text-slate-900 text-xs">{c.numero}</div>
                      <div className="text-slate-600 text-xs font-medium mt-0.5">{c.titulo}</div>
                      <div className="text-[11px] text-slate-400">{c.tipo}</div>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{c.clientName}</div>
                      <Link
                        href={`/clientes/${c.clienteId}`}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Ver cliente →
                      </Link>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full border ${areaInfo.color}`}
                      >
                        {areaInfo.label}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full border ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>{c.responsable}</span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <Link
                        href={`/expedientes/${c.id}`}
                        className="inline-flex items-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                      >
                        Ver Ficha
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCaseToDelete(c)}
                        className="inline-flex items-center px-2 py-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                        title="Eliminar expediente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Diálogo Confirmar Eliminación */}
      <Dialog open={!!caseToDelete} onOpenChange={() => setCaseToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">Eliminar Expediente</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 pt-2">
              ¿Está seguro que desea eliminar el expediente{" "}
              <strong className="text-slate-900">{caseToDelete?.numero}</strong> (
              {caseToDelete?.titulo})? Se eliminará de la base de datos de casos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCaseToDelete(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
            >
              Eliminar Expediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
