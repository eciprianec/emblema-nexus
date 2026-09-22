"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import { formatMoney, formatDate } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, PaymentMethod } from "@/features/finance/types";
import {
  ArrowDownLeft,
  CreditCard,
  Search,
  Building2,
  Calendar,
  Eye,
  Plus,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PagosPage() {
  const { payments, invoices, openPaymentCreateModal, openInvoiceDetail } =
    useFinanceStore();

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("todos");

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter !== "todos" && p.paymentMethod !== methodFilter) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        p.receiptNumber.toLowerCase().includes(term) ||
        p.invoiceNumber.toLowerCase().includes(term) ||
        p.clientName.toLowerCase().includes(term) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(term))
      );
    });
  }, [payments, methodFilter, search]);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const transferCollected = payments
    .filter((p) => p.paymentMethod === "transferencia")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cobros, Recaudos e Ingresos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro de recibos de caja, transferencias bancarias, cheques y aplicaciones de pago a facturas.
          </p>
        </div>

        <Button
          onClick={() => openPaymentCreateModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium shadow-xs"
        >
          <CreditCard className="h-3.5 w-3.5 mr-1" />
          Registrar Cobro
        </Button>
      </div>

      {/* Métricas de Cobros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Recaudado
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatMoney(totalCollected, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {payments.length} recibos procesados
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Vía Transferencias Bancarias
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(transferCollected, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {((transferCollected / (totalCollected || 1)) * 100).toFixed(0)}% del total cobrado
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Otros Métodos (Cheque / Efectivo)
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalCollected - transferCollected, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Depósitos directos y caja
          </div>
        </div>
      </div>

      {/* Tabla de Cobros */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por recibo, factura, cliente o ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="todos">Todos los métodos</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Recibo No.</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Factura Imputada</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4">Referencia / Banco</th>
                <th className="py-3 px-4 text-right">Monto Recaudado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Receipt className="h-8 w-8 mb-2 stroke-1 text-slate-300" />
                      <p className="text-sm font-medium">No se encontraron cobros registrados</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Utilice el botón "Registrar Cobro" para asentar un ingreso.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const invoice = invoices.find((i) => i.id === p.invoiceId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {p.clientName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-800 font-medium">
                          {p.invoiceNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800">
                          {p.referenceNumber || "-"}
                        </div>
                        {p.bankAccountName && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {p.bankAccountName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        +{formatMoney(p.amount, p.currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {invoice && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInvoiceDetail(invoice)}
                            className="h-6 px-2 text-xs text-slate-600 hover:text-slate-900"
                            title="Ver Factura Asociada"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Factura
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
