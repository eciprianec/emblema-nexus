import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FISCAL_TYPES, PROVIDER_FISCAL_TYPES } from "@/domain/billing";
import type { EcfRecordRow } from "@/services/billing/types";
import { EcfPrintBlock } from "./EcfPrintBlock";
import { EcfPrintHeader } from "./EcfPrintHeader";

const header = (overrides: Partial<Parameters<typeof EcfPrintHeader>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(EcfPrintHeader, {
      fiscalType: "31",
      ncf: "E310000000001",
      issueDate: "2026-11-03",
      sequenceExpiresOn: "2028-12-31",
      modifiedNcf: null,
      modificationCode: null,
      emitter: { rnc: "131880738", legalName: "Empresa SRL", tradeName: "Marca", address: "Santo Domingo" },
      buyer: { name: "Cliente SRL", taxId: "101672919" },
      ...overrides,
    })
  );

/** Texto de un bloque del encabezado, sin etiquetas. */
function block(html: string, name: string): string {
  const start = html.indexOf(`data-print-block="${name}"`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = html.slice(start);
  const next = rest.indexOf("data-print-block", 10);
  return (next === -1 ? rest : rest.slice(0, next)).replace(/<[^>]+>/g, " ");
}

describe("encabezado de la representación impresa", () => {
  it("arriba a la derecha van el tipo en palabras, el e-NCF y la fecha de vencimiento", () => {
    const right = block(header(), "comprobante");
    expect(right).toContain("Factura de Crédito Fiscal Electrónica");
    expect(right).toContain("E310000000001");
    expect(right).toContain("Fecha Vencimiento: 31/12/2028");
    expect(right).not.toContain("Válido hasta");
  });

  it("arriba a la izquierda va el emisor con la fecha de emisión", () => {
    const left = block(header(), "emisor");
    expect(left).toContain("Marca");
    expect(left).toContain("Empresa SRL");
    expect(left).toContain("RNC 131880738");
    expect(left).toContain("Fecha de Emisión: 03/11/2026");
    expect(left).not.toContain("E310000000001");
  });

  it("el emisor va antes que el comprobante, y el comprador debajo de ambos", () => {
    const html = header();
    const emitter = html.indexOf('data-print-block="emisor"');
    const document = html.indexOf('data-print-block="comprobante"');
    const buyer = html.indexOf('data-print-block="comprador"');
    expect(emitter).toBeLessThan(document);
    expect(document).toBeLessThan(buyer);
    expect(block(html, "comprador")).toContain("Cliente SRL");
  });

  it("una nota lleva el e-NCF modificado y el código en palabras a la derecha", () => {
    const right = block(header({ fiscalType: "34", sequenceExpiresOn: null, modifiedNcf: "E310000000009", modificationCode: 3 }), "comprobante");
    expect(right).toContain("Nota de Crédito Electrónica");
    expect(right).toContain("e-NCF Modificado");
    expect(right).toContain("E310000000009");
    expect(right).toContain("Corrige montos del NCF modificado");
    expect(right).not.toContain("Fecha Vencimiento");
  });

  it("todos los tipos del proveedor tienen su denominación oficial, y los de NCF no cambian", () => {
    expect(PROVIDER_FISCAL_TYPES.map((code) => FISCAL_TYPES[code].ecfName)).toEqual([
      "Factura de Crédito Fiscal Electrónica",
      "Factura de Consumo Electrónica",
      "Nota de Débito Electrónica",
      "Nota de Crédito Electrónica",
      "Comprobante Electrónico Gubernamental",
    ]);
    expect(FISCAL_TYPES["31"].name).toBe("Factura de Crédito Fiscal");
    expect(FISCAL_TYPES["45"].name).toBe("Gubernamental");
  });
});

const baseEcf: EcfRecordRow = {
  id: "e",
  encf: "E320000000001",
  security_code: "aB3xYz",
  sign_date: null,
  track_id: null,
  dgii_status: "aceptado",
  source: "proveedor",
  environment: "DEV",
  qr_code_url: "https://fc.dgii.gov.do/testecf/consultatimbrefc?encf=E320000000001",
  dgii_messages: null,
  provider_phase: "enviado",
  provider_status: "Aceptado",
  provider_signed_date: null,
  provider_error: null,
  secuencia_utilizada: true,
  send_attempts: 1,
  number_parked_at: null,
  created_at: "2026-11-03T00:00:00Z",
};

const printBlock = async (ecf: Partial<EcfRecordRow>) => renderToStaticMarkup(await EcfPrintBlock({ ecf: { ...baseEcf, ...ecf } }));

describe("datos de consulta", () => {
  it("imprime el QR de la DGII y el código tal cual", async () => {
    const html = await printBlock({});
    expect(html).toContain("<svg");
    expect(html).toContain("aB3xYz");
  });

  it.each(["https://evil.example/phish", "javascript:alert(1)", "https://ecf.dgii.gov.do@evil.example/x", "http://ecf.dgii.gov.do/x"])(
    "no imprime un QR que no lleve a la DGII: %s",
    async (url) => {
      expect(await printBlock({ qr_code_url: url })).not.toContain("<svg");
    }
  );

  it("en consumo sin fecha lo avisa en pantalla y no lo imprime en el documento del cliente", async () => {
    const html = await printBlock({});
    expect(html).toContain("No disponible: pídela al proveedor");
    expect(html).not.toContain("Pendiente");
    const start = html.lastIndexOf("<div", html.indexOf("Fecha de firma digital"));
    expect(html.slice(start, html.indexOf("Fecha de firma digital"))).toContain("print:hidden");
  });

  it("con fecha, la línea sí se imprime", async () => {
    const html = await printBlock({ provider_signed_date: "14-05-2025 03:26:18" });
    const start = html.lastIndexOf("<div", html.indexOf("Fecha de firma digital"));
    expect(html.slice(start, html.indexOf("Fecha de firma digital"))).not.toContain("print:hidden");
  });

  it("mientras está en proceso, lo que falta sí está pendiente", async () => {
    const html = await printBlock({ dgii_status: "enviado", security_code: null, qr_code_url: null });
    expect(html).toContain("Pendiente");
    expect(html).toContain("cuando el proveedor confirme");
  });

  it("muestra la fecha tal como vino, sin reinterpretarla", async () => {
    expect(await printBlock({ provider_signed_date: "14-05-2025 03:26:18" })).toContain("14-05-2025 03:26:18");
  });
});
