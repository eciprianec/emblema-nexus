import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases CSS con soporte para Tailwind merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un valor monetario en formato dominicano.
 * Usa Intl.NumberFormat para evitar errores de punto flotante.
 */
export function formatMoney(
  amount: number | string,
  currency: string = "DOP"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formatea una fecha en formato dominicano (DD/MM/YYYY).
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Santo_Domingo",
  }).format(d);
}

/**
 * Formatea fecha y hora en formato dominicano.
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santo_Domingo",
  }).format(d);
}

/**
 * Genera las iniciales de un nombre (para avatares).
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Valida formato de cédula dominicana (XXX-XXXXXXX-X).
 */
export function validateCedula(cedula: string): boolean {
  const clean = cedula.replace(/[-\s]/g, "");
  if (clean.length !== 11) return false;
  if (!/^\d{11}$/.test(clean)) return false;

  // Algoritmo de Luhn modificado para cédulas dominicanas
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let product = parseInt(clean[i]) * weights[i];
    if (product > 9) product -= 9;
    sum += product;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[10]);
}

/**
 * Formatea una cédula con guiones (XXX-XXXXXXX-X).
 */
export function formatCedula(cedula: string): string {
  const clean = cedula.replace(/[-\s]/g, "");
  if (clean.length !== 11) return cedula;
  return `${clean.slice(0, 3)}-${clean.slice(3, 10)}-${clean.slice(10)}`;
}

/**
 * Valida formato de RNC (X-XX-XXXXX-X o XXX-XXXXX-X).
 */
export function validateRnc(rnc: string): boolean {
  const clean = rnc.replace(/[-\s]/g, "");
  return clean.length === 9 && /^\d{9}$/.test(clean);
}

/**
 * Formatea un RNC con guiones.
 */
export function formatRnc(rnc: string): string {
  const clean = rnc.replace(/[-\s]/g, "");
  if (clean.length !== 9) return rnc;
  return `${clean.slice(0, 1)}-${clean.slice(1, 3)}-${clean.slice(3, 8)}-${clean.slice(8)}`;
}

/**
 * Trunca un texto y agrega "..." si excede la longitud.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
