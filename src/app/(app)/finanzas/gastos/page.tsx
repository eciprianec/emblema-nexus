"use client";

import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import { ExpenseList } from "@/features/finance/components/ExpenseList";
import { formatMoney } from "@/lib/utils";
import { ArrowUpRight, UserCheck, Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GastosPage() {
  const { expenses, openExpenseCreateModal } = useFinanceStore();

  const totalGastos = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalReembolsables = expenses
    .filter((e) => e.isReimbursable)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOperativos = totalGastos - totalReembolsables;

  const totalTasas = expenses
    .filter((e) => e.category === "tasas_judiciales" || e.category === "agrimensura_catastrales")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gastos Operativos y Tasas de Ley
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Control de egresos, tasas catastrales, sellos judiciales, viáticos de agrimensura y costos reembolsables.
          </p>
        </div>

        <Button
          onClick={() => openExpenseCreateModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shadow-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Registrar Gasto
        </Button>
      </div>

      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Gastos del Período
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalGastos, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {expenses.length} egresos contabilizados
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Reembolsables (A Clientes)
          </span>
          <div className="text-xl font-bold font-mono text-blue-700 mt-1">
            {formatMoney(totalReembolsables, "DOP")}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {((totalReembolsables / (totalGastos || 1)) * 100).toFixed(0)}% imputable a expedientes
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Gastos Operativos Firma
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalOperativos, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Costos fijos y suministros
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Tasas Catastrales y Judiciales
          </span>
          <div className="text-xl font-bold font-mono text-amber-800 mt-1">
            {formatMoney(totalTasas, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Sellos de ley y radicación JI
          </div>
        </div>
      </div>

      {/* Lista interactiva de Gastos */}
      <ExpenseList />
    </div>
  );
}
