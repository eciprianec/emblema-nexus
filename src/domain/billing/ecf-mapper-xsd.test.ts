import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LineInput } from "./calculate";
import type { FiscalDocument } from "./document";
import { normalizePhone, pruneEcf, toEcfDocument, type EcfNode } from "./ecf-mapper";
import type { FiscalType } from "./catalogs";

/**
 * Comprobación independiente: convierte el JSON a XML en el orden de sus campos, como hará el
 * proveedor, y lo valida con xmllint contra el XSD oficial de la DGII.
 */
const XMLLINT = "/usr/bin/xmllint";
const hasXmllint = existsSync(XMLLINT);
const XSD_DIR = path.resolve(__dirname, "fixtures/xsd");

/**
 * El XSD oficial del tipo 31 declara ` IndicadorServicioTodoIncluidoType` con un espacio
 * inicial y así no compila. Se corrige una copia temporal: el archivo de la DGII queda intacto.
 */
const schemaPath = (() => {
  const dir = mkdtempSync(path.join(tmpdir(), "ecf-xsd-"));
  const cache = new Map<FiscalType, string>();
  return (type: FiscalType): string => {
    const cached = cache.get(type);
    if (cached) return cached;
    const source = readFileSync(path.join(XSD_DIR, `e-CF_${type}_v.1.0.xsd`), "utf8");
    const target = path.join(dir, `e-CF_${type}.xsd`);
    writeFileSync(target, source.replace(/name=" IndicadorServicioTodoIncluidoType"/, 'name="IndicadorServicioTodoIncluidoType"'));
    cache.set(type, target);
    return target;
  };
})();

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function toXml(tag: string, value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => toXml(tag, item)).join("");
  if (value !== null && typeof value === "object") {
    const inner = Object.entries(value as EcfNode).map(([key, child]) => toXml(key, child)).join("");
    return `<${tag}>${inner}</${tag}>`;
  }
  return `<${tag}>${escapeXml(String(value))}</${tag}>`;
}

function validate(type: FiscalType, payload: { ECF: EcfNode }): string {
  // Quien firma agrega FechaHoraFirma y la firma; el XSD exige ambas como últimos campos.
  const body = toXml("ECF", { ...payload.ECF, FechaHoraFirma: "03-11-2026 10:15:30", Signature: "firma" });
  const xml = `<?xml version="1.0" encoding="utf-8"?>${body}`;
  try {
    execFileSync(XMLLINT, ["--noout", "--schema", schemaPath(type), "-"], {
      input: xml,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return "ok";
  } catch (err) {
    return `${String((err as { stderr?: Buffer }).stderr ?? err)}\n${xml}`;
  }
}

const line = (overrides: Partial<LineInput> = {}): LineInput => ({
  description: "Honorarios profesionales",
  quantity: 1,
  unitPrice: 1000,
  billingIndicator: 1,
  goodOrService: 2,
  ...overrides,
});

const doc = (overrides: Partial<FiscalDocument> = {}): FiscalDocument => ({
  fiscalType: "31",
  issueDate: "2026-10-15",
  currency: "DOP",
  exchangeRate: 1,
  incomeType: "01",
  paymentType: 1,
  buyer: { taxId: "131880738", name: "Cliente & Asociados SRL" },
  lines: [line()],
  ...overrides,
});

const emitter = {
  rnc: "101672919",
  legalName: "Emblema Nexus SRL",
  tradeName: "Emblema",
  address: "Av. Winston Churchill, Santo Domingo",
  phone: "(809) 555-1234",
  email: "facturas@emblema.do",
};

const EXPIRY = "2028-12-31";
const reference = (code: 1 | 2 | 3 = 3) => ({
  modifiedNumber: "E310000000001",
  modifiedDate: "2026-10-01",
  modifiedTotal: 1180,
  availableToCredit: 1180,
  code,
  reason: "Corrige monto",
});

const CASES: { name: string; encf: string; expiry?: string; document: FiscalDocument }[] = [
  { name: "31 gravado al 18 %", encf: "E310000000001", expiry: EXPIRY, document: doc() },
  {
    name: "31 con retenciones, crédito, término de pago y descuento",
    encf: "E310000000002",
    expiry: EXPIRY,
    document: doc({
      paymentType: 2,
      dueDate: "2026-11-15",
      paymentTerm: "30 días",
      withholding: { itbisRate: 30, isrRate: 10 },
      lines: [line({ unitPrice: 12345.6789, quantity: 2.5, discount: 100.5 }), line({ description: "Sellos", billingIndicator: 4, unitPrice: 50, goodOrService: 1, unitCode: 43 })],
    }),
  },
  {
    name: "31 en USD con tasa",
    encf: "E310000000003",
    expiry: EXPIRY,
    document: doc({ currency: "USD", exchangeRate: 58.1234, lines: [line({ unitPrice: 100, discount: 5 }), line({ billingIndicator: 4, unitPrice: 25 })] }),
  },
  {
    name: "31 con 16 %, 18 %, exento y suplido",
    encf: "E310000000004",
    expiry: EXPIRY,
    document: doc({
      lines: [
        line({ billingIndicator: 1 }),
        line({ billingIndicator: 2, unitPrice: 500 }),
        line({ billingIndicator: 4, unitPrice: 300 }),
        line({ billingIndicator: 0, unitPrice: 75, description: "Suplido" }),
      ],
    }),
  },
  {
    name: "31 con detalles en la línea",
    encf: "E310000000005",
    expiry: EXPIRY,
    document: doc({ lines: [line({ details: "Expediente 2026-15 <urgente>" })] }),
  },
  { name: "32 anónima exenta", encf: "E320000000001", document: doc({ fiscalType: "32", buyer: {}, lines: [line({ billingIndicator: 4 })] }) },
  { name: "32 anónima gravada", encf: "E320000000002", document: doc({ fiscalType: "32", buyer: {} }) },
  {
    name: "32 con comprador extranjero",
    encf: "E320000000003",
    document: doc({ fiscalType: "32", buyer: { foreignId: "PA1234567", name: "Jane Doe" } }),
  },
  {
    name: "32 con cédula, correo y dirección",
    encf: "E320000000004",
    document: doc({ fiscalType: "32", buyer: { taxId: "00114532165", name: "Juan Pérez", email: "juan@correo.do", address: "Calle 1, Santiago" } }),
  },
  {
    name: "33 nota de débito",
    encf: "E330000000001",
    expiry: EXPIRY,
    document: doc({ fiscalType: "33", reference: reference() }),
  },
  {
    name: "33 con retención y crédito",
    encf: "E330000000002",
    expiry: EXPIRY,
    document: doc({ fiscalType: "33", paymentType: 2, dueDate: "2026-11-15", withholding: { itbisRate: 100 }, reference: reference() }),
  },
  {
    name: "34 nota de crédito a menos de 30 días",
    encf: "E340000000001",
    document: doc({ fiscalType: "34", issueDate: "2026-10-15", paymentType: 2, dueDate: "2026-11-15", paymentTerm: "30 dias", reference: reference() }),
  },
  {
    name: "34 sin comprador, más de 30 días, 16 %",
    encf: "E340000000002",
    document: doc({
      fiscalType: "34",
      buyer: {},
      issueDate: "2026-12-15",
      lines: [line({ billingIndicator: 2 })],
      reference: reference(),
    }),
  },
  {
    name: "34 de corrección de texto con monto cero",
    encf: "E340000000003",
    document: doc({ fiscalType: "34", lines: [line({ billingIndicator: 4, unitPrice: 0 })], reference: reference(2) }),
  },
  {
    name: "34 con retenciones y USD",
    encf: "E340000000004",
    document: doc({ fiscalType: "34", currency: "USD", exchangeRate: 60.5, withholding: { isrRate: 10 }, reference: reference() }),
  },
  { name: "45 gubernamental", encf: "E450000000001", expiry: EXPIRY, document: doc({ fiscalType: "45" }) },
  {
    name: "45 con 16 % y exento en USD",
    encf: "E450000000002",
    expiry: EXPIRY,
    document: doc({ fiscalType: "45", currency: "USD", exchangeRate: 58.5, lines: [line({ billingIndicator: 2 }), line({ billingIndicator: 4 })] }),
  },
];

describe.skipIf(!hasXmllint)("el JSON cumple los XSD oficiales", () => {
  it.each(CASES)("$name", ({ encf, expiry, document }) => {
    const payload = toEcfDocument({ document, emitter, encf, sequenceExpiry: expiry });
    expect(validate(document.fiscalType, payload)).toBe("ok");
  });

  it("la prueba detecta un documento inválido", () => {
    const payload = toEcfDocument({ document: doc(), emitter, encf: "E310000000001", sequenceExpiry: EXPIRY });
    const broken = { ECF: { ...payload.ECF, Encabezado: { ...(payload.ECF.Encabezado as EcfNode), Version: "9.9" } } };
    expect(validate("31", broken)).not.toBe("ok");
  });
});

describe("forma del JSON", () => {
  const ecf = (document: FiscalDocument, encf = "E310000000001", expiry: string | undefined = EXPIRY) =>
    toEcfDocument({ document, emitter, encf, sequenceExpiry: expiry }).ECF;
  const node = (value: unknown) => value as EcfNode;

  function emptyTags(value: unknown, trail = "ECF"): string[] {
    if (value === undefined || value === null || value === "") return [trail];
    if (Array.isArray(value)) return value.length === 0 ? [trail] : value.flatMap((v, i) => emptyTags(v, `${trail}[${i}]`));
    if (typeof value === "object") {
      const entries = Object.entries(value as object);
      return entries.length === 0 ? [trail] : entries.flatMap(([k, v]) => emptyTags(v, `${trail}.${k}`));
    }
    return [];
  }

  it.each(CASES)("no deja etiquetas vacías: $name", ({ encf, expiry, document }) => {
    expect(emptyTags(toEcfDocument({ document, emitter, encf, sequenceExpiry: expiry }).ECF)).toEqual([]);
  });

  it("usa montos numéricos y TipoIngresos como texto, como los ejemplos del proveedor", () => {
    const e = ecf(doc());
    const header = node(e.Encabezado);
    const idDoc = node(header.IdDoc);
    const totals = node(header.Totales);
    const item = (node(e.DetallesItems).Item as EcfNode[])[0];
    expect(idDoc.TipoeCF).toBe(31);
    expect(idDoc.TipoIngresos).toBe("01");
    expect(idDoc.TipoPago).toBe(1);
    expect(idDoc.IndicadorMontoGravado).toBe(0);
    expect(totals.MontoTotal).toBe(1180);
    expect(totals.ITBIS1).toBe(18);
    expect(item.NumeroLinea).toBe(1);
    expect(item.PrecioUnitarioItem).toBe(1000);
    expect(header.Version).toBe("1.0");
    expect(JSON.stringify(e)).not.toContain("{{");
  });

  it("no envía IndicadorEnvioDiferido, TotalPaginas ni FechaHoraFirma", () => {
    const text = JSON.stringify(ecf(doc()));
    expect(text).not.toContain("IndicadorEnvioDiferido");
    expect(text).not.toContain("TotalPaginas");
    expect(text).not.toContain("FechaHoraFirma");
  });

  it("el tipo 32 anónimo no inventa un RNC ni deja Comprador vacío", () => {
    const e = ecf(doc({ fiscalType: "32", buyer: {} }), "E320000000001", undefined);
    expect(node(e.Encabezado).Comprador).toEqual({ RazonSocialComprador: "Consumidor Final" });
  });

  it("una nota anónima omite el área Comprador", () => {
    const e = ecf(doc({ fiscalType: "34", buyer: {}, reference: reference() }), "E340000000001", undefined);
    expect(node(e.Encabezado).Comprador).toBeUndefined();
  });

  it("emite TablaTelefonoEmisor solo con un teléfono válido", () => {
    expect(node(node(ecf(doc()).Encabezado).Emisor).TablaTelefonoEmisor).toEqual({ TelefonoEmisor: ["809-555-1234"] });
    const noPhone = toEcfDocument({ document: doc(), emitter: { ...emitter, phone: "ext. 12" }, encf: "E310000000001", sequenceExpiry: EXPIRY });
    expect(node(node(noPhone.ECF.Encabezado).Emisor).TablaTelefonoEmisor).toBeUndefined();
    expect(normalizePhone("1-809-555-1234")).toBe("809-555-1234");
  });

  it("el indicador de monto gravado solo va si hay líneas gravadas", () => {
    const exempt = ecf(doc({ lines: [line({ billingIndicator: 4 })] }));
    expect(node(node(exempt.Encabezado).IdDoc).IndicadorMontoGravado).toBeUndefined();
  });

  it("omite un correo o un término que el XSD rechazaría", () => {
    const e = toEcfDocument({
      document: doc({ paymentTerm: "30-dias!", buyer: { taxId: "131880738", name: "Cliente", email: "no es correo" } }),
      emitter,
      encf: "E310000000001",
      sequenceExpiry: EXPIRY,
    }).ECF;
    expect(node(node(e.Encabezado).IdDoc).TerminoPago).toBeUndefined();
    expect(node(node(e.Encabezado).Comprador).CorreoComprador).toBeUndefined();
  });

  it("pruneEcf conserva los ceros", () => {
    expect(pruneEcf({ a: 0, b: "0", c: undefined, d: {}, e: [], f: { g: undefined } })).toEqual({ a: 0, b: "0" });
  });
});
