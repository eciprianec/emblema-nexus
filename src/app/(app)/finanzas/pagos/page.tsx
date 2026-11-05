import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NON_PROD_ECF_LEGEND } from "@/domain/billing";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { CompanySelect } from "@/features/billing/components/CompanySelect";
import { Pager, parsePage } from "@/features/billing/components/Pager";
import { VoidPaymentButton } from "@/features/billing/components/VoidPaymentButton";
import { PAYMENT_METHODS, count, fieldClass, formatIsoDate, money } from "@/features/billing/components/format";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

const PAGE_SIZE = 50;

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; metodo?: string; pagina?: string }>;
}) {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} />;
  if (!ctx.can.view) return <NoPermission what="ver los cobros" />;

  const { q, metodo, pagina } = await searchParams;
  const method = PAYMENT_METHODS.some((m) => m.value === metodo) ? metodo : undefined;
  const page = parsePage(pagina);

  const service = new BillingService(ctx);
  const [summary, list] = await Promise.all([
    service.getPaymentsSummary(),
    service.listPayments({ search: q, method, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  ]);

  const others = summary.collected_total - summary.transfer_total;
  const share = (value: number) => (summary.collected_total > 0 ? `${((value / summary.collected_total) * 100).toFixed(0)} % del total` : "Sin cobros");

  const cards = [
    {
      label: "Total cobrado",
      value: money(summary.collected_total),
      hint: `${count(summary.receipt_count, "recibo vigente", "recibos vigentes")}${summary.voided_count > 0 ? `, ${count(summary.voided_count, "anulado", "anulados")}` : ""}`,
    },
    { label: "Cobrado este mes", value: money(summary.collected_this_month), hint: "Según la fecha del cobro" },
    { label: "Por transferencia", value: money(summary.transfer_total), hint: share(summary.transfer_total) },
    { label: "Otras formas de pago", value: money(others), hint: share(others) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cobros</h1>
          <p className="mt-1 text-xs text-slate-500">Recibos aplicados a los comprobantes. Los totales están en pesos y no incluyen cobros anulados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CompanySelect companies={ctx.companies} value={ctx.companyId} />
          {ctx.can.collect && (
            <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href="/finanzas/cxc">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" aria-hidden />
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
            <div className="mt-1 font-mono text-xl font-bold text-slate-900">{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.hint}</div>
          </div>
        ))}
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" action="/finanzas/pagos">
        <input name="q" defaultValue={q} placeholder="Buscar por recibo, comprobante, cliente o referencia" aria-label="Buscar cobros" className={`${fieldClass} sm:max-w-sm`} />
        <select name="metodo" defaultValue={method ?? ""} aria-label="Filtrar por forma de pago" className={`${fieldClass} sm:w-44`}>
          <option value="">Todas las formas</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Filtrar
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Recibo</th>
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Comprobante</th>
              <th className="px-4 py-2.5 font-medium">Forma de pago</th>
              <th className="px-4 py-2.5 font-medium">Referencia</th>
              <th className="px-4 py-2.5 text-right font-medium">Monto</th>
              {ctx.can.voidPayment && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.payments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  {q || method ? "Ningún cobro coincide con el filtro." : "Aún no hay cobros registrados."}
                </td>
              </tr>
            )}
            {list.payments.map((payment) => {
              const voided = Boolean(payment.voided_at);
              return (
                <tr key={payment.id} className={voided ? "bg-slate-50 text-slate-400" : "hover:bg-slate-50"}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono font-medium">
                    {payment.receipt_number}
                    {voided && <div className="font-sans text-xs text-rose-700">Anulado: {payment.void_reason}</div>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatIsoDate(payment.payment_date)}</td>
                  <td className="px-4 py-2.5">{payment.client_name}</td>
                  <td className="px-4 py-2.5">
                    {payment.invoice_id ? (
                      <Link href={`/finanzas/facturas/${payment.invoice_id}`} className="whitespace-nowrap font-medium underline-offset-2 hover:underline">
                        {payment.invoice_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {payment.ncf && <div className="font-mono text-xs text-slate-500">{payment.ncf}</div>}
                    {payment.dgii_environment && payment.dgii_environment !== "prod" && (
                      <div className="text-xs font-medium text-orange-800">{NON_PROD_ECF_LEGEND}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{PAYMENT_METHODS.find((m) => m.value === payment.payment_method)?.label ?? payment.payment_method}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-mono">{payment.reference_number ?? "—"}</div>
                    {payment.bank_name && <div className="text-xs text-slate-500">{payment.bank_name}</div>}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-2.5 text-right font-mono font-bold ${voided ? "line-through" : "text-emerald-700"}`}>
                    {money(payment.amount, payment.currency)}
                  </td>
                  {ctx.can.voidPayment && (
                    <td className="px-4 py-2.5 text-right">
                      {!voided && <VoidPaymentButton paymentId={payment.id} receipt={payment.receipt_number} />}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager path="/finanzas/pagos" params={{ q, metodo: method }} page={page} pageSize={PAGE_SIZE} total={list.total} />
    </div>
  );
}
