import { calculateDocument } from "./calculate";
import { CONSUMER_INVOICE_ID_THRESHOLD_DOP, FIELD_LIMITS, FISCAL_TYPES } from "./catalogs";
import { daysBetween } from "./dates";
import type { FiscalDocument } from "./document";
import {
  cleanTaxId,
  isCedulaChecksumValid,
  isRncChecksumValid,
  isValidFiscalNumber,
  taxIdKind,
} from "./fiscal-numbers";

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: IssueSeverity;
  field: string;
  message: string;
}

/** Tipos en los que el formato permite retenciones (obligatoriedad 2 en el área Retención). */
const WITHHOLDING_TYPES = new Set(["31", "33", "34"]);

/**
 * Reglas que un comprobante debe cumplir para emitirse. Son las del formato e-CF
 * y se aplican también con NCF tradicional, para que un borrador válido hoy siga
 * siéndolo al cambiar de modo de emisión.
 */
export function validateForIssue(
  doc: FiscalDocument,
  today: string,
  emitter?: { tradeName?: string | null }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (field: string, message: string) => issues.push({ severity: "error", field, message });
  const warn = (field: string, message: string) => issues.push({ severity: "warning", field, message });

  const info = FISCAL_TYPES[doc.fiscalType];
  if (!info) {
    error("fiscalType", `Tipo de comprobante inválido: ${doc.fiscalType}`);
    return issues;
  }

  if (doc.lines.length === 0) {
    error("lines", "El comprobante debe tener al menos una línea.");
    return issues;
  }

  doc.lines.forEach((line, index) => {
    if (!line.description?.trim()) error(`lines.${index}`, `Línea ${index + 1}: falta el nombre del ítem.`);
    if ((line.description ?? "").length > FIELD_LIMITS.itemName) {
      error(`lines.${index}`, `Línea ${index + 1}: el nombre admite hasta ${FIELD_LIMITS.itemName} caracteres.`);
    }
    if ((line.details ?? "").length > FIELD_LIMITS.itemDetails) {
      error(`lines.${index}`, `Línea ${index + 1}: la descripción admite hasta ${FIELD_LIMITS.itemDetails} caracteres.`);
    }
  });

  let totals;
  try {
    totals = calculateDocument(doc.lines, doc.withholding);
  } catch (err) {
    error("lines", err instanceof Error ? err.message : "Las líneas contienen valores inválidos.");
    return issues;
  }

  // Fechas
  if (doc.issueDate > today) error("issueDate", "La fecha de emisión no puede ser futura.");

  // Moneda
  if (doc.currency !== "DOP" && !(doc.exchangeRate > 0)) {
    error("exchangeRate", "Indica la tasa de cambio para facturar en moneda extranjera.");
  }
  const totalDop = doc.currency === "DOP" ? totals.total : totals.total * doc.exchangeRate;

  // Comprador
  const taxId = cleanTaxId(doc.buyer.taxId);
  const kind = taxIdKind(taxId);
  const hasForeignId = Boolean(doc.buyer.foreignId?.trim());
  const hasName = Boolean(doc.buyer.name?.trim());

  if (kind === "invalid") {
    error("buyer.taxId", "El RNC debe tener 9 dígitos y la cédula 11.");
  } else if (kind === "rnc" && !isRncChecksumValid(taxId)) {
    warn("buyer.taxId", "El dígito verificador del RNC no cuadra; confírmalo en el Consulta RNC de la DGII.");
  } else if (kind === "cedula" && !isCedulaChecksumValid(taxId)) {
    warn("buyer.taxId", "El dígito verificador de la cédula no cuadra; confírmala antes de emitir.");
  }

  if (doc.fiscalType === "31" || doc.fiscalType === "45") {
    if (kind === "empty") error("buyer.taxId", `${info.name}: el RNC o cédula del comprador es obligatorio.`);
    if (!hasName) error("buyer.name", `${info.name}: la razón social del comprador es obligatoria.`);
  }
  if ((doc.fiscalType === "44" || doc.fiscalType === "46") && kind === "empty" && !hasForeignId) {
    error("buyer.taxId", `${info.name}: indica el RNC/cédula o el identificador extranjero del comprador.`);
  }

  const reachesThreshold =
    (doc.fiscalType === "32" && totalDop >= CONSUMER_INVOICE_ID_THRESHOLD_DOP) ||
    ((doc.fiscalType === "33" || doc.fiscalType === "34") &&
      doc.reference?.modifiedFiscalType === "32" &&
      doc.reference.modifiedTotal * doc.exchangeRate >= CONSUMER_INVOICE_ID_THRESHOLD_DOP);
  if (reachesThreshold) {
    if (kind === "empty" && !hasForeignId) {
      error("buyer.taxId", "Desde RD$250,000.00 la factura de consumo debe identificar al comprador.");
    }
    if (!hasName) error("buyer.name", "Desde RD$250,000.00 la factura de consumo debe indicar el nombre del comprador.");
  }

  if ((doc.buyer.name ?? "").length > FIELD_LIMITS.buyerName) {
    error("buyer.name", `El nombre del comprador admite hasta ${FIELD_LIMITS.buyerName} caracteres.`);
  }
  if ((doc.buyer.address ?? "").length > FIELD_LIMITS.address) {
    error("buyer.address", `La dirección admite hasta ${FIELD_LIMITS.address} caracteres.`);
  }
  if ((doc.buyer.foreignId ?? "").length > FIELD_LIMITS.foreignId) {
    error("buyer.foreignId", `El identificador extranjero del comprador admite hasta ${FIELD_LIMITS.foreignId} caracteres.`);
  }
  if ((emitter?.tradeName ?? "").length > FIELD_LIMITS.tradeName) {
    error("emitter.tradeName", `El nombre comercial admite hasta ${FIELD_LIMITS.tradeName} caracteres; corrígelo en la configuración.`);
  }

  // Pago
  if (doc.paymentType === 3 && doc.fiscalType === "31") {
    error("paymentType", "Las entregas gratuitas no son válidas para crédito fiscal.");
  }
  if (doc.paymentType === 2) {
    if (!doc.dueDate) error("dueDate", "Las ventas a crédito requieren fecha límite de pago.");
    else if (doc.dueDate < doc.issueDate) error("dueDate", "La fecha límite de pago no puede ser anterior a la emisión.");
  }
  if ((doc.paymentTerm ?? "").length > FIELD_LIMITS.paymentTerm) {
    error("paymentTerm", `El término de pago admite hasta ${FIELD_LIMITS.paymentTerm} caracteres (ej. "30 días").`);
  }

  // Retenciones
  const hasWithholding = totals.itbisWithheld > 0 || totals.isrWithheld > 0;
  if (hasWithholding && !WITHHOLDING_TYPES.has(doc.fiscalType)) {
    error("withholding", `${info.name}: este tipo de comprobante no admite retenciones.`);
  }

  // El formato fija el indicador de facturación de estos tipos.
  if (doc.fiscalType === "44" && doc.lines.some((l) => l.billingIndicator !== 4)) {
    error("lines", "Regímenes Especiales: todas las líneas deben ir como exentas.");
  }
  if (doc.fiscalType === "46" && doc.lines.some((l) => l.billingIndicator !== 3)) {
    error("lines", "Exportaciones: todas las líneas deben ir con ITBIS a tasa 0 %.");
  }

  // Notas de crédito y débito
  if (info.kind === "factura") {
    if (doc.reference) error("reference", "Solo las notas de crédito o débito modifican otro comprobante.");
  } else {
    const ref = doc.reference;
    if (!ref) {
      error("reference", `${info.name}: debe indicar el comprobante que modifica.`);
    } else {
      if (!isValidFiscalNumber(ref.modifiedNumber)) {
        error("reference.modifiedNumber", "El comprobante modificado debe ser un NCF de 11 o un e-NCF de 13 posiciones.");
      }
      if (![1, 2, 3].includes(ref.code)) {
        error("reference.code", "Las notas solo admiten los códigos 1 (anula), 2 (corrige texto) o 3 (corrige montos).");
      }
      if (!ref.reason?.trim()) {
        error("reference.reason", "Indica la razón de la modificación.");
      } else if (ref.reason.length > FIELD_LIMITS.modificationReason) {
        error("reference.reason", `La razón admite hasta ${FIELD_LIMITS.modificationReason} caracteres.`);
      }
      if (ref.modifiedDate > doc.issueDate) {
        error("issueDate", "La nota no puede ser anterior al comprobante que modifica.");
      }
      if (doc.fiscalType === "34") {
        if (ref.code === 2 && totals.total !== 0) {
          error("lines", "Una nota de crédito que solo corrige texto debe ir con monto cero.");
        }
        if (ref.code === 1 && totals.total !== ref.availableToCredit) {
          error("lines", `Para anular, la nota debe ser por el saldo acreditable: ${ref.availableToCredit.toFixed(2)}.`);
        }
        if (totals.total > ref.availableToCredit) {
          error("lines", `La nota supera lo acreditable del comprobante (${ref.availableToCredit.toFixed(2)}).`);
        }
        if (daysBetween(ref.modifiedDate, doc.issueDate) > 30 && totals.itbisTotal > 0) {
          warn("reference", "Pasaron más de 30 días del comprobante: esta nota no da derecho a rebajar el ITBIS.");
        }
      }
    }
  }

  return issues;
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

/**
 * Una nota de crédito puede pasar del saldo abierto: lo cobrado de más queda a favor del cliente.
 * Nunca es más de lo que pagó: sin cobros, una nota no le genera un saldo. Igual que billing_customer_credits.
 */
export function customerCredit(invoice: { fiscal_type: string; amount_due: number; paid_amount: number; credited_due: number }): number {
  if (invoice.fiscal_type === "34") return 0;
  const excess = Math.round((invoice.paid_amount + invoice.credited_due - invoice.amount_due) * 100) / 100;
  return Math.max(0, Math.min(invoice.paid_amount, excess));
}

/** "Vencida" se deriva: una venta a crédito con saldo y fecha límite pasada. */
export function effectiveStatus<T extends { status: string; payment_type: number; due_date: string; balance_due: number }>(
  invoice: T,
  today: string
): string {
  const open = invoice.status === "emitida" || invoice.status === "parcialmente_pagada";
  if (open && invoice.payment_type === 2 && invoice.balance_due > 0 && invoice.due_date < today) {
    return "vencida";
  }
  return invoice.status;
}
