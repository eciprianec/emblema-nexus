import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { attemptClosing, describeProviderMessages } from "./provider-messages";
import { ProviderMessages } from "./ProviderMessages";

describe("mensajes del proveedor", () => {
  it("traduce el campo a las palabras del formulario y deja lo original aparte", () => {
    const view = describeProviderMessages([
      { codigo: "REQUIRED", valor: "ECF.Encabezado.Comprador.RNCComprador" },
      { codigo: "TIPO_ECF_MISMATCH", valor: "ECF.Encabezado.IdDoc.TipoeCF", detalle: "TipoeCF (322) no coincide" },
    ]);
    expect(view.readable).toEqual(["RNC o cédula del comprador: falta este dato.", "Tipo de comprobante: revisa este dato."]);
    expect(view.technical).toEqual([
      "[REQUIRED] ECF.Encabezado.Comprador.RNCComprador",
      "[TIPO_ECF_MISMATCH] ECF.Encabezado.IdDoc.TipoeCF: TipoeCF (322) no coincide",
    ]);
  });

  it("un campo desconocido no enseña códigos en inglés", () => {
    const view = describeProviderMessages([{ codigo: "STUB_VALIDATION", valor: "ECF" }]);
    expect(view.readable).toEqual(["Un dato del comprobante no es válido."]);
    expect(view.readable.join()).not.toContain("STUB_VALIDATION");
    expect(view.technical).toEqual(["[STUB_VALIDATION] ECF"]);
  });

  it("usa la sección cuando no conoce el campo exacto, y no repite lo mismo", () => {
    const view = describeProviderMessages([
      { codigo: "X", valor: "ECF.Encabezado.Totales.MontoGravadoI1" },
      { codigo: "Y", valor: "ECF.Encabezado.Totales.ITBIS1" },
      { codigo: "Z", valor: "ECF.DetallesItems.Item[0].OtroCampo" },
    ]);
    expect(view.readable).toEqual(["Totales del comprobante: revisa este dato.", "Una línea del comprobante: revisa este dato."]);
    expect(view.technical).toHaveLength(3);
  });

  it("lo que dice la DGII ya está en español y se muestra igual", () => {
    expect(describeProviderMessages([{ codigo: 1924, valor: "Excede la tolerancia" }])).toEqual({
      readable: ["1924: Excede la tolerancia"],
      technical: [],
    });
    expect(describeProviderMessages(null)).toEqual({ readable: [], technical: [] });
  });

  it("el detalle técnico queda plegado", () => {
    const html = renderToStaticMarkup(createElement(ProviderMessages, { messages: [{ codigo: "REQUIRED", valor: "ECF.Encabezado.IdDoc.eNCF" }] }));
    expect(html).toContain("Número e-NCF: falta este dato.");
    expect(html.indexOf("<details")).toBeLessThan(html.indexOf("[REQUIRED]"));
    expect(html).toContain("Detalle técnico");
    expect(renderToStaticMarkup(createElement(ProviderMessages, { messages: [] }))).toBe("");
  });
});

describe("qué hacer después de un intento fallido", () => {
  it("un dato inválido o un rechazo de la DGII se corrige en el borrador", () => {
    const fix = "Corrige el borrador y vuelve a emitir.";
    expect(attemptClosing({ provider_phase: "no_enviado", provider_error: "x", dgii_messages: [{ codigo: "REQUIRED", valor: "ECF" }] }).text).toBe(fix);
    expect(attemptClosing({ provider_phase: "enviado", provider_error: null, dgii_messages: [] }).text).toBe(fix);
  });

  it("una API Key mala lleva a la configuración, no al borrador", () => {
    const closing = attemptClosing({
      provider_phase: "no_enviado",
      provider_error: "El proveedor rechazó la API Key o no tiene permisos para este ambiente; revísala en la configuración.",
      dgii_messages: [],
    });
    expect(closing.toSettings).toBe(true);
    expect(closing.text).not.toContain("Corrige el borrador");
  });

  it("si el proveedor no estaba disponible, el borrador tampoco es el problema", () => {
    const closing = attemptClosing({ provider_phase: "no_enviado", provider_error: "No se pudo conectar con el proveedor.", dgii_messages: null });
    expect(closing).toEqual({ text: "El borrador está bien: vuelve a emitir cuando se resuelva.", toSettings: false });
  });
});
