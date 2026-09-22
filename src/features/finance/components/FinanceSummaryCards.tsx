"use client";

import { useFinanceStore } from "../store/useFinanceStore";
import { formatMoney } from "@/lib/utils";
import {
  FileText,
  ArrowDownLeft,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

export function FinanceSummaryCards() {
  const { invoices, payments, expenses } = useFinanceStore();

  // Total Facturado (Facturas emitidas, parciales, pagadas y vencidas, excluyendo borradores y anuladas)
  const totalBilled = invoices
    .filter((inv) => inv.status !== "anulada" && inv.status !== "borrador" && inv.currency === "DOP")
    .reduce((sum, inv) => sum + inv.total, 0);

  // Total Cobrado
  const totalCollected = payments
    .filter((p) => p.currency === "DOP")
    .reduce((sum, p) => sum + p.amount, 0);

  // CxC Pendiente (Cartera de cobro)
  const pendingCxc = invoices
    .filter((inv) => inv.status !== "anulada" && inv.currency === "DOP")
    .reduce((sum, inv) => sum + inv.balance, 0);

  // Gastos del Mes
  const totalExpenses = expenses
    .filter((e) => e.currency === "DOP")
    .reduce((sum, e) => sum + e.amount, 0);

  // Margen Operativo Neto (Cobros - Gastos) y Margen %
  const netOperatingMargin = totalCollected - totalExpenses;
  const marginPercentage =
    totalCollected > 0 ? ((netOperatingMargin / totalCollected) * 100).toFixed(1) : "0.0";

  // Conteo de facturas vencidas para indicador
  const overdueCount = invoices.filter((inv) => inv.status === "vencida").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Facturado */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Facturado
          </span>
          <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
            <FileText className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatMoney(totalBilled, "DOP")}
          </div>
          <div className="mt-1 flex items-center text-xs text-slate-500">
            <span className="font-medium text-slate-700 mr-1">
              {invoices.filter((i) => i.status !== "anulada" && i.status !== "borrador").length}
            </span>{" "}
            comprobantes emitidos
          </div>
        </div>
      </div>

      {/* 2. Cobrado */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Cobrado
          </span>
          <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatMoney(totalCollected, "DOP")}
          </div>
          <div className="mt-1 flex items-center text-xs text-emerald-700 font-medium">
            <span>{payments.length} recaudos liquidados</span>
          </div>
        </div>
      </div>

      {/* 3. CxC Pendiente */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            CxC Pendiente
          </span>
          <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatMoney(pendingCxc, "DOP")}
          </div>
          <div className="mt-1 flex items-center text-xs">
            {overdueCount > 0 ? (
              <span className="text-rose-600 font-medium">
                {overdueCount} facturas en mora
              </span>
            ) : (
              <span className="text-slate-500">Cartera al día</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Gastos del Mes */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Gastos Totales
          </span>
          <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatMoney(totalExpenses, "DOP")}
          </div>
          <div className="mt-1 flex items-center text-xs text-slate-500">
            <span>
              {expenses.filter((e) => e.isReimbursable).length} reembolsables a clientes
            </span>
          </div>
        </div>
      </div>

      {/* 5. Margen Operativo */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Margen Operativo
          </span>
          <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatMoney(netOperatingMargin, "DOP")}
          </div>
          <div className="mt-1 flex items-center text-xs">
            <span
              className={`font-semibold ${
                netOperatingMargin >= 0 ? "text-slate-900" : "text-rose-600"
              }`}
            >
              {marginPercentage}% de rentabilidad
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
