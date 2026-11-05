import { notFound, redirect } from "next/navigation";
import { FISCAL_TYPES, todayInDr, type FiscalType, type IncomeType, type PaymentType } from "@/domain/billing";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { itemsToEditorLines } from "@/features/billing/components/editor-mapping";
import { InvoiceEditor, type EditorInitial, type EditorParent } from "@/features/billing/components/InvoiceEditor";
import { QuoteInvoiceEditor } from "@/features/billing/components/QuoteInvoiceEditor";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: Promise<{ nota?: string; de?: string; cliente?: string; cotizacion?: string }>;
}) {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} />;
  if (!ctx.can.create) return <NoPermission />;

  const service = new BillingService(ctx);
  const [clients, settings] = await Promise.all([service.listClients(), service.getSettings()]);
  const { nota, de, cliente, cotizacion } = await searchParams;
  const defaultClientId = clients.some((client) => client.id === cliente) ? cliente : undefined;
  const defaultDueDays = settings?.default_due_days ?? 30;

  let parent: EditorParent | undefined;
  let initial: EditorInitial | undefined;

  if (nota || de) {
    if ((nota !== "33" && nota !== "34") || !de) notFound();
    const detail = await service.getInvoice(de);
    if (!detail) notFound();
    const source = detail.invoice;
    // Solo se modifica un comprobante vigente; una nota no se modifica con otra nota.
    if (!source.ncf || source.status === "anulada" || source.status === "en_proceso" || FISCAL_TYPES[source.fiscal_type as FiscalType].kind !== "factura") {
      redirect(`/finanzas/facturas/${de}`);
    }

    const lines = itemsToEditorLines(detail.items);
    parent = {
      id: source.id,
      invoiceNumber: source.invoice_number,
      ncf: source.ncf,
      issueDate: source.issue_date,
      fiscalType: source.fiscal_type as FiscalType,
      total: source.total,
      creditedAmount: source.credited_amount,
      buyerName: source.buyer_snapshot?.name ?? "",
      lines,
    };
    initial = {
      fiscalType: nota,
      clientId: source.client_id,
      issueDate: todayInDr(),
      dueDate: null,
      currency: source.currency,
      exchangeRate: source.exchange_rate ?? 1,
      incomeType: source.income_type as IncomeType,
      paymentType: (source.payment_type === 3 ? 1 : source.payment_type) as PaymentType,
      paymentTerm: "",
      notes: "",
      itbisWithholdingRate: source.itbis_withholding_rate,
      isrWithholdingRate: source.isr_withholding_rate,
      modificationCode: 3,
      modificationReason: "",
      lines,
    };
  }

  if (cotizacion && !parent) {
    return (
      <QuoteInvoiceEditor
        quoteId={cotizacion}
        clients={clients}
        defaultClientId={defaultClientId}
        defaultDueDays={defaultDueDays}
      />
    );
  }

  return (
    <InvoiceEditor
      clients={clients}
      initial={initial}
      parent={parent}
      defaultClientId={defaultClientId}
      defaultDueDays={defaultDueDays}
    />
  );
}
