"use client";

import { useEcfStore } from "../store/useEcfStore";
import { formatMoney } from "@/lib/utils";
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  Inbox,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EcfSummaryCards() {
  const { issuedEcfs, receivedEcfs, config } = useEcfStore();

  const totalIssued = issuedEcfs.length;
  const acceptedCount = issuedEcfs.filter((e) => e.dgiiStatus === "aceptado").length;
  const inProcessCount = issuedEcfs.filter((e) => e.dgiiStatus === "en_proceso").length;
  const rejectedCount = issuedEcfs.filter((e) => e.dgiiStatus === "rechazado").length;

  const totalAmountIssued = issuedEcfs
    .filter((e) => e.dgiiStatus === "aceptado")
    .reduce((sum, e) => sum + e.montoTotal, 0);

  const receivedCount = receivedEcfs.length;
  const receivedPendingApproval = receivedEcfs.filter(
    (e) => e.statusComercial === "pendiente_aprobacion"
  ).length;

  const isProd = config.ambiente === "PROD";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Emitidos */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total e-CF Emitidos
          </span>
          <FileCheck2 className="h-4 w-4 text-slate-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {totalIssued}
          </span>
          <span className="text-xs text-slate-500">comprobantes</span>
        </div>
        <p className="text-xs font-mono font-medium text-slate-700 mt-1">
          {formatMoney(totalAmountIssued, "DOP")}
        </p>
      </div>

      {/* Aceptados por DGII */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Aceptados DGII
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {acceptedCount}
          </span>
          <span className="text-xs text-emerald-700 font-medium">
            {totalIssued > 0 ? `${Math.round((acceptedCount / totalIssued) * 100)}%` : "0%"} efectividad
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Con validez fiscal e impuestos reconocidos</p>
      </div>

      {/* En Proceso */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            En Validación
          </span>
          <Clock className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {inProcessCount}
          </span>
          <span className="text-xs text-amber-700 font-medium">En cola asíncrona</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Esperando timbre fiscal DGII</p>
      </div>

      {/* Rechazados */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rechazados DGII
          </span>
          <AlertTriangle className="h-4 w-4 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {rejectedCount}
          </span>
          <span className="text-xs text-rose-700 font-medium">Requieren corrección</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Inconsistencia en catálogo o NCF</p>
      </div>

      {/* Recibidos de Suplidores */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            e-CF Recibidos
          </span>
          <Inbox className="h-4 w-4 text-slate-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {receivedCount}
          </span>
          {receivedPendingApproval > 0 ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0">
              {receivedPendingApproval} por revisar
            </Badge>
          ) : (
            <span className="text-xs text-slate-500">Al día</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">Buzón de compras y gastos B2B</p>
      </div>
    </div>
  );
}
