import { z } from "zod";

export const clientSchema = z.object({
  type: z.enum(["FISICA", "JURIDICA"]),
  nombres: z.string().min(1, "El nombre es obligatorio").optional(),
  apellidos: z.string().min(1, "El apellido es obligatorio").optional(),
  cedula: z.string().optional(),
  pasaporte: z.string().optional(),
  razonSocial: z.string().min(1, "La razón social es obligatoria").optional(),
  nombreComercial: z.string().optional(),
  rnc: z.string().optional(),
  representante: z.string().optional(),
  telefono: z.string().min(1, "El teléfono es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
  direccion: z.string().min(1, "La dirección es obligatoria"),
}).superRefine((data, ctx) => {
  if (data.type === "FISICA") {
    if (!data.nombres) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["nombres"] });
    if (!data.apellidos) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["apellidos"] });
    if (!data.cedula && !data.pasaporte) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cédula o pasaporte requerido", path: ["cedula"] });
  } else {
    if (!data.razonSocial) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["razonSocial"] });
    if (!data.rnc) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["rnc"] });
  }
});

export type ClientFormValues = z.infer<typeof clientSchema>;
