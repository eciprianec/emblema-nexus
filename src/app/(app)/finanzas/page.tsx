"use client";

import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import { FinanceSummaryCards } from "@/features/finance/components/FinanceSummaryCards";
import { formatMoney, formatDate } from "@/lib/utils";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/features/finance/types";
import {
  FileText,
  FileCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  Building2,
  Wallet,
  TrendingUp,
  Plus,
  Eye,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FinanceDashboardPage() {
  const {
    invoices,
    payments,
    expenses,
    bankAccounts,
    pettyCashBalance,
    openInvoiceCreateModal,
    openQuoteCreateModal,
    openPaymentCreateModal,
    openExpenseCreateModal,
    openInvoiceDetail,
  } = useFinanceStore();

  // Facturas con saldo pendiente ordenadas por vencimiento más próximo o vencidas
  const pendingInvoices = invoices
    .filter((inv) => inv.balance > 0 && inv.status !== "anulada")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Últimos pagos registrados
  const recentPayments = payments.slice(0, 5);

  // Totales de recaudación por área estimada
  const legalTotal = invoices
    .filter((i) => i.caseNumber?.startsWith("LEG") || i.items.some((it) => it.itemType === "honorarios" || it.itemType === "gastos_legales"))
    .reduce((sum, i) => sum + i.total, 0);

  const agrimensuraTotal = invoices
    .filter((i) => i.caseNumber?.startsWith("AGR") || i.items.some((it) => it.itemType === "agrimensura" || it.itemType === "tasas_catastrales"))
    .reduce((sum, i) => sum + i.total, 0);

  const inmobiliariaTotal = invoices
    .filter((i) => i.caseNumber?.startsWith("INM") || i.items.some((it) => it.itemType === "comision_inmobiliaria"))
    .reduce((sum, i) => sum + i.total, 0);

  const totalServices = legalTotal + agrimensuraTotal + inmobiliariaTotal || 1;

  // Total en bancos en pesos
  const totalBancosDOP = bankAccounts
    .filter((b) => b.currency === "DOP")
    .reduce((sum, b) => sum + b.balance, 0);

  const totalBancosUSD = bankAccounts
    .filter((b) => b.currency === "USD")
    .reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Panel Financiero Ejecutivo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consolidado general de ingresos, emisión de comprobantes fiscales (NCF), cuentas por cobrar y tesorería.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => openInvoiceCreateModal()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nueva Factura
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openPaymentCreateModal()}
            className="text-xs h-8 font-medium"
          >
            <ArrowDownLeft className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Registrar Cobro
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openExpenseCreateModal()}
            className="text-xs h-8 font-medium"
          >
            <ArrowUpRight className="h-3.5 w-3.5 mr-1 text-rose-600" />
            Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <FinanceSummaryCards />

      {/* Grid Central: Rendimiento y Tesorería */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desglose de Ingresos por Área (2 columnas) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Distribución de Facturación por Área de Servicios
              </h3>
              <p className="text-xs text-slate-500">
                Composición de ingresos facturados entre las divisiones de la firma.
              </p>
            </div>
            <Link
              href="/finanzas/facturas"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              Ver todas <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* Legal */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  Servicios Legales y Litigios
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(legalTotal, "DOP")} ({((legalTotal / totalServices) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full"
                  style={{ width: `${(legalTotal / totalServices) * 100}%` }}
                />
              </div>
            </div>

            {/* Agrimensura */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  Agrimensura, Deslindes y Catastro
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(agrimensuraTotal, "DOP")} ({((agrimensuraTotal / totalServices) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-600 rounded-full"
                  style={{ width: `${(agrimensuraTotal / totalServices) * 100}%` }}
                />
              </div>
            </div>

            {/* Inmobiliaria */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  Inmobiliaria, Regularización y Fideicomisos
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(inmobiliariaTotal, "DOP")} ({((inmobiliariaTotal / totalServices) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${(inmobiliariaTotal / totalServices) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-800 inline-block" />
                Legal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-600 inline-block" />
                Agrimensura
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400 inline-block" />
                Inmobiliaria
              </span>
            </div>

            <div className="font-mono font-bold text-slate-900">
              Total Emitido: {formatMoney(totalServices, "DOP")}
            </div>
          </div>
        </div>

        {/* Cuentas Bancarias y Disponibilidad (1 columna) */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Disponibilidad en Bancos</h3>
            </div>
            <Link
              href="/finanzas/bancos"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              Ver <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="p-3 bg-slate-50/75 rounded-md border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">{account.bankName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Cta. {account.accountNumber} ({account.accountType})
                  </p>
                </div>
                <div className="text-right font-mono font-bold text-slate-900">
                  {formatMoney(account.balance, account.currency)}
                </div>
              </div>
            ))}

            {/* Caja Chica */}
            <div className="p-3 bg-slate-50/75 rounded-md border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="font-bold text-slate-900">Caja Chica Operativa</p>
                  <p className="text-[10px] text-slate-500">Fondo fijo de oficina</p>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-slate-900">
                {formatMoney(pettyCashBalance, "DOP")}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Total Líquido DOP:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatMoney(totalBancosDOP + pettyCashBalance, "DOP")}
              </span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mt-1">
              <span>Total en Divisas USD:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatMoney(totalBancosUSD, "USD")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Inferior: Facturas Próximas a Vencer y Últimos Pagos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facturas Pendientes / Próximas a Vencer */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Facturas con Cobro Pendiente
              </h3>
            </div>
            <Link
              href="/finanzas/cxc"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              Ir a CxC <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {pendingInvoices.length === 0 ? (
              <p className="p-6 text-center text-slate-400">
                No hay facturas con saldo pendiente.
              </p>
            ) : (
              pendingInvoices.slice(0, 5).map((inv) => {
                const statusMeta = INVOICE_STATUS_LABELS[inv.status];
                return (
                  <div
                    key={inv.id}
                    className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{inv.number}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium truncate max-w-[200px]">
                        {inv.clientName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Vence: {formatDate(inv.dueDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-600 block">
                          {formatMoney(inv.balance, inv.currency)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Total: {formatMoney(inv.total, inv.currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openInvoiceDetail(inv)}
                          className="h-7 w-7 text-slate-500 hover:text-slate-900"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openPaymentCreateModal(inv)}
                          className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Cobrar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Últimos Recaudos y Pagos */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Últimos Recaudos Liquidados
              </h3>
            </div>
            <Link
              href="/finanzas/pagos"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentPayments.length === 0 ? (
              <p className="p-6 text-center text-slate-400">No hay pagos registrados aún.</p>
            ) : (
              recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        {p.receiptNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans">
                        {formatDate(p.paymentDate)}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium truncate max-w-[220px]">
                      {p.clientName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Factura: {p.invoiceNumber} | {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                    </p>
                  </div>

                  <div className="text-right font-mono font-bold text-emerald-700 text-sm">
                    +{formatMoney(p.amount, p.currency)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
