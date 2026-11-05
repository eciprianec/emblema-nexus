import { FISCAL_TYPES, type FiscalType } from "./catalogs";

/** NCF tradicional: letra B + tipo (2) + secuencia (8) = 11 posiciones. */
const NCF_PATTERN = /^B\d{2}\d{8}$/;
/** e-NCF: letra E + tipo (2) + secuencia (10) = 13 posiciones. */
const ENCF_PATTERN = /^E\d{2}\d{10}$/;

export function isValidNcf(value: string): boolean {
  return NCF_PATTERN.test(value);
}

export function isValidEncf(value: string): boolean {
  return ENCF_PATTERN.test(value);
}

/** El comprobante puede ser modificado por una nota si es serie B (11) o e-NCF (13). */
export function isValidFiscalNumber(value: string): boolean {
  return isValidNcf(value) || isValidEncf(value);
}

export function encfMatchesType(encf: string, type: FiscalType): boolean {
  return isValidEncf(encf) && encf.startsWith(FISCAL_TYPES[type].ecfPrefix);
}

/** Código de seguridad del e-CF: 6 caracteres alfanuméricos. */
export function isValidSecurityCode(value: string): boolean {
  return /^[0-9A-Za-z]{6}$/.test(value);
}

export function formatSequence(prefix: string, sequence: number): string {
  const digits = prefix.startsWith("E") ? 10 : 8;
  return `${prefix}${String(sequence).padStart(digits, "0")}`;
}

export function cleanTaxId(value: string | null | undefined): string {
  return (value ?? "").replace(/[^0-9]/g, "");
}

export type TaxIdKind = "rnc" | "cedula" | "invalid" | "empty";

export function taxIdKind(value: string | null | undefined): TaxIdKind {
  const clean = cleanTaxId(value);
  if (!clean) return "empty";
  if (clean.length === 9) return "rnc";
  if (clean.length === 11) return "cedula";
  return "invalid";
}

/** Dígito verificador del RNC de 9 posiciones (módulo 11). */
export function isRncChecksumValid(value: string): boolean {
  const clean = cleanTaxId(value);
  if (clean.length !== 9) return false;
  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, weight, i) => acc + weight * Number(clean[i]), 0);
  const remainder = sum % 11;
  const expected = remainder === 0 ? 2 : remainder === 1 ? 1 : 11 - remainder;
  return expected === Number(clean[8]);
}

/** Dígito verificador de la cédula (Luhn). */
export function isCedulaChecksumValid(value: string): boolean {
  const clean = cleanTaxId(value);
  if (clean.length !== 11) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let product = Number(clean[i]) * (i % 2 === 0 ? 1 : 2);
    if (product > 9) product -= 9;
    sum += product;
  }
  return (10 - (sum % 10)) % 10 === Number(clean[10]);
}
