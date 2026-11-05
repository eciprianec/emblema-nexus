"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { todayInDr } from "@/domain/billing";
import { isUuid } from "@/features/clients/mapping";
import { quoteToEditorInitial } from "@/features/finance/quote-invoice";
import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import type { BillingClient } from "@/services/billing/types";
import { InvoiceEditor } from "./InvoiceEditor";

interface QuoteInvoiceEditorProps {
  quoteId: string;
  clients: BillingClient[];
  defaultClientId?: string;
  defaultDueDays: number;
}

const noticeClass = "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900";
const subscribeToNothing = () => () => {};

/** Las cotizaciones siguen en localStorage: el servidor no las ve y el formulario se monta ya en el navegador. */
export function QuoteInvoiceEditor(props: QuoteInvoiceEditorProps) {
  const inBrowser = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  if (!inBrowser) return <p className="text-xs text-slate-500">Cargando la cotización…</p>;
  return <PrefilledEditor key={props.quoteId} {...props} />;
}

function PrefilledEditor({ quoteId, clients, defaultClientId, defaultDueDays }: QuoteInvoiceEditorProps) {
  // Se lee una vez: guardar el borrador cambia la cotización y el aviso no debe saltar antes de salir de la página.
  const [quote] = useState(() => useFinanceStore.getState().quotes.find((q) => q.id === quoteId));
  const [initial] = useState(() =>
    quote
      ? quoteToEditorInitial(quote, {
          clientIds: clients.map((client) => client.id),
          today: todayInDr(),
          defaultDueDays,
        })
      : undefined
  );

  return (
    <div className="space-y-4">
      {!quote && (
        <p role="alert" className={noticeClass}>
          Esta cotización no está guardada en este navegador, así que sus líneas no se pudieron cargar.
        </p>
      )}
      {quote && isUuid(quote.convertedInvoiceId) && (
        <p role="alert" className={noticeClass}>
          La cotización {quote.number} ya tiene una{" "}
          <Link href={`/finanzas/facturas/${quote.convertedInvoiceId}`} className="font-medium underline">
            factura
          </Link>
          . Si guardas este borrador, la cotización apuntará al nuevo.
        </p>
      )}
      {quote && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Datos de la cotización <strong>{quote.number}</strong>. Revisa el tipo de comprobante y el ITBIS de cada línea
          antes de guardar.
        </p>
      )}
      {quote && !initial?.clientId && (
        <p role="alert" className={noticeClass}>
          El cliente de la cotización ({quote.clientName}
          {quote.clientRncCedula ? `, ${quote.clientRncCedula}` : ""}) no está entre los clientes registrados. Selecciónalo
          o créalo.
        </p>
      )}
      <InvoiceEditor
        clients={clients}
        initial={initial}
        defaultClientId={defaultClientId}
        defaultDueDays={defaultDueDays}
        onSaved={(invoiceId) => {
          if (quote) useFinanceStore.getState().markQuoteInvoiced(quote.id, invoiceId);
        }}
      />
    </div>
  );
}
