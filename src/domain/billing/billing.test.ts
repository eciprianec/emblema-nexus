import { describe, expect, it } from "vitest";
import { calculateDocument, type LineInput } from "./calculate";
import { addDays, todayInDr, toDgiiDate, toDgiiDateTime } from "./dates";
import type { FiscalDocument } from "./document";
import { buildTimbreUrl, isDgiiQrUrl, toEcfDocument, type EcfNode } from "./ecf-mapper";
import {
  encfMatchesType,
  formatSequence,
  isCedulaChecksumValid,
  isRncChecksumValid,
  isValidEncf,
  isValidNcf,
} from "./fiscal-numbers";
import { divRound, fixed2, rescale, toScaled } from "./money";
import { customerCredit, effectiveStatus, hasBlockingIssues, validateForIssue } from "./rules";

const line = (over: Partial<LineInput> = {}): LineInput => ({
  description: "Honorarios",
  quantity: 1,
  unitPrice: 1000,
  billingIndicator: 1,
  ...over,
});

const baseDoc = (over: Partial<FiscalDocument> = {}): FiscalDocument => ({
  fiscalType: "31",
  issueDate: "2026-11-01",
  currency: "DOP",
  exchangeRate: 1,
  incomeType: "01",
  paymentType: 1,
  buyer: { taxId: "131880738", name: "Cliente SRL" },
  lines: [line()],
  ...over,
});

const errorsOf = (doc: FiscalDocument, today = "2026-11-01") =>
  validateForIssue(doc, today).filter((i) => i.severity === "error").map((i) => i.field);

describe("dinero", () => {
  it("no arrastra errores de punto flotante", () => {
    expect(toScaled(0.1, 2) + toScaled(0.2, 2)).toBe(toScaled(0.3, 2));
    expect(toScaled("1.005", 2)).toBe(BigInt(101));
    expect(toScaled("-1.005", 2)).toBe(BigInt(-101));
  });

  it("redondea a la mitad hacia arriba", () => {
    expect(divRound(BigInt(15), BigInt(10))).toBe(BigInt(2));
    expect(divRound(BigInt(14), BigInt(10))).toBe(BigInt(1));
    expect(divRound(BigInt(-15), BigInt(10))).toBe(BigInt(-2));
    expect(rescale(BigInt(123456), 4, 2)).toBe(BigInt(1235));
  });

  it("rechaza valores no numéricos", () => {
    expect(() => toScaled("abc", 2)).toThrow();
    expect(() => toScaled(Number.NaN, 2)).toThrow();
  });

  it("formatea sin separadores de miles", () => {
    expect(fixed2(1234567.5)).toBe("1234567.50");
    expect(fixed2(0)).toBe("0.00");
  });
});

describe("cálculo del comprobante", () => {
  it("aplica ITBIS 18 % sin incluirlo en el monto de la línea", () => {
    const t = calculateDocument([line()]);
    expect(t.taxable18).toBe(1000);
    expect(t.itbis18).toBe(180);
    expect(t.total).toBe(1180);
    expect(t.lines[0].amount).toBe(1000);
    expect(t.lines[0].total).toBe(1180);
  });

  it("calcula el descuento antes del ITBIS, a diferencia del servicio anterior", () => {
    const t = calculateDocument([line({ discount: 100 })]);
    expect(t.lines[0].amount).toBe(900);
    expect(t.itbis18).toBe(162);
    expect(t.total).toBe(1062);
  });

  it("separa tasas, exento y no facturable como en el formato oficial", () => {
    const t = calculateDocument([
      line({ unitPrice: 1000, billingIndicator: 1 }),
      line({ unitPrice: 1000, billingIndicator: 2 }),
      line({ unitPrice: 1000, billingIndicator: 3 }),
      line({ unitPrice: 1000, billingIndicator: 4 }),
      line({ unitPrice: 500, billingIndicator: 0 }),
    ]);
    expect(t.taxable18).toBe(1000);
    expect(t.taxable16).toBe(1000);
    expect(t.taxable0).toBe(1000);
    expect(t.taxableTotal).toBe(3000);
    expect(t.exempt).toBe(1000);
    expect(t.nonBillable).toBe(500);
    expect(t.itbis18).toBe(180);
    expect(t.itbis16).toBe(160);
    // MontoTotal = gravado + exento + ITBIS; el no facturable queda fuera.
    expect(t.total).toBe(4340);
    expect(t.amountDue).toBe(4840);
  });

  it("calcula el ITBIS sobre el total por tasa y lo reparte sin descuadre", () => {
    // El total por tasa manda: 1.00 × 18 % = 0.18, y la suma de las líneas debe dar lo mismo.
    const t = calculateDocument([
      line({ unitPrice: 0.33 }),
      line({ unitPrice: 0.33 }),
      line({ unitPrice: 0.34 }),
    ]);
    expect(t.taxable18).toBe(1);
    expect(t.itbis18).toBe(0.18);
    const suma = t.lines.reduce((acc, l) => acc + Math.round(l.itbis * 100), 0);
    expect(suma).toBe(18);
  });

  it("reparte el redondeo con muchas líneas pequeñas", () => {
    const lines = Array.from({ length: 7 }, () => line({ unitPrice: 0.07 }));
    const t = calculateDocument(lines);
    expect(t.taxable18).toBe(0.49);
    expect(t.itbis18).toBe(0.09);
    expect(t.lines.reduce((acc, l) => acc + Math.round(l.itbis * 100), 0)).toBe(9);
  });

  it("acepta cantidad y precio con decimales del formato", () => {
    const t = calculateDocument([line({ quantity: "1.50", unitPrice: "33.3333" })]);
    expect(t.lines[0].amount).toBe(50);
  });

  it("calcula retenciones y las descuenta de lo que paga el cliente", () => {
    const t = calculateDocument([line({ unitPrice: 10000 })], { itbisRate: 30, isrRate: 10 });
    expect(t.itbis18).toBe(1800);
    expect(t.itbisWithheld).toBe(540);
    expect(t.isrWithheld).toBe(1000);
    expect(t.total).toBe(11800);
    expect(t.amountDue).toBe(10260);
  });

  it("no retiene ISR sobre suplidos no facturables", () => {
    const t = calculateDocument([line({ unitPrice: 500, billingIndicator: 0 })], { isrRate: 10 });
    expect(t.isrWithheld).toBe(0);
  });

  it("rechaza líneas imposibles", () => {
    expect(() => calculateDocument([line({ quantity: 0 })])).toThrow(/cantidad/);
    expect(() => calculateDocument([line({ unitPrice: -1 })])).toThrow(/precio/);
    expect(() => calculateDocument([line({ discount: 2000 })])).toThrow(/descuento/);
  });
});

describe("números fiscales", () => {
  it("distingue NCF (11) de e-NCF (13)", () => {
    expect(isValidNcf("B0100000001")).toBe(true);
    expect(isValidNcf("B01000000011")).toBe(false);
    expect(isValidEncf("E310000000001")).toBe(true);
    expect(isValidEncf("E3100000001")).toBe(false);
  });

  it("genera secuencias con la longitud oficial", () => {
    expect(formatSequence("E31", 1)).toBe("E310000000001");
    expect(formatSequence("B01", 145)).toBe("B0100000145");
  });

  it("verifica que el e-NCF corresponda al tipo", () => {
    expect(encfMatchesType("E310000000001", "31")).toBe(true);
    expect(encfMatchesType("E320000000001", "31")).toBe(false);
  });

  it("valida dígitos verificadores con los RNC de los ejemplos de la DGII", () => {
    expect(isRncChecksumValid("131880738")).toBe(true);
    expect(isRncChecksumValid("101672919")).toBe(true);
    expect(isRncChecksumValid("131880739")).toBe(false);
    // Número sintético: no corresponde a ninguna persona.
    expect(isCedulaChecksumValid("00100000009")).toBe(true);
    expect(isCedulaChecksumValid("00100000008")).toBe(false);
  });
});

describe("fechas", () => {
  it("usa el día de RD aunque en UTC ya sea mañana", () => {
    expect(todayInDr(new Date("2026-11-02T01:00:00Z"))).toBe("2026-11-01");
    expect(todayInDr(new Date("2026-11-02T04:30:00Z"))).toBe("2026-11-02");
  });

  it("usa los formatos de la DGII", () => {
    expect(toDgiiDate("2026-11-01")).toBe("01-11-2026");
    expect(toDgiiDateTime("2026-11-02T01:05:09Z")).toBe("01-11-2026 21:05:09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("reglas de emisión", () => {
  it("acepta una factura de crédito fiscal completa", () => {
    expect(errorsOf(baseDoc())).toEqual([]);
  });

  it("exige comprador identificado en crédito fiscal y gubernamental", () => {
    expect(errorsOf(baseDoc({ buyer: {} }))).toEqual(expect.arrayContaining(["buyer.taxId", "buyer.name"]));
    expect(errorsOf(baseDoc({ fiscalType: "45", buyer: {} }))).toContain("buyer.taxId");
  });

  it("permite consumo anónimo solo por debajo de RD$250,000", () => {
    const anon = { taxId: "", name: "" };
    expect(errorsOf(baseDoc({ fiscalType: "32", buyer: anon }))).toEqual([]);
    const justBelow = [line({ unitPrice: "249999.99", billingIndicator: 4 })];
    expect(errorsOf(baseDoc({ fiscalType: "32", buyer: anon, lines: justBelow }))).toEqual([]);
    const exact = [line({ unitPrice: 250000, billingIndicator: 4 })];
    expect(errorsOf(baseDoc({ fiscalType: "32", buyer: anon, lines: exact }))).toContain("buyer.taxId");
  });

  it("evalúa el umbral en pesos al facturar en dólares", () => {
    const doc = baseDoc({
      fiscalType: "32",
      currency: "USD",
      exchangeRate: 60,
      buyer: {},
      lines: [line({ unitPrice: 5000, billingIndicator: 4 })],
    });
    expect(errorsOf(doc)).toContain("buyer.taxId");
  });

  it("acepta identificador extranjero en regímenes especiales y exportaciones", () => {
    const buyer = { foreignId: "P1234567", name: "Foreign LLC" };
    const exento = [line({ billingIndicator: 4 })];
    expect(errorsOf(baseDoc({ fiscalType: "44", buyer, lines: exento }))).toEqual([]);
    expect(errorsOf(baseDoc({ fiscalType: "46", buyer, lines: [line({ billingIndicator: 3 })] }))).toEqual([]);
    expect(errorsOf(baseDoc({ fiscalType: "44", buyer: { name: "X" }, lines: exento }))).toContain("buyer.taxId");
  });

  it("exige el indicador de facturación que el formato fija por tipo", () => {
    const buyer = { foreignId: "P1234567", name: "Foreign LLC" };
    expect(errorsOf(baseDoc({ fiscalType: "44", buyer }))).toContain("lines");
    expect(errorsOf(baseDoc({ fiscalType: "46", buyer }))).toContain("lines");
  });

  it("limita el identificador extranjero y el nombre comercial al largo del formato", () => {
    const buyer = (foreignId: string) => ({ foreignId, name: "Foreign LLC" });
    expect(errorsOf(baseDoc({ fiscalType: "44", buyer: buyer("x".repeat(20)), lines: [line({ billingIndicator: 4 })] }))).toEqual([]);
    expect(errorsOf(baseDoc({ fiscalType: "44", buyer: buyer("x".repeat(21)), lines: [line({ billingIndicator: 4 })] }))).toContain("buyer.foreignId");
    const fields = (tradeName: string) =>
      validateForIssue(baseDoc(), "2026-11-01", { tradeName }).filter((i) => i.severity === "error").map((i) => i.field);
    expect(fields("x".repeat(150))).not.toContain("emitter.tradeName");
    expect(fields("x".repeat(151))).toContain("emitter.tradeName");
  });

  it("rechaza identificaciones de largo inválido y solo advierte el dígito verificador", () => {
    expect(errorsOf(baseDoc({ buyer: { taxId: "12345", name: "X" } }))).toContain("buyer.taxId");
    const issues = validateForIssue(baseDoc({ buyer: { taxId: "131880739", name: "X" } }), "2026-11-01");
    expect(issues.map((i) => i.severity)).toEqual(["warning"]);
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("exige fecha límite válida en ventas a crédito", () => {
    expect(errorsOf(baseDoc({ paymentType: 2 }))).toContain("dueDate");
    expect(errorsOf(baseDoc({ paymentType: 2, dueDate: "2026-10-01" }))).toContain("dueDate");
    expect(errorsOf(baseDoc({ paymentType: 2, dueDate: "2026-12-01" }))).toEqual([]);
  });

  it("no admite entrega gratuita con crédito fiscal", () => {
    expect(errorsOf(baseDoc({ paymentType: 3 }))).toContain("paymentType");
    expect(errorsOf(baseDoc({ fiscalType: "32", paymentType: 3 }))).toEqual([]);
  });

  it("limita los campos a lo que admite el formato", () => {
    expect(errorsOf(baseDoc({ lines: [line({ description: "x".repeat(81) })] }))).toContain("lines.0");
    expect(errorsOf(baseDoc({ paymentTerm: "x".repeat(16) }))).toContain("paymentTerm");
  });

  it("no admite fecha de emisión futura", () => {
    expect(errorsOf(baseDoc({ issueDate: "2026-11-02" }))).toContain("issueDate");
  });

  it("solo admite retenciones en los tipos permitidos", () => {
    const withholding = { isrRate: 10 };
    expect(errorsOf(baseDoc({ withholding }))).toEqual([]);
    expect(errorsOf(baseDoc({ fiscalType: "32", withholding }))).toContain("withholding");
  });

  describe("notas", () => {
    const reference = {
      modifiedNumber: "E310000000001",
      modifiedDate: "2026-10-20",
      modifiedFiscalType: "31" as const,
      modifiedTotal: 1180,
      availableToCredit: 1180,
      code: 3 as const,
      reason: "Error en precio",
    };

    it("exigen referencia y no se aceptan en una factura", () => {
      expect(errorsOf(baseDoc({ fiscalType: "34" }))).toContain("reference");
      expect(errorsOf(baseDoc({ reference }))).toContain("reference");
    });

    it("admiten corrección parcial", () => {
      expect(errorsOf(baseDoc({ fiscalType: "34", reference, lines: [line({ unitPrice: 500 })] }))).toEqual([]);
    });

    it("no pueden superar lo acreditable", () => {
      const lines = [line({ unitPrice: 2000 })];
      expect(errorsOf(baseDoc({ fiscalType: "34", reference, lines }))).toContain("lines");
      const parcial = { ...reference, availableToCredit: 100 };
      expect(errorsOf(baseDoc({ fiscalType: "34", reference: parcial }))).toContain("lines");
    });

    it("para anular deben cubrir todo lo acreditable", () => {
      const anula = { ...reference, code: 1 as const };
      expect(errorsOf(baseDoc({ fiscalType: "34", reference: anula, lines: [line({ unitPrice: 500 })] }))).toContain("lines");
      expect(errorsOf(baseDoc({ fiscalType: "34", reference: anula, lines: [line()] }))).toEqual([]);
    });

    it("la corrección de texto va en cero", () => {
      const texto = { ...reference, code: 2 as const };
      expect(errorsOf(baseDoc({ fiscalType: "34", reference: texto, lines: [line()] }))).toContain("lines");
      expect(errorsOf(baseDoc({ fiscalType: "34", reference: texto, lines: [line({ unitPrice: 0 })] }))).toEqual([]);
    });

    it("rechazan códigos que no aplican a notas y números mal formados", () => {
      const cod4 = { ...reference, code: 4 as const };
      expect(errorsOf(baseDoc({ fiscalType: "34", reference: cod4, lines: [line()] }))).toContain("reference.code");
      const malo = { ...reference, modifiedNumber: "E3100000001" };
      expect(errorsOf(baseDoc({ fiscalType: "34", reference: malo }))).toContain("reference.modifiedNumber");
    });

    it("advierten cuando pasaron más de 30 días", () => {
      const vieja = { ...reference, modifiedDate: "2026-09-01" };
      const issues = validateForIssue(baseDoc({ fiscalType: "34", reference: vieja }), "2026-11-01");
      expect(issues.some((i) => i.severity === "warning" && i.field === "reference")).toBe(true);
    });
  });
});

describe("estado derivado", () => {
  const invoice = { status: "emitida", payment_type: 2, due_date: "2026-10-31", balance_due: 100 };

  it("marca vencida la venta a crédito con saldo", () => {
    expect(effectiveStatus(invoice, "2026-11-01")).toBe("vencida");
    expect(effectiveStatus({ ...invoice, status: "parcialmente_pagada" }, "2026-11-01")).toBe("vencida");
  });

  it("no marca vencida antes de la fecha, sin saldo o al contado", () => {
    expect(effectiveStatus(invoice, "2026-10-31")).toBe("emitida");
    expect(effectiveStatus({ ...invoice, balance_due: 0 }, "2026-11-01")).toBe("emitida");
    expect(effectiveStatus({ ...invoice, payment_type: 1 }, "2026-11-01")).toBe("emitida");
    expect(effectiveStatus({ ...invoice, status: "anulada" }, "2026-11-01")).toBe("anulada");
  });
});

describe("transformación a e-CF", () => {
  it("con RNC o cédula no envía además el identificador extranjero", () => {
    const comprador = (buyer: FiscalDocument["buyer"]) => {
      const { ECF } = toEcfDocument({ document: baseDoc({ fiscalType: "32", buyer }), emitter: { rnc: "131880738", legalName: "X", address: "Y" }, encf: "E320000000001" });
      return (ECF.Encabezado as EcfNode).Comprador as EcfNode;
    };
    const both = comprador({ taxId: "131880738", foreignId: "P123", name: "Cliente" });
    expect(both.RNCComprador).toBe("131880738");
    expect(both.IdentificadorExtranjero).toBeUndefined();
    expect(comprador({ foreignId: "P123", name: "Cliente" }).IdentificadorExtranjero).toBe("P123");
  });

  const emitter = { rnc: "131880738", legalName: "Emblema SRL", address: "Santo Domingo" };
  const node = (value: unknown) => value as EcfNode;

  it("usa los nombres y códigos del formato oficial", () => {
    const ecf = toEcfDocument({ document: baseDoc(), emitter, encf: "E310000000001", sequenceExpiry: "2028-12-31" }).ECF;
    const header = node(ecf.Encabezado);
    const idDoc = node(header.IdDoc);
    const totales = node(header.Totales);
    const item = node(node(ecf.DetallesItems).Item)[0] as EcfNode;

    expect(header.Version).toBe("1.0");
    expect(idDoc.TipoeCF).toBe(31);
    expect(idDoc.eNCF).toBe("E310000000001");
    expect(idDoc.FechaVencimientoSecuencia).toBe("31-12-2028");
    expect(idDoc.IndicadorMontoGravado).toBe(0);
    expect(idDoc.TipoPago).toBe(1);
    expect(totales.MontoGravadoI1).toBe(1000);
    expect(totales.ITBIS1).toBe(18);
    expect(totales.TotalITBIS1).toBe(180);
    expect(totales.MontoTotal).toBe(1180);
    // Indicador 1 = 18 %; el código anterior enviaba 2, que significa 16 %.
    expect(item.IndicadorFacturacion).toBe(1);
    expect(item.MontoItem).toBe(1000);
  });

  it("omite la fecha de vencimiento en los tipos 32 y 34", () => {
    const ecf = toEcfDocument({ document: baseDoc({ fiscalType: "32" }), emitter, encf: "E320000000001" }).ECF;
    expect(node(node(ecf.Encabezado).IdDoc).FechaVencimientoSecuencia).toBeUndefined();
  });

  it("exige la fecha de vencimiento en los demás", () => {
    expect(() => toEcfDocument({ document: baseDoc(), emitter, encf: "E310000000001" })).toThrow(/vencimiento/);
  });

  it("rechaza un e-NCF de otro tipo o de largo incorrecto", () => {
    expect(() => toEcfDocument({ document: baseDoc(), emitter, encf: "E320000000001", sequenceExpiry: "2028-12-31" })).toThrow();
    expect(() => toEcfDocument({ document: baseDoc(), emitter, encf: "E3100000001", sequenceExpiry: "2028-12-31" })).toThrow();
  });

  it("incluye la referencia y el indicador de 30 días en la nota de crédito", () => {
    const doc = baseDoc({
      fiscalType: "34",
      reference: {
        modifiedNumber: "E310000000001",
        modifiedDate: "2026-09-01",
        modifiedTotal: 1180,
        availableToCredit: 1180,
        code: 3,
        reason: "Error en precio",
      },
    });
    const ecf = toEcfDocument({ document: doc, emitter, encf: "E340000000001" }).ECF;
    expect(node(node(ecf.Encabezado).IdDoc).IndicadorNotaCredito).toBe("1");
    expect(node(ecf.InformacionReferencia).NCFModificado).toBe("E310000000001");
    expect(node(ecf.InformacionReferencia).FechaNCFModificado).toBe("01-09-2026");
    expect(node(ecf.InformacionReferencia).CodigoModificacion).toBe("3");
  });

  it("expresa los totales en pesos y agrega la otra moneda", () => {
    const doc = baseDoc({ currency: "USD", exchangeRate: 60.5, lines: [line({ unitPrice: 100 })] });
    const ecf = toEcfDocument({ document: doc, emitter, encf: "E310000000001", sequenceExpiry: "2028-12-31" }).ECF;
    const header = node(ecf.Encabezado);
    expect(node(header.Totales).MontoGravadoI1).toBe(6050);
    expect(node(header.Totales).MontoTotal).toBe(7139);
    expect(node(header.OtraMoneda).TipoMoneda).toBe("USD");
    expect(node(header.OtraMoneda).MontoGravado1OtraMoneda).toBe(100);
    expect(node(header.OtraMoneda).MontoTotalOtraMoneda).toBe(118);
    const item = node(node(ecf.DetallesItems).Item)[0] as EcfNode;
    expect(node(item.OtraMonedaDetalle).MontoItemOtraMoneda).toBe(100);
  });

  it("detalla las retenciones por línea y en los totales", () => {
    const doc = baseDoc({ withholding: { itbisRate: 30, isrRate: 10 }, lines: [line({ unitPrice: 10000 })] });
    const ecf = toEcfDocument({ document: doc, emitter, encf: "E310000000001", sequenceExpiry: "2028-12-31" }).ECF;
    const totales = node(node(ecf.Encabezado).Totales);
    const item = node(node(ecf.DetallesItems).Item)[0] as EcfNode;
    expect(totales.TotalITBISRetenido).toBe(540);
    expect(totales.TotalISRRetencion).toBe(1000);
    expect(node(item.Retencion).IndicadorAgenteRetencionoPercepcion).toBe(1);
  });
});

describe("URL del QR", () => {
  it("solo acepta la consulta de la DGII por https", () => {
    expect(isDgiiQrUrl("https://ecf.dgii.gov.do/testecf/consultatimbre?x=1")).toBe(true);
    expect(isDgiiQrUrl("https://fc.dgii.gov.do/ecf/consultatimbrefc?x=1")).toBe(true);
    for (const bad of ["https://evil.example/", "javascript:alert(1)", "http://ecf.dgii.gov.do/x", "https://ecf.dgii.gov.do@evil.example/", "https://ecf.dgii.gov.do.evil.example/", "", null, undefined]) {
      expect(isDgiiQrUrl(bad)).toBe(false);
    }
  });
});

describe("URL del timbre", () => {
  const base = {
    environment: "test" as const,
    emitterRnc: "130000001",
    buyerTaxId: "130000002",
    encf: "E310000000001",
    issueDate: "2020-10-10",
    total: 2.11,
    signedAt: "2020-10-10T13:00:00Z",
    securityCode: "DCP79Q",
  };

  it("coincide con el ejemplo oficial de e-CF", () => {
    expect(buildTimbreUrl({ ...base, fiscalType: "31" }).toLowerCase()).toBe(
      "https://ecf.dgii.gov.do/testecf/consultatimbre?rncemisor=130000001&rnccomprador=130000002&encf=e310000000001&fechaemision=10-10-2020&montototal=2.11&fechafirma=10-10-2020%2009:00:00&codigoseguridad=dcp79q"
    );
  });

  it("usa el servicio de resúmenes para consumo menor de RD$250,000", () => {
    const url = buildTimbreUrl({ ...base, fiscalType: "32", emitterRnc: "131880738", encf: "E320000000064", total: 6225.09, securityCode: "UABNYH" });
    expect(url.toLowerCase()).toBe(
      "https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=131880738&encf=e320000000064&montototal=6225.09&codigoseguridad=uabnyh"
    );
  });

  it("usa el servicio de e-CF para consumo desde RD$250,000 y apunta a producción", () => {
    const url = buildTimbreUrl({ ...base, environment: "prod", fiscalType: "32", total: 250000 });
    expect(url.startsWith("https://ecf.dgii.gov.do/ecf/consultatimbre?")).toBe(true);
  });
});

describe("saldo a favor del cliente", () => {
  const invoice = { fiscal_type: "31", amount_due: 1180, paid_amount: 100, credited_due: 1180 };

  it("lo cobrado de más tras las notas queda a favor", () => {
    expect(customerCredit(invoice)).toBe(100);
    expect(customerCredit({ ...invoice, credited_due: 590 })).toBe(0);
    expect(customerCredit({ ...invoice, paid_amount: 1180, credited_due: 590 })).toBe(590);
  });

  it("nunca es más de lo que el cliente pagó", () => {
    expect(customerCredit({ ...invoice, paid_amount: 0 })).toBe(0);
    expect(customerCredit({ fiscal_type: "31", amount_due: 1026, paid_amount: 10, credited_due: 1180 })).toBe(10);
  });

  it("una nota de crédito no tiene saldo a favor", () => {
    expect(customerCredit({ ...invoice, fiscal_type: "34" })).toBe(0);
  });
});
