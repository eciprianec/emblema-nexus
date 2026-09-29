import { z } from "zod";

export const clientSchema = z
  .object({
    type: z.enum(["FISICA", "JURIDICA"]),
    nombres: z.string().optional(),
    apellidos: z.string().optional(),
    cedula: z.string().optional(),
    pasaporte: z.string().optional(),
    razonSocial: z.string().optional(),
    nombreComercial: z.string().optional(),
    rnc: z.string().optional(),
    representante: z.string().optional(),
    telefono: z.string().min(1, "El teléfono es obligatorio"),
    email: z
      .string()
      .min(1, "El correo electrónico es obligatorio")
      .email("Correo electrónico inválido"),
    direccion: z.string().min(1, "La dirección es obligatoria"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "FISICA") {
      if (!data.nombres || !data.nombres.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre es obligatorio",
          path: ["nombres"],
        });
      }
      if (!data.apellidos || !data.apellidos.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El apellido es obligatorio",
          path: ["apellidos"],
        });
      }
      if (
        (!data.cedula || !data.cedula.trim()) &&
        (!data.pasaporte || !data.pasaporte.trim())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cédula o pasaporte requerido",
          path: ["cedula"],
        });
      }
    } else {
      if (!data.razonSocial || !data.razonSocial.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La razón social es obligatoria",
          path: ["razonSocial"],
        });
      }
      if (!data.rnc || !data.rnc.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RNC es obligatorio",
          path: ["rnc"],
        });
      }
    }
  });

export type ClientFormValues = z.infer<typeof clientSchema>;
