import Link from "next/link";
import { ArrowDownLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { effectiveStatus, todayInDr } from "@/domain/billing";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { CompanySelect } from "@/features/billing/components/CompanySelect";
import { CollectButton } from "@/features/billing/components/PaymentDialog";
import { StatusBadge } from "@/features/billing/components/StatusBadge";
import { count, formatIsoDate, money } from "@/features/billing/components/format";
import { LocalTreasuryPanel } from "@/features/finance/components/LocalTreasuryPanel";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

const CONCEPT_LABELS: Record<string, string> = {
  honorarios: "Honorarios",
  servicio: "Servicios",
  tasa_judicial: "Tasas judiciales",
  tasa_catastral: "Tasas catastrales",
  gasto_notarial: "Gastos notariales",
  otro: "Otros",
};

export default async function FinanceDashboardPage() {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} />;
  if (!ctx.can.view) return <NoPermission what="ver las finanzas" />;

  const service = new BillingService(ctx);
  const [summary, payments, concepts, pending, recent] = await Promise.all([
    service.getSummary(),
    service.getPaymentsSummary(),
    service.listInvoicedByConcept(),
    service.listOpenInvoices({ limit: 5 }),
    service.listPayments({ limit: 5 }),
  ]);
  const today = todayInDr();

  const conceptTotal = concepts.reduce((sum, concept) => sum + concept.amount, 0);

  const cards = [
    { label: "Facturado este mes", value: money(summary.invoiced_this_month), hint: "Neto de notas de crédito" },
    { label: "Cobrado este mes", value: money(payments.collected_this_month), hint: "Sin cobros anulados" },
    { label: "Por cobrar", value: money(summary.collectible), hint: "Saldo de comprobantes abiertos" },
    {
      label: "Vencido",
      value: money(summary.overdue),
      hint: count(summary.overdue_count, "comprobante", "comprobantes"),
      danger: Number(summary.overdue) > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resumen financiero</h1>
          <p className="mt-1 text-xs text-slate-500">Facturación, cobros y cuentas por cobrar de la empresa, en pesos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CompanySelect companies={ctx.companies} value={ctx.companyId} />
          {ctx.can.create && (
            <Button asChild size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
              <Link href="/finanzas/facturas/nueva">
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Nueva factura
              </Link>
            </Button>
          )}
          {ctx.can.collect && (
            <Button asChild size="sm" variant="outline">
              <Link href="/finanzas/cxc">
                <ArrowDownLeft className="mr-1.5 h-3.5 w-3.5 text-emerald-600" aria-hidden />
                Registrar cobro
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{card.label}</span>
            <div className={`mt-1 font-mono text-xl font-bold ${card.danger ? "text-rose-600" : "text-slate-900"}`}>{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Facturación por concepto</h2>
              <p className="text-xs text-slate-500">Acumulado antes de ITBIS, neto de notas de crédito.</p>
            </div>
            <Link href="/finanzas/facturas" className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
              Ver facturas <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {concepts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Aún no hay comprobantes emitidos.</p>
          ) : (
            <div className="space-y-4">
              {concepts.map((concept) => {
                const percent = conceptTotal > 0 ? Math.max(0, (concept.amount / conceptTotal) * 100) : 0;
                return (
                  <div key={concept.item_type} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{CONCEPT_LABELS[concept.item_type] ?? concept.item_type}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {money(concept.amount)} ({percent.toFixed(0)} %)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-700" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-700">
                <span>Total</span>
                <span className="font-mono font-bold text-slate-900">{money(conceptTotal)}</span>
              </div>
            </div>
          )}
        </section>

        <LocalTreasuryPanel />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock className="h-4 w-4 text-amber-600" aria-hidden />
              Comprobantes por cobrar
            </h2>
            <Link href="/finanzas/cxc" className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
              Ir a CxC <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {pending.invoices.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No hay comprobantes con saldo pendiente.</p>
            ) : (
              pending.invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/finanzas/facturas/${invoice.id}`} className="font-bold text-slate-900 underline-offset-2 hover:underline">
                        {invoice.invoice_number}
                      </Link>
                      <StatusBadge status={effectiveStatus(invoice, today)} environment={invoice.dgii_environment} />
                    </div>
                    <p className="truncate font-medium text-slate-600">{invoice.buyer_snapshot?.name || "Consumidor final"}</p>
                    <p className="text-slate-500">{invoice.payment_type === 2 ? `Vence: ${formatIsoDate(invoice.due_date)}` : "Al contado"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono font-bold text-rose-600">{money(invoice.balance_due, invoice.currency)}</span>
                    {ctx.can.collect && (
                      <CollectButton
                        invoiceId={invoice.id}
                        balanceDue={invoice.balance_due}
                        pendingCredit={invoice.pending_credit}
                        currency={invoice.currency}
                        invoiceLabel={invoice.invoice_number}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" aria-hidden />
              Últimos cobros
            </h2>
            <Link href="/finanzas/pagos" className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
              Ver todos <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {recent.payments.length === 0 ? (
              <p className="p-6 text-center text-slate-500">Aún no hay cobros registrados.</p>
            ) : (
              recent.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{payment.receipt_number}</span>
                      <span className="text-slate-500">{formatIsoDate(payment.payment_date)}</span>
                      {payment.voided_at && <span className="font-medium text-rose-700">Anulado</span>}
                    </div>
                    <p className="truncate font-medium text-slate-700">{payment.client_name}</p>
                    <p className="text-slate-500">Comprobante: {payment.invoice_number ?? "—"}</p>
                  </div>
                  <span className={`shrink-0 font-mono text-sm font-bold ${payment.voided_at ? "text-slate-400 line-through" : "text-emerald-700"}`}>
                    {money(payment.amount, payment.currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
