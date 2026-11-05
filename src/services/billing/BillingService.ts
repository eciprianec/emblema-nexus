import "server-only";

import {
  calculateDocument,
  hasBlockingIssues,
  validateForIssue,
  todayInDr,
  type BillingIndicator,
  type FiscalDocument,
  type FiscalType,
  type GoodOrService,
  type IncomeType,
  type LineInput,
  type ModificationCode,
  type PaymentType,
  type ValidationIssue,
} from "@/domain/billing";
import type { ReadyBillingContext } from "./context";
import { getIssuer } from "./issuers";
import { EcfProviderService, type EmitOutcome, type ReservedDocument } from "./mseller/EcfProviderService";
import type {
  BillingClient,
  BillingSettingsRow,
  BuyerSnapshot,
  CustomerCreditRow,
  EcfRecordRow,
  FiscalSequenceRow,
  InvoiceDetail,
  InvoiceItemRow,
  InvoiceRow,
  PaymentListRow,
  PaymentRow,
} from "./types";

export interface InvoiceFilters {
  status?: string;
  search?: string;
}

export interface BillingSummary {
  invoiced_this_month: number;
  collectible: number;
  overdue: number;
  overdue_count: number;
  draft_count: number;
}

export interface ReceivablesBuckets {
  total: number;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  invoice_count: number;
}

export interface ReceivablesSummary extends ReceivablesBuckets {
  client_count: number;
}

export interface ClientReceivables extends ReceivablesBuckets {
  client_id: string | null;
  client_name: string;
  tax_id: string | null;
}

export interface PaymentsSummary {
  collected_total: number;
  collected_this_month: number;
  transfer_total: number;
  receipt_count: number;
  voided_count: number;
}

export interface ClientFinanceSummary {
  billed: number;
  collected: number;
  balance: number;
  overdue: number;
  invoice_count: number;
}

export interface OpenInvoiceFilters {
  /** "sin_cliente" para las facturas de consumo anónimas. */
  clientId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SaveDraftInput {
  id?: string | null;
  fiscalType: FiscalType;
  clientId?: string | null;
  issueDate: string;
  dueDate?: string | null;
  currency: "DOP" | "USD";
  exchangeRate: number;
  incomeType: IncomeType;
  paymentType: PaymentType;
  paymentTerm?: string | null;
  notes?: string | null;
  itbisWithholdingRate?: number;
  isrWithholdingRate?: number;
  modifiesInvoiceId?: string | null;
  modificationCode?: ModificationCode | null;
  modificationReason?: string | null;
  lines: LineInput[];
}

// Lo enviado al proveedor no hace falta en pantalla.
const ECF_COLUMNS =
  "id, encf, security_code, sign_date, track_id, dgii_status, source, environment, qr_code_url, dgii_messages, " +
  "provider_phase, provider_status, provider_signed_date, provider_error, secuencia_utilizada, send_attempts, number_parked_at, created_at";

const CLIENT_COLUMNS = "id, client_type, first_name, last_name, business_name, rnc, cedula, passport, email, address";

export function clientDisplayName(client: Pick<BillingClient, "business_name" | "first_name" | "last_name">): string {
  return client.business_name?.trim() || `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
}

function clientToBuyer(client: BillingClient): BuyerSnapshot {
  const taxId = (client.rnc || client.cedula || "").replace(/[^0-9]/g, "");
  return {
    taxId: taxId || null,
    foreignId: taxId ? null : client.passport || null,
    name: clientDisplayName(client) || null,
    address: client.address || null,
    email: client.email || null,
  };
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export class BillingService {
  constructor(private readonly ctx: ReadyBillingContext) {}

  private get db() {
    return this.ctx.db;
  }

  private get companyId() {
    return this.ctx.companyId;
  }

  // ---- Consultas ----------------------------------------------------------

  async listInvoices(filters: InvoiceFilters = {}): Promise<InvoiceRow[]> {
    let query = this.db
      .from("invoices")
      .select("*")
      .eq("company_id", this.companyId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (filters.status) query = query.eq("status", filters.status);

    const term = filters.search?.trim().replace(/[%,()]/g, "");
    if (term) {
      query = query.or(`invoice_number.ilike.%${term}%,ncf.ilike.%${term}%,buyer_snapshot->>name.ilike.%${term}%`);
    }

    const { data, error } = await query;
    fail(error);
    return (data ?? []) as InvoiceRow[];
  }

  async getSummary(): Promise<BillingSummary> {
    const { data, error } = await this.db.rpc("billing_summary", { p_company_id: this.companyId }).single();
    fail(error);
    return data as BillingSummary;
  }

  async getInvoice(id: string): Promise<InvoiceDetail | null> {
    const { data, error } = await this.db
      .from("invoices")
      .select("*")
      .eq("company_id", this.companyId)
      .eq("id", id)
      .maybeSingle();
    fail(error);
    if (!data) return null;
    const invoice = data as InvoiceRow;

    const [items, applications, ecf, notes, parent] = await Promise.all([
      this.db.from("invoice_items").select("*").eq("invoice_id", id).order("order_index"),
      this.db.from("payment_applications").select("payment_id").eq("invoice_id", id),
      this.db.from("ecf_invoices").select(ECF_COLUMNS).eq("invoice_id", id).order("created_at", { ascending: false }),
      this.db
        .from("invoices")
        .select("id, invoice_number, ncf, fiscal_type, status, total, amount_due, issue_date")
        .eq("modifies_invoice_id", id)
        .order("created_at"),
      invoice.modifies_invoice_id
        ? this.db
            .from("invoices")
            .select("id, invoice_number, ncf, issue_date, total, credited_amount, fiscal_type")
            .eq("id", invoice.modifies_invoice_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    fail(items.error);
    fail(applications.error);
    fail(ecf.error);
    fail(notes.error);
    fail(parent.error);

    const paymentIds = (applications.data ?? []).map((a) => a.payment_id as string);
    let payments: PaymentRow[] = [];
    if (paymentIds.length > 0) {
      const result = await this.db.from("payments").select("*").in("id", paymentIds).order("payment_date");
      fail(result.error);
      payments = (result.data ?? []) as PaymentRow[];
    }

    const ecfRows = (ecf.data ?? []) as unknown as EcfRecordRow[];

    return {
      invoice,
      items: (items.data ?? []) as InvoiceItemRow[],
      payments,
      ecf: ecfRows.find((row) => row.dgii_status !== "rechazado") ?? null,
      ecfHistory: ecfRows.filter((row) => row.dgii_status === "rechazado"),
      notes: (notes.data ?? []) as InvoiceDetail["notes"],
      parent: (parent.data ?? null) as InvoiceDetail["parent"],
    };
  }

  async listClients(): Promise<BillingClient[]> {
    const { data, error } = await this.db
      .from("clients")
      .select(CLIENT_COLUMNS)
      .eq("company_id", this.companyId)
      .eq("is_active", true)
      .is("archived_at", null)
      // Si se llega al límite de la API, que sobren los más antiguos y no el recién creado.
      .order("created_at", { ascending: false })
      .limit(1000);
    fail(error);
    return ((data ?? []) as BillingClient[]).sort((a, b) =>
      clientDisplayName(a).localeCompare(clientDisplayName(b))
    );
  }

  /** Para mostrar un cliente archivado que sigue en un borrador. */
  async getClient(id: string): Promise<BillingClient | null> {
    const { data, error } = await this.db
      .from("clients")
      .select(CLIENT_COLUMNS)
      .eq("company_id", this.companyId)
      .eq("id", id)
      .maybeSingle();
    fail(error);
    return (data ?? null) as BillingClient | null;
  }

  async createClient(input: {
    kind: "persona_fisica" | "persona_juridica";
    name: string;
    lastName?: string | null;
    taxId?: string | null;
    passport?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  }): Promise<BillingClient> {
    const digits = (input.taxId ?? "").replace(/[^0-9]/g, "");
    const { data, error } = await this.db
      .from("clients")
      .insert({
        company_id: this.companyId,
        created_by: this.ctx.userId,
        client_type: input.kind,
        business_name: input.kind === "persona_juridica" ? input.name : null,
        first_name: input.kind === "persona_fisica" ? input.name : null,
        last_name: input.kind === "persona_fisica" ? input.lastName || null : null,
        rnc: digits.length === 9 ? digits : null,
        cedula: digits.length === 11 ? digits : null,
        passport: input.passport || null,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null,
      })
      .select(CLIENT_COLUMNS)
      .single();
    if (error?.code === "42501") throw new Error("Tu rol no permite crear clientes.");
    fail(error);
    return data as BillingClient;
  }

  async getSettings(): Promise<BillingSettingsRow | null> {
    const { data, error } = await this.db
      .from("billing_settings")
      .select("*")
      .eq("company_id", this.companyId)
      .maybeSingle();
    fail(error);
    return (data ?? null) as BillingSettingsRow | null;
  }

  async saveSettings(input: Omit<BillingSettingsRow, "company_id">): Promise<void> {
    const { error } = await this.db
      .from("billing_settings")
      .upsert({ ...input, company_id: this.companyId }, { onConflict: "company_id" });
    fail(error);
  }

  async listSequences(): Promise<FiscalSequenceRow[]> {
    const { data, error } = await this.db
      .from("fiscal_sequences")
      .select("*")
      .eq("company_id", this.companyId)
      .order("prefix")
      .order("start_number");
    fail(error);
    return (data ?? []) as FiscalSequenceRow[];
  }

  async addSequence(input: {
    prefix: string;
    startNumber: number;
    endNumber: number;
    expiresOn: string | null;
  }): Promise<void> {
    // Un e-NCF vale para el ambiente en que se registra; la serie B siempre es real.
    let environment: BillingSettingsRow["dgii_environment"] = "prod";
    if (input.prefix.startsWith("E")) {
      const settings = await this.getSettings();
      if (!settings) throw new Error("Configura primero el modo de emisión y el ambiente.");
      environment = settings.dgii_environment;
    }
    const { error } = await this.db.from("fiscal_sequences").insert({
      company_id: this.companyId,
      environment,
      prefix: input.prefix,
      start_number: input.startNumber,
      end_number: input.endNumber,
      next_number: input.startNumber,
      expires_on: input.expiresOn,
    });
    fail(error);
  }

  async setSequenceActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.db
      .from("fiscal_sequences")
      .update({ is_active: isActive })
      .eq("company_id", this.companyId)
      .eq("id", id);
    fail(error);
  }

  // ---- Cartera y cobros ---------------------------------------------------

  async getReceivablesSummary(): Promise<ReceivablesSummary> {
    const { data, error } = await this.db.rpc("billing_receivables_summary", { p_company_id: this.companyId }).single();
    fail(error);
    return data as ReceivablesSummary;
  }

  async listReceivablesByClient(): Promise<ClientReceivables[]> {
    const { data, error } = await this.db.rpc("billing_receivables_by_client", { p_company_id: this.companyId });
    fail(error);
    return (data ?? []) as ClientReceivables[];
  }

  /** Comprobantes con saldo, los que vencen antes primero. */
  async listOpenInvoices(filters: OpenInvoiceFilters = {}): Promise<{ invoices: InvoiceRow[]; total: number }> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    let query = this.db
      .from("invoices")
      .select("*", { count: "exact" })
      .eq("company_id", this.companyId)
      .in("status", ["emitida", "parcialmente_pagada", "vencida"])
      .gt("balance_due", 0)
      .order("due_date")
      .order("created_at")
      .range(offset, offset + limit - 1);

    if (filters.clientId === "sin_cliente") query = query.is("client_id", null);
    else if (filters.clientId) query = query.eq("client_id", filters.clientId);

    const term = filters.search?.trim().replace(/[%,()]/g, "");
    if (term) {
      query = query.or(`invoice_number.ilike.%${term}%,ncf.ilike.%${term}%,buyer_snapshot->>name.ilike.%${term}%`);
    }

    const { data, error, count } = await query;
    fail(error);
    const invoices = (data ?? []) as InvoiceRow[];
    const credits = await this.pendingCredits(invoices.map((invoice) => invoice.id));
    return {
      invoices: invoices.map((invoice) => ({ ...invoice, pending_credit: credits.get(invoice.id) ?? 0 })),
      total: count ?? 0,
    };
  }

  /** Lo que las notas de crédito en proceso ya comprometen, por comprobante: aún no se puede cobrar. */
  private async pendingCredits(invoiceIds: string[]): Promise<Map<string, number>> {
    const credits = new Map<string, number>();
    if (invoiceIds.length === 0) return credits;
    const { data, error } = await this.db
      .from("invoices")
      .select("modifies_invoice_id, amount_due")
      .eq("company_id", this.companyId)
      .eq("fiscal_type", "34")
      .eq("status", "en_proceso")
      .in("modifies_invoice_id", invoiceIds);
    fail(error);
    for (const note of (data ?? []) as { modifies_invoice_id: string; amount_due: number }[]) {
      credits.set(note.modifies_invoice_id, (credits.get(note.modifies_invoice_id) ?? 0) + Number(note.amount_due));
    }
    return credits;
  }

  /** Números que el proveedor rechazó sin motivo y se apartaron de la reutilización. */
  async listParkedNumbers(): Promise<{ encf: string; environment: string; number_parked_at: string }[]> {
    const { data, error } = await this.db
      .from("ecf_invoices")
      .select("encf, environment, number_parked_at")
      .eq("company_id", this.companyId)
      .not("number_parked_at", "is", null)
      .order("number_parked_at", { ascending: false })
      .limit(50);
    fail(error);
    return (data ?? []) as { encf: string; environment: string; number_parked_at: string }[];
  }

  /** Números que la DGII dio por usados en un rechazo; el borrador pudo haberse eliminado después. */
  async listUsedRejectedNumbers(): Promise<{ encf: string; environment: string }[]> {
    const { data, error } = await this.db
      .from("ecf_invoices")
      .select("encf, environment")
      .eq("company_id", this.companyId)
      .eq("source", "proveedor")
      .eq("dgii_status", "rechazado")
      .is("number_parked_at", null)
      // Sin el dato de la DGII, el número se da por usado.
      .or("secuencia_utilizada.is.null,secuencia_utilizada.eq.true")
      .order("created_at", { ascending: false })
      .limit(50);
    fail(error);
    return (data ?? []) as { encf: string; environment: string }[];
  }

  /** Comprobantes en los que el cliente pagó más de lo que quedó por cobrar tras las notas de crédito. */
  async listCustomerCredits(): Promise<CustomerCreditRow[]> {
    const { data, error } = await this.db.rpc("billing_customer_credits", { p_company_id: this.companyId });
    fail(error);
    return (data ?? []) as CustomerCreditRow[];
  }

  async getPaymentsSummary(): Promise<PaymentsSummary> {
    const { data, error } = await this.db.rpc("billing_payments_summary", { p_company_id: this.companyId }).single();
    fail(error);
    return data as PaymentsSummary;
  }

  async listPayments(
    filters: { clientId?: string; search?: string; method?: string; limit?: number; offset?: number } = {}
  ): Promise<{ payments: PaymentListRow[]; total: number }> {
    const { data, error } = await this.db.rpc("billing_list_payments", {
      p_company_id: this.companyId,
      p_client_id: filters.clientId ?? null,
      p_search: filters.search?.trim() || null,
      p_method: filters.method || null,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
    });
    fail(error);
    const payments = (data ?? []) as PaymentListRow[];
    return { payments, total: payments[0]?.total_count ?? 0 };
  }

  async listInvoicedByConcept(): Promise<{ item_type: string; amount: number }[]> {
    const { data, error } = await this.db.rpc("billing_invoiced_by_concept", { p_company_id: this.companyId });
    fail(error);
    return (data ?? []) as { item_type: string; amount: number }[];
  }

  async getClientSummary(clientId: string): Promise<ClientFinanceSummary> {
    const { data, error } = await this.db
      .rpc("billing_client_summary", { p_company_id: this.companyId, p_client_id: clientId })
      .single();
    fail(error);
    return data as ClientFinanceSummary;
  }

  /** Estado de cuenta: lo emitido a este cliente, sin borradores ni lo que la DGII aún no responde. */
  async listClientInvoices(clientId: string, limit = 100): Promise<InvoiceRow[]> {
    const { data, error } = await this.db
      .from("invoices")
      .select("*")
      .eq("company_id", this.companyId)
      .eq("client_id", clientId)
      .not("status", "in", '("borrador","en_proceso")')
      .order("issue_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    fail(error);
    return (data ?? []) as InvoiceRow[];
  }

  // ---- Borradores ---------------------------------------------------------

  async saveDraft(input: SaveDraftInput): Promise<string> {
    const totals = calculateDocument(input.lines, {
      itbisRate: input.itbisWithholdingRate,
      isrRate: input.isrWithholdingRate,
    });

    let buyer: BuyerSnapshot = {};
    if (input.clientId) {
      const { data, error } = await this.db
        .from("clients")
        .select(CLIENT_COLUMNS)
        .eq("company_id", this.companyId)
        .eq("id", input.clientId)
        .maybeSingle();
      fail(error);
      if (!data) throw new Error("El cliente no pertenece a esta empresa.");
      buyer = clientToBuyer(data as BillingClient);
    }

    const header = {
      fiscal_type: input.fiscalType,
      client_id: input.clientId ?? null,
      issue_date: input.issueDate,
      // La columna es obligatoria; al contado la fecha límite no aplica y se iguala a la emisión.
      due_date: input.paymentType === 2 && input.dueDate ? input.dueDate : input.issueDate,
      currency: input.currency,
      exchange_rate: input.currency === "DOP" ? 1 : input.exchangeRate,
      income_type: input.incomeType,
      payment_type: input.paymentType,
      payment_terms: input.paymentTerm || null,
      notes: input.notes || null,
      buyer_snapshot: buyer,
      subtotal: totals.subtotal,
      itbis: totals.itbisTotal,
      discount: totals.discountTotal,
      total: totals.total,
      amount_due: totals.amountDue,
      taxable_18: totals.taxable18,
      taxable_16: totals.taxable16,
      taxable_0: totals.taxable0,
      exempt_amount: totals.exempt,
      non_billable_amount: totals.nonBillable,
      itbis_18: totals.itbis18,
      itbis_16: totals.itbis16,
      itbis_withholding_rate: input.itbisWithholdingRate ?? 0,
      isr_withholding_rate: input.isrWithholdingRate ?? 0,
      itbis_withheld: totals.itbisWithheld,
      isr_withheld: totals.isrWithheld,
      modifies_invoice_id: input.modifiesInvoiceId ?? null,
      modification_code: input.modificationCode ?? null,
      modification_reason: input.modificationReason ?? null,
    };

    const items = totals.lines.map((line) => ({
      description: line.description,
      details: line.details,
      item_type: line.itemType,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      unit_code: line.unitCode,
      billing_indicator: line.billingIndicator,
      good_or_service: line.goodOrService,
      discount_amount: line.discount,
      amount: line.amount,
      itbis_amount: line.itbis,
      total: line.total,
      itbis_withheld: line.itbisWithheld,
      isr_withheld: line.isrWithheld,
    }));

    const { data, error } = await this.db.rpc("billing_save_draft", {
      p_company_id: this.companyId,
      p_invoice_id: input.id ?? null,
      p_header: header,
      p_items: items,
    });
    fail(error);
    return data as string;
  }

  async deleteDraft(id: string): Promise<void> {
    const { error } = await this.db.rpc("billing_delete_draft", { p_invoice_id: id });
    fail(error);
  }

  // ---- Emisión ------------------------------------------------------------

  /** Convierte lo guardado al modelo neutral que validan las reglas y el mapeo a e-CF. */
  toFiscalDocument(detail: InvoiceDetail): FiscalDocument {
    const { invoice, items, parent } = detail;
    const lines: LineInput[] = items.map((item) => ({
      description: item.description,
      details: item.details,
      itemType: item.item_type,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      discount: item.discount_amount,
      billingIndicator: item.billing_indicator as BillingIndicator,
      goodOrService: item.good_or_service as GoodOrService,
      unitCode: item.unit_code,
    }));

    return {
      fiscalType: invoice.fiscal_type as FiscalType,
      issueDate: invoice.issue_date,
      dueDate: invoice.payment_type === 2 ? invoice.due_date : null,
      currency: invoice.currency,
      exchangeRate: invoice.exchange_rate ?? 1,
      incomeType: invoice.income_type as IncomeType,
      paymentType: invoice.payment_type as PaymentType,
      paymentTerm: invoice.payment_terms,
      buyer: invoice.buyer_snapshot,
      lines,
      withholding: {
        itbisRate: invoice.itbis_withholding_rate,
        isrRate: invoice.isr_withholding_rate,
      },
      reference:
        parent && parent.ncf
          ? {
              modifiedNumber: parent.ncf,
              modifiedDate: parent.issue_date,
              modifiedFiscalType: parent.fiscal_type as FiscalType,
              modifiedTotal: parent.total,
              availableToCredit: Math.round((parent.total - parent.credited_amount) * 100) / 100,
              code: invoice.modification_code as ModificationCode,
              reason: invoice.modification_reason ?? "",
            }
          : null,
    };
  }

  validate(detail: InvoiceDetail, settings?: Pick<BillingSettingsRow, "trade_name"> | null): ValidationIssue[] {
    return validateForIssue(this.toFiscalDocument(detail), todayInDr(), { tradeName: settings?.trade_name });
  }

  async issue(
    id: string,
    external?: { encf: string; securityCode: string; signedAt: string; trackId?: string | null }
  ): Promise<{ issues: ValidationIssue[]; outcome?: EmitOutcome }> {
    const detail = await this.getInvoice(id);
    if (!detail) throw new Error("Comprobante no encontrado.");

    const settings = await this.getSettings();
    if (!settings) throw new Error("Configura los datos fiscales de la empresa antes de emitir.");

    const issues = this.validate(detail, settings);
    if (hasBlockingIssues(issues)) return { issues };

    const outcome = await getIssuer(settings.emission_mode).issue({
      db: this.db,
      invoiceId: id,
      document: this.toFiscalDocument(detail),
      external,
      provider: { service: this.ecfProvider(), environment: settings.dgii_environment },
    });
    return { issues, outcome: outcome ?? undefined };
  }

  ecfProvider(): EcfProviderService {
    return new EcfProviderService(this.ctx, (id) => this.loadReserved(id));
  }

  /** Los datos que la reserva dejó fijos; de aquí sale el documento del proveedor. */
  private async loadReserved(id: string): Promise<ReservedDocument> {
    const detail = await this.getInvoice(id);
    if (!detail) throw new Error("Comprobante no encontrado.");
    const { invoice } = detail;
    if (invoice.status !== "en_proceso" || !invoice.emitter_snapshot) {
      throw new Error("El comprobante no está reservado para el proveedor.");
    }
    return {
      document: this.toFiscalDocument(detail),
      emitter: invoice.emitter_snapshot,
      sequenceExpiry: invoice.sequence_expires_on,
    };
  }

  async voidInvoice(id: string, reason: string): Promise<void> {
    const { error } = await this.db.rpc("billing_void_invoice", { p_invoice_id: id, p_reason: reason });
    fail(error);
  }

  // ---- Cobros -------------------------------------------------------------

  async registerPayment(input: {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    method: string;
    reference?: string | null;
    bankName?: string | null;
    notes?: string | null;
  }): Promise<void> {
    const { error } = await this.db.rpc("billing_register_payment", {
      p_invoice_id: input.invoiceId,
      p_amount: input.amount,
      p_payment_date: input.paymentDate,
      p_method: input.method,
      p_reference: input.reference ?? null,
      p_bank_name: input.bankName ?? null,
      p_notes: input.notes ?? null,
    });
    fail(error);
  }

  async voidPayment(paymentId: string, reason: string): Promise<void> {
    const { error } = await this.db.rpc("billing_void_payment", { p_payment_id: paymentId, p_reason: reason });
    fail(error);
  }
}
