"use client";

import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import { QuoteList } from "@/features/finance/components/QuoteList";
import { formatMoney } from "@/lib/utils";
import { FileCheck, CheckCircle2, ArrowRight, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CotizacionesPage() {
  const { quotes, openQuoteCreateModal } = useFinanceStore();

  const totalQuotes = quotes.length;
  const approvedQuotes = quotes.filter((q) => q.status === "aprobada").length;
  const invoicedQuotes = quotes.filter((q) => q.status === "facturada").length;
  const totalAmount = quotes.reduce((sum, q) => sum + q.total, 0);

  const conversionRate =
    totalQuotes > 0 ? (((approvedQuotes + invoicedQuotes) / totalQuotes) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cotizaciones y Propuestas Económicas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Elaboración de presupuestos formales para servicios jurídicos, topográficos e inmobiliarios con conversión directa a factura.
          </p>
        </div>

        <Button
          onClick={() => openQuoteCreateModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shadow-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nueva Cotización
        </Button>
      </div>

      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Presupuestado
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalAmount, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalQuotes} propuestas elaboradas
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Aprobadas por Cliente
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {approvedQuotes}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            Listas para emitir factura
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Facturadas
          </span>
          <div className="text-xl font-bold font-mono text-purple-700 mt-1">
            {invoicedQuotes}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            Con NCF asignado
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Tasa de Conversión
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {conversionRate}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Efectividad comercial
          </div>
        </div>
      </div>

      {/* Lista interactiva de Cotizaciones */}
      <QuoteList />
    </div>
  );
}
