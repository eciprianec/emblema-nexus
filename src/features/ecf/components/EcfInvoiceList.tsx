"use client";

import { useState, useMemo } from "react";
import { useEcfStore } from "../store/useEcfStore";
import { ECFType, ECFStatus, ECF_STATUS_MAP, ECF_TYPE_MAP, IssuedECF } from "../types";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Search,
  Printer,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Copy,
  ExternalLink,
  Plus,
  FileCode,
  FileText,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function EcfInvoiceList() {
  const {
    issuedEcfs,
    openPrintModal,
    openTrackIdModal,
    openEmitModal,
  } = useEcfStore();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filteredEcfs = useMemo(() => {
    return issuedEcfs.filter((ecf) => {
      if (typeFilter !== "todos" && ecf.ecfType !== typeFilter) return false;
      if (statusFilter !== "todos" && ecf.dgiiStatus !== statusFilter) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        ecf.eNCF.toLowerCase().includes(term) ||
        ecf.razonSocialComprador.toLowerCase().includes(term) ||
        ecf.rncComprador.toLowerCase().includes(term) ||
        ecf.trackId.toLowerCase().includes(term) ||
        (ecf.invoiceNumber && ecf.invoiceNumber.toLowerCase().includes(term))
      );
    });
  }, [issuedEcfs, typeFilter, statusFilter, search]);

  const handleCopyTrackId = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(trackId);
    toast.success("TrackId copiado al portapapeles");
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Barra de Filtros y Acciones */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por e-NCF (ej. E3100000010), RNC, cliente o TrackId..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="E31">E31 - Crédito Fiscal</option>
            <option value="E32">E32 - Consumo</option>
            <option value="E34">E34 - Nota de Crédito</option>
            <option value="E44">E44 - Régimen Especial</option>
            <option value="E45">E45 - Gubernamental</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          >
            <option value="todos">Todos los Estados</option>
            <option value="aceptado">Aceptado DGII</option>
            <option value="en_proceso">En Proceso</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => openEmitModal()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Emitir Nuevo e-CF
          </Button>
        </div>
      </div>

      {/* Tabla de e-CF Emitidos */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-4">e-NCF</th>
              <th className="py-2.5 px-4">Tipo Comprobante</th>
              <th className="py-2.5 px-4">Receptor / RNC</th>
              <th className="py-2.5 px-4">Fecha Emisión</th>
              <th className="py-2.5 px-4 text-right">Monto Total</th>
              <th className="py-2.5 px-4 text-center">Estado DGII</th>
              <th className="py-2.5 px-4">TrackId</th>
              <th className="py-2.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEcfs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileText className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium">No se encontraron comprobantes electrónicos</p>
                    <p className="text-xs text-slate-400">
                      Modifique los filtros o emita un nuevo comprobante con valor fiscal ante la DGII.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEcfs.map((ecf) => {
                const typeInfo = ECF_TYPE_MAP[ecf.ecfType];
                const statusMeta = ECF_STATUS_MAP[ecf.dgiiStatus];

                return (
                  <tr
                    key={ecf.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    onClick={() => openPrintModal(ecf)}
                  >
                    {/* e-NCF */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 group-hover:text-blue-600 transition-colors">
                          {ecf.eNCF}
                        </span>
                      </div>
                      {ecf.invoiceNumber && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Ref: {ecf.invoiceNumber}
                        </span>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">
                        {typeInfo ? typeInfo.shortName : ecf.ecfType}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Cód. {ecf.ecfType}
                      </span>
                    </td>

                    {/* Receptor */}
                    <td className="py-3 px-4 max-w-[200px] truncate">
                      <span className="font-semibold text-slate-800 block truncate" title={ecf.razonSocialComprador}>
                        {ecf.razonSocialComprador}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        RNC: {ecf.rncComprador}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {formatDate(ecf.fechaEmision)}
                    </td>

                    {/* Monto Total */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                      {formatMoney(ecf.montoTotal, ecf.currency)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ITBIS: {formatMoney(ecf.montoItbis, ecf.currency)}
                      </span>
                    </td>

                    {/* Estado DGII */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                        {statusMeta.label}
                      </span>
                    </td>

                    {/* TrackId */}
                    <td
                      className="py-3 px-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openTrackIdModal(ecf.trackId, ecf)}
                          className="font-mono text-[10px] text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1"
                          title="Haga clic para auditar el estado del TrackId"
                        >
                          {ecf.trackId.slice(0, 13)}...
                        </button>
                        <button
                          onClick={(e) => handleCopyTrackId(ecf.trackId, e)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Copiar TrackId completo"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Cód. Seg: {ecf.codigoSeguridad}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPrintModal(ecf)}
                          className="h-7 px-2 text-[11px] border-slate-300 text-slate-700 hover:bg-slate-100"
                          title="Ver Representación Impresa (RI)"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1" />
                          RI
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTrackIdModal(ecf.trackId, ecf)}
                          className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="Consultar Web Service DGII"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1 text-slate-500" />
                          DGII
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación / Resumen inferior */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Mostrando <span className="font-semibold text-slate-800">{filteredEcfs.length}</span> de{" "}
          <span className="font-semibold text-slate-800">{issuedEcfs.length}</span> comprobantes fiscales electrónicos
        </div>
        <div className="text-[11px] text-slate-400">
          Timbrado XML certificado según norma de la República Dominicana
        </div>
      </div>
    </div>
  );
}
