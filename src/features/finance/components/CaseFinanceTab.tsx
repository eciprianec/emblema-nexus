"use client";

import Link from "next/link";
import { useFinanceStore } from "../store/useFinanceStore";
import { formatMoney, formatDate } from "@/lib/utils";
import { QUOTE_STATUS_LABELS, EXPENSE_CATEGORY_LABELS } from "../types";
import { FileText, FileCheck, ArrowUpRight, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCaseStore } from "@/features/cases/store/useCaseStore";
import { isUuid } from "@/features/clients/mapping";

interface CaseFinanceTabProps {
  caseId: string;
}

export function CaseFinanceTab({ caseId }: CaseFinanceTabProps) {
  const {
    getCaseFinance,
    openQuoteCreateModal,
    openExpenseCreateModal,
  } = useFinanceStore();
  const { cases } = useCaseStore();

  const {
    quotes,
    expenses,
    totalExpenses,
    reimbursableExpenses,
  } = getCaseFinance(caseId);

  // Los expedientes viejos del navegador pueden apuntar a clientes que no se migraron.
  const clientId = cases.find((c) => c.id === caseId)?.clienteId;
  const realClientId = isUuid(clientId) ? clientId : null;
  const newInvoiceHref = realClientId ? `/finanzas/facturas/nueva?cliente=${realClientId}` : "/finanzas/facturas/nueva";

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Resumen Financiero del Expediente
          </h3>
          <p className="text-xs text-slate-500">
            Cotizaciones vigentes y costos operativos asociados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
            <Link href={newInvoiceHref}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Nueva Factura
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openQuoteCreateModal(undefined, caseId)}
            className="text-xs h-8"
          >
            <FileCheck className="h-3.5 w-3.5 mr-1.5" />
            Cotizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openExpenseCreateModal(caseId)}
            className="text-xs h-8"
          >
            <ArrowUpRight className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
            Cargar Gasto
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas del Caso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Gastos Imputados
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalExpenses, "DOP")}
          </div>
          <div className="text-xs text-blue-700 font-medium mt-1">
            {formatMoney(reimbursableExpenses, "DOP")} reembolsable
          </div>
        </div>
      </div>

      {/* Sección 1: las facturas viven en la base de datos; el expediente, aún en el navegador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
        <p className="text-xs text-slate-600">
          Las facturas y sus cobros se llevan en Facturación. Todavía no se vinculan a un expediente: se consultan por cliente.
        </p>
        <Link
          href={realClientId ? `/clientes/${realClientId}` : "/finanzas/facturas"}
          className="shrink-0 text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
        >
          {realClientId ? "Ver estado de cuenta del cliente" : "Ver facturas"}
        </Link>
      </div>

      {/* Sección 2: Cotizaciones del Caso */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="h-4 w-4 text-slate-600" />
            Cotizaciones y Presupuestos
          </h4>
          <span className="text-xs text-slate-500 font-medium">{quotes.length} cotizaciones</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600 font-semibold text-[10px] uppercase">
                <th className="py-2.5 px-3">No. Cotización</th>
                <th className="py-2.5 px-3">Emisión</th>
                <th className="py-2.5 px-3">Vigencia</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-right">Total Presupuestado</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No hay cotizaciones registradas para este expediente.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => {
                  const statusMeta = QUOTE_STATUS_LABELS[q.status];
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/75">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{q.number}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{formatDate(q.issueDate)}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{formatDate(q.validUntil)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatMoney(q.subtotal, q.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatMoney(q.total, q.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 3: Gastos Imputados al Expediente */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4 text-rose-600" />
            Gastos y Tasas Judiciales / Catastrales Cargadas al Caso
          </h4>
          <span className="text-xs text-slate-500 font-medium">{expenses.length} gastos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600 font-semibold text-[10px] uppercase">
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Concepto</th>
                <th className="py-2.5 px-3">Categoría</th>
                <th className="py-2.5 px-3">Proveedor / Comprobante</th>
                <th className="py-2.5 px-3 text-center">¿Reembolsable?</th>
                <th className="py-2.5 px-3 text-right">Monto</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                    No se han imputado gastos a este expediente.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/75">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{e.description}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {EXPENSE_CATEGORY_LABELS[e.category] || e.category}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {e.supplier || "N/A"} {e.receiptNumber ? `(${e.receiptNumber})` : ""}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {e.isReimbursable ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <UserCheck className="h-3 w-3" />
                          Sí (Cliente)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">No</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatMoney(e.amount, e.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          e.status === "pagado"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
