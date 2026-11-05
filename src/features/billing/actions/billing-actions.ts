"use server";

import "server-only";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { hasBlockingIssues, type ValidationIssue } from "@/domain/billing";
import { ACTIVE_COMPANY_COOKIE, getBillingContext, type ReadyBillingContext } from "@/services/billing/context";
import { BillingService } from "@/services/billing/BillingService";
import type { EmitOutcome, RefreshOutcome } from "@/services/billing/mseller/EcfProviderService";
import type { BillingClient } from "@/services/billing/types";
import {
  clientSchema,
  issueSchema,
  paymentSchema,
  providerCredentialsSchema,
  saveDraftSchema,
  sequenceSchema,
  settingsSchema,
} from "../schemas";

export type ActionResult<T = undefined> =
  | { success: true; data: T; warnings?: ValidationIssue[] }
  | { success: false; error: string; issues?: ValidationIssue[] };

// Facturas, CxC, cobros, resumen y la ficha del cliente muestran los mismos datos.
function revalidateBilling() {
  revalidatePath("/finanzas", "layout");
  revalidatePath("/clientes", "layout");
}

async function ready(): Promise<ReadyBillingContext> {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") {
    throw new Error("Debes iniciar sesión con un usuario asignado a una empresa.");
  }
  return ctx;
}

async function run<T>(fn: (service: BillingService) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const service = new BillingService(await ready());
    return { success: true, data: await fn(service) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "No se pudo completar la operación." };
  }
}

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

export async function saveDraftAction(values: unknown): Promise<ActionResult<string>> {
  const parsed = saveDraftSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const result = await run((service) => service.saveDraft(parsed.data));
  if (result.success) revalidateBilling();
  return result;
}

export async function deleteDraftAction(id: string): Promise<ActionResult> {
  const result = await run(async (service) => {
    await service.deleteDraft(id);
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

export async function issueInvoiceAction(values: unknown): Promise<ActionResult<EmitOutcome | undefined>> {
  const parsed = issueSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };
  const { id, encf, securityCode, signedAt, trackId } = parsed.data;

  try {
    const service = new BillingService(await ready());
    const external = encf && securityCode && signedAt ? { encf, securityCode, signedAt, trackId } : undefined;
    const { issues, outcome } = await service.issue(id, external);
    if (hasBlockingIssues(issues)) {
      return { success: false, error: "El comprobante tiene datos por corregir.", issues };
    }
    revalidateBilling();
    return { success: true, data: outcome, warnings: issues };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "No se pudo emitir el comprobante." };
  }
}

/** Actualizar estado / Verificar en la página del comprobante. */
export async function refreshEcfStatusAction(invoiceId: string): Promise<ActionResult<RefreshOutcome>> {
  const result = await run((service) => service.ecfProvider().refresh(invoiceId));
  if (result.success && result.data.changed) revalidateBilling();
  return result;
}

/** Revisión en lote de los pendientes al abrir la lista; limitada por el servicio. */
export async function refreshPendingEcfAction(
  manual = false
): Promise<ActionResult<{ checked: number; finalized: number; throttled?: boolean }>> {
  const result = await run((service) => service.ecfProvider().refreshPending({ manual: manual === true }));
  if (result.success && result.data.finalized > 0) revalidateBilling();
  return result;
}

/** Solo procede con lo que el proveedor no tiene; la base de datos lo vuelve a comprobar. */
export async function resendEcfAction(invoiceId: string): Promise<ActionResult<EmitOutcome>> {
  const result = await run((service) => service.ecfProvider().resend(invoiceId));
  revalidateBilling();
  return result;
}

export async function discardEcfAction(invoiceId: string): Promise<ActionResult> {
  const result = await run(async (service) => {
    await service.ecfProvider().discard(invoiceId);
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

/** Las credenciales solo entran: ninguna acción las devuelve al navegador. */
export async function saveProviderCredentialsAction(values: unknown): Promise<ActionResult> {
  const parsed = providerCredentialsSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };
  const { environment, ...credentials } = parsed.data;

  const result = await run(async (service) => {
    await service.ecfProvider().saveCredentials(environment, credentials);
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

export async function testProviderConnectionAction(environment: unknown): Promise<ActionResult<{ ok: boolean; message: string }>> {
  const parsed = providerCredentialsSchema.shape.environment.safeParse(environment);
  if (!parsed.success) return { success: false, error: "Ambiente inválido." };
  return run((service) => service.ecfProvider().testConnection(parsed.data));
}

export async function voidInvoiceAction(id: string, reason: string): Promise<ActionResult> {
  const result = await run(async (service) => {
    await service.voidInvoice(id, reason);
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

export async function registerPaymentAction(values: unknown): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const result = await run(async (service) => {
    await service.registerPayment(parsed.data);
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

export async function voidPaymentAction(paymentId: string, reason: string): Promise<ActionResult> {
  const result = await run(async (service) => {
    await service.voidPayment(paymentId, reason);
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

export async function saveSettingsAction(values: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };
  if (parsed.data.emission_mode === "ecf_directo") {
    return { success: false, error: "La emisión directa de e-CF aún no está disponible." };
  }

  const result = await run(async (service) => {
    await service.saveSettings({
      ...parsed.data,
      trade_name: parsed.data.trade_name || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    });
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

export async function addSequenceAction(values: unknown): Promise<ActionResult> {
  const parsed = sequenceSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const result = await run(async (service) => {
    await service.addSequence({ ...parsed.data, expiresOn: parsed.data.expiresOn || null });
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

export async function setSequenceActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  const result = await run(async (service) => {
    await service.setSequenceActive(id, isActive);
    return undefined;
  });
  if (result.success) revalidateBilling();
  return result;
}

export async function createClientAction(values: unknown): Promise<ActionResult<BillingClient>> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };
  const result = await run((service) => service.createClient(parsed.data));
  if (result.success) revalidatePath("/clientes", "layout");
  return result;
}

export async function setActiveCompanyAction(companyId: string): Promise<ActionResult> {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready" || !ctx.companies.some((c) => c.id === companyId)) {
    return { success: false, error: "No perteneces a esa empresa." };
  }
  const store = await cookies();
  store.set(ACTIVE_COMPANY_COOKIE, companyId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidateBilling();
  return { success: true, data: undefined };
}
