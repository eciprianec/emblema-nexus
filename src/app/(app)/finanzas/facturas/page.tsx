"use client";

import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import { InvoiceList } from "@/features/finance/components/InvoiceList";
import { formatMoney } from "@/lib/utils";
import { FileText, CheckCircle2, Clock, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FacturasPage() {
  const { invoices, openInvoiceCreateModal } = useFinanceStore();

  const totalFacturado = invoices
    .filter((i) => i.status !== "anulada" && i.status !== "borrador")
    .reduce((sum, i) => sum + i.total, 0);

  const totalCobrado = invoices
    .filter((i) => i.status !== "anulada")
    .reduce((sum, i) => sum + i.paidAmount, 0);

  const totalPendiente = invoices
    .filter((i) => i.status !== "anulada")
    .reduce((sum, i) => sum + i.balance, 0);

  const totalVencidas = invoices.filter((i) => i.status === "vencida").length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Facturas Comerciales y Comprobantes Fiscales
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Emisión y administración de facturas con NCF (B01, B02, B14, B15), control de vencimientos y saldos.
          </p>
        </div>

        <Button
          onClick={() => openInvoiceCreateModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shadow-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nueva Factura (NCF)
        </Button>
      </div>

      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Facturado
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalFacturado, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {invoices.filter((i) => i.status !== "anulada").length} facturas activas
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Recaudado
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatMoney(totalCobrado, "DOP")}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            {((totalCobrado / (totalFacturado || 1)) * 100).toFixed(0)}% cobrado
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Saldo Pendiente
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalPendiente, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Por cobrar a clientes
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Facturas Vencidas
          </span>
          <div className="text-xl font-bold font-mono text-rose-600 mt-1">
            {totalVencidas}
          </div>
          <div className="text-xs text-rose-600 mt-1">
            Requieren intimación de cobro
          </div>
        </div>
      </div>

      {/* Lista interactiva de Facturas */}
      <InvoiceList />
    </div>
  );
}
