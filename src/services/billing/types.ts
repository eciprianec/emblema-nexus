import type { EmissionMode, InvoiceStatus } from "@/domain/billing";

export interface InvoiceRow {
  id: string;
  company_id: string;
  /** Solo en los listados de cartera: lo comprometido por notas de crédito en proceso. */
  pending_credit?: number;
  invoice_number: string;
  status: InvoiceStatus;
  fiscal_type: string;
  ncf: string | null;
  ncf_type: string | null;
  emission_mode: EmissionMode | null;
  client_id: string | null;
  issue_date: string;
  due_date: string;
  issued_at: string | null;
  sequence_expires_on: string | null;
  currency: "DOP" | "USD";
  exchange_rate: number | null;
  income_type: string;
  payment_type: number;
  payment_forms: { form: number; amount: number }[];
  payment_terms: string | null;
  notes: string | null;
  buyer_snapshot: BuyerSnapshot;
  emitter_snapshot: EmitterSnapshot | null;
  subtotal: number;
  itbis: number;
  discount: number;
  total: number;
  amount_due: number;
  paid_amount: number;
  credited_amount: number;
  credited_due: number;
  balance_due: number;
  taxable_18: number;
  taxable_16: number;
  taxable_0: number;
  exempt_amount: number;
  non_billable_amount: number;
  itbis_18: number;
  itbis_16: number;
  itbis_withholding_rate: number;
  isr_withholding_rate: number;
  itbis_withheld: number;
  isr_withheld: number;
  modifies_invoice_id: string | null;
  modified_ncf: string | null;
  modified_ncf_date: string | null;
  modification_code: number | null;
  modification_reason: string | null;
  void_reason: string | null;
  voided_at: string | null;
  created_at: string;
  /** Solo en modo proveedor: rotula los e-CF que no son de producción. */
  dgii_environment: "test" | "cert" | "prod" | null;
}

export interface BuyerSnapshot {
  taxId?: string | null;
  foreignId?: string | null;
  name?: string | null;
  address?: string | null;
  email?: string | null;
}

export interface EmitterSnapshot {
  rnc: string;
  legalName: string;
  tradeName?: string | null;
  address: string;
  phone?: string | null;
  email?: string | null;
}

export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  description: string;
  details: string | null;
  item_type: string;
  quantity: number;
  unit_price: number;
  unit_code: number | null;
  billing_indicator: number;
  good_or_service: number;
  discount_amount: number;
  amount: number;
  itbis_amount: number;
  total: number;
  itbis_withheld: number;
  isr_withheld: number;
  order_index: number | null;
}

export interface PaymentRow {
  id: string;
  receipt_number: string;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  bank_name: string | null;
  amount: number;
  currency: string;
  voided_at: string | null;
  void_reason: string | null;
}

export interface PaymentListRow extends PaymentRow {
  invoice_id: string | null;
  invoice_number: string | null;
  ncf: string | null;
  /** Ambiente del e-CF cobrado; nulo fuera del modo proveedor. */
  dgii_environment: "test" | "cert" | "prod" | null;
  client_id: string | null;
  client_name: string;
  total_count: number;
}

export interface EcfRecordRow {
  id: string;
  encf: string;
  /** Tal cual lo devolvió el emisor: distingue mayúsculas y minúsculas. */
  security_code: string | null;
  sign_date: string | null;
  track_id: string | null;
  dgii_status: string;
  source: string;
  environment: string;
  qr_code_url: string | null;
  dgii_messages: { codigo: number | string | null; valor: string; detalle?: string }[] | null;
  provider_phase: "reservado" | "enviando" | "ambiguo" | "enviado" | "no_enviado" | null;
  provider_status: string | null;
  provider_signed_date: string | null;
  provider_error: string | null;
  secuencia_utilizada: boolean | null;
  send_attempts: number;
  /** El proveedor rechazó el envío sin motivo: el número no vuelve a la bolsa. */
  number_parked_at: string | null;
  created_at: string;
}

export interface BillingSettingsRow {
  company_id: string;
  emission_mode: EmissionMode;
  dgii_environment: "test" | "cert" | "prod";
  rnc: string;
  legal_name: string;
  trade_name: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  default_due_days: number;
}

export interface FiscalSequenceRow {
  id: string;
  prefix: string;
  /** Un rango vale para un solo ambiente: los números de prueba coinciden con los reales. */
  environment: "test" | "cert" | "prod";
  start_number: number;
  end_number: number;
  next_number: number;
  expires_on: string | null;
  is_active: boolean;
}

export interface BillingClient {
  id: string;
  client_type: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  rnc: string | null;
  cedula: string | null;
  passport: string | null;
  email: string | null;
  address: string | null;
}

export interface InvoiceDetail {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
  payments: PaymentRow[];
  /** El e-CF vigente; un comprobante rechazado vuelve a borrador y no tiene. */
  ecf: EcfRecordRow | null;
  /** Intentos rechazados o no enviados, del más reciente al más antiguo. */
  ecfHistory: EcfRecordRow[];
  notes: Pick<InvoiceRow, "id" | "invoice_number" | "ncf" | "fiscal_type" | "status" | "total" | "amount_due" | "issue_date">[];
  parent: Pick<InvoiceRow, "id" | "invoice_number" | "ncf" | "issue_date" | "total" | "credited_amount" | "fiscal_type"> | null;
}

export interface CustomerCreditRow {
  invoice_id: string;
  invoice_number: string;
  ncf: string | null;
  client_id: string | null;
  client_name: string;
  currency: string;
  amount: number;
  amount_dop: number;
}
