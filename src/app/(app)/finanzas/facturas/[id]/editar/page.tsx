import { notFound, redirect } from "next/navigation";
import type { FiscalType, IncomeType, ModificationCode, PaymentType } from "@/domain/billing";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { itemsToEditorLines } from "@/features/billing/components/editor-mapping";
import { InvoiceEditor, type EditorParent } from "@/features/billing/components/InvoiceEditor";
import { BillingService } from "@/services/billing/BillingService";
import { getBillingContext } from "@/services/billing/context";

export default async function EditarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} />;
  if (!ctx.can.create) return <NoPermission />;

  const { id } = await params;
  const service = new BillingService(ctx);
  const [detail, clients, settings] = await Promise.all([
    service.getInvoice(id),
    service.listClients(),
    service.getSettings(),
  ]);
  if (!detail) notFound();
  const { invoice, items } = detail;
  if (invoice.status !== "borrador") redirect(`/finanzas/facturas/${id}`);

  let parent: EditorParent | undefined;
  if (invoice.modifies_invoice_id) {
    const source = await service.getInvoice(invoice.modifies_invoice_id);
    if (source?.invoice.ncf) {
      parent = {
        id: source.invoice.id,
        invoiceNumber: source.invoice.invoice_number,
        ncf: source.invoice.ncf,
        issueDate: source.invoice.issue_date,
        fiscalType: source.invoice.fiscal_type as FiscalType,
        total: source.invoice.total,
        creditedAmount: source.invoice.credited_amount,
        buyerName: source.invoice.buyer_snapshot?.name ?? "",
        lines: itemsToEditorLines(source.items),
      };
    }
  }

  // Un cliente archivado no sale en la lista, pero el borrador debe conservarlo.
  if (invoice.client_id && !clients.some((client) => client.id === invoice.client_id)) {
    const archived = await service.getClient(invoice.client_id);
    if (archived) clients.push(archived);
  }

  return (
    <InvoiceEditor
      clients={clients}
      parent={parent}
      defaultDueDays={settings?.default_due_days ?? 30}
      initial={{
        id: invoice.id,
        fiscalType: invoice.fiscal_type as FiscalType,
        clientId: invoice.client_id,
        issueDate: invoice.issue_date,
        dueDate: invoice.payment_type === 2 ? invoice.due_date : null,
        currency: invoice.currency,
        exchangeRate: invoice.exchange_rate ?? 1,
        incomeType: invoice.income_type as IncomeType,
        paymentType: invoice.payment_type as PaymentType,
        paymentTerm: invoice.payment_terms ?? "",
        notes: invoice.notes ?? "",
        itbisWithholdingRate: invoice.itbis_withholding_rate,
        isrWithholdingRate: invoice.isr_withholding_rate,
        modificationCode: invoice.modification_code as ModificationCode | null,
        modificationReason: invoice.modification_reason ?? "",
        lines: itemsToEditorLines(items),
      }}
    />
  );
}
