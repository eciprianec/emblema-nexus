/**
 * Aritmética decimal exacta para montos fiscales.
 *
 * Trabaja con enteros (BigInt) para que 0.1 + 0.2 no descuadre un comprobante.
 * Redondeo: mitad hacia arriba.
 */

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);

function pow10(exp: number): bigint {
  let result = ONE;
  for (let i = 0; i < exp; i++) result *= TEN;
  return result;
}

/** Convierte un valor decimal a un entero con `scale` decimales. */
export function toScaled(value: number | string, scale: number): bigint {
  const text = typeof value === "number" ? numberToPlainString(value) : value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  const negative = text.startsWith("-");
  const [intPart, fracPart = ""] = text.replace("-", "").split(".");
  const kept = fracPart.slice(0, scale).padEnd(scale, "0");
  let scaled = BigInt(intPart + kept);
  if ((fracPart[scale] ?? "0") >= "5") scaled += ONE;
  return negative ? -scaled : scaled;
}

function numberToPlainString(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`Valor numérico inválido: ${value}`);
  const text = String(value);
  return /e/i.test(text) ? value.toFixed(10) : text;
}

/** Divide con redondeo a la mitad hacia arriba (`divisor` positivo). */
export function divRound(numerator: bigint, divisor: bigint): bigint {
  const adjust = numerator >= ZERO ? divisor / TWO : -(divisor / TWO);
  return (numerator + adjust) / divisor;
}

/** Reduce un entero de `fromScale` decimales a `toScale` decimales. */
export function rescale(value: bigint, fromScale: number, targetScale: number): bigint {
  if (fromScale <= targetScale) return value * pow10(targetScale - fromScale);
  return divRound(value, pow10(fromScale - targetScale));
}

/** Monto en centavos a número de 2 decimales. */
export function centsToNumber(cents: bigint): number {
  return Number(cents) / 100;
}

export function toCents(value: number | string): bigint {
  return toScaled(value, 2);
}

/** Representación decimal sin separadores de miles, como exige el formato e-CF. */
export function formatScaled(value: bigint, scale: number): string {
  const negative = value < ZERO;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, "0");
  const intPart = digits.slice(0, digits.length - scale);
  const fracPart = scale > 0 ? `.${digits.slice(-scale)}` : "";
  return `${negative ? "-" : ""}${intPart}${fracPart}`;
}

/** Formatea un número con exactamente 2 decimales. */
export function fixed2(value: number | string): string {
  return formatScaled(toCents(value), 2);
}
