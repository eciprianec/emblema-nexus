"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, ChevronRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { useFinanceStore } from "../store/useFinanceStore";

/**
 * Bancos, caja y gastos aún se guardan en este navegador, y los cobros reales no mueven
 * esos saldos. Van aparte y rotulados para que no se lean junto a los datos de la empresa.
 */
export function LocalTreasuryPanel() {
  const { bankAccounts, pettyCashBalance, expenses, openExpenseCreateModal } = useFinanceStore();

  const totalDop = bankAccounts.filter((b) => b.currency === "DOP").reduce((sum, b) => sum + b.balance, 0);
  const totalUsd = bankAccounts.filter((b) => b.currency === "USD").reduce((sum, b) => sum + b.balance, 0);
  const totalExpenses = expenses.filter((e) => e.currency === "DOP").reduce((sum, e) => sum + e.amount, 0);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Building2 className="h-4 w-4 text-slate-700" aria-hidden />
            Tesorería y gastos
          </h2>
          <Link href="/finanzas/bancos" className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
            Ver <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <p className="mt-1 text-xs text-amber-700">Guardado solo en este navegador. No incluye los cobros de la empresa.</p>
      </div>

      <div className="space-y-3 text-xs">
        {bankAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/75 p-3">
            <div>
              <p className="font-bold text-slate-900">{account.bankName}</p>
              <p className="font-mono text-[10px] text-slate-500">
                Cta. {account.accountNumber} ({account.accountType})
              </p>
            </div>
            <div className="text-right font-mono font-bold text-slate-900">{formatMoney(account.balance, account.currency)}</div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/75 p-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-600" aria-hidden />
            <p className="font-bold text-slate-900">Caja chica</p>
          </div>
          <div className="text-right font-mono font-bold text-slate-900">{formatMoney(pettyCashBalance, "DOP")}</div>
        </div>
      </div>

      <dl className="space-y-1 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-700">
        <div className="flex justify-between">
          <dt>Líquido en pesos</dt>
          <dd className="font-mono font-bold text-slate-900">{formatMoney(totalDop + pettyCashBalance, "DOP")}</dd>
        </div>
        <div className="flex justify-between">
          <dt>En dólares</dt>
          <dd className="font-mono font-bold text-slate-900">{formatMoney(totalUsd, "USD")}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Gastos registrados</dt>
          <dd className="font-mono font-bold text-slate-900">{formatMoney(totalExpenses, "DOP")}</dd>
        </div>
      </dl>

      <Button size="sm" variant="outline" onClick={() => openExpenseCreateModal()} className="h-8 w-full text-xs">
        <ArrowUpRight className="mr-1 h-3.5 w-3.5 text-rose-600" aria-hidden />
        Registrar gasto
      </Button>
    </section>
  );
}
