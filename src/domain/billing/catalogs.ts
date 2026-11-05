/**
 * Catálogos fiscales de la DGII.
 *
 * Los códigos provienen del documento oficial "Formato Comprobante Fiscal
 * Electrónico (e-CF) v1.0, octubre 2025". El dominio guarda siempre estos
 * códigos, de modo que una factura es la misma tanto si se emite con NCF
 * tradicional como con e-CF.
 */

export type FiscalType = "31" | "32" | "33" | "34" | "44" | "45" | "46";
export type DocumentKind = "factura" | "nota_debito" | "nota_credito";

export interface FiscalTypeInfo {
  code: FiscalType;
  name: string;
  /** Denominación oficial del e-CF (Informe Técnico, 6.1), que va en palabras en la representación impresa. */
  ecfName: string;
  kind: DocumentKind;
  /** Prefijo de la secuencia electrónica (e-NCF). */
  ecfPrefix: string;
  /** Prefijo equivalente de la secuencia tradicional (NCF). */
  ncfPrefix: string;
  /** La FechaVencimientoSecuencia no debe ir en los tipos 32 y 34. */
  carriesSequenceExpiry: boolean;
}

export const FISCAL_TYPES: Record<FiscalType, FiscalTypeInfo> = {
  "31": { code: "31", name: "Factura de Crédito Fiscal", ecfName: "Factura de Crédito Fiscal Electrónica", kind: "factura", ecfPrefix: "E31", ncfPrefix: "B01", carriesSequenceExpiry: true },
  "32": { code: "32", name: "Factura de Consumo", ecfName: "Factura de Consumo Electrónica", kind: "factura", ecfPrefix: "E32", ncfPrefix: "B02", carriesSequenceExpiry: false },
  "33": { code: "33", name: "Nota de Débito", ecfName: "Nota de Débito Electrónica", kind: "nota_debito", ecfPrefix: "E33", ncfPrefix: "B03", carriesSequenceExpiry: true },
  "34": { code: "34", name: "Nota de Crédito", ecfName: "Nota de Crédito Electrónica", kind: "nota_credito", ecfPrefix: "E34", ncfPrefix: "B04", carriesSequenceExpiry: false },
  "44": { code: "44", name: "Regímenes Especiales", ecfName: "Comprobante Electrónico para Regímenes Especiales", kind: "factura", ecfPrefix: "E44", ncfPrefix: "B14", carriesSequenceExpiry: true },
  "45": { code: "45", name: "Gubernamental", ecfName: "Comprobante Electrónico Gubernamental", kind: "factura", ecfPrefix: "E45", ncfPrefix: "B15", carriesSequenceExpiry: true },
  "46": { code: "46", name: "Exportaciones", ecfName: "Comprobante Electrónico para Exportaciones", kind: "factura", ecfPrefix: "E46", ncfPrefix: "B16", carriesSequenceExpiry: true },
};

export const INVOICE_FISCAL_TYPES = (Object.values(FISCAL_TYPES) as FiscalTypeInfo[]).filter(
  (t) => t.kind === "factura"
);

/** IndicadorFacturacion: 0 no facturable, 1 = 18 %, 2 = 16 %, 3 = 0 %, 4 exento. */
export type BillingIndicator = 0 | 1 | 2 | 3 | 4;

export const BILLING_INDICATORS: { code: BillingIndicator; label: string; rate: number | null }[] = [
  { code: 1, label: "ITBIS 18 %", rate: 18 },
  { code: 2, label: "ITBIS 16 %", rate: 16 },
  { code: 3, label: "ITBIS 0 %", rate: 0 },
  { code: 4, label: "Exento", rate: null },
  { code: 0, label: "No facturable (suplido)", rate: null },
];

export type GoodOrService = 1 | 2;
export const GOOD_OR_SERVICE: { code: GoodOrService; label: string }[] = [
  { code: 2, label: "Servicio" },
  { code: 1, label: "Bien" },
];

export type IncomeType = "01" | "02" | "03" | "04" | "05" | "06";
export const INCOME_TYPES: { code: IncomeType; label: string }[] = [
  { code: "01", label: "Ingresos por operaciones (no financieros)" },
  { code: "02", label: "Ingresos financieros" },
  { code: "03", label: "Ingresos extraordinarios" },
  { code: "04", label: "Ingresos por arrendamientos" },
  { code: "05", label: "Ingresos por venta de activo depreciable" },
  { code: "06", label: "Otros ingresos" },
];

export type PaymentType = 1 | 2 | 3;
export const PAYMENT_TYPES: { code: PaymentType; label: string }[] = [
  { code: 1, label: "Contado" },
  { code: 2, label: "Crédito" },
  { code: 3, label: "Gratuito" },
];

export type PaymentForm = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const PAYMENT_FORMS: { code: PaymentForm; label: string }[] = [
  { code: 1, label: "Efectivo" },
  { code: 2, label: "Cheque / transferencia / depósito" },
  { code: 3, label: "Tarjeta de débito o crédito" },
  { code: 4, label: "Venta a crédito" },
  { code: 5, label: "Bonos o certificados de regalo" },
  { code: 6, label: "Permuta" },
  { code: 7, label: "Nota de crédito" },
  { code: 8, label: "Otras formas de pago" },
];

export type ModificationCode = 1 | 2 | 3 | 4 | 5;
export const MODIFICATION_CODES: { code: ModificationCode; label: string; forNotes: boolean }[] = [
  { code: 1, label: "Anula el comprobante modificado", forNotes: true },
  { code: 2, label: "Corrige texto del comprobante", forNotes: true },
  { code: 3, label: "Corrige montos del comprobante", forNotes: true },
  { code: 4, label: "Reemplazo de NCF emitido en contingencia", forNotes: false },
  { code: 5, label: "Referencia a Factura de Consumo Electrónica", forNotes: false },
];

/** Selección de la Tabla IV (Unidad de Medida) útil para servicios profesionales. */
export const UNIT_CODES: { code: number; label: string }[] = [
  { code: 43, label: "Unidad" },
  { code: 19, label: "Hora" },
  { code: 12, label: "Día" },
  { code: 27, label: "Metro cuadrado" },
  { code: 10, label: "Conjunto" },
];

/** Umbral legal a partir del cual el e-CF 32 debe identificar al comprador y enviarse completo. */
export const CONSUMER_INVOICE_ID_THRESHOLD_DOP = 250_000;

/** Longitudes máximas del formato oficial. */
export const FIELD_LIMITS = {
  itemName: 80,
  itemDetails: 1000,
  buyerName: 150,
  emitterName: 150,
  tradeName: 150,
  foreignId: 20,
  address: 100,
  modificationReason: 90,
  paymentTerm: 15,
} as const;

/** Cómo se obtiene la validez fiscal de un documento. */
export type EmissionMode = "ecf_externo" | "ncf_interno" | "ecf_directo" | "ecf_proveedor";

/** Tipos que se emiten por el proveedor en este momento. */
export const PROVIDER_FISCAL_TYPES: FiscalType[] = ["31", "32", "33", "34", "45"];

export type DgiiEnvironmentCode = "test" | "cert" | "prod";

export const DGII_ENVIRONMENTS: { code: DgiiEnvironmentCode; label: string }[] = [
  { code: "test", label: "Pruebas (TesteCF)" },
  { code: "cert", label: "Certificación (CerteCF)" },
  { code: "prod", label: "Producción (eCF)" },
];

/** Leyenda obligatoria en pantalla e impresión de todo e-CF que no sea de producción. */
export const NON_PROD_ECF_LEGEND = "Ambiente de pruebas: sin validez fiscal";

export const EMISSION_MODES: { code: EmissionMode; label: string; description: string; available: boolean }[] = [
  {
    code: "ecf_externo",
    label: "e-CF emitido fuera del sistema",
    description:
      "Emites en el Facturador Gratuito de la DGII o con un proveedor autorizado, y registras aquí el e-NCF y el código de seguridad.",
    available: true,
  },
  {
    code: "ncf_interno",
    label: "NCF tradicional (serie B)",
    description:
      "El sistema asigna el NCF de tus rangos autorizados. Según la DGII, tras la fecha de obligatoriedad de tu categoría solo procede en contingencia.",
    available: true,
  },
  {
    code: "ecf_proveedor",
    label: "e-CF por proveedor autorizado (MSeller)",
    description:
      "El sistema asigna el e-NCF de tus rangos y lo envía al proveedor, que lo firma y lo presenta a la DGII. Requiere cuenta, certificado y API Key del proveedor.",
    available: true,
  },
  {
    code: "ecf_directo",
    label: "e-CF directo con la DGII",
    description:
      "Firma y envío desde este sistema. Requiere certificación como emisor electrónico; aún no está disponible.",
    available: false,
  },
];

export type InvoiceStatus =
  | "borrador"
  | "en_proceso"
  | "emitida"
  | "parcialmente_pagada"
  | "pagada"
  | "vencida"
  | "acreditada"
  | "anulada";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-slate-100 text-slate-700 border-slate-300" },
  en_proceso: { label: "En proceso DGII", className: "bg-sky-50 text-sky-700 border-sky-200" },
  emitida: { label: "Emitida", className: "bg-blue-50 text-blue-700 border-blue-200" },
  parcialmente_pagada: { label: "Pago parcial", className: "bg-amber-50 text-amber-700 border-amber-200" },
  pagada: { label: "Pagada", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vencida: { label: "Vencida", className: "bg-rose-50 text-rose-700 border-rose-200" },
  acreditada: { label: "Acreditada", className: "bg-violet-50 text-violet-700 border-violet-200" },
  anulada: { label: "Anulada", className: "bg-zinc-100 text-zinc-500 border-zinc-300" },
};
