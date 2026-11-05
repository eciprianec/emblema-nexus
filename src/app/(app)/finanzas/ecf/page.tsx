"use client";

import { EcfSummaryCards } from "@/features/ecf/components/EcfSummaryCards";
import { EcfInvoiceList } from "@/features/ecf/components/EcfInvoiceList";
import { EcfNav } from "@/features/ecf/components/EcfNav";
import { EcfModals } from "@/features/ecf/components/EcfModals";
import { ShieldCheck, Info } from "lucide-react";

export default function EcfMainPage() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Facturación Electrónica e-CF
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
              Ley No. 32-23 (DGII)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registros simulados guardados en este navegador. Desde aquí no se emiten comprobantes.
          </p>
        </div>
      </div>

      {/* Subnavegación e-CF */}
      <EcfNav />

      {/* Tarjetas de Métricas */}
      <EcfSummaryCards />

      {/* Banner Informativo Normativo */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            Los comprobantes fiscales se crean y se registran en Facturación; esta lista no tiene firma, timbre ni TrackId reales.
          </span>
        </div>
      </div>

      {/* Tabla de Facturas e-CF */}
      <EcfInvoiceList />

      {/* Modales Reactivos */}
      <EcfModals />
    </div>
  );
}
