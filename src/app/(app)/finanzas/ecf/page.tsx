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
            Gestión, emisión y timbrado oficial de comprobantes fiscales electrónicos en tiempo real ante la DGII.
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
            Los comprobantes electrónicos emitidos cuentan con firma digital X.509 avanzada y timbre fiscal verificable mediante código QR y TrackId oficial.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
          RNC Emisor: 1-31-98765-4
        </span>
      </div>

      {/* Tabla de Facturas e-CF */}
      <EcfInvoiceList />

      {/* Modales Reactivos */}
      <EcfModals />
    </div>
  );
}
