import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FISCAL_TYPES, effectiveStatus, todayInDr, type FiscalType } from "@/domain/billing";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { CompanySelect } from "@/features/billing/components/CompanySelect";
import { Pager, parsePage } from "@/features/billing/components/Pager";
import { CollectButton } from "@/features/billing/components/PaymentDialog";
import { StatusBadge } from "@/features/billing/components/StatusBadge";
import { count, fieldClass, formatIsoDate, money } from "@/features/billing/components/format";
import { isUuid } from "@/features/clients/mapping";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

const PAGE_SIZE = 50;

export default async function CxcPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cliente?: string; pagina?: string }>;
}) {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} />;
  if (!ctx.can.view) return <NoPermission what="ver las cuentas por cobrar" />;

  const { q, cliente, pagina } = await searchParams;
  const clientId = cliente === "sin_cliente" || isUuid(cliente) ? cliente : undefined;
  const page = parsePage(pagina);

  const service = new BillingService(ctx);
  const [summary, byClient, open, credits] = await Promise.all([
    service.getReceivablesSummary(),
    service.listReceivablesByClient(),
    service.listOpenInvoices({ clientId, search: q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    service.listCustomerCredits(),
  ]);
  const today = todayInDr();

  const overdue = summary.days_1_30 + summary.days_31_60 + summary.days_61_90 + summary.days_over_90;
  const critical = summary.days_61_90 + summary.days_over_90;
  const hasForeignCurrency = open.invoices.some((invoice) => invoice.currency !== "DOP");

  const cards = [
    {
      label: "Total por cobrar",
      value: money(summary.total),
      hint: `${count(summary.invoice_count, "comprobante", "comprobantes")} de ${count(summary.client_count, "cliente", "clientes")}`,
    },
    { label: "Al día", value: money(summary.current_amount), hint: "Sin vencer o al contado" },
    {
      label: "Vencido",
      value: money(overdue),
      hint: summary.total > 0 ? `${((overdue / summary.total) * 100).toFixed(1)} % del saldo` : "Sin saldo",
      danger: overdue > 0,
    },
    { label: "Más de 60 días", value: money(critical), hint: "Mora crítica", danger: critical > 0 },
  ];

  const selected = byClient.find((row) => (row.client_id ?? "sin_cliente") === clientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cuentas por cobrar</h1>
          <p className="mt-1 text-xs text-slate-500">Saldos de los comprobantes emitidos, por antigüedad. Montos en pesos a la tasa de cada comprobante.</p>
        </div>
        <CompanySelect companies={ctx.companies} value={ctx.companyId} />
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

      {credits.length > 0 && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" aria-labelledby="a-favor">
          <h2 id="a-favor" className="font-bold">
            Saldos a favor de clientes: {money(credits.reduce((sum, credit) => sum + Number(credit.amount_dop), 0))}
          </h2>
          <p className="mt-0.5 text-xs">
            Cobros que quedaron de más tras una nota de crédito. No restan de lo que hay por cobrar: hay que devolverlos o
            aplicarlos a otro comprobante.
          </p>
          <ul className="mt-2 space-y-1">
            {credits.map((credit) => (
              <li key={credit.invoice_id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {credit.client_name} ·{" "}
                  <Link href={`/finanzas/facturas/${credit.invoice_id}`} className="font-medium underline">
                    {credit.ncf ?? credit.invoice_number}
                  </Link>
                </span>
                <span className="font-mono">{money(credit.amount, credit.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white" aria-labelledby="antiguedad">
        <h2 id="antiguedad" className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-900">
          Antigüedad por cliente
        </h2>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 text-right font-medium">Al día</th>
              <th className="px-4 py-2.5 text-right font-medium">1–30</th>
              <th className="px-4 py-2.5 text-right font-medium">31–60</th>
              <th className="px-4 py-2.5 text-right font-medium">61–90</th>
              <th className="px-4 py-2.5 text-right font-medium">+90</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byClient.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No hay saldos pendientes.
                </td>
              </tr>
            )}
            {byClient.map((row) => (
              <tr key={row.client_id ?? "sin_cliente"} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/finanzas/cxc?cliente=${row.client_id ?? "sin_cliente"}`}
                    className="font-medium text-slate-900 underline-offset-2 hover:underline"
                  >
                    {row.client_name}
                  </Link>
                  <div className="font-mono text-xs text-slate-500">{row.tax_id ?? "Sin documento"}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">{money(row.current_amount)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">{money(row.days_1_30)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">{money(row.days_31_60)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">{money(row.days_61_90)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">{money(row.days_over_90)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-bold">{money(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3" aria-labelledby="abiertos">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 id="abiertos" className="text-sm font-bold text-slate-900">
            Comprobantes por cobrar{selected ? ` de ${selected.client_name}` : ""}
            {clientId && (
              <Link href="/finanzas/cxc" className="ml-2 text-xs font-medium text-slate-600 underline">
                Ver todos
              </Link>
            )}
          </h2>
          <form className="flex gap-2" action="/finanzas/cxc">
            {clientId && <input type="hidden" name="cliente" value={clientId} />}
            <input name="q" defaultValue={q} placeholder="Buscar por número, NCF o cliente" aria-label="Buscar comprobantes" className={`${fieldClass} sm:w-72`} />
            <Button type="submit" variant="outline" size="sm" className="h-9">
              Filtrar
            </Button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Número</th>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Vence</th>
                <th className="px-4 py-2.5 text-right font-medium">A cobrar</th>
                <th className="px-4 py-2.5 text-right font-medium">Cobrado y acreditado</th>
                <th className="px-4 py-2.5 text-right font-medium">Saldo</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                {ctx.can.collect && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {open.invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    {q || clientId ? "Ningún comprobante coincide con el filtro." : "No hay comprobantes por cobrar."}
                  </td>
                </tr>
              )}
              {open.invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/finanzas/facturas/${invoice.id}`} className="whitespace-nowrap font-medium text-slate-900 underline-offset-2 hover:underline">
                      {invoice.invoice_number}
                    </Link>
                    <div className="font-mono text-xs text-slate-500">{invoice.ncf}</div>
                    <div className="text-xs text-slate-500">{FISCAL_TYPES[invoice.fiscal_type as FiscalType]?.name}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{invoice.buyer_snapshot?.name || "Consumidor final"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {invoice.payment_type === 2 ? formatIsoDate(invoice.due_date) : "Al contado"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">{money(invoice.amount_due, invoice.currency)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">
                    {money(invoice.paid_amount + invoice.credited_due, invoice.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                    {money(invoice.balance_due, invoice.currency)}
                    {!!invoice.pending_credit && (
                      <div className="font-sans text-xs font-normal text-sky-700">
                        {money(invoice.pending_credit, invoice.currency)} en nota de crédito en proceso
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={effectiveStatus(invoice, today)} environment={invoice.dgii_environment} />
                  </td>
                  {ctx.can.collect && (
                    <td className="px-4 py-2.5 text-right">
                      <CollectButton
                        invoiceId={invoice.id}
                        balanceDue={invoice.balance_due}
                        pendingCredit={invoice.pending_credit}
                        currency={invoice.currency}
                        invoiceLabel={invoice.invoice_number}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasForeignCurrency && <p className="text-xs text-slate-500">Esta lista muestra cada comprobante en su moneda; los totales de arriba están en pesos.</p>}
        <Pager path="/finanzas/cxc" params={{ q, cliente: clientId }} page={page} pageSize={PAGE_SIZE} total={open.total} />
      </section>
    </div>
  );
}
