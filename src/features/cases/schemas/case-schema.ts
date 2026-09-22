import { z } from "zod";

export const caseSchema = z.object({
  clienteId: z.string().min(1, "Debe seleccionar un cliente"),
  area: z.enum(["LEGAL", "AGRIMENSURA", "INMOBILIARIA"]),
  tipo: z.string().min(1, "Tipo de expediente requerido"),
  responsableId: z.string().min(1, "Responsable requerido"),
  supervisorId: z.string().optional(),
  titulo: z.string().min(1, "El título es obligatorio"),
  descripcion: z.string().optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).default("MEDIA"),
});

export type CaseFormValues = z.infer<typeof caseSchema>;
