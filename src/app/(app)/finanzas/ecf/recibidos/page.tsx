"use client";

import { EcfReceptionsList } from "@/features/ecf/components/EcfReceptionsList";
import { EcfNav } from "@/features/ecf/components/EcfNav";
import { EcfModals } from "@/features/ecf/components/EcfModals";
import { useEcfStore } from "@/features/ecf/store/useEcfStore";
import { formatMoney } from "@/lib/utils";
import { Inbox, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function EcfRecibidosPage() {
  const { receivedEcfs } = useEcfStore();

  const totalRecibidos = receivedEcfs.length;
  const aprobados = receivedEcfs.filter((r) => r.statusComercial === "aprobado_comercial").length;
  const pendientes = receivedEcfs.filter((r) => r.statusComercial === "pendiente_aprobacion").length;
  const rechazados = receivedEcfs.filter((r) => r.statusComercial === "rechazado_comercial").length;

  const totalMontoRecibido = receivedEcfs
    .filter((r) => r.statusComercial !== "rechazado_comercial")
    .reduce((sum, r) => sum + r.montoTotal, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Buzón de e-CF Recibidos de Suplidores
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
              Intercambio Electrónico B2B
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Recepción automática de comprobantes emitidos a nombre de Emblema Nexus S.R.L. (RNC 131987654), emisión de acuses de recibo y aprobación comercial para pago.
          </p>
        </div>
      </div>

      {/* Subnavegación e-CF */}
      <EcfNav />

      {/* Métricas de Recepción */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Comprobantes
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalRecibidos}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monto: <span className="font-mono font-medium text-slate-800">{formatMoney(totalMontoRecibido, "DOP")}</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pendientes de Aprobación
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {pendientes}
          </div>
          <p className="text-xs text-slate-500 mt-1">Requieren conformidad comercial</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Aprobados para Pago
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {aprobados}
          </div>
          <p className="text-xs text-slate-500 mt-1">Conformidad técnica y fiscal otorgada</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rechazados Comercialmente
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {rechazados}
          </div>
          <p className="text-xs text-slate-500 mt-1">Con notificación de discrepancia enviada</p>
        </div>
      </div>

      {/* Tabla de Buzón */}
      <EcfReceptionsList />

      {/* Modales */}
      <EcfModals />
    </div>
  );
}
