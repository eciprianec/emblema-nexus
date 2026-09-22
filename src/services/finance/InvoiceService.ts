import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logAuditEntry } from "@/services/audit/AuditService";

export type InvoiceStatus =
  | "borrador"
  | "emitida"
  | "parcialmente_pagada"
  | "pagada"
  | "vencida"
  | "anulada";

export type NcfType = "B01" | "B02" | "B14" | "B15" | "ninguno";

export type InvoiceItemType =
  | "servicio"
  | "honorarios"
  | "tasa_judicial"
  | "tasa_catastral"
  | "gasto_notarial"
  | "otro";

export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];

export type InvoiceItemRow = Database["public"]["Tables"]["invoice_items"]["Row"];
export type InvoiceItemInsert = Database["public"]["Tables"]["invoice_items"]["Insert"];

export interface CreateInvoiceItemInput {
  description: string;
  itemType?: InvoiceItemType;
  item_type?: InvoiceItemType;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  appliesItbis?: boolean;
  applies_itbis?: boolean;
  orderIndex?: number;
  order_index?: number;
}

export interface CreateInvoiceInput {
  clientId?: string;
  client_id?: string;
  caseId?: string | null;
  case_id?: string | null;
  quoteId?: string | null;
  quote_id?: string | null;
  issueDate?: string;
  issue_date?: string;
  dueDate?: string;
  due_date?: string;
  currency?: "DOP" | "USD";
  exchangeRate?: number;
  exchange_rate?: number;
  ncfType?: NcfType;
  ncf_type?: NcfType;
  ncf?: string | null;
  discount?: number;
  paymentTerms?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  status?: InvoiceStatus;
  createdBy?: string | null;
  created_by?: string | null;
  items: CreateInvoiceItemInput[];
}

export interface GetInvoicesFilters {
  clientId?: string;
  caseId?: string;
  status?: string;
  search?: string;
  ncfType?: string;
  startDate?: string;
  endDate?: string;
}

export interface InvoiceWithDetails extends InvoiceRow {
  items: InvoiceItemRow[];
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
    address: string | null;
  } | null;
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  quote?: {
    id: string;
    quote_number: string;
  } | null;
}

export interface InvoicesSummary {
  totalFacturado: number;
  totalCobrado: number;
  totalPendiente: number;
  facturasVencidas: number;
  montoVencido: number;
  cantidadFacturas: number;
  facturasEmitidas: number;
  facturasPagadas: number;
  facturasParciales: number;
  facturasBorrador: number;
  facturasAnuladas: number;
}

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export class InvoiceService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Genera el siguiente número correlativo para facturas: FAC-YYYY-XXXX
   */
  async generateNextInvoiceNumber(companyId: string): Promise<string> {
    const supabase = await this.getClient();
    const currentYear = new Date().getFullYear();
    const prefix = `FAC-${currentYear}-`;

    const { data, error } = await (supabase.from("invoices" as any) as any)
      .select("invoice_number")
      .eq("company_id", companyId)
      .ilike("invoice_number", `${prefix}%`)
      .order("invoice_number", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error al consultar secuencia de facturas:", error);
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      for (const row of data) {
        const numPart = row.invoice_number.replace(prefix, "");
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed >= nextNumber) {
          nextNumber = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  /**
   * Genera el siguiente NCF tradicional para el tipo seleccionado (ej. B0100000001, B0200000001).
   * En República Dominicana, el NCF tradicional se compone del prefijo de tipo (3 caracteres: B01, B02, B14, B15)
   * y una secuencia correlativa de 8 dígitos.
   */
  async generateNextNcf(
    companyId: string,
    ncfType: NcfType
  ): Promise<string | null> {
    if (!ncfType || ncfType === "ninguno") {
      return null;
    }

    const supabase = await this.getClient();
    const { data, error } = await (supabase.from("invoices" as any) as any)
      .select("ncf")
      .eq("company_id", companyId)
      .eq("ncf_type", ncfType)
      .not("ncf", "is", null)
      .ilike("ncf", `${ncfType}%`)
      .order("ncf", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error al consultar último NCF:", error);
    }

    let maxSeq = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        if (!row.ncf) continue;
        const seqPart = row.ncf.substring(3);
        const parsed = parseInt(seqPart, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    return `${ncfType}${String(nextSeq).padStart(8, "0")}`;
  }

  /**
   * Carga detalles relacionados (ítems, cliente, expediente, cotización) para una lista de facturas.
   */
  private async hydrateInvoices(
    supabase: any,
    companyId: string,
    rawInvoices: InvoiceRow[]
  ): Promise<InvoiceWithDetails[]> {
    if (!rawInvoices || rawInvoices.length === 0) return [];

    const invoiceIds = rawInvoices.map((inv) => inv.id);
    const clientIds = Array.from(
      new Set(rawInvoices.map((inv) => inv.client_id).filter(Boolean))
    );
    const caseIds = Array.from(
      new Set(rawInvoices.map((inv) => inv.case_id).filter(Boolean) as string[])
    );
    const quoteIds = Array.from(
      new Set(rawInvoices.map((inv) => inv.quote_id).filter(Boolean) as string[])
    );

    // Cargar ítems de las facturas
    const { data: itemsData } = await (supabase.from("invoice_items" as any) as any)
      .select("*")
      .in("invoice_id", invoiceIds)
      .order("order_index", { ascending: true });

    const itemsMap = new Map<string, InvoiceItemRow[]>();
    (itemsData || []).forEach((item: InvoiceItemRow) => {
      const list = itemsMap.get(item.invoice_id) ?? [];
      list.push(item);
      itemsMap.set(item.invoice_id, list);
    });

    // Cargar clientes
    const clientsMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const { data: clientsData } = await (supabase.from("clients" as any) as any)
        .select("id, client_type, first_name, last_name, business_name, rnc, cedula, email, phone, address")
        .in("id", clientIds);
      (clientsData || []).forEach((c: any) => clientsMap.set(c.id, c));
    }

    // Cargar expedientes
    const casesMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: casesData } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .in("id", caseIds);
      (casesData || []).forEach((c: any) => casesMap.set(c.id, c));
    }

    // Cargar cotizaciones
    const quotesMap = new Map<string, any>();
    if (quoteIds.length > 0) {
      const { data: quotesData } = await (supabase.from("quotes" as any) as any)
        .select("id, quote_number")
        .in("id", quoteIds);
      (quotesData || []).forEach((q: any) => quotesMap.set(q.id, q));
    }

    return rawInvoices.map((inv) => ({
      ...inv,
      items: itemsMap.get(inv.id) ?? [],
      client: clientsMap.get(inv.client_id) ?? null,
      case: inv.case_id ? casesMap.get(inv.case_id) ?? null : null,
      quote: inv.quote_id ? quotesMap.get(inv.quote_id) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de facturas con filtros opcionales.
   */
  async getInvoices(
    companyId: string,
    filters?: GetInvoicesFilters
  ): Promise<InvoiceWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("invoices" as any) as any)
      .select("*")
      .eq("company_id", companyId);

    if (filters?.clientId) {
      query = query.eq("client_id", filters.clientId);
    }
    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.ncfType) {
      query = query.eq("ncf_type", filters.ncfType);
    }
    if (filters?.startDate) {
      query = query.gte("issue_date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("issue_date", filters.endDate);
    }
    if (filters?.search) {
      const s = filters.search.trim();
      query = query.or(`invoice_number.ilike.%${s}%,ncf.ilike.%${s}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener facturas:", error);
      throw error;
    }

    return this.hydrateInvoices(supabase, companyId, data || []);
  }

  /**
   * Obtiene una factura por su ID con todos sus detalles (ítems, cliente, expediente, cotización vinculada).
   */
  async getInvoiceById(
    companyId: string,
    id: string
  ): Promise<InvoiceWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("invoices" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener factura por ID:", error);
      throw error;
    }

    if (!data) return null;

    const hydrated = await this.hydrateInvoices(supabase, companyId, [data]);
    return hydrated[0] ?? null;
  }

  /**
   * Crea una nueva factura tradicional con cálculo automático de Subtotal, ITBIS (18% en RD cuando aplica),
   * Descuento, Total, asignación de número correlativo (FAC-YYYY-XXXX) y NCF tradicional.
   */
  async createInvoice(
    companyId: string,
    data: CreateInvoiceInput
  ): Promise<InvoiceWithDetails> {
    const supabase = await this.getClient();

    const clientId = data.client_id ?? data.clientId;
    if (!clientId) {
      throw new Error("El cliente es obligatorio para emitir una factura.");
    }

    if (!data.items || data.items.length === 0) {
      throw new Error("La factura debe tener al menos un ítem.");
    }

    // Calcular montos de cada ítem y acumulados
    let calculatedSubtotal = 0;
    let calculatedItbis = 0;

    const itemsToInsert = data.items.map((item, idx) => {
      if (!item.description || !item.description.trim()) {
        throw new Error(`El ítem en la posición ${idx + 1} requiere una descripción.`);
      }

      const qty = item.quantity !== undefined ? Number(item.quantity) : 1;
      const price = Number(item.unit_price ?? item.unitPrice ?? 0);
      const appliesItbis = item.applies_itbis ?? item.appliesItbis ?? true;

      const itemSubtotal = roundMoney(qty * price);
      // En RD la tasa general de ITBIS es el 18%
      const itemItbis = appliesItbis ? roundMoney(itemSubtotal * 0.18) : 0;
      const itemTotal = roundMoney(itemSubtotal + itemItbis);

      calculatedSubtotal = roundMoney(calculatedSubtotal + itemSubtotal);
      calculatedItbis = roundMoney(calculatedItbis + itemItbis);

      return {
        description: item.description.trim(),
        item_type: item.item_type ?? item.itemType ?? "servicio",
        quantity: qty,
        unit_price: price,
        applies_itbis: appliesItbis,
        itbis_amount: itemItbis,
        total: itemTotal,
        order_index: item.order_index ?? item.orderIndex ?? idx,
      };
    });

    const discount = roundMoney(Number(data.discount ?? 0));
    const calculatedTotal = roundMoney(
      Math.max(0, calculatedSubtotal + calculatedItbis - discount)
    );

    // Numeración correlativa
    const invoiceNumber = await this.generateNextInvoiceNumber(companyId);

    // Asignación de NCF tradicional si aplica
    const ncfType: NcfType = data.ncf_type ?? data.ncfType ?? "B02";
    let assignedNcf = data.ncf ?? null;
    if (!assignedNcf && ncfType !== "ninguno") {
      assignedNcf = await this.generateNextNcf(companyId, ncfType);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const issueDate = data.issue_date ?? data.issueDate ?? todayStr;

    // Fecha de vencimiento por defecto a 30 días si no se especifica
    let dueDate = data.due_date ?? data.dueDate;
    if (!dueDate) {
      const due = new Date();
      due.setDate(due.getDate() + 30);
      dueDate = due.toISOString().split("T")[0];
    }

    const status: InvoiceStatus = data.status ?? "emitida";

    const insertPayload: InvoiceInsert = {
      company_id: companyId,
      invoice_number: invoiceNumber,
      ncf_type: ncfType,
      ncf: assignedNcf,
      client_id: clientId,
      case_id: data.case_id ?? data.caseId ?? null,
      quote_id: data.quote_id ?? data.quoteId ?? null,
      issue_date: issueDate,
      due_date: dueDate,
      currency: data.currency ?? "DOP",
      exchange_rate: data.exchange_rate ?? data.exchangeRate ?? 1.0,
      subtotal: calculatedSubtotal,
      itbis: calculatedItbis,
      discount,
      total: calculatedTotal,
      paid_amount: 0.0,
      balance_due: calculatedTotal,
      status,
      payment_terms: data.payment_terms ?? data.paymentTerms ?? null,
      notes: data.notes ?? null,
      created_by: data.created_by ?? data.createdBy ?? null,
    };

    const { data: createdInvoice, error: invoiceError } = await (supabase
      .from("invoices" as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (invoiceError) {
      console.error("Error al crear factura:", invoiceError);
      throw invoiceError;
    }

    // Insertar ítems asociados
    const itemsPayload = itemsToInsert.map((item) => ({
      ...item,
      invoice_id: createdInvoice.id,
    }));

    const { error: itemsError } = await (supabase
      .from("invoice_items" as any) as any)
      .insert(itemsPayload);

    if (itemsError) {
      console.error("Error al insertar ítems de factura:", itemsError);
      // Intentar limpiar factura creada para evitar registros huérfanos
      await (supabase.from("invoices" as any) as any)
        .delete()
        .eq("id", createdInvoice.id);
      throw itemsError;
    }

    // Registrar en auditoría
    try {
      await logAuditEntry({
        companyId,
        entityType: "invoice",
        entityId: createdInvoice.id,
        action: "create",
        newData: createdInvoice,
        reason: `Creación de factura ${invoiceNumber} (${assignedNcf ?? "Sin NCF"})`,
      });
    } catch (auditErr) {
      console.warn("No se pudo registrar la auditoría de factura:", auditErr);
    }

    const fullInvoice = await this.getInvoiceById(companyId, createdInvoice.id);
    if (!fullInvoice) {
      throw new Error("No se pudo recuperar la factura recién creada.");
    }

    return fullInvoice;
  }

  /**
   * Actualiza el estado de una factura.
   */
  async updateInvoiceStatus(
    companyId: string,
    id: string,
    status: InvoiceStatus
  ): Promise<InvoiceWithDetails> {
    const supabase = await this.getClient();

    const current = await this.getInvoiceById(companyId, id);
    if (!current) {
      throw new Error(`Factura con ID ${id} no encontrada.`);
    }

    const { error } = await (supabase.from("invoices" as any) as any)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al actualizar estado de la factura:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "invoice",
        entityId: id,
        action: "status_change",
        oldData: { status: current.status },
        newData: { status },
        reason: `Cambio de estado de factura ${current.invoice_number} a ${status}`,
      });
    } catch (auditErr) {
      console.warn("Error al auditar cambio de estado de factura:", auditErr);
    }

    const updated = await this.getInvoiceById(companyId, id);
    if (!updated) {
      throw new Error("No se pudo recuperar la factura actualizada.");
    }
    return updated;
  }

  /**
   * Cancela / anula una factura.
   * Valida que no tenga cobros registrados previamente.
   */
  async cancelInvoice(
    companyId: string,
    id: string,
    reason?: string
  ): Promise<InvoiceWithDetails> {
    const supabase = await this.getClient();

    const current = await this.getInvoiceById(companyId, id);
    if (!current) {
      throw new Error(`Factura con ID ${id} no encontrada.`);
    }

    if (current.status === "anulada") {
      throw new Error("La factura ya se encuentra anulada.");
    }

    if (current.paid_amount > 0) {
      throw new Error(
        "No se puede anular una factura con pagos registrados. Debe anular primero los recibos de pago vinculados."
      );
    }

    const updatePayload: InvoiceUpdate = {
      status: "anulada",
      balance_due: 0,
      notes: reason
        ? `${current.notes ? current.notes + " | " : ""}Motivo de anulación: ${reason}`
        : current.notes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase.from("invoices" as any) as any)
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al anular factura:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "invoice",
        entityId: id,
        action: "cancel",
        oldData: current as any,
        newData: { ...current, status: "anulada", balance_due: 0 },
        reason: reason ?? "Factura anulada",
      });
    } catch (auditErr) {
      console.warn("Error al registrar auditoría de anulación:", auditErr);
    }

    const cancelled = await this.getInvoiceById(companyId, id);
    if (!cancelled) {
      throw new Error("No se pudo recuperar la factura anulada.");
    }
    return cancelled;
  }

  /**
   * Obtiene un resumen cuantitativo y consolidado de facturación:
   * Total Facturado, Total Cobrado, Total Pendiente y Facturas Vencidas.
   */
  async getInvoicesSummary(companyId: string): Promise<InvoicesSummary> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("invoices" as any) as any)
      .select("status, total, paid_amount, balance_due, due_date")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error al calcular resumen de facturas:", error);
      throw error;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    let totalFacturado = 0;
    let totalCobrado = 0;
    let totalPendiente = 0;
    let facturasVencidas = 0;
    let montoVencido = 0;
    let facturasEmitidas = 0;
    let facturasPagadas = 0;
    let facturasParciales = 0;
    let facturasBorrador = 0;
    let facturasAnuladas = 0;

    for (const inv of (data || [])) {
      const isAnulada = inv.status === "anulada";
      const isBorrador = inv.status === "borrador";

      switch (inv.status) {
        case "emitida":
          facturasEmitidas++;
          break;
        case "pagada":
          facturasPagadas++;
          break;
        case "parcialmente_pagada":
          facturasParciales++;
          break;
        case "borrador":
          facturasBorrador++;
          break;
        case "anulada":
          facturasAnuladas++;
          break;
        case "vencida":
          facturasVencidas++;
          break;
      }

      if (!isAnulada && !isBorrador) {
        totalFacturado = roundMoney(totalFacturado + Number(inv.total || 0));
        totalCobrado = roundMoney(totalCobrado + Number(inv.paid_amount || 0));
        totalPendiente = roundMoney(totalPendiente + Number(inv.balance_due || 0));

        // Si la factura no está completamente saldada y la fecha de vencimiento ya pasó
        const isOverdue =
          inv.due_date &&
          inv.due_date < todayStr &&
          Number(inv.balance_due || 0) > 0;

        if (isOverdue && inv.status !== "vencida") {
          facturasVencidas++;
          montoVencido = roundMoney(montoVencido + Number(inv.balance_due || 0));
        } else if (inv.status === "vencida") {
          montoVencido = roundMoney(montoVencido + Number(inv.balance_due || 0));
        }
      }
    }

    return {
      totalFacturado,
      totalCobrado,
      totalPendiente,
      facturasVencidas,
      montoVencido,
      cantidadFacturas: (data || []).length,
      facturasEmitidas,
      facturasPagadas,
      facturasParciales,
      facturasBorrador,
      facturasAnuladas,
    };
  }
}

export const invoiceService = new InvoiceService();
