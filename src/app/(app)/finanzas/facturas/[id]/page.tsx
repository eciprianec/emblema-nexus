import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import {
  BILLING_INDICATORS,
  FISCAL_TYPES,
  INCOME_TYPES,
  MODIFICATION_CODES,
  NON_PROD_ECF_LEGEND,
  PAYMENT_TYPES,
  PROVIDER_FISCAL_TYPES,
  UNIT_CODES,
  buildTimbreUrl,
  customerCredit,
  effectiveStatus,
  fixed2,
  isDgiiQrUrl,
  todayInDr,
  type FiscalType,
} from "@/domain/billing";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { EcfPrintBlock } from "@/features/billing/components/EcfPrintBlock";
import { EcfPrintHeader } from "@/features/billing/components/EcfPrintHeader";
import { EcfStatusPanel } from "@/features/billing/components/EcfStatusPanel";
import { attemptClosing } from "@/features/billing/components/provider-messages";
import { ProviderMessages } from "@/features/billing/components/ProviderMessages";
import { InvoiceActions } from "@/features/billing/components/InvoiceActions";
import { StatusBadge } from "@/features/billing/components/StatusBadge";
import { VoidPaymentButton } from "@/features/billing/components/VoidPaymentButton";
import { formatIsoDate, money } from "@/features/billing/components/format";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";
import { isServiceRoleConfigured } from "@/services/billing/mseller/EcfProviderService";
import { isSecretsKeyConfigured } from "@/services/billing/mseller/secrets";
import type { EcfRecordRow } from "@/services/billing/types";

const ECF_STATUS_WORDING: Record<string, string> = {
  pendiente: "Pendiente de envío",
  enviado: "En proceso",
  en_proceso: "En proceso",
  aceptado: "Aceptado",
  condicional: "Aceptado con observaciones",
  rechazado: "Rechazado",
};

export default async function FacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} />;
  if (!ctx.can.view) return <NoPermission />;

  const { id } = await params;
  const service = new BillingService(ctx);
  const [detail, settings] = await Promise.all([service.getInvoice(id), service.getSettings()]);
  if (!detail) notFound();

  const { invoice, items, payments, ecf, ecfHistory, notes, parent } = detail;
  const type = FISCAL_TYPES[invoice.fiscal_type as FiscalType];
  const currency = invoice.currency;
  const isDraft = invoice.status === "borrador";
  const issues = isDraft ? service.validate(detail, settings) : [];
  const blocking = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const emitter = invoice.emitter_snapshot;
  const buyer = invoice.buyer_snapshot ?? {};

  const isProviderEcf = ecf?.source === "proveedor";
  const nonProd = isProviderEcf && ecf.environment !== "PROD";
  const lastAttempt = isDraft ? ecfHistory[0] : undefined;
  const observations = ecf?.dgii_status === "condicional" ? (ecf.dgii_messages ?? []) : [];
  // Recuperado por consulta en lote: puede llegar a un estado final sin código o sin QR.
  const missingProviderData = isProviderEcf && ["aceptado", "condicional"].includes(ecf.dgii_status) && (!ecf.security_code || !ecf.qr_code_url);

  // Lo que una nota de crédito en proceso ya compromete aún no se puede cobrar.
  const pendingCredit = notes
    .filter((note) => note.fiscal_type === "34" && note.status === "en_proceso")
    .reduce((sum, note) => sum + Number(note.amount_due), 0);

  const pendingCreditNotes = notes.filter((note) => note.fiscal_type === "34" && note.status === "en_proceso");
  // Igual que el límite de la base de datos: las notas en proceso ya comprometen ese margen.
  const creditable = pendingCreditNotes.reduce((rest, note) => rest - Number(note.total), invoice.total - invoice.credited_amount);
  const inFavor = isDraft || invoice.status === "en_proceso" || invoice.status === "anulada" ? 0 : customerCredit(invoice);
  const closing = lastAttempt ? attemptClosing(lastAttempt) : null;

  // En modo proveedor el timbre es su URL, tal cual, y solo si lleva a la DGII; las demás se arman con el código registrado.
  const rate = invoice.currency === "DOP" ? 1 : invoice.exchange_rate ?? 1;
  const timbreUrl = isProviderEcf
    ? (isDgiiQrUrl(ecf.qr_code_url) ? ecf.qr_code_url : null)
    : ecf && emitter && ecf.security_code
      ? buildTimbreUrl({
          environment: settings?.dgii_environment ?? "prod",
          fiscalType: invoice.fiscal_type,
          emitterRnc: emitter.rnc,
          buyerTaxId: buyer.taxId,
          encf: ecf.encf,
          issueDate: invoice.issue_date,
          total: Math.round(invoice.total * rate * 100) / 100,
          signedAt: ecf.sign_date ?? invoice.issued_at ?? new Date().toISOString(),
          securityCode: ecf.security_code,
        })
      : null;

  // Por qué no se puede emitir todavía en modo proveedor, en palabras de quien lo resuelve.
  const providerBlockers: string[] = [];
  if (isDraft && settings?.emission_mode === "ecf_proveedor") {
    if (!PROVIDER_FISCAL_TYPES.includes(type.code)) {
      providerBlockers.push(`${type.name}: este tipo aún no se emite por el proveedor.`);
    } else {
      const provider = service.ecfProvider();
      const [credentials, hasNumber] = await Promise.all([
        provider.credentialsStatus(settings.dgii_environment),
        provider.hasNumberAvailable(type.ecfPrefix, settings.dgii_environment),
      ]);
      if (!isSecretsKeyConfigured()) providerBlockers.push("Falta la variable BILLING_SECRETS_KEY en el servidor.");
      if (!isServiceRoleConfigured()) providerBlockers.push("Falta la variable SUPABASE_SERVICE_ROLE_KEY en el servidor.");
      if (!credentials.configured) providerBlockers.push("Faltan las credenciales del proveedor para este ambiente.");
      if (!hasNumber) providerBlockers.push(`No queda ningún e-NCF disponible en un rango ${type.ecfPrefix} vigente.`);
    }
  }

  const hasOtherNotes = notes.some((n) => n.status !== "borrador" && n.status !== "anulada");

  const totals: { label: string; value: number; strong?: boolean; hideZero?: boolean }[] = [
    ...(isProviderEcf
      ? [{ label: "Subtotal gravado", value: invoice.taxable_18 + invoice.taxable_16 + invoice.taxable_0, hideZero: true }]
      : []),
    { label: "Gravado 18 %", value: invoice.taxable_18, hideZero: true },
    { label: "Gravado 16 %", value: invoice.taxable_16, hideZero: true },
    { label: "Gravado 0 %", value: invoice.taxable_0, hideZero: true },
    { label: isProviderEcf ? "Subtotal exento" : "Exento", value: invoice.exempt_amount, hideZero: true },
    { label: "Descuentos aplicados", value: invoice.discount, hideZero: true },
    { label: "ITBIS", value: invoice.itbis },
    { label: "Total", value: invoice.total, strong: true },
    { label: "Suplidos no facturables", value: invoice.non_billable_amount, hideZero: true },
    { label: "ITBIS retenido", value: -invoice.itbis_withheld, hideZero: true },
    { label: "ISR retenido", value: -invoice.isr_withheld, hideZero: true },
  ];

  return (
    <div className="space-y-6">
      <div className="billing-no-print flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <Link href="/finanzas/facturas" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Facturación
        </Link>
        <InvoiceActions
          invoiceId={invoice.id}
          status={effectiveStatus(invoice, todayInDr())}
          fiscalType={invoice.fiscal_type}
          ecfPrefix={type.ecfPrefix}
          emissionMode={invoice.emission_mode}
          settingsMode={settings?.emission_mode ?? null}
          balanceDue={invoice.balance_due}
          pendingCredit={pendingCredit}
          creditable={creditable}
          encf={ecf?.encf ?? null}
          rejectedAttempts={ecfHistory.map((attempt) => attempt.encf)}
          currency={currency}
          isInvoice={type.kind === "factura"}
          isVoidable={
            invoice.emission_mode === "ncf_interno" &&
            !["borrador", "anulada"].includes(invoice.status) &&
            invoice.paid_amount === 0 &&
            invoice.credited_amount === 0 &&
            !hasOtherNotes
          }
          canCreate={ctx.can.create}
          canVoid={ctx.can.void}
          canCollect={ctx.can.collect}
          blockingIssues={blocking.length}
          providerBlocked={providerBlockers.length > 0}
          externalSummary={[
            { label: "Tipo", value: `${invoice.fiscal_type} · ${type.name}` },
            { label: "RNC/cédula comprador", value: buyer.taxId || buyer.foreignId || "—" },
            { label: "Comprador", value: buyer.name || "Consumidor final" },
            { label: "Monto gravado", value: fixed2(invoice.taxable_18 + invoice.taxable_16 + invoice.taxable_0) },
            { label: "Exento", value: fixed2(invoice.exempt_amount) },
            { label: "ITBIS", value: fixed2(invoice.itbis) },
            { label: "Total", value: `${fixed2(invoice.total)} ${currency}` },
          ]}
        />
      </div>

      {isDraft && !settings && (
        <Notice>
          Falta la configuración fiscal de la empresa.{" "}
          {ctx.can.configure && (
            <Link href="/finanzas/facturas/configuracion" className="font-medium underline">
              Completar configuración
            </Link>
          )}
        </Notice>
      )}
      {isDraft && settings?.emission_mode === "ecf_directo" && (
        <Notice>La emisión directa aún no está disponible. Cambia el modo de emisión en la configuración.</Notice>
      )}
      {providerBlockers.length > 0 && (
        <Notice title="Para enviar este comprobante al proveedor, falta:">
          <ul className="ml-4 list-disc">
            {providerBlockers.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {ctx.can.configure && (
            <Link href="/finanzas/facturas/configuracion" className="font-medium underline">
              Ir a la configuración
            </Link>
          )}
        </Notice>
      )}
      {lastAttempt && (
        <div role="alert" className="billing-no-print rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-medium">
            {lastAttempt.number_parked_at
              ? `El proveedor rechazó el envío del e-NCF ${lastAttempt.encf}`
              : lastAttempt.provider_phase === "no_enviado"
                ? `El e-NCF ${lastAttempt.encf} no llegó al proveedor`
                : `La DGII rechazó el e-NCF ${lastAttempt.encf}`}
          </p>
          {lastAttempt.provider_error && <p className="mt-0.5">{lastAttempt.provider_error}</p>}
          <ProviderMessages messages={lastAttempt.dgii_messages} />
          <p className="mt-1">
            {lastAttempt.number_parked_at
              ? "Ese número quedó apartado: no se volverá a usar y la próxima emisión tomará otro. "
              : lastAttempt.secuencia_utilizada === false
                ? "El número no se consumió y se volverá a usar. "
                : "La DGII dio esa secuencia por usada: se emitirá con un número nuevo. "}
            {closing?.text}{" "}
            {closing?.toSettings && ctx.can.configure && (
              <Link href="/finanzas/facturas/configuracion" className="font-medium underline">
                Ir a la configuración
              </Link>
            )}
          </p>
        </div>
      )}
      {isProviderEcf && (invoice.status === "en_proceso" || missingProviderData) && (
        <EcfStatusPanel invoiceId={invoice.id} ecf={ecf} canAct={ctx.can.create} />
      )}
      {pendingCredit > 0 && (
        <Notice title="Hay notas de crédito en proceso en la DGII">
          Comprometen {money(pendingCredit, currency)} de este comprobante: de su saldo solo se puede cobrar{" "}
          {money(Math.max(0, invoice.balance_due - pendingCredit), currency)} hasta que la DGII responda.{" "}
          {pendingCreditNotes.map((note) => (
            <Link key={note.id} href={`/finanzas/facturas/${note.id}`} className="mr-2 font-medium underline">
              Ver {note.ncf ?? note.invoice_number}
            </Link>
          ))}
        </Notice>
      )}
      {observations.length > 0 && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">La DGII lo aceptó con observaciones</p>
          <ProviderMessages messages={observations} />
        </div>
      )}
      {(blocking.length > 0 || warnings.length > 0) && (
        <Notice title={blocking.length > 0 ? "Para emitir, corrige:" : "Revisa antes de emitir:"}>
          <ul className="ml-4 list-disc">
            {[...blocking, ...warnings].map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </Notice>
      )}

      <div id="billing-print-area" className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          {isProviderEcf ? (
            <EcfPrintHeader
              fiscalType={invoice.fiscal_type}
              ncf={invoice.ncf}
              issueDate={invoice.issue_date}
              sequenceExpiresOn={invoice.sequence_expires_on}
              modifiedNcf={invoice.modified_ncf}
              modificationCode={invoice.modification_code}
              emitter={emitter ?? null}
              buyer={buyer}
            >
              <div className="billing-no-print mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={effectiveStatus(invoice, todayInDr())} />
                <span className="text-slate-500">{invoice.invoice_number}</span>
              </div>
            </EcfPrintHeader>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{type.name}</h1>
                  <StatusBadge status={effectiveStatus(invoice, todayInDr())} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{invoice.invoice_number}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-semibold text-slate-900">{invoice.ncf ?? "Sin número fiscal"}</p>
                {invoice.sequence_expires_on && (
                  <p className="text-xs text-slate-500">Válido hasta {formatIsoDate(invoice.sequence_expires_on)}</p>
                )}
              </div>
            </div>
          )}

          {nonProd && (
            <p className="mt-3 rounded border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-900">
              {NON_PROD_ECF_LEGEND}
            </p>
          )}
          {isProviderEcf && invoice.status === "en_proceso" && (
            <p className="mt-3 rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
              En proceso en la DGII: hasta que sea recibido y aceptado, no sustenta crédito fiscal.
            </p>
          )}
          {isDraft && (
            <p className="mt-3 rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              BORRADOR — sin valor fiscal
            </p>
          )}
          {invoice.emission_mode === "ecf_externo" && (
            <p className="mt-3 rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
              Copia interna. La representación impresa oficial es la que generó la plataforma donde se emitió el e-CF.
            </p>
          )}
          {invoice.status === "anulada" && invoice.void_reason && (
            <p className="mt-3 rounded bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700">Anulada: {invoice.void_reason}</p>
          )}

          {!isProviderEcf && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Emisor</h2>
                {emitter || settings ? (
                  <div className="mt-1 text-sm text-slate-800">
                    <p className="font-medium">{emitter?.legalName ?? settings?.legal_name}</p>
                    <p>RNC {emitter?.rnc ?? settings?.rnc}</p>
                    <p>{emitter?.address ?? settings?.address}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Sin configurar</p>
                )}
              </div>
              <div>
                <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Comprador</h2>
                <div className="mt-1 text-sm text-slate-800">
                  <p className="font-medium">{buyer.name || "Consumidor final"}</p>
                  {buyer.taxId && <p>RNC/Cédula {buyer.taxId}</p>}
                  {buyer.foreignId && <p>ID extranjero {buyer.foreignId}</p>}
                  {buyer.address && <p>{buyer.address}</p>}
                </div>
              </div>
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {!isProviderEcf && <Fact label="Fecha de emisión" value={formatIsoDate(invoice.issue_date)} />}
            <Fact label="Tipo de pago" value={PAYMENT_TYPES.find((p) => p.code === invoice.payment_type)?.label ?? "—"} />
            {invoice.payment_type === 2 && <Fact label="Fecha límite" value={formatIsoDate(invoice.due_date)} />}
            <Fact label="Tipo de ingreso" value={INCOME_TYPES.find((t) => t.code === invoice.income_type)?.label ?? "—"} />
            {currency !== "DOP" && <Fact label="Tasa de cambio" value={String(invoice.exchange_rate)} />}
          </dl>

          {(parent || invoice.modified_ncf) && (
            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">
                Modifica{" "}
                {parent ? (
                  <Link href={`/finanzas/facturas/${parent.id}`} className="font-mono underline">
                    {parent.ncf}
                  </Link>
                ) : (
                  <span className="font-mono">{invoice.modified_ncf}</span>
                )}{" "}
                del {formatIsoDate(invoice.modified_ncf_date ?? parent?.issue_date)}
              </p>
              <p className="text-slate-600">
                {MODIFICATION_CODES.find((m) => m.code === invoice.modification_code)?.label}
                {invoice.modification_reason ? ` — ${invoice.modification_reason}` : ""}
              </p>
            </div>
          )}
        </section>

        <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Descripción</th>
                <th className="px-4 py-2 text-right font-medium">Cant.</th>
                {isProviderEcf && <th className="px-4 py-2 font-medium">Unidad</th>}
                <th className="px-4 py-2 text-right font-medium">Precio</th>
                <th className="px-4 py-2 text-right font-medium">Desc.</th>
                <th className={`px-4 py-2 font-medium ${isProviderEcf ? "text-right" : ""}`}>ITBIS</th>
                <th className="px-4 py-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-slate-800">
                    {/* La representación impresa marca con "E" lo exento, a la izquierda de la descripción. */}
                    {isProviderEcf && item.billing_indicator === 4 && <span className="mr-1 font-semibold">E</span>}
                    {item.description}
                    {item.details && <span className="block text-xs text-slate-500">{item.details}</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{item.quantity}</td>
                  {isProviderEcf && (
                    <td className="px-4 py-2 text-slate-600">{UNIT_CODES.find((u) => u.code === item.unit_code)?.label ?? "—"}</td>
                  )}
                  <td className="px-4 py-2 text-right font-mono">{money(item.unit_price, currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">{item.discount_amount ? money(item.discount_amount, currency) : "—"}</td>
                  {isProviderEcf ? (
                    <td className="px-4 py-2 text-right font-mono">{item.itbis_amount ? money(item.itbis_amount, currency) : "—"}</td>
                  ) : (
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {BILLING_INDICATORS.find((b) => b.code === item.billing_indicator)?.label}
                    </td>
                  )}
                  <td className="px-4 py-2 text-right font-mono">{money(item.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className={`grid gap-6 lg:grid-cols-2 ${isProviderEcf ? "print:grid-cols-2" : ""}`}>
          <div className="space-y-6">
            {/* Abajo a la izquierda en la impresión, como pide el Informe Técnico. */}
            {isProviderEcf && <EcfPrintBlock ecf={ecf} />}
            {ecf && (
              <section className={`rounded-lg border border-slate-200 bg-white p-4 text-sm ${isProviderEcf ? "print:hidden" : ""}`}>
                <h2 className="mb-2 font-semibold text-slate-900">Comprobante electrónico</h2>
                <dl className="space-y-1">
                  <Row label="e-NCF" value={ecf.encf} mono />
                  <Row label="Código de seguridad" value={ecf.security_code ?? "Pendiente"} mono />
                  {/* El texto del proveedor, igual al del QR; su hora no se reinterpreta. */}
                  {isProviderEcf
                    ? ecf.provider_signed_date && <Row label="Firma" value={ecf.provider_signed_date} mono />
                    : ecf.sign_date && <Row label="Firma" value={new Date(ecf.sign_date).toLocaleString("es-DO", { timeZone: "America/Santo_Domingo" })} />}
                  {ecf.track_id && <Row label={isProviderEcf ? "Número de seguimiento de la DGII" : "TrackId"} value={ecf.track_id} mono />}
                  <Row
                    label="Origen"
                    value={ecf.source === "externo" ? "Emitido fuera del sistema" : isProviderEcf ? "Proveedor autorizado (MSeller)" : "Emisión directa"}
                  />
                  {isProviderEcf && <Row label="Estado en la DGII" value={ECF_STATUS_WORDING[ecf.dgii_status] ?? ecf.provider_status ?? ecf.dgii_status} />}
                </dl>
                {timbreUrl && (
                  <a
                    href={timbreUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="billing-no-print mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-800 underline"
                  >
                    Verificar en la DGII
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </section>
            )}

            {notes.length > 0 && (
              <section className="billing-no-print rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <h2 className="mb-2 font-semibold text-slate-900">Notas vinculadas</h2>
                <ul className="space-y-1">
                  {notes.map((note) => (
                    <li key={note.id} className="flex items-center justify-between gap-3">
                      <Link href={`/finanzas/facturas/${note.id}`} className="underline">
                        {note.ncf ?? note.invoice_number}
                      </Link>
                      <span className="text-slate-600">{FISCAL_TYPES[note.fiscal_type as FiscalType]?.name}</span>
                      <span className="font-mono">{money(note.total, currency)}</span>
                      <StatusBadge status={note.status} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {payments.length > 0 && (
              // En un e-CF el QR debe quedar abajo a la izquierda: los cobros no se imprimen debajo.
              <section className={`rounded-lg border border-slate-200 bg-white p-4 text-sm ${isProviderEcf ? "print:hidden" : ""}`}>
                <h2 className="mb-2 font-semibold text-slate-900">Cobros</h2>
                <ul className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <div className={payment.voided_at ? "text-slate-400 line-through" : ""}>
                        <span className="font-medium">{payment.receipt_number}</span>{" "}
                        <span className="text-slate-500">
                          {formatIsoDate(payment.payment_date)} · {payment.payment_method}
                          {payment.reference_number ? ` · ${payment.reference_number}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono ${payment.voided_at ? "text-slate-400 line-through" : ""}`}>
                          {money(payment.amount, payment.currency)}
                        </span>
                        {!payment.voided_at && ctx.can.voidPayment && (
                          <VoidPaymentButton paymentId={payment.id} receipt={payment.receipt_number} />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <dl className="space-y-1.5 text-sm">
              {totals
                .filter((row) => !(row.hideZero && row.value === 0))
                .map((row) => (
                  <div
                    key={row.label}
                    className={`flex justify-between ${row.strong ? "border-t border-slate-200 pt-1.5 font-semibold text-slate-900" : "text-slate-600"}`}
                  >
                    <dt>{row.label}</dt>
                    <dd className="font-mono">{money(row.value, currency)}</dd>
                  </div>
                ))}
              {invoice.fiscal_type !== "34" && invoice.amount_due !== invoice.total && (
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                  <dt>A pagar por el cliente</dt>
                  <dd className="font-mono">{money(invoice.amount_due, currency)}</dd>
                </div>
              )}
              {!isDraft && invoice.fiscal_type !== "34" && (
                <>
                  {invoice.paid_amount > 0 && <TotalsRow label="Cobrado" value={-invoice.paid_amount} currency={currency} />}
                  {invoice.credited_due > 0 && <TotalsRow label="Notas de crédito" value={-invoice.credited_due} currency={currency} />}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900">
                    <dt>Saldo</dt>
                    <dd className="font-mono">{money(invoice.balance_due, currency)}</dd>
                  </div>
                  {inFavor > 0 && (
                    <div className="flex justify-between font-semibold text-emerald-800">
                      <dt>Saldo a favor del cliente</dt>
                      <dd className="font-mono">{money(inFavor, currency)}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </section>
        </div>

        {invoice.notes && (
          <section className="billing-no-print rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <h2 className="mb-1 font-semibold text-slate-900">Notas internas</h2>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </section>
        )}
      </div>
    </div>
  );
}

function Notice({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div role="status" className="billing-no-print flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function TotalsRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <dt>{label}</dt>
      <dd className="font-mono">{money(value, currency)}</dd>
    </div>
  );
}
