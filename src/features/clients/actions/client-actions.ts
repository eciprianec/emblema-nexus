"use server";

import "server-only";
import { clientSchema, ClientFormValues } from "../schemas/client-schema";
// import { createRevision } from "@/features/revisions/RevisionService";
// import { supabaseServer } from "@/lib/supabase/server";

export async function createClientAction(data: ClientFormValues) {
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten() };
  }
  
  // Aquí iría la llamada a Supabase para insertar
  // const supabase = supabaseServer();
  // const { data: client, error } = await supabase.from('clients').insert(parsed.data).select().single();
  
  return { success: true, data: { id: "cl_" + Date.now(), ...parsed.data } };
}

export async function updateClientAction(id: string, data: ClientFormValues) {
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten() };
  }

  // createRevision(id, "CLIENT_UPDATE", data);

  return { success: true, data: { id, ...parsed.data } };
}

export async function archiveClientAction(id: string) {
  return { success: true };
}

export async function listClientsAction(params?: { search?: string, type?: string, status?: string }) {
  return {
    success: true,
    data: []
  };
}
