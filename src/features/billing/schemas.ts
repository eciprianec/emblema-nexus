import { z } from "zod";
import { FIELD_LIMITS } from "@/domain/billing";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const optionalText = z.string().trim().optional().nullable();

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Falta el nombre del ítem").max(FIELD_LIMITS.itemName),
  details: z.string().trim().max(FIELD_LIMITS.itemDetails).optional().nullable(),
  itemType: z.enum(["servicio", "honorarios", "tasa_judicial", "tasa_catastral", "gasto_notarial", "otro"]),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor que cero"),
  unitPrice: z.coerce.number().min(0, "El precio no puede ser negativo"),
  discount: z.coerce.number().min(0).default(0),
  billingIndicator: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  goodOrService: z.union([z.literal(1), z.literal(2)]),
  unitCode: z.number().int().optional().nullable(),
});

export const saveDraftSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  fiscalType: z.enum(["31", "32", "33", "34", "44", "45", "46"]),
  clientId: z.string().uuid().optional().nullable(),
  issueDate: isoDate,
  dueDate: isoDate.optional().nullable(),
  currency: z.enum(["DOP", "USD"]),
  exchangeRate: z.coerce.number().positive(),
  incomeType: z.enum(["01", "02", "03", "04", "05", "06"]),
  paymentType: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  paymentTerm: z.string().trim().max(FIELD_LIMITS.paymentTerm).optional().nullable(),
  notes: optionalText,
  itbisWithholdingRate: z.coerce.number().min(0).max(100).default(0),
  isrWithholdingRate: z.coerce.number().min(0).max(100).default(0),
  modifiesInvoiceId: z.string().uuid().optional().nullable(),
  modificationCode: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().nullable(),
  modificationReason: z.string().trim().max(FIELD_LIMITS.modificationReason).optional().nullable(),
  lines: z.array(invoiceLineSchema).min(1, "Agrega al menos una línea").max(1000),
});

export type SaveDraftValues = z.infer<typeof saveDraftSchema>;

export const issueSchema = z.object({
  id: z.string().uuid(),
  encf: z.string().trim().toUpperCase().optional(),
  securityCode: z.string().trim().optional(),
  signedAt: z.string().optional(),
  trackId: z.string().trim().optional().nullable(),
});

export const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive("El monto debe ser positivo"),
  paymentDate: isoDate,
  method: z.enum(["efectivo", "transferencia", "cheque", "tarjeta", "otro"]),
  reference: optionalText,
  bankName: optionalText,
  notes: optionalText,
});

export const providerCredentialsSchema = z.object({
  environment: z.enum(["test", "cert", "prod"]),
  email: z.string().trim().email("Indica el correo de la cuenta del proveedor"),
  password: z.string().min(1, "Indica la contraseña"),
  apiKey: z.string().trim().min(1, "Indica la API Key"),
});

export const settingsSchema = z.object({
  emission_mode: z.enum(["ecf_externo", "ncf_interno", "ecf_directo", "ecf_proveedor"]),
  // Sin valor por defecto: con proveedor, emitir en producción debe ser una decisión expresa.
  dgii_environment: z.enum(["test", "cert", "prod"], { errorMap: () => ({ message: "Elige el ambiente de la DGII" }) }),
  rnc: z.string().transform((v) => v.replace(/[^0-9]/g, "")).refine((v) => v.length === 9 || v.length === 11, "El RNC debe tener 9 dígitos o la cédula 11"),
  legal_name: z.string().trim().min(1, "Indica la razón social").max(FIELD_LIMITS.emitterName),
  trade_name: z.string().trim().max(FIELD_LIMITS.tradeName, `El nombre comercial admite hasta ${FIELD_LIMITS.tradeName} caracteres`).optional().nullable(),
  address: z.string().trim().min(1, "Indica la dirección").max(FIELD_LIMITS.address),
  phone: optionalText,
  email: z.string().trim().email("Correo inválido").optional().nullable().or(z.literal("")),
  default_due_days: z.coerce.number().int().min(0).max(365),
});

export const sequenceSchema = z
  .object({
    prefix: z.enum(["B01", "B02", "B03", "B04", "B14", "B15", "B16", "E31", "E32", "E33", "E34", "E44", "E45", "E46"]),
    startNumber: z.coerce.number().int().positive("El inicio debe ser positivo"),
    endNumber: z.coerce.number().int().positive(),
    expiresOn: isoDate.optional().nullable().or(z.literal("")),
  })
  .refine((v) => v.endNumber >= v.startNumber, { message: "El final no puede ser menor que el inicio", path: ["endNumber"] })
  .refine((v) => Boolean(v.expiresOn) || v.prefix === "E32" || v.prefix === "E34", {
    message: "Indica la fecha de vencimiento del rango",
    path: ["expiresOn"],
  });

export const clientSchema = z.object({
  kind: z.enum(["persona_fisica", "persona_juridica"]),
  name: z.string().trim().min(1, "Indica el nombre").max(FIELD_LIMITS.buyerName),
  lastName: optionalText,
  taxId: z
    .string()
    .optional()
    .nullable()
    .refine((v) => {
      const digits = (v ?? "").replace(/[^0-9]/g, "");
      return digits.length === 0 || digits.length === 9 || digits.length === 11;
    }, "El RNC debe tener 9 dígitos y la cédula 11"),
  passport: z.string().trim().max(FIELD_LIMITS.foreignId, `El pasaporte admite hasta ${FIELD_LIMITS.foreignId} caracteres`).optional().nullable(),
  email: z.string().trim().email("Correo inválido").optional().nullable().or(z.literal("")),
  phone: optionalText,
  address: z.string().trim().max(FIELD_LIMITS.address).optional().nullable(),
});
