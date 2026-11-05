import { calculateDocument, type DocumentTotals } from "./calculate";
import { CONSUMER_INVOICE_ID_THRESHOLD_DOP, FISCAL_TYPES, type FiscalType } from "./catalogs";
import { daysBetween, toDgiiDate, toDgiiDateTime } from "./dates";
import type { EmitterData, FiscalDocument } from "./document";
import { cleanTaxId, encfMatchesType } from "./fiscal-numbers";
import { divRound, fixed2, formatScaled, toScaled } from "./money";

/** Nodo del e-CF; los campos en `undefined` y los contenedores vacíos no se envían. */
export type EcfValue = string | number | EcfNode | (EcfNode | string)[] | undefined;
export type EcfNode = { [tag: string]: EcfValue };

export interface EcfMappingInput {
  document: FiscalDocument;
  emitter: EmitterData;
  encf: string;
  /** Obligatoria salvo en los tipos 32 y 34, donde no debe enviarse. */
  sequenceExpiry?: string | null;
}

export type DgiiEnvironment = "test" | "cert" | "prod";

const ENVIRONMENT_PATHS: Record<DgiiEnvironment, string> = {
  test: "testecf",
  cert: "certecf",
  prod: "ecf",
};

/** Lleva las líneas a pesos: el formato expresa los totales en DOP y la otra moneda aparte. */
function totalsInDop(doc: FiscalDocument): DocumentTotals {
  if (doc.currency === "DOP") return calculateDocument(doc.lines, doc.withholding);
  const rate = toScaled(doc.exchangeRate, 4);
  const lines = doc.lines.map((line) => ({
    ...line,
    unitPrice: formatScaled(divRound(toScaled(line.unitPrice, 4) * rate, BigInt(10000)), 4),
    discount: formatScaled(divRound(toScaled(line.discount ?? 0, 2) * rate, BigInt(10000)), 2),
  }));
  return calculateDocument(lines, doc.withholding);
}

/** Campos que los XSD oficiales (v1.0) no admiten en ciertos tipos. */
const NO_AMOUNT_INDICATOR = new Set<FiscalType>(["44", "46"]);
const NO_PAYMENT_TERMS = new Set<FiscalType>(["34"]);
const NO_FOREIGN_ID = new Set<FiscalType>(["31", "45"]);
const WITHHOLDING_TYPES = new Set<FiscalType>(["31", "33", "34"]);

/** Patrones de los XSD: un dato opcional que no los cumple se omite en vez de provocar un rechazo. */
const EMAIL_PATTERN = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
const PAYMENT_TERM_PATTERN = /^[\p{L}\p{N}_\s]{1,15}$/u;

const amount = (value: number) => Number(fixed2(value));
const moneyOrSkip = (value: number) => (value !== 0 ? amount(value) : undefined);
const price = (value: number) => Number(formatScaled(toScaled(value, 4), 4));

function validEmail(value: string | null | undefined): string | undefined {
  const email = value?.trim();
  return email && email.length <= 80 && EMAIL_PATTERN.test(email) ? email : undefined;
}

/** El XSD exige 809-555-1234; se acepta lo que la gente suele escribir y se omite lo demás. */
export function normalizePhone(value: string | null | undefined): string | undefined {
  let digits = (value ?? "").replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return undefined;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Quita lo no definido y los contenedores vacíos: una etiqueta vacía provoca rechazo. */
export function pruneEcf<T extends EcfValue>(value: T): T | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    const items = value.map((item) => pruneEcf(item)).filter((item) => item !== undefined);
    return (items.length > 0 ? items : undefined) as T | undefined;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as EcfNode)
      .map(([key, child]) => [key, pruneEcf(child)] as const)
      .filter(([, child]) => child !== undefined);
    return (entries.length > 0 ? Object.fromEntries(entries) : undefined) as T | undefined;
  }
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

/**
 * Traduce un comprobante al JSON del proveedor: `{ ECF: ... }`, con los nombres y el orden
 * de campos del formato e-CF v1.0. Es la única pieza que conoce esa forma; el resto del
 * módulo trata el resultado como un dato opaco.
 *
 * No se envían `IndicadorEnvioDiferido` ni `TotalPaginas`: el primero solo procede con
 * autorización para ventas offline (Formato e-CF, campo 6) y el segundo debe ser mayor
 * que 1 según el XSD. `FechaHoraFirma` la agrega quien firma.
 */
export function toEcfDocument({ document: doc, emitter, encf, sequenceExpiry }: EcfMappingInput): { ECF: EcfNode } {
  const type = doc.fiscalType;
  const info = FISCAL_TYPES[type];
  if (!encfMatchesType(encf, type)) {
    throw new Error(`El e-NCF ${encf} no corresponde al tipo ${type}.`);
  }
  if (info.carriesSequenceExpiry && !sequenceExpiry) {
    throw new Error(`El tipo ${type} requiere la fecha de vencimiento de la secuencia.`);
  }

  const totals = totalsInDop(doc);
  const foreign = doc.currency === "DOP" ? null : calculateDocument(doc.lines, doc.withholding);

  const buyerTaxId = cleanTaxId(doc.buyer.taxId);
  const ref = doc.reference;
  const phone = normalizePhone(emitter.phone);
  const paymentTerm = doc.paymentTerm?.trim();
  const withholds = WITHHOLDING_TYPES.has(type) && (totals.itbisWithheld > 0 || totals.isrWithheld > 0);

  const idDoc: EcfNode = {
    TipoeCF: Number(type),
    eNCF: encf,
    FechaVencimientoSecuencia: info.carriesSequenceExpiry ? toDgiiDate(sequenceExpiry as string) : undefined,
    IndicadorNotaCredito:
      type === "34" && ref ? (daysBetween(ref.modifiedDate, doc.issueDate) > 30 ? "1" : "0") : undefined,
    // Las líneas del módulo siempre van sin ITBIS incluido.
    IndicadorMontoGravado: !NO_AMOUNT_INDICATOR.has(type) && totals.taxableTotal > 0 ? 0 : undefined,
    TipoIngresos: doc.incomeType,
    TipoPago: doc.paymentType,
    FechaLimitePago: doc.paymentType === 2 && doc.dueDate ? toDgiiDate(doc.dueDate) : undefined,
    TerminoPago:
      !NO_PAYMENT_TERMS.has(type) && paymentTerm && PAYMENT_TERM_PATTERN.test(paymentTerm) ? paymentTerm : undefined,
    TablaFormasPago:
      !NO_PAYMENT_TERMS.has(type) && doc.paymentForms?.length
        ? { FormaDePago: doc.paymentForms.map((p) => ({ FormaPago: p.form, MontoPago: amount(p.amount) })) }
        : undefined,
  };

  const encabezado: EcfNode = {
    Version: "1.0",
    IdDoc: idDoc,
    Emisor: {
      RNCEmisor: cleanTaxId(emitter.rnc),
      RazonSocialEmisor: emitter.legalName,
      NombreComercial: emitter.tradeName || undefined,
      DireccionEmisor: emitter.address,
      TablaTelefonoEmisor: phone ? { TelefonoEmisor: [phone] } : undefined,
      CorreoEmisor: validEmail(emitter.email),
      FechaEmision: toDgiiDate(doc.issueDate),
    },
    Comprador: {
      RNCComprador: buyerTaxId || undefined,
      // El Formato no admite ambos: con RNC o cédula, el identificador extranjero no va.
      IdentificadorExtranjero: NO_FOREIGN_ID.has(type) || buyerTaxId ? undefined : doc.buyer.foreignId || undefined,
      // El área Comprador es obligatoria en el tipo 32 aunque sus campos sean opcionales:
      // sin datos del cliente va la denominación que el proveedor documenta, nunca un RNC ficticio.
      RazonSocialComprador: doc.buyer.name?.trim() || (type === "32" ? "Consumidor Final" : undefined),
      CorreoComprador: validEmail(doc.buyer.email),
      DireccionComprador: doc.buyer.address || undefined,
    },
    Totales: {
      MontoGravadoTotal: moneyOrSkip(totals.taxableTotal),
      MontoGravadoI1: moneyOrSkip(totals.taxable18),
      MontoGravadoI2: moneyOrSkip(totals.taxable16),
      MontoGravadoI3: moneyOrSkip(totals.taxable0),
      MontoExento: moneyOrSkip(totals.exempt),
      ITBIS1: totals.taxable18 > 0 ? 18 : undefined,
      ITBIS2: totals.taxable16 > 0 ? 16 : undefined,
      ITBIS3: totals.taxable0 > 0 ? 0 : undefined,
      TotalITBIS: totals.taxableTotal > 0 ? amount(totals.itbisTotal) : undefined,
      TotalITBIS1: totals.taxable18 > 0 ? amount(totals.itbis18) : undefined,
      TotalITBIS2: totals.taxable16 > 0 ? amount(totals.itbis16) : undefined,
      TotalITBIS3: totals.taxable0 > 0 ? 0 : undefined,
      MontoTotal: amount(totals.total),
      MontoNoFacturable: moneyOrSkip(totals.nonBillable),
      TotalITBISRetenido: withholds ? amount(totals.itbisWithheld) : undefined,
      TotalISRRetencion: withholds ? amount(totals.isrWithheld) : undefined,
    },
    OtraMoneda: foreign
      ? {
          TipoMoneda: doc.currency,
          TipoCambio: Number(formatScaled(toScaled(doc.exchangeRate, 4), 4)),
          MontoGravadoTotalOtraMoneda: moneyOrSkip(foreign.taxableTotal),
          MontoGravado1OtraMoneda: moneyOrSkip(foreign.taxable18),
          MontoGravado2OtraMoneda: moneyOrSkip(foreign.taxable16),
          MontoGravado3OtraMoneda: moneyOrSkip(foreign.taxable0),
          MontoExentoOtraMoneda: moneyOrSkip(foreign.exempt),
          TotalITBISOtraMoneda: foreign.taxableTotal > 0 ? amount(foreign.itbisTotal) : undefined,
          TotalITBIS1OtraMoneda: foreign.taxable18 > 0 ? amount(foreign.itbis18) : undefined,
          TotalITBIS2OtraMoneda: foreign.taxable16 > 0 ? amount(foreign.itbis16) : undefined,
          TotalITBIS3OtraMoneda: foreign.taxable0 > 0 ? 0 : undefined,
          MontoTotalOtraMoneda: amount(foreign.total),
        }
      : undefined,
  };

  const items: EcfNode[] = totals.lines.map((line, index) => ({
    NumeroLinea: line.lineNumber,
    IndicadorFacturacion: line.billingIndicator,
    Retencion:
      withholds && (line.itbisWithheld > 0 || line.isrWithheld > 0)
        ? {
            IndicadorAgenteRetencionoPercepcion: 1,
            MontoITBISRetenido: amount(line.itbisWithheld),
            MontoISRRetenido: amount(line.isrWithheld),
          }
        : undefined,
    NombreItem: line.description,
    IndicadorBienoServicio: line.goodOrService,
    DescripcionItem: line.details || undefined,
    CantidadItem: amount(line.quantity),
    UnidadMedida: line.unitCode != null ? String(line.unitCode) : undefined,
    PrecioUnitarioItem: price(line.unitPrice),
    DescuentoMonto: moneyOrSkip(line.discount),
    // Condicional a que exista descuento en el ítem (Formato e-CF, Tabla de Subdescuento).
    TablaSubDescuento:
      line.discount > 0
        ? { SubDescuento: [{ TipoSubDescuento: "$", MontoSubDescuento: amount(line.discount) }] }
        : undefined,
    OtraMonedaDetalle: foreign
      ? {
          PrecioOtraMoneda: price(foreign.lines[index].unitPrice),
          DescuentoOtraMoneda: moneyOrSkip(foreign.lines[index].discount),
          MontoItemOtraMoneda: amount(foreign.lines[index].amount),
        }
      : undefined,
    MontoItem: amount(line.amount),
  }));

  const ecf: EcfNode = {
    Encabezado: encabezado,
    DetallesItems: { Item: items },
    InformacionReferencia: ref
      ? {
          NCFModificado: ref.modifiedNumber,
          FechaNCFModificado: toDgiiDate(ref.modifiedDate),
          CodigoModificacion: String(ref.code),
          RazonModificacion: ref.reason,
        }
      : undefined,
  };

  return { ECF: pruneEcf(ecf) as EcfNode };
}

/** La URL de un QR impreso solo puede llevar a la consulta de la DGII. */
export function isDgiiQrUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && /^https:\/\/(ecf|fc)\.dgii\.gov\.do\//.test(url);
}

export interface TimbreParams {
  environment: DgiiEnvironment;
  fiscalType: string;
  emitterRnc: string;
  buyerTaxId?: string | null;
  encf: string;
  issueDate: string;
  /** Monto total en DOP. */
  total: number;
  signedAt: Date | string;
  securityCode: string;
}

/**
 * URL de consulta del timbre. Las facturas de consumo menores de RD$250,000 se
 * validan por el servicio de resúmenes (fc.dgii.gov.do); el resto, por el de e-CF.
 * Con el modo de proveedor no se usa: su `qr_url` se imprime tal cual.
 */
export function buildTimbreUrl(p: TimbreParams): string {
  const env = ENVIRONMENT_PATHS[p.environment];
  const rnc = cleanTaxId(p.emitterRnc);
  const total = fixed2(p.total);

  if (p.fiscalType === "32" && p.total < CONSUMER_INVOICE_ID_THRESHOLD_DOP) {
    return (
      `https://fc.dgii.gov.do/${env}/consultatimbrefc?RncEmisor=${rnc}` +
      `&ENCF=${p.encf}&MontoTotal=${total}&CodigoSeguridad=${encodeURIComponent(p.securityCode)}`
    );
  }

  const buyer = cleanTaxId(p.buyerTaxId);
  return (
    `https://ecf.dgii.gov.do/${env}/consultatimbre?RncEmisor=${rnc}` +
    (buyer ? `&RncComprador=${buyer}` : "") +
    `&ENCF=${p.encf}&FechaEmision=${toDgiiDate(p.issueDate)}&MontoTotal=${total}` +
    `&FechaFirma=${toDgiiDateTime(p.signedAt).replace(" ", "%20")}` +
    `&CodigoSeguridad=${encodeURIComponent(p.securityCode)}`
  );
}
