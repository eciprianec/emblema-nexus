"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "../store/useFinanceStore";
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory, Expense } from "../types";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpenseListProps {
  caseId?: string;
  clientId?: string;
  hideHeaderActions?: boolean;
}

export function ExpenseList({
  caseId,
  clientId,
  hideHeaderActions = false,
}: ExpenseListProps) {
  const { expenses, openExpenseCreateModal } = useFinanceStore();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [reimbursableFilter, setReimbursableFilter] = useState<string>("todos");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (caseId && e.caseId !== caseId) return false;
      if (clientId && e.clientId !== clientId) return false;

      if (categoryFilter !== "todas" && e.category !== categoryFilter) return false;

      if (reimbursableFilter === "si" && !e.isReimbursable) return false;
      if (reimbursableFilter === "no" && e.isReimbursable) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        e.description.toLowerCase().includes(term) ||
        (e.supplier && e.supplier.toLowerCase().includes(term)) ||
        (e.receiptNumber && e.receiptNumber.toLowerCase().includes(term)) ||
        (e.caseNumber && e.caseNumber.toLowerCase().includes(term)) ||
        (e.clientName && e.clientName.toLowerCase().includes(term))
      );
    });
  }, [expenses, caseId, clientId, categoryFilter, reimbursableFilter, search]);

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalReimbursable = filteredExpenses
    .filter((e) => e.isReimbursable)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Controles de Búsqueda y Filtros */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar gasto por concepto, proveedor o expediente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          >
            <option value="todas">Todas las categorías</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={reimbursableFilter}
            onChange={(e) => setReimbursableFilter(e.target.value)}
            className="py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900 hidden sm:block"
          >
            <option value="todos">Reembolsable: Todos</option>
            <option value="si">Solo Reembolsables</option>
            <option value="no">Gastos Operativos</option>
          </select>
        </div>

        {!hideHeaderActions && (
          <Button
            onClick={() => openExpenseCreateModal(caseId)}
            size="sm"
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Registrar Gasto
          </Button>
        )}
      </div>

      {/* Tabla de Gastos */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Concepto / Descripción</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">Proveedor / Comprobante</th>
              <th className="py-3 px-4">Expediente / Cliente</th>
              <th className="py-3 px-3 text-center">¿Reembolsable?</th>
              <th className="py-3 px-4 text-right">Monto</th>
              <th className="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <ArrowUpRight className="h-8 w-8 mb-2 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium">No hay gastos registrados</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registre tasas judiciales, notariales, combustible o viáticos asociados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => {
                const categoryLabel =
                  EXPENSE_CATEGORY_LABELS[expense.category] || expense.category;

                return (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    {/* Fecha */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>

                    {/* Descripción */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 max-w-[280px]">
                        {expense.description}
                      </p>
                    </td>

                    {/* Categoría */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {categoryLabel}
                      </span>
                    </td>

                    {/* Proveedor / Comprobante */}
                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-medium truncate max-w-[160px]">
                        {expense.supplier || "N/A"}
                      </div>
                      {expense.receiptNumber && (
                        <div className="text-[10px] font-mono text-slate-500">
                          Doc: {expense.receiptNumber} {expense.ncf ? `(${expense.ncf})` : ""}
                        </div>
                      )}
                    </td>

                    {/* Expediente / Cliente */}
                    <td className="py-3 px-4">
                      {expense.caseNumber ? (
                        <div>
                          <span className="font-mono text-slate-900 font-medium">
                            {expense.caseNumber}
                          </span>
                          {expense.clientName && (
                            <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {expense.clientName}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Gasto Operativo General</span>
                      )}
                    </td>

                    {/* Reembolsable */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {expense.isReimbursable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <UserCheck className="h-3 w-3" />
                          Reembolsable
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          No (Firma)
                        </span>
                      )}
                    </td>

                    {/* Monto */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatMoney(expense.amount, expense.currency)}
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          expense.status === "pagado"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : expense.status === "reembolsado"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {expense.status === "pagado"
                          ? "Pagado"
                          : expense.status === "reembolsado"
                          ? "Reembolsado"
                          : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie de tabla con totales */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          Mostrando <span className="font-semibold text-slate-700">{filteredExpenses.length}</span>{" "}
          gastos registrados
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <div>
            Reembolsable a clientes:{" "}
            <span className="font-bold text-blue-700">
              {formatMoney(totalReimbursable, "DOP")}
            </span>
          </div>
          <div>
            Total Gastos:{" "}
            <span className="font-bold text-slate-900">
              {formatMoney(totalExpenseAmount, "DOP")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
