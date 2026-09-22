"use client";

import { useFinanceStore } from "../store/useFinanceStore";
import { formatMoney, formatDate } from "@/lib/utils";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "../types";
import {
  FileText,
  CreditCard,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientFinanceTabProps {
  clientId: string;
}

export function ClientFinanceTab({ clientId }: ClientFinanceTabProps) {
  const {
    getClientFinance,
    openInvoiceCreateModal,
    openPaymentCreateModal,
    openInvoiceDetail,
  } = useFinanceStore();

  const { invoices, payments, totalBilled, totalPaid, balance } =
    getClientFinance(clientId);

  const pendingInvoice = invoices.find((inv) => inv.balance > 0 && inv.status !== "anulada");

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Estado de Cuenta y Facturación del Cliente
          </h3>
          <p className="text-xs text-slate-500">
            Historial de facturas comerciales con NCF, recaudos recibidos y saldo actual de cartera.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => openInvoiceCreateModal(clientId)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Nueva Factura
          </Button>

          {balance > 0 && (
            <Button
              size="sm"
              onClick={() => openPaymentCreateModal(pendingInvoice)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Registrar Cobro
            </Button>
          )}
        </div>
      </div>

      {/* Métricas del Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Facturado
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalBilled, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {invoices.length} facturas emitidas históricamente
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Pagado
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatMoney(totalPaid, "DOP")}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            {payments.length} recibos de cobro aplicados
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Saldo Actual (CxC)
          </span>
          <div className="text-xl font-bold font-mono mt-1">
            <span className={balance > 0 ? "text-rose-600 font-extrabold" : "text-emerald-700"}>
              {formatMoney(balance, "DOP")}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {balance > 0 ? "Pendiente de cobro" : "Cliente al día"}
          </div>
        </div>
      </div>

      {/* Facturas del Cliente */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-slate-600" />
            Facturas Emitidas
          </h4>
          <span className="text-xs text-slate-500 font-medium">{invoices.length} facturas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600 font-semibold text-[10px] uppercase">
                <th className="py-2.5 px-3">No. Factura</th>
                <th className="py-2.5 px-3">NCF</th>
                <th className="py-2.5 px-3">Expediente</th>
                <th className="py-2.5 px-3">Emisión</th>
                <th className="py-2.5 px-3">Vencimiento</th>
                <th className="py-2.5 px-3 text-right">Total Factura</th>
                <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No se han registrado facturas para este cliente.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusMeta = INVOICE_STATUS_LABELS[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/75">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.number}</td>
                      <td className="py-2.5 px-3 text-slate-600">{inv.ncf}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {inv.caseNumber || "General"}
                      </td>
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

      {/* Pagos Recibidos del Cliente */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            Recibos de Pago y Recaudaciones
          </h4>
          <span className="text-xs text-slate-500 font-medium">{payments.length} pagos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600 font-semibold text-[10px] uppercase">
                <th className="py-2.5 px-3">No. Recibo</th>
                <th className="py-2.5 px-3">Factura Imputada</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Método</th>
                <th className="py-2.5 px-3">Referencia</th>
                <th className="py-2.5 px-3 text-right">Monto Pagado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No se han registrado pagos para este cliente aún.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/75">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{p.receiptNumber}</td>
                    <td className="py-2.5 px-3 text-slate-700">{p.invoiceNumber}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{formatDate(p.paymentDate)}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">
                      {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{p.referenceNumber || "-"}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {formatMoney(p.amount, p.currency)}
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
