"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { ClientService } from "@/services/clients/ClientService";
import { getTenantContext } from "@/services/tenant/context";
import { clientEditSchema, clientSchema } from "../schemas/client-schema";
import type { Client } from "../types";

export type ClientActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

async function run<T>(fn: (service: ClientService) => Promise<T>): Promise<ClientActionResult<T>> {
  try {
    const ctx = await getTenantContext();
    if (ctx.status !== "ready") {
      return { success: false, error: "Debes iniciar sesión con un usuario asignado a una empresa." };
    }
    return { success: true, data: await fn(new ClientService(ctx)) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "No se pudo completar la operación." };
  }
}

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

// Los clientes aparecen en la facturación y en sus pantallas de cartera.
function revalidateClients() {
  revalidatePath("/clientes", "layout");
  revalidatePath("/finanzas", "layout");
}

export async function createClientAction(values: unknown): Promise<ClientActionResult<Client>> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const result = await run((service) => service.create(parsed.data));
  if (result.success) revalidateClients();
  return result;
}

/** Alta desde otra pantalla, con solo lo que se conoce en ese momento. */
export async function createQuickClientAction(values: unknown): Promise<ClientActionResult<Client>> {
  const parsed = clientEditSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const result = await run((service) => service.create(parsed.data));
  if (result.success) revalidateClients();
  return result;
}

export async function updateClientAction(id: string, values: unknown): Promise<ClientActionResult<Client>> {
  const parsed = clientEditSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const result = await run((service) => service.update(id, parsed.data));
  if (result.success) revalidateClients();
  return result;
}

export async function archiveClientAction(id: string): Promise<ClientActionResult> {
  const result = await run(async (service) => {
    await service.setArchived(id, true);
    return undefined;
  });
  if (result.success) revalidateClients();
  return result;
}

export async function restoreClientAction(id: string): Promise<ClientActionResult> {
  const result = await run(async (service) => {
    await service.setArchived(id, false);
    return undefined;
  });
  if (result.success) revalidateClients();
  return result;
}

export async function listClientsAction(): Promise<ClientActionResult<Client[]>> {
  return run((service) => service.listActive());
}
