import type { BillingIndicator, GoodOrService } from "./catalogs";
import { BILLING_INDICATORS } from "./catalogs";
import { centsToNumber, divRound, rescale, toScaled } from "./money";

const ZERO = BigInt(0);
const HUNDRED = BigInt(100);

export interface LineInput {
  description: string;
  details?: string | null;
  itemType?: string;
  quantity: number | string;
  unitPrice: number | string;
  /** Monto de descuento de la línea (no porcentaje). */
  discount?: number | string;
  billingIndicator: BillingIndicator;
  goodOrService?: GoodOrService;
  unitCode?: number | null;
}

export interface WithholdingInput {
  /** Porcentaje del ITBIS de la línea que retiene el comprador. */
  itbisRate?: number | string;
  /** Porcentaje del monto de la línea que el comprador retiene como ISR. */
  isrRate?: number | string;
}

export interface CalculatedLine {
  lineNumber: number;
  description: string;
  details: string | null;
  itemType: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  /** MontoItem: (precio × cantidad) − descuento, sin ITBIS. */
  amount: number;
  billingIndicator: BillingIndicator;
  goodOrService: GoodOrService;
  unitCode: number | null;
  itbisRate: number | null;
  itbis: number;
  total: number;
  itbisWithheld: number;
  isrWithheld: number;
}

export interface DocumentTotals {
  lines: CalculatedLine[];
  taxable18: number;
  taxable16: number;
  taxable0: number;
  taxableTotal: number;
  exempt: number;
  nonBillable: number;
  itbis18: number;
  itbis16: number;
  itbisTotal: number;
  discountTotal: number;
  /** Gravado + exento, antes de ITBIS. */
  subtotal: number;
  /** MontoTotal: gravado + exento + ITBIS. */
  total: number;
  itbisWithheld: number;
  isrWithheld: number;
  /** Lo que el cliente debe pagar: total + no facturable − retenciones. */
  amountDue: number;
}

function indicatorRate(indicator: BillingIndicator): number | null {
  const found = BILLING_INDICATORS.find((i) => i.code === indicator);
  if (!found) throw new Error(`Indicador de facturación inválido: ${indicator}`);
  return found.rate;
}

function percentOf(amountCents: bigint, rate: number | string | undefined): bigint {
  if (rate === undefined || rate === "" || Number(rate) === 0) return ZERO;
  // La tasa llega con hasta 2 decimales: (monto × tasa×100) / 10000.
  return divRound(amountCents * toScaled(rate, 2), HUNDRED * HUNDRED);
}

/**
 * Reparte `target` centavos entre las líneas para que la suma coincida exactamente.
 * El formato oficial calcula el ITBIS sobre el total gravado por tasa (no por línea),
 * así que las diferencias de redondeo se absorben en las líneas de mayor monto.
 */
function allocate(amounts: bigint[], target: bigint): bigint[] {
  const base = amounts.reduce((sum, a) => sum + a, ZERO);
  if (base === ZERO) return amounts.map(() => ZERO);
  const shares = amounts.map((a) => (a * target) / base);
  let remainder = target - shares.reduce((sum, s) => sum + s, ZERO);
  const order = amounts
    .map((a, index) => ({ a, index }))
    .sort((x, y) => (x.a === y.a ? x.index - y.index : x.a > y.a ? -1 : 1));
  for (let i = 0; remainder > ZERO && order.length > 0; i = (i + 1) % order.length) {
    shares[order[i].index] += BigInt(1);
    remainder -= BigInt(1);
  }
  return shares;
}

/**
 * Calcula un comprobante conforme a las fórmulas del formato e-CF.
 * Es la misma función en el formulario y en el servidor, y la base de datos
 * vuelve a verificar el cuadre antes de emitir.
 */
export function calculateDocument(lines: LineInput[], withholding: WithholdingInput = {}): DocumentTotals {
  const prepared = lines.map((line, index) => {
    const quantity = toScaled(line.quantity, 2);
    const unitPrice = toScaled(line.unitPrice, 4);
    const discount = toScaled(line.discount ?? 0, 2);
    if (quantity <= ZERO) throw new Error(`Línea ${index + 1}: la cantidad debe ser mayor que cero.`);
    if (unitPrice < ZERO) throw new Error(`Línea ${index + 1}: el precio no puede ser negativo.`);
    if (discount < ZERO) throw new Error(`Línea ${index + 1}: el descuento no puede ser negativo.`);
    // cantidad (2 dec) × precio (4 dec) = 6 decimales; se lleva a centavos.
    const gross = rescale(quantity * unitPrice, 6, 2);
    if (discount > gross) throw new Error(`Línea ${index + 1}: el descuento supera el monto de la línea.`);
    return {
      line,
      index,
      quantity,
      unitPrice,
      discount,
      amount: gross - discount,
      rate: indicatorRate(line.billingIndicator),
    };
  });

  const sumBy = (indicator: BillingIndicator) =>
    prepared.filter((p) => p.line.billingIndicator === indicator).reduce((sum, p) => sum + p.amount, ZERO);

  const taxable18 = sumBy(1);
  const taxable16 = sumBy(2);
  const taxable0 = sumBy(3);
  const exempt = sumBy(4);
  const nonBillable = sumBy(0);
  const itbis18 = divRound(taxable18 * BigInt(18), HUNDRED);
  const itbis16 = divRound(taxable16 * BigInt(16), HUNDRED);

  const lineItbis = new Map<number, bigint>();
  const assign = (indicator: BillingIndicator, total: bigint) => {
    const group = prepared.filter((p) => p.line.billingIndicator === indicator);
    allocate(group.map((p) => p.amount), total).forEach((share, i) => lineItbis.set(group[i].index, share));
  };
  assign(1, itbis18);
  assign(2, itbis16);

  let itbisWithheld = ZERO;
  let isrWithheld = ZERO;
  let discountTotal = ZERO;

  const calculated: CalculatedLine[] = prepared.map((p) => {
    const itbis = lineItbis.get(p.index) ?? ZERO;
    const lineItbisWithheld = percentOf(itbis, withholding.itbisRate);
    const lineIsrWithheld = p.line.billingIndicator === 0 ? ZERO : percentOf(p.amount, withholding.isrRate);
    itbisWithheld += lineItbisWithheld;
    isrWithheld += lineIsrWithheld;
    discountTotal += p.discount;
    return {
      lineNumber: p.index + 1,
      description: p.line.description.trim(),
      details: p.line.details?.trim() || null,
      itemType: p.line.itemType ?? "servicio",
      quantity: Number(p.quantity) / 100,
      unitPrice: Number(p.unitPrice) / 10000,
      discount: centsToNumber(p.discount),
      amount: centsToNumber(p.amount),
      billingIndicator: p.line.billingIndicator,
      goodOrService: p.line.goodOrService ?? 2,
      unitCode: p.line.unitCode ?? null,
      itbisRate: p.rate,
      itbis: centsToNumber(itbis),
      total: centsToNumber(p.amount + itbis),
      itbisWithheld: centsToNumber(lineItbisWithheld),
      isrWithheld: centsToNumber(lineIsrWithheld),
    };
  });

  const taxableTotal = taxable18 + taxable16 + taxable0;
  const itbisTotal = itbis18 + itbis16;
  const total = taxableTotal + exempt + itbisTotal;

  return {
    lines: calculated,
    taxable18: centsToNumber(taxable18),
    taxable16: centsToNumber(taxable16),
    taxable0: centsToNumber(taxable0),
    taxableTotal: centsToNumber(taxableTotal),
    exempt: centsToNumber(exempt),
    nonBillable: centsToNumber(nonBillable),
    itbis18: centsToNumber(itbis18),
    itbis16: centsToNumber(itbis16),
    itbisTotal: centsToNumber(itbisTotal),
    discountTotal: centsToNumber(discountTotal),
    subtotal: centsToNumber(taxableTotal + exempt),
    total: centsToNumber(total),
    itbisWithheld: centsToNumber(itbisWithheld),
    isrWithheld: centsToNumber(isrWithheld),
    amountDue: centsToNumber(total + nonBillable - itbisWithheld - isrWithheld),
  };
}
