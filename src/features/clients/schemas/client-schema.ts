import { z } from "zod";
import { FIELD_LIMITS } from "@/domain/billing";

export const onlyDigits = (value: string | null | undefined) => (value ?? "").replace(/[^0-9]/g, "");

const clientFields = z.object({
  type: z.enum(["FISICA", "JURIDICA"]),
  nombres: z.string().optional(),
  apellidos: z.string().optional(),
  cedula: z.string().optional(),
  pasaporte: z.string().max(FIELD_LIMITS.foreignId, `El pasaporte admite hasta ${FIELD_LIMITS.foreignId} caracteres`).optional(),
  razonSocial: z.string().optional(),
  nombreComercial: z.string().optional(),
  rnc: z.string().optional(),
  representante: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().trim().email("Correo electrónico inválido").optional().or(z.literal("")),
  direccion: z
    .string()
    .max(FIELD_LIMITS.address, `La dirección admite hasta ${FIELD_LIMITS.address} caracteres`)
    .optional(),
});

type ClientFields = z.infer<typeof clientFields>;

const isBlank = (value: string | undefined) => !value || !value.trim();

/** Lo que el comprobante fiscal rechazaría después: mejor detenerlo al guardar el cliente. */
function checkFiscalFormat(data: ClientFields, ctx: z.RefinementCtx) {
  const issue = (path: keyof ClientFields, message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });

  const name =
    data.type === "FISICA" ? `${data.nombres ?? ""} ${data.apellidos ?? ""}`.trim() : (data.razonSocial ?? "").trim();
  if (name.length > FIELD_LIMITS.buyerName) {
    issue(data.type === "FISICA" ? "nombres" : "razonSocial", `El nombre admite hasta ${FIELD_LIMITS.buyerName} caracteres`);
  }

  if (data.type === "FISICA") {
    if (isBlank(data.nombres)) issue("nombres", "El nombre es obligatorio");
    const cedula = onlyDigits(data.cedula);
    if (cedula && cedula.length !== 11) issue("cedula", "La cédula debe tener 11 dígitos");
  } else {
    if (isBlank(data.razonSocial)) issue("razonSocial", "La razón social es obligatoria");
    const rnc = onlyDigits(data.rnc);
    if (rnc && rnc.length !== 9 && rnc.length !== 11) issue("rnc", "El RNC debe tener 9 dígitos, o 11 si es una cédula");
  }
}

/** Alta completa desde /clientes. */
export const clientSchema = clientFields
  .extend({
    telefono: z.string().min(1, "El teléfono es obligatorio"),
    email: z.string().trim().min(1, "El correo electrónico es obligatorio").email("Correo electrónico inválido"),
    direccion: z
      .string()
      .min(1, "La dirección es obligatoria")
      .max(FIELD_LIMITS.address, `La dirección admite hasta ${FIELD_LIMITS.address} caracteres`),
  })
  .superRefine((data, ctx) => {
    checkFiscalFormat(data, ctx);
    const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });

    if (data.type === "FISICA") {
      if (isBlank(data.apellidos)) issue("apellidos", "El apellido es obligatorio");
      if (isBlank(data.cedula) && isBlank(data.pasaporte)) issue("cedula", "Cédula o pasaporte requerido");
    } else if (isBlank(data.rnc)) {
      issue("rnc", "El RNC es obligatorio");
    }
  });

/**
 * Edición y alta rápida: admite clientes con datos incompletos, como los creados desde
 * la factura, para que corregir un RNC no obligue a inventar un teléfono.
 */
export const clientEditSchema = clientFields.superRefine(checkFiscalFormat);

export type ClientFormValues = z.infer<typeof clientSchema>;
export type ClientEditValues = z.infer<typeof clientEditSchema>;
