import { cn } from "@/lib/utils";
import { INVOICE_STATUS_LABELS, NON_PROD_ECF_LEGEND, type InvoiceStatus } from "@/domain/billing";

export function StatusBadge({ status, environment }: { status: string; environment?: string | null }) {
  const info = INVOICE_STATUS_LABELS[status as InvoiceStatus] ?? INVOICE_STATUS_LABELS.borrador;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", info.className)}>
        {info.label}
      </span>
      {environment && environment !== "prod" && (
        <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800">
          {NON_PROD_ECF_LEGEND}
        </span>
      )}
    </span>
  );
}
