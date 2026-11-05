import type { BillingIndicator, GoodOrService } from "@/domain/billing";
import type { InvoiceItemRow } from "@/services/billing/types";
import type { EditorLine } from "./InvoiceEditor";

export function itemsToEditorLines(items: InvoiceItemRow[]): EditorLine[] {
  return items.map((item) => ({
    key: item.id,
    description: item.description,
    details: item.details ?? "",
    itemType: item.item_type,
    quantity: String(item.quantity),
    unitPrice: String(item.unit_price),
    discount: item.discount_amount ? String(item.discount_amount) : "",
    billingIndicator: item.billing_indicator as BillingIndicator,
    goodOrService: item.good_or_service as GoodOrService,
    unitCode: item.unit_code,
  }));
}
