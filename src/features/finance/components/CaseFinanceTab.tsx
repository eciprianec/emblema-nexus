"use client";

import { useFinanceStore } from "../store/useFinanceStore";
import { formatMoney, formatDate } from "@/lib/utils";
import { INVOICE_STATUS_LABELS, QUOTE_STATUS_LABELS, EXPENSE_CATEGORY_LABELS } from "../types";
import {
  FileText,
  FileCheck,
  ArrowUpRight,
  Clock,
  Plus,
  CreditCard,
  UserCheck,
  Eye,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CaseFinanceTabProps {
  caseId: string;
}

export function CaseFinanceTab({ caseId }: CaseFinanceTabProps) {
  const {
    getCaseFinance,
    openInvoiceCreateModal,
    openQuoteCreateModal,
    openExpenseCreateModal,
    openInvoiceDetail,
    openPaymentCreateModal,
  } = useFinanceStore();

  const {
    invoices,
    quotes,
    expenses,
    totalBilled,
    totalCollected,
    pendingBalance,
    totalExpenses,
    reimbursableExpenses,
  } = getCaseFinance(caseId);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Resumen Financiero del Expediente
          </h3>
          <p className="text-xs text-slate-500">
            Estado de cuenta, facturación emitida, cotizaciones vigentes y costos operativos asociados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => openInvoiceCreateModal(undefined, caseId)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Nueva Factura
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
            Total Facturado
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalBilled, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {invoices.length} facturas vinculadas
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Recaudado
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatMoney(totalCollected, "DOP")}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            Fondos liquidados en cuenta
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Saldo Pendiente (CxC)
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            <span className={pendingBalance > 0 ? "text-rose-600 font-bold" : "text-slate-900"}>
              {formatMoney(pendingBalance, "DOP")}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Por cobrar al cliente
          </div>
        </div>

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

      {/* Sección 1: Facturas del Caso */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-slate-600" />
            Facturas Emitidas para este Expediente
          </h4>
          <span className="text-xs text-slate-500 font-medium">{invoices.length} facturas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600 font-semibold text-[10px] uppercase">
                <th className="py-2.5 px-3">No. Factura</th>
                <th className="py-2.5 px-3">NCF</th>
                <th className="py-2.5 px-3">Emisión</th>
                <th className="py-2.5 px-3">Vencimiento</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No se han emitido facturas para este expediente aún.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusMeta = INVOICE_STATUS_LABELS[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/75">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.number}</td>
                      <td className="py-2.5 px-3 text-slate-600">{inv.ncf}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{formatDate(inv.issueDate)}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{formatDate(inv.dueDate)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatMoney(inv.total, inv.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={inv.balance > 0 ? "text-rose-600 font-bold" : "text-slate-400"}>
                          {formatMoney(inv.balance, inv.currency)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInvoiceDetail(inv)}
                            className="h-6 px-2 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          {inv.balance > 0 && inv.status !== "anulada" && (
                            <Button
                              size="sm"
                              onClick={() => openPaymentCreateModal(inv)}
                              className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Cobrar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
