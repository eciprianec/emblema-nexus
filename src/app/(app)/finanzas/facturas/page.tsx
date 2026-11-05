import Link from "next/link";
import { AlertTriangle, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FISCAL_TYPES, INVOICE_STATUS_LABELS, effectiveStatus, todayInDr, type FiscalType } from "@/domain/billing";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { CompanySelect } from "@/features/billing/components/CompanySelect";
import { EcfBatchRefresher } from "@/features/billing/components/EcfBatchRefresher";
import { StatusBadge } from "@/features/billing/components/StatusBadge";
import { fieldClass, formatIsoDate, money } from "@/features/billing/components/format";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} />;
  if (!ctx.can.view) return <NoPermission />;

  const { estado, q } = await searchParams;
  const service = new BillingService(ctx);
  const [invoices, summary, settings] = await Promise.all([
    service.listInvoices({ status: estado, search: q }),
    service.getSummary(),
    service.getSettings(),
  ]);
  const today = todayInDr();
  const inProcess = invoices.filter((invoice) => invoice.status === "en_proceso").length;

  const cards = [
    { label: "Facturado este mes", value: money(summary.invoiced_this_month), hint: "Neto de notas de crédito" },
    { label: "Por cobrar", value: money(summary.collectible), hint: "Saldo de comprobantes abiertos" },
    {
      label: "Vencido",
      value: money(summary.overdue),
      hint: `${summary.overdue_count} ${Number(summary.overdue_count) === 1 ? "comprobante" : "comprobantes"}`,
      danger: Number(summary.overdue) > 0,
    },
    { label: "Borradores", value: String(summary.draft_count), hint: "Sin valor fiscal aún" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Facturación</h1>
          <p className="mt-1 text-xs text-slate-500">Comprobantes fiscales, notas de crédito y débito, y cobros.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings?.emission_mode === "ecf_proveedor" && ctx.can.create && <EcfBatchRefresher pendingCount={inProcess} />}
          <CompanySelect companies={ctx.companies} value={ctx.companyId} />
          {ctx.can.configure && (
            <Button asChild variant="outline" size="sm">
              <Link href="/finanzas/facturas/configuracion">
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Configuración
              </Link>
            </Button>
          )}
          {ctx.can.create && (
            <Button asChild size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
              <Link href="/finanzas/facturas/nueva">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nueva factura
              </Link>
            </Button>
          )}
        </div>
      </div>

      {!settings && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Antes de emitir, registra el RNC, la razón social y el modo de emisión de la empresa.{" "}
            {ctx.can.configure ? (
              <Link href="/finanzas/facturas/configuracion" className="font-medium underline">
                Completar configuración
              </Link>
            ) : (
              "Pídeselo a un administrador."
            )}
          </p>
        </div>
      )}

      {settings?.emission_mode === "ncf_interno" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Estás emitiendo con NCF tradicional (serie B). Según la DGII, desde el 1 de noviembre de 2026 los grandes
            y medianos contribuyentes solo pueden emitir e-CF, y los demás desde el 15 de noviembre de 2026; después,
            la serie B queda para contingencia.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{card.label}</span>
            <div className={`mt-1 font-mono text-xl font-bold ${card.danger ? "text-rose-600" : "text-slate-900"}`}>
              {card.value}
            </div>
            <div className="mt-1 text-xs text-slate-500">{card.hint}</div>
          </div>
        ))}
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" action="/finanzas/facturas">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por número, NCF o cliente"
          aria-label="Buscar comprobantes"
          className={`${fieldClass} sm:max-w-sm`}
        />
        <select name="estado" defaultValue={estado ?? ""} aria-label="Filtrar por estado" className={`${fieldClass} sm:w-44`}>
          <option value="">Todos los estados</option>
          {Object.entries(INVOICE_STATUS_LABELS)
            .filter(([key]) => key !== "vencida")
            .map(([key, info]) => (
              <option key={key} value={key}>
                {info.label}
              </option>
            ))}
        </select>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Filtrar
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Número</th>
              <th className="px-4 py-2.5 font-medium">Comprobante</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
              <th className="px-4 py-2.5 text-right font-medium">Saldo</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {q || estado ? "Ningún comprobante coincide con el filtro." : "Aún no hay comprobantes."}
                </td>
              </tr>
            )}
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/finanzas/facturas/${invoice.id}`} className="whitespace-nowrap font-medium text-slate-900 underline-offset-2 hover:underline">
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-slate-700">{FISCAL_TYPES[invoice.fiscal_type as FiscalType]?.name}</div>
                  <div className="font-mono text-xs text-slate-500">{invoice.ncf ?? "Sin número fiscal"}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{invoice.buyer_snapshot?.name || "Consumidor final"}</td>
                <td className="px-4 py-2.5 text-slate-600">{formatIsoDate(invoice.issue_date)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">{money(invoice.total, invoice.currency)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">
                  {invoice.status === "borrador" || invoice.status === "en_proceso" ? "—" : money(invoice.balance_due, invoice.currency)}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={effectiveStatus(invoice, today)} environment={invoice.dgii_environment} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {invoices.length === 200 && (
        <p className="text-xs text-slate-500">Se muestran los 200 más recientes. Usa el filtro para encontrar otros.</p>
      )}
    </div>
  );
}
