import { addDays, type GoodOrService } from "@/domain/billing";
import type { EditorInitial, EditorLine } from "@/features/billing/components/InvoiceEditor";
import { isUuid } from "@/features/clients/mapping";
import type { ItemType, Quote } from "./types";

/** Una cotización con un cliente antiguo abre la factura sin cliente: `cliente` solo admite identificadores reales. */
export function quoteInvoiceHref(quote: Pick<Quote, "id" | "clientId">): string {
  const params = new URLSearchParams({ cotizacion: quote.id });
  if (isUuid(quote.clientId)) params.set("cliente", quote.clientId);
  return `/finanzas/facturas/nueva?${params}`;
}

const BILLING_ITEM_TYPES: Record<ItemType, string> = {
  honorarios: "honorarios",
  gastos_legales: "otro",
  tasas_catastrales: "tasa_catastral",
  agrimensura: "servicio",
  comision_inmobiliaria: "servicio",
  otro: "otro",
};

const SERVICE: GoodOrService = 2;
const UNIT_CODE_SERVICE = 43;

/**
 * Solo prepara un borrador: el comprobante lo numera el módulo de facturación al emitir.
 * Una línea sin ITBIS se propone como exenta; si es un suplido, se cambia en el formulario.
 */
export function quoteToEditorInitial(
  quote: Quote,
  { clientIds, today, defaultDueDays }: { clientIds: string[]; today: string; defaultDueDays: number }
): EditorInitial {
  const origin = [`Cotización ${quote.number}`, quote.caseNumber && `Expediente ${quote.caseNumber}`]
    .filter(Boolean)
    .join(" · ");

  const lines: EditorLine[] = quote.items.map((item, index) => ({
    key: `cotizacion-${index}`,
    description: item.description,
    details: "",
    itemType: BILLING_ITEM_TYPES[item.itemType] ?? "otro",
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    discount: "",
    billingIndicator: item.appliesTax ? 1 : 4,
    goodOrService: SERVICE,
    unitCode: UNIT_CODE_SERVICE,
  }));

  return {
    fiscalType: "31",
    clientId: clientIds.includes(quote.clientId) ? quote.clientId : null,
    issueDate: today,
    dueDate: addDays(today, defaultDueDays),
    currency: quote.currency,
    // La cotización no guarda tasa: en dólares se pide al facturar, como al elegir USD en el formulario.
    exchangeRate: quote.currency === "DOP" ? 1 : 0,
    incomeType: "01",
    paymentType: 2,
    paymentTerm: "",
    notes: quote.notes ? `${origin}\n${quote.notes}` : origin,
    itbisWithholdingRate: 0,
    isrWithholdingRate: 0,
    modificationCode: null,
    modificationReason: "",
    lines,
  };
}
