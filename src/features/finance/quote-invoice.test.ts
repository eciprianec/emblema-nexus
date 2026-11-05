import { describe, expect, it } from "vitest";
import { quoteInvoiceHref, quoteToEditorInitial } from "./quote-invoice";
import type { Quote } from "./types";

const CLIENT_ID = "6f1c2c1e-3a54-4b7e-9d2a-0c8e5f7a1b23";

const quote: Quote = {
  id: "quo-1730000000000",
  number: "COT-2024-0002",
  clientId: CLIENT_ID,
  clientName: "Ana Pérez",
  issueDate: "2026-10-01",
  validUntil: "2026-10-31",
  currency: "DOP",
  items: [
    { id: "a", description: "Honorarios", itemType: "honorarios", quantity: 2, unitPrice: 1500.5, appliesTax: true, total: 3001 },
    { id: "b", description: "Tasa", itemType: "tasas_catastrales", quantity: 1, unitPrice: 300, appliesTax: false, total: 300 },
  ],
  subtotal: 3301,
  taxTotal: 540.18,
  total: 3841.18,
  status: "aprobada",
  createdAt: "2026-10-01T00:00:00.000Z",
};

const options = { clientIds: [CLIENT_ID], today: "2026-11-02", defaultDueDays: 30 };

describe("quoteInvoiceHref", () => {
  it("incluye el cliente cuando es real", () => {
    const url = new URL(quoteInvoiceHref(quote), "http://x");
    expect(url.pathname).toBe("/finanzas/facturas/nueva");
    expect(url.searchParams.get("cotizacion")).toBe(quote.id);
    expect(url.searchParams.get("cliente")).toBe(CLIENT_ID);
  });

  it("omite un cliente antiguo", () => {
    const url = new URL(quoteInvoiceHref({ ...quote, clientId: "cl-1730000000000" }), "http://x");
    expect(url.searchParams.has("cliente")).toBe(false);
  });
});

describe("quoteToEditorInitial", () => {
  it("lleva cliente y líneas al formulario", () => {
    const initial = quoteToEditorInitial(quote, options);
    expect(initial.clientId).toBe(CLIENT_ID);
    expect(initial.dueDate).toBe("2026-12-02");
    expect(initial.lines.map((l) => [l.description, l.quantity, l.unitPrice, l.billingIndicator, l.itemType])).toEqual([
      ["Honorarios", "2", "1500.5", 1, "honorarios"],
      ["Tasa", "1", "300", 4, "tasa_catastral"],
    ]);
  });

  it("no preselecciona un cliente que no existe en la empresa", () => {
    expect(quoteToEditorInitial({ ...quote, clientId: "cl-1730000000000" }, options).clientId).toBeNull();
    expect(quoteToEditorInitial(quote, { ...options, clientIds: [] }).clientId).toBeNull();
  });

  it("no inventa la tasa de una cotización en dólares", () => {
    expect(quoteToEditorInitial(quote, options).exchangeRate).toBe(1);
    expect(quoteToEditorInitial({ ...quote, currency: "USD" }, options).exchangeRate).toBe(0);
  });

  it("deja constancia de la cotización y el expediente", () => {
    const { notes } = quoteToEditorInitial({ ...quote, caseNumber: "EXP-7", notes: "Pago en dos partes" }, options);
    expect(notes).toBe("Cotización COT-2024-0002 · Expediente EXP-7\nPago en dos partes");
  });
});
