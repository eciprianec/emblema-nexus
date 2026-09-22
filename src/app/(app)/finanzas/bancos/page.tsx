"use client";

import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Building2,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BancosPage() {
  const { bankAccounts, payments, expenses } = useFinanceStore();

  const totalDOP = bankAccounts
    .filter((b) => b.currency === "DOP")
    .reduce((sum, b) => sum + b.balance, 0);

  const totalUSD = bankAccounts
    .filter((b) => b.currency === "USD")
    .reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cuentas Bancarias y Tesorería
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administración de cuentas corrientes y de ahorros comerciales, saldos conciliados y recaudaciones bancarias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1 text-slate-500" />
            Sincronizar Extractos
          </Button>
        </div>
      </div>

      {/* Resumen Global de Tesorería */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Disponible en Pesos (DOP)
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalDOP, "DOP")}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            Banco Popular + Banreservas
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Disponible en Divisas (USD)
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalUSD, "USD")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Banco BHD - Cta. Internacional
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Estado de Conciliación
          </span>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-lg font-bold text-slate-900">Al Día</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Todos los recaudos cruzados con libro banco
          </div>
        </div>
      </div>

      {/* Tarjetas Detalladas de Cada Banco */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bankAccounts.map((account) => {
          const isUSD = account.currency === "USD";
          return (
            <div
              key={account.id}
              className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-800">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isUSD
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {account.currency} - {account.accountType}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {account.bankName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    No. Cuenta: {account.accountNumber}
                  </p>
                  {account.description && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                      {account.description}
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400 block uppercase font-medium">
                    Saldo Disponible Conciliado
                  </span>
                  <span className="text-2xl font-bold font-mono text-slate-900 mt-0.5 block">
                    {formatMoney(account.balance, account.currency)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Titular: Emblema Nexus S.R.L.</span>
                <span className="text-slate-700 font-semibold flex items-center gap-1">
                  Activa <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Movimientos Recientes Imputados a Cuentas */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Últimos Movimientos Registrados en Cuentas
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Conciliación automática</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Tipo Movimiento</th>
                <th className="py-3 px-4">Referencia / Descripción</th>
                <th className="py-3 px-4">Cuenta Destino</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-center">Estado Conciliado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {formatDate(p.paymentDate)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">
                    Depósito / Cobro de Cliente
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-800">
                    {p.receiptNumber} - {p.clientName} (Ref: {p.referenceNumber || "S/R"})
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {p.bankAccountName || "Banco Popular - Cta Corriente"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                    +{formatMoney(p.amount, p.currency)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Conciliado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
