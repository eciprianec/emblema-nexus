import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logAuditEntry } from "@/services/audit/AuditService";
import {
  invoiceService,
  InvoiceWithDetails,
  roundMoney,
} from "./InvoiceService";

export type QuoteStatus =
  | "borrador"
  | "enviada"
  | "aprobada"
  | "rechazada"
  | "facturada"
  | "vencida";

export type QuoteItemType =
  | "servicio"
  | "honorarios"
  | "tasa_judicial"
  | "tasa_catastral"
  | "gasto_notarial"
  | "otro";

export type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];
export type QuoteInsert = Database["public"]["Tables"]["quotes"]["Insert"];
export type QuoteUpdate = Database["public"]["Tables"]["quotes"]["Update"];

export type QuoteItemRow = Database["public"]["Tables"]["quote_items"]["Row"];
export type QuoteItemInsert = Database["public"]["Tables"]["quote_items"]["Insert"];

export interface CreateQuoteItemInput {
  description: string;
  itemType?: QuoteItemType;
  item_type?: QuoteItemType;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  appliesItbis?: boolean;
  applies_itbis?: boolean;
  orderIndex?: number;
  order_index?: number;
}

export interface CreateQuoteInput {
  clientId?: string;
  client_id?: string;
  caseId?: string | null;
  case_id?: string | null;
  currency?: "DOP" | "USD";
  exchangeRate?: number;
  exchange_rate?: number;
  discount?: number;
  validUntil?: string | null;
  valid_until?: string | null;
  termsAndConditions?: string | null;
  terms_and_conditions?: string | null;
  notes?: string | null;
  status?: QuoteStatus;
  createdBy?: string | null;
  created_by?: string | null;
  items: CreateQuoteItemInput[];
}

export interface GetQuotesFilters {
  clientId?: string;
  caseId?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface QuoteWithDetails extends QuoteRow {
  items: QuoteItemRow[];
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
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
}

export class QuoteService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  /**
   * Genera el siguiente número correlativo para cotizaciones: COT-YYYY-XXXX
   */
  async generateNextQuoteNumber(companyId: string): Promise<string> {
    const supabase = await this.getClient();
    const currentYear = new Date().getFullYear();
    const prefix = `COT-${currentYear}-`;

    const { data, error } = await (supabase.from("quotes" as any) as any)
      .select("quote_number")
      .eq("company_id", companyId)
      .ilike("quote_number", `${prefix}%`)
      .order("quote_number", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error al consultar secuencia de cotizaciones:", error);
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      for (const row of data) {
        const numPart = row.quote_number.replace(prefix, "");
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed >= nextNumber) {
          nextNumber = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  /**
   * Carga detalles relacionados (ítems, cliente, expediente) para una lista de cotizaciones.
   */
  private async hydrateQuotes(
    supabase: any,
    companyId: string,
    rawQuotes: QuoteRow[]
  ): Promise<QuoteWithDetails[]> {
    if (!rawQuotes || rawQuotes.length === 0) return [];

    const quoteIds = rawQuotes.map((q) => q.id);
    const clientIds = Array.from(
      new Set(rawQuotes.map((q) => q.client_id).filter(Boolean))
    );
    const caseIds = Array.from(
      new Set(rawQuotes.map((q) => q.case_id).filter(Boolean) as string[])
    );

    // Cargar ítems
    const { data: itemsData } = await (supabase.from("quote_items" as any) as any)
      .select("*")
      .in("quote_id", quoteIds)
      .order("order_index", { ascending: true });

    const itemsMap = new Map<string, QuoteItemRow[]>();
    (itemsData || []).forEach((item: QuoteItemRow) => {
      const list = itemsMap.get(item.quote_id) ?? [];
      list.push(item);
      itemsMap.set(item.quote_id, list);
    });

    // Cargar clientes
    const clientsMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const { data: clientsData } = await (supabase.from("clients" as any) as any)
        .select("id, client_type, first_name, last_name, business_name, rnc, cedula, email, phone")
        .in("id", clientIds);
      (clientsData || []).forEach((c: any) => clientsMap.set(c.id, c));
    }

    // Cargar casos
    const casesMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: casesData } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .in("id", caseIds);
      (casesData || []).forEach((c: any) => casesMap.set(c.id, c));
    }

    return rawQuotes.map((q) => ({
      ...q,
      items: itemsMap.get(q.id) ?? [],
      client: clientsMap.get(q.client_id) ?? null,
      case: q.case_id ? casesMap.get(q.case_id) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de cotizaciones aplicando filtros opcionales.
   */
  async getQuotes(
    companyId: string,
    filters?: GetQuotesFilters
  ): Promise<QuoteWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("quotes" as any) as any)
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
    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate);
    }
    if (filters?.search) {
      query = query.ilike("quote_number", `%${filters.search.trim()}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener cotizaciones:", error);
      throw error;
    }

    return this.hydrateQuotes(supabase, companyId, data || []);
  }

  /**
   * Obtiene una cotización por ID con sus ítems, cliente y expediente vinculados.
   */
  async getQuoteById(
    companyId: string,
    id: string
  ): Promise<QuoteWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase.from("quotes" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener cotización por ID:", error);
      throw error;
    }

    if (!data) return null;

    const hydrated = await this.hydrateQuotes(supabase, companyId, [data]);
    return hydrated[0] ?? null;
  }

  /**
   * Crea una cotización con numeración correlativa automática (COT-YYYY-XXXX)
   * y cálculo exacto de subtotal, ITBIS (18%) y total.
   */
  async createQuote(
    companyId: string,
    data: CreateQuoteInput
  ): Promise<QuoteWithDetails> {
    const supabase = await this.getClient();

    const clientId = data.client_id ?? data.clientId;
    if (!clientId) {
      throw new Error("El cliente es obligatorio para generar una cotización.");
    }

    if (!data.items || data.items.length === 0) {
      throw new Error("La cotización debe contener al menos un ítem.");
    }

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

    const quoteNumber = await this.generateNextQuoteNumber(companyId);

    // Validez por defecto de 30 días si no se especifica
    let validUntil = data.valid_until ?? data.validUntil;
    if (!validUntil) {
      const v = new Date();
      v.setDate(v.getDate() + 30);
      validUntil = v.toISOString().split("T")[0];
    }

    const insertPayload: QuoteInsert = {
      company_id: companyId,
      quote_number: quoteNumber,
      client_id: clientId,
      case_id: data.case_id ?? data.caseId ?? null,
      currency: data.currency ?? "DOP",
      exchange_rate: data.exchange_rate ?? data.exchangeRate ?? 1.0,
      subtotal: calculatedSubtotal,
      itbis: calculatedItbis,
      discount,
      total: calculatedTotal,
      status: data.status ?? "borrador",
      valid_until: validUntil,
      terms_and_conditions: data.terms_and_conditions ?? data.termsAndConditions ?? null,
      notes: data.notes ?? null,
      created_by: data.created_by ?? data.createdBy ?? null,
    };

    const { data: createdQuote, error: quoteError } = await (supabase
      .from("quotes" as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (quoteError) {
      console.error("Error al crear cotización:", quoteError);
      throw quoteError;
    }

    const itemsPayload = itemsToInsert.map((item) => ({
      ...item,
      quote_id: createdQuote.id,
    }));

    const { error: itemsError } = await (supabase
      .from("quote_items" as any) as any)
      .insert(itemsPayload);

    if (itemsError) {
      console.error("Error al insertar ítems de la cotización:", itemsError);
      await (supabase.from("quotes" as any) as any)
        .delete()
        .eq("id", createdQuote.id);
      throw itemsError;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "quote",
        entityId: createdQuote.id,
        action: "create",
        newData: createdQuote,
        reason: `Creación de cotización ${quoteNumber}`,
      });
    } catch (auditErr) {
      console.warn("Error registrando auditoría de cotización:", auditErr);
    }

    const fullQuote = await this.getQuoteById(companyId, createdQuote.id);
    if (!fullQuote) {
      throw new Error("No se pudo recuperar la cotización recién creada.");
    }
    return fullQuote;
  }

  /**
   * Actualiza el estado de una cotización.
   */
  async updateQuoteStatus(
    companyId: string,
    id: string,
    status: QuoteStatus
  ): Promise<QuoteWithDetails> {
    const supabase = await this.getClient();

    const current = await this.getQuoteById(companyId, id);
    if (!current) {
      throw new Error(`Cotización con ID ${id} no encontrada.`);
    }

    const { error } = await (supabase.from("quotes" as any) as any)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al actualizar estado de la cotización:", error);
      throw error;
    }

    try {
      await logAuditEntry({
        companyId,
        entityType: "quote",
        entityId: id,
        action: "status_change",
        oldData: { status: current.status },
        newData: { status },
        reason: `Cambio de estado de cotización ${current.quote_number} a ${status}`,
      });
    } catch (auditErr) {
      console.warn("Error en auditoría de cotización:", auditErr);
    }

    const updated = await this.getQuoteById(companyId, id);
    if (!updated) {
      throw new Error("No se pudo recuperar la cotización actualizada.");
    }
    return updated;
  }

  /**
   * Transforma una cotización aprobada directamente en una factura en estado 'emitida',
   * copiando todos sus ítems y vinculando `quote_id`.
   */
  async convertQuoteToInvoice(
    companyId: string,
    quoteId: string
  ): Promise<InvoiceWithDetails> {
    const supabase = await this.getClient();

    const quote = await this.getQuoteById(companyId, quoteId);
    if (!quote) {
      throw new Error(`Cotización con ID ${quoteId} no encontrada.`);
    }

    if (quote.status === "facturada") {
      throw new Error(
        `La cotización ${quote.quote_number} ya fue facturada previamente.`
      );
    }

    if (quote.status === "rechazada" || quote.status === "vencida") {
      throw new Error(
        `No se puede facturar una cotización en estado "${quote.status}".`
      );
    }

    // Convertir ítems de la cotización al formato de factura
    const invoiceItems: CreateQuoteItemInput[] = quote.items.map((item) => ({
      description: item.description,
      item_type: item.item_type,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      applies_itbis: item.applies_itbis ?? true,
      order_index: item.order_index ?? 0,
    }));

    // Crear la factura directamente en estado 'emitida'
    const newInvoice = await invoiceService.createInvoice(companyId, {
      clientId: quote.client_id,
      caseId: quote.case_id,
      quoteId: quote.id,
      currency: quote.currency,
      exchangeRate: quote.exchange_rate ?? 1.0,
      discount: Number(quote.discount || 0),
      ncfType: "B02", // Por defecto factura de consumo, modificable según cliente
      status: "emitida",
      notes: `Generada a partir de la cotización ${quote.quote_number}.${
        quote.notes ? " " + quote.notes : ""
      }`,
      items: invoiceItems,
    });

    // Actualizar el estado de la cotización a 'facturada'
    await (supabase.from("quotes" as any) as any)
      .update({
        status: "facturada",
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", quoteId);

    try {
      await logAuditEntry({
        companyId,
        entityType: "quote",
        entityId: quoteId,
        action: "convert_to_invoice",
        oldData: { status: quote.status },
        newData: { status: "facturada", invoiceId: newInvoice.id },
        reason: `Cotización ${quote.quote_number} convertida a factura ${newInvoice.invoice_number}`,
      });
    } catch (auditErr) {
      console.warn("Error al auditar conversión de cotización:", auditErr);
    }

    return newInvoice;
  }
}

export const quoteService = new QuoteService();
