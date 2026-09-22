import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { roundMoney } from "./InvoiceService";

export interface AgingBucket {
  corriente: number; // Por vencer
  dias1a30: number; // 1 a 30 días de atraso
  dias31a60: number; // 31 a 60 días
  dias61a90: number; // 61 a 90 días
  masDe90: number; // Más de 90 días
  totalPendiente: number;
}

export interface ClientAgingItem {
  clientId: string;
  clientName: string;
  clientType: "persona_fisica" | "persona_juridica";
  identification: string | null; // RNC o Cédula
  email: string | null;
  phone: string | null;
  invoiceCount: number;
  aging: AgingBucket;
}

export interface AgingReport {
  fechaCorte: string;
  totalCartera: number;
  totalCorriente: number;
  total1a30: number;
  total31a60: number;
  total61a90: number;
  totalMasDe90: number;
  totalClientesConSaldo: number;
  clientes: ClientAgingItem[];
}

export interface ClientStatementInvoice {
  id: string;
  invoiceNumber: string;
  ncfType: string | null;
  ncf: string | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  diasAtraso: number;
}

export interface ClientStatementPayment {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  referenceNumber: string | null;
  notes: string | null;
}

export interface ClientStatement {
  cliente: {
    id: string;
    nombre: string;
    tipo: "persona_fisica" | "persona_juridica";
    identificacion: string | null;
    email: string | null;
    telefono: string | null;
    direccion: string | null;
  };
  facturas: ClientStatementInvoice[];
  pagos: ClientStatementPayment[];
  resumen: {
    totalFacturado: number;
    totalCobrado: number;
    saldoPendiente: number;
    facturasPendientes: number;
    facturasVencidas: number;
  };
}

export class CxcService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Helper para obtener el nombre comercial o completo de un cliente.
   */
  private formatClientName(c: any): string {
    if (!c) return "Cliente no registrado";
    if (c.business_name && c.business_name.trim()) return c.business_name.trim();
    const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    return fullName || c.trade_name || "Sin nombre";
  }

  /**
   * Genera el reporte de cartera vencida / Cuentas por Cobrar (CxC).
   * Clasifica las cuentas pendientes en:
   * - Corriente (por vencer)
   * - 1 a 30 días de atraso
   * - 31 a 60 días
   * - 61 a 90 días
   * - Más de 90 días
   */
  async getAgingReport(companyId: string): Promise<AgingReport> {
    const supabase = await this.getClient();

    // Obtener facturas con balance pendiente y que no estén anuladas ni en borrador
    const { data: invoices, error: invError } = await (supabase
      .from("invoices" as any) as any)
      .select("id, client_id, invoice_number, total, paid_amount, balance_due, due_date, status")
      .eq("company_id", companyId)
      .gt("balance_due", 0)
      .not("status", "in", '("anulada","borrador")');

    if (invError) {
      console.error("Error al obtener facturas para reporte de CxC:", invError);
      throw invError;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Obtener información de clientes únicos con facturas pendientes
    const clientIds = Array.from(
      new Set((invoices || []).map((inv: any) => inv.client_id).filter(Boolean))
    );

    const clientsMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const { data: clientsData, error: clientErr } = await (supabase
        .from("clients" as any) as any)
        .select("id, client_type, first_name, last_name, business_name, trade_name, rnc, cedula, email, phone")
        .in("id", clientIds);

      if (!clientErr && clientsData) {
        clientsData.forEach((c: any) => clientsMap.set(c.id, c));
      }
    }

    // Estructura por cliente
    const clientAgingMap = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        clientType: "persona_fisica" | "persona_juridica";
        identification: string | null;
        email: string | null;
        phone: string | null;
        invoiceCount: number;
        corriente: number;
        dias1a30: number;
        dias31a60: number;
        dias61a90: number;
        masDe90: number;
        totalPendiente: number;
      }
    >();

    for (const inv of invoices || []) {
      const balance = roundMoney(Number(inv.balance_due || 0));
      if (balance <= 0) continue;

      const dueDate = new Date(inv.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const dueDateTime = dueDate.getTime();

      const diffTime = todayTime - dueDateTime;
      const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const clientId = inv.client_id;
      const clientInfo = clientsMap.get(clientId);

      if (!clientAgingMap.has(clientId)) {
        clientAgingMap.set(clientId, {
          clientId,
          clientName: this.formatClientName(clientInfo),
          clientType: clientInfo?.client_type ?? "persona_fisica",
          identification: clientInfo?.rnc ?? clientInfo?.cedula ?? null,
          email: clientInfo?.email ?? null,
          phone: clientInfo?.phone ?? null,
          invoiceCount: 0,
          corriente: 0,
          dias1a30: 0,
          dias31a60: 0,
          dias61a90: 0,
          masDe90: 0,
          totalPendiente: 0,
        });
      }

      const clientEntry = clientAgingMap.get(clientId)!;
      clientEntry.invoiceCount++;
      clientEntry.totalPendiente = roundMoney(clientEntry.totalPendiente + balance);

      if (daysOverdue <= 0) {
        // Al día / corriente
        clientEntry.corriente = roundMoney(clientEntry.corriente + balance);
      } else if (daysOverdue <= 30) {
        clientEntry.dias1a30 = roundMoney(clientEntry.dias1a30 + balance);
      } else if (daysOverdue <= 60) {
        clientEntry.dias31a60 = roundMoney(clientEntry.dias31a60 + balance);
      } else if (daysOverdue <= 90) {
        clientEntry.dias61a90 = roundMoney(clientEntry.dias61a90 + balance);
      } else {
        clientEntry.masDe90 = roundMoney(clientEntry.masDe90 + balance);
      }
    }

    // Totales de la empresa
    let totalCorriente = 0;
    let total1a30 = 0;
    let total31a60 = 0;
    let total61a90 = 0;
    let totalMasDe90 = 0;
    let totalCartera = 0;

    const clientes: ClientAgingItem[] = Array.from(clientAgingMap.values()).map(
      (c) => {
        totalCorriente = roundMoney(totalCorriente + c.corriente);
        total1a30 = roundMoney(total1a30 + c.dias1a30);
        total31a60 = roundMoney(total31a60 + c.dias31a60);
        total61a90 = roundMoney(total61a90 + c.dias61a90);
        totalMasDe90 = roundMoney(totalMasDe90 + c.masDe90);
        totalCartera = roundMoney(totalCartera + c.totalPendiente);

        return {
          clientId: c.clientId,
          clientName: c.clientName,
          clientType: c.clientType,
          identification: c.identification,
          email: c.email,
          phone: c.phone,
          invoiceCount: c.invoiceCount,
          aging: {
            corriente: c.corriente,
            dias1a30: c.dias1a30,
            dias31a60: c.dias31a60,
            dias61a90: c.dias61a90,
            masDe90: c.masDe90,
            totalPendiente: c.totalPendiente,
          },
        };
      }
    );

    // Ordenar de mayor a menor saldo adeudado
    clientes.sort((a, b) => b.aging.totalPendiente - a.aging.totalPendiente);

    return {
      fechaCorte: today.toISOString().split("T")[0],
      totalCartera,
      totalCorriente,
      total1a30,
      total31a60,
      total61a90,
      totalMasDe90,
      totalClientesConSaldo: clientes.length,
      clientes,
    };
  }

  /**
   * Obtiene el estado de cuenta corriente de un cliente específico,
   * con el historial cronológico de facturas, pagos y saldo consolidado.
   */
  async getClientStatement(
    companyId: string,
    clientId: string
  ): Promise<ClientStatement> {
    const supabase = await this.getClient();

    // 1. Cargar cliente
    const { data: client, error: clientErr } = await (supabase
      .from("clients" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", clientId)
      .maybeSingle();

    if (clientErr) {
      console.error("Error al obtener cliente para estado de cuenta:", clientErr);
      throw clientErr;
    }

    if (!client) {
      throw new Error(`Cliente con ID ${clientId} no encontrado.`);
    }

    // 2. Cargar facturas del cliente (excepto anuladas)
    const { data: invoices, error: invErr } = await (supabase
      .from("invoices" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .neq("status", "anulada")
      .order("issue_date", { ascending: true });

    if (invErr) {
      console.error("Error al obtener facturas para estado de cuenta:", invErr);
      throw invErr;
    }

    // 3. Cargar cobros del cliente
    const { data: payments, error: payErr } = await (supabase
      .from("payments" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("payment_date", { ascending: true });

    if (payErr) {
      console.error("Error al obtener pagos para estado de cuenta:", payErr);
      throw payErr;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    let totalFacturado = 0;
    let totalCobrado = 0;
    let saldoPendiente = 0;
    let facturasPendientes = 0;
    let facturasVencidas = 0;

    const facturas: ClientStatementInvoice[] = (invoices || []).map((inv: any) => {
      const total = roundMoney(Number(inv.total || 0));
      const paid = roundMoney(Number(inv.paid_amount || 0));
      const balance = roundMoney(Number(inv.balance_due || 0));

      totalFacturado = roundMoney(totalFacturado + total);
      totalCobrado = roundMoney(totalCobrado + paid);
      saldoPendiente = roundMoney(saldoPendiente + balance);

      const dueDate = new Date(inv.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((todayTime - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const diasAtraso = Math.max(0, diffDays);

      if (balance > 0) {
        facturasPendientes++;
        if (diasAtraso > 0) {
          facturasVencidas++;
        }
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        ncfType: inv.ncf_type,
        ncf: inv.ncf,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        currency: inv.currency,
        total,
        paidAmount: paid,
        balanceDue: balance,
        status: inv.status,
        diasAtraso,
      };
    });

    const pagos: ClientStatementPayment[] = (payments || []).map((p: any) => ({
      id: p.id,
      receiptNumber: p.receipt_number,
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method,
      amount: roundMoney(Number(p.amount || 0)),
      currency: p.currency,
      referenceNumber: p.reference_number,
      notes: p.notes,
    }));

    return {
      cliente: {
        id: client.id,
        nombre: this.formatClientName(client),
        tipo: client.client_type,
        identificacion: client.rnc ?? client.cedula ?? null,
        email: client.email ?? null,
        telefono: client.phone ?? null,
        direccion: client.address ?? null,
      },
      facturas,
      pagos,
      resumen: {
        totalFacturado,
        totalCobrado,
        saldoPendiente,
        facturasPendientes,
        facturasVencidas,
      },
    };
  }
}

export const cxcService = new CxcService();
