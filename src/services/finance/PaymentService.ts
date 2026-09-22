import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logAuditEntry } from "@/services/audit/AuditService";
import { roundMoney } from "./InvoiceService";

export type PaymentMethod =
  | "efectivo"
  | "transferencia"
  | "cheque"
  | "tarjeta"
  | "otro";

export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];

export type PaymentApplicationRow =
  Database["public"]["Tables"]["payment_applications"]["Row"];
export type PaymentApplicationInsert =
  Database["public"]["Tables"]["payment_applications"]["Insert"];

export interface PaymentApplicationInput {
  invoiceId?: string;
  invoice_id?: string;
  amount?: number;
  amount_applied?: number;
}

export interface CreatePaymentInput {
  clientId?: string;
  client_id?: string;
  paymentDate?: string;
  payment_date?: string;
  paymentMethod?: PaymentMethod;
  payment_method?: PaymentMethod;
  referenceNumber?: string | null;
  reference_number?: string | null;
  bankName?: string | null;
  bank_name?: string | null;
  amount: number;
  currency?: "DOP" | "USD";
  notes?: string | null;
  createdBy?: string | null;
  created_by?: string | null;
}

export interface GetPaymentsFilters {
  clientId?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaymentWithDetails extends PaymentRow {
  client?: {
    id: string;
    client_type: string;
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    rnc: string | null;
    cedula: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  applications: Array<
    PaymentApplicationRow & {
      invoice?: {
        id: string;
        invoice_number: string;
        ncf: string | null;
        total: number;
        paid_amount: number;
        balance_due: number;
        status: string;
      } | null;
    }
  >;
}

export class PaymentService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Genera el siguiente número correlativo para recibos de cobro: REC-YYYY-XXXX
   */
  async generateNextReceiptNumber(companyId: string): Promise<string> {
    const supabase = await this.getClient();
    const currentYear = new Date().getFullYear();
    const prefix = `REC-${currentYear}-`;

    const { data, error } = await (supabase.from("payments" as any) as any)
      .select("receipt_number")
      .eq("company_id", companyId)
      .ilike("receipt_number", `${prefix}%`)
      .order("receipt_number", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error al consultar secuencia de recibos de pago:", error);
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      for (const row of data) {
        const numPart = row.receipt_number.replace(prefix, "");
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed >= nextNumber) {
          nextNumber = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  /**
   * Carga detalles de clientes e imputaciones para una lista de pagos.
   */
  private async hydratePayments(
    supabase: any,
    companyId: string,
    rawPayments: PaymentRow[]
  ): Promise<PaymentWithDetails[]> {
    if (!rawPayments || rawPayments.length === 0) return [];

    const paymentIds = rawPayments.map((p) => p.id);
    const clientIds = Array.from(
      new Set(rawPayments.map((p) => p.client_id).filter(Boolean))
    );

    // Cargar aplicaciones de pago
    const { data: appsData } = await (supabase.from("payment_applications" as any) as any)
      .select("*")
      .in("payment_id", paymentIds);

    const invoiceIds = Array.from(
      new Set((appsData || []).map((app: any) => app.invoice_id).filter(Boolean))
    );

    // Cargar facturas vinculadas a las aplicaciones
    const invoicesMap = new Map<string, any>();
    if (invoiceIds.length > 0) {
      const { data: invData } = await (supabase.from("invoices" as any) as any)
        .select("id, invoice_number, ncf, total, paid_amount, balance_due, status")
        .in("id", invoiceIds);
      (invData || []).forEach((inv: any) => invoicesMap.set(inv.id, inv));
    }

    const appsMap = new Map<string, any[]>();
    (appsData || []).forEach((app: any) => {
      const list = appsMap.get(app.payment_id) ?? [];
      list.push({
        ...app,
        invoice: invoicesMap.get(app.invoice_id) ?? null,
      });
      appsMap.set(app.payment_id, list);
    });

    // Cargar clientes
    const clientsMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const { data: clientsData } = await (supabase.from("clients" as any) as any)
        .select("id, client_type, first_name, last_name, business_name, rnc, cedula, email, phone")
        .in("id", clientIds);
      (clientsData || []).forEach((c: any) => clientsMap.set(c.id, c));
    }

    return rawPayments.map((p) => ({
      ...p,
      client: clientsMap.get(p.client_id) ?? null,
      applications: appsMap.get(p.id) ?? [],
    }));
  }

  /**
   * Obtiene la lista de pagos con filtros opcionales.
   */
  async getPayments(
    companyId: string,
    filters?: GetPaymentsFilters
  ): Promise<PaymentWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("payments" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.clientId) {
      query = query.eq("client_id", filters.clientId);
    }
    if (filters?.paymentMethod) {
      query = query.eq("payment_method", filters.paymentMethod);
    }
    if (filters?.startDate) {
      query = query.gte("payment_date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("payment_date", filters.endDate);
    }
    if (filters?.search) {
      const s = filters.search.trim();
      query = query.or(`receipt_number.ilike.%${s}%,reference_number.ilike.%${s}%`);
    }

    query = query.order("payment_date", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener pagos:", error);
      throw error;
    }

    return this.hydratePayments(supabase, companyId, data || []);
  }

  /**
   * Obtiene el detalle de un pago por su ID.
   */
  async getPaymentById(
    companyId: string,
    id: string
  ): Promise<PaymentWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("payments" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener pago por ID:", error);
      throw error;
    }

    if (!data) return null;

    const hydrated = await this.hydratePayments(supabase, companyId, [data]);
    return hydrated[0] ?? null;
  }

  /**
   * Registra el cobro/pago (generando REC-YYYY-XXXX), crea las `payment_applications`
   * y actualiza automáticamente el `paid_amount` y `balance_due` de cada factura involucrada.
   * Si el balance de una factura llega a 0, actualiza su estado automáticamente a 'pagada'.
   */
  async createPayment(
    companyId: string,
    data: CreatePaymentInput,
    applications: Array<{ invoiceId: string; amount: number }>
  ): Promise<PaymentWithDetails> {
    const supabase = await this.getClient();

    const clientId = data.client_id ?? data.clientId;
    if (!clientId) {
      throw new Error("El cliente es obligatorio para registrar un pago.");
    }

    const paymentAmount = roundMoney(Number(data.amount || 0));
    if (paymentAmount <= 0) {
      throw new Error("El monto del pago debe ser mayor a 0.");
    }

    const paymentMethod: PaymentMethod =
      data.payment_method ?? data.paymentMethod ?? "transferencia";

    // Validar suma de imputaciones
    const totalApplied = roundMoney(
      applications.reduce((acc, app) => acc + Number(app.amount || 0), 0)
    );

    if (totalApplied > paymentAmount) {
      throw new Error(
        `El monto total aplicado a facturas (RD$ ${totalApplied.toFixed(
          2
        )}) no puede ser mayor que el monto del recibo de pago (RD$ ${paymentAmount.toFixed(
          2
        )}).`
      );
    }

    // Validar facturas a aplicar
    const invoiceIds = applications.map((a) => a.invoiceId);
    let invoicesToUpdate: any[] = [];

    if (invoiceIds.length > 0) {
      const { data: invRows, error: invErr } = await (supabase
        .from("invoices" as any) as any)
        .select("*")
        .eq("company_id", companyId)
        .in("id", invoiceIds);

      if (invErr) {
        console.error("Error al consultar facturas para pago:", invErr);
        throw invErr;
      }

      invoicesToUpdate = invRows || [];

      // Validar cada aplicación
      for (const app of applications) {
        const inv = invoicesToUpdate.find((i) => i.id === app.invoiceId);
        if (!inv) {
          throw new Error(`La factura con ID ${app.invoiceId} no existe en esta empresa.`);
        }
        if (inv.client_id !== clientId) {
          throw new Error(
            `La factura ${inv.invoice_number} no pertenece al cliente seleccionado.`
          );
        }
        if (inv.status === "anulada") {
          throw new Error(
            `La factura ${inv.invoice_number} está anulada y no puede recibir pagos.`
          );
        }
        if (app.amount <= 0) {
          throw new Error(
            `El monto aplicado a la factura ${inv.invoice_number} debe ser mayor a 0.`
          );
        }
        if (app.amount > Number(inv.balance_due) + 0.01) {
          throw new Error(
            `El monto aplicado (RD$ ${app.amount.toFixed(
              2
            )}) supera el balance pendiente de la factura ${
              inv.invoice_number
            } (RD$ ${Number(inv.balance_due).toFixed(2)}).`
          );
        }
      }
    }

    // Generar correlativo de recibo
    const receiptNumber = await this.generateNextReceiptNumber(companyId);

    const paymentDate =
      data.payment_date ??
      data.paymentDate ??
      new Date().toISOString().split("T")[0];

    const insertPaymentPayload: PaymentInsert = {
      company_id: companyId,
      receipt_number: receiptNumber,
      client_id: clientId,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference_number: data.reference_number ?? data.referenceNumber ?? null,
      bank_name: data.bank_name ?? data.bankName ?? null,
      amount: paymentAmount,
      currency: data.currency ?? "DOP",
      notes: data.notes ?? null,
      created_by: data.created_by ?? data.createdBy ?? null,
    };

    const { data: createdPayment, error: paymentError } = await (supabase
      .from("payments" as any) as any)
      .insert(insertPaymentPayload)
      .select()
      .single();

    if (paymentError) {
      console.error("Error al registrar pago:", paymentError);
      throw paymentError;
    }

    // Crear aplicaciones e impactar facturas
    if (applications.length > 0) {
      const appsPayload: PaymentApplicationInsert[] = applications.map((app) => ({
        payment_id: createdPayment.id,
        invoice_id: app.invoiceId,
        amount_applied: roundMoney(app.amount),
      }));

      const { error: appError } = await (supabase
        .from("payment_applications" as any) as any)
        .insert(appsPayload);

      if (appError) {
        console.error("Error al registrar aplicaciones de pago:", appError);
        // Rollback pago
        await (supabase.from("payments" as any) as any)
          .delete()
          .eq("id", createdPayment.id);
        throw appError;
      }

      // Actualizar paid_amount, balance_due y status de cada factura
      for (const app of applications) {
        const inv = invoicesToUpdate.find((i) => i.id === app.invoiceId);
        const currentPaid = Number(inv.paid_amount || 0);
        const invTotal = Number(inv.total || 0);

        const newPaid = roundMoney(currentPaid + app.amount);
        const newBalance = roundMoney(Math.max(0, invTotal - newPaid));
        const newStatus = newBalance <= 0 ? "pagada" : "parcialmente_pagada";

        const { error: updateInvErr } = await (supabase
          .from("invoices" as any) as any)
          .update({
            paid_amount: newPaid,
            balance_due: newBalance,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .eq("id", app.invoiceId);

        if (updateInvErr) {
          console.error(
            `Error al actualizar saldo de factura ${inv.invoice_number}:`,
            updateInvErr
          );
        }
      }
    }

    // Auditoría
    try {
      await logAuditEntry({
        companyId,
        entityType: "payment",
        entityId: createdPayment.id,
        action: "create",
        newData: createdPayment,
        reason: `Cobro ${receiptNumber} registrado por RD$ ${paymentAmount.toFixed(
          2
        )} con ${applications.length} aplicaciones.`,
      });
    } catch (auditErr) {
      console.warn("Error al registrar auditoría de cobro:", auditErr);
    }

    const fullPayment = await this.getPaymentById(companyId, createdPayment.id);
    if (!fullPayment) {
      throw new Error("No se pudo recuperar el cobro recién registrado.");
    }
    return fullPayment;
  }
}

export const paymentService = new PaymentService();
