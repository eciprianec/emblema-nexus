import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FISCAL_TYPES, effectiveStatus, todayInDr, type FiscalType } from "@/domain/billing";
import { CollectButton } from "@/features/billing/components/PaymentDialog";
import { StatusBadge } from "@/features/billing/components/StatusBadge";
import { PAYMENT_METHODS, count, formatIsoDate, money } from "@/features/billing/components/format";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

export async function ClientFinanceTab({ clientId }: { clientId: string }) {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready" || !ctx.can.view) {
    return <p className="py-10 text-center text-sm text-slate-500">Tu rol no incluye permisos para ver la facturación de esta empresa.</p>;
  }

  const service = new BillingService(ctx);
  const [summary, invoices, paymentList] = await Promise.all([
    service.getClientSummary(clientId),
    service.listClientInvoices(clientId),
    service.listPayments({ clientId, limit: 100 }),
  ]);
  const today = todayInDr();

  const cards = [
    { label: "Facturado", value: money(summary.billed), hint: `${count(summary.invoice_count, "comprobante", "comprobantes")}, neto de notas de crédito` },
    { label: "Cobrado", value: money(summary.collected), hint: "Sin cobros anulados" },
    {
      label: "Saldo",
      value: money(summary.balance),
      hint: summary.overdue > 0 ? `${money(summary.overdue)} vencido` : "Sin saldo vencido",
      danger: summary.overdue > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-bold text-slate-900">Estado de cuenta</h3>
          <p className="text-xs text-slate-500">Comprobantes emitidos a este cliente y sus cobros. Los totales están en pesos.</p>
        </div>
        {ctx.can.create && (
          <Button asChild size="sm" className="h-8 bg-slate-900 text-xs text-white hover:bg-slate-800">
            <Link href={`/finanzas/facturas/nueva?cliente=${clientId}`}>
              <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Nueva factura
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{card.label}</span>
            <div className={`mt-1 font-mono text-xl font-bold ${card.danger ? "text-rose-600" : "text-slate-900"}`}>{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.hint}</div>
          </div>
        ))}
      </div>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <h4 className="border-b border-slate-200 bg-slate-50 p-3 text-xs font-bold uppercase tracking-wider text-slate-800">Comprobantes</h4>
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2.5">Número</th>
              <th className="px-3 py-2.5">Comprobante</th>
              <th className="px-3 py-2.5">Emisión</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5 text-right">Saldo</th>
              <th className="px-3 py-2.5">Estado</th>
              {ctx.can.collect && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Aún no hay comprobantes emitidos a este cliente.
                </td>
              </tr>
            )}
            {invoices.map((invoice) => {
              const collectible = ["emitida", "parcialmente_pagada", "vencida"].includes(invoice.status) && invoice.balance_due > 0;
              return (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Link href={`/finanzas/facturas/${invoice.id}`} className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-slate-700">{FISCAL_TYPES[invoice.fiscal_type as FiscalType]?.name}</div>
                    <div className="font-mono text-slate-500">{invoice.ncf}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatIsoDate(invoice.issue_date)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{money(invoice.total, invoice.currency)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold">{money(invoice.balance_due, invoice.currency)}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={effectiveStatus(invoice, today)} environment={invoice.dgii_environment} />
                  </td>
                  {ctx.can.collect && (
                    <td className="px-3 py-2.5 text-right">
                      {collectible && (
                        <CollectButton
                          invoiceId={invoice.id}
                          balanceDue={invoice.balance_due}
                          currency={invoice.currency}
                          invoiceLabel={invoice.invoice_number}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <h4 className="border-b border-slate-200 bg-slate-50 p-3 text-xs font-bold uppercase tracking-wider text-slate-800">Cobros</h4>
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2.5">Recibo</th>
              <th className="px-3 py-2.5">Fecha</th>
              <th className="px-3 py-2.5">Comprobante</th>
              <th className="px-3 py-2.5">Forma de pago</th>
              <th className="px-3 py-2.5 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paymentList.payments.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  Aún no hay cobros de este cliente.
                </td>
              </tr>
            )}
            {paymentList.payments.map((payment) => (
              <tr key={payment.id} className={payment.voided_at ? "text-slate-400" : "hover:bg-slate-50"}>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold">
                  {payment.receipt_number}
                  {payment.voided_at && <span className="ml-2 font-sans text-rose-700">Anulado</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{formatIsoDate(payment.payment_date)}</td>
                <td className="px-3 py-2.5">{payment.invoice_number ?? "—"}</td>
                <td className="px-3 py-2.5">{PAYMENT_METHODS.find((m) => m.value === payment.payment_method)?.label ?? payment.payment_method}</td>
                <td className={`whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold ${payment.voided_at ? "line-through" : "text-emerald-700"}`}>
                  {money(payment.amount, payment.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
