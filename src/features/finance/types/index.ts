export type NCFType = 'B01' | 'B02' | 'B14' | 'B15' | 'B16';

export const NCF_LABELS: Record<NCFType, { code: NCFType; name: string; description: string }> = {
  B01: {
    code: 'B01',
    name: 'Crédito Fiscal',
    description: 'Válida para Crédito Fiscal (RNC obligatorio)',
  },
  B02: {
    code: 'B02',
    name: 'Consumo Final',
    description: 'Válida para Consumidor Final',
  },
  B14: {
    code: 'B14',
    name: 'Régimen Especial',
    description: 'Zonas Francas y Regímenes Especiales de Tributación',
  },
  B15: {
    code: 'B15',
    name: 'Gubernamental',
    description: 'Entidades Estatales e Instituciones del Gobierno',
  },
  B16: {
    code: 'B16',
    name: 'Exportación',
    description: 'Factura para Exportación de Bienes o Servicios',
  },
};

export type InvoiceStatus = 'borrador' | 'emitida' | 'parcial' | 'pagada' | 'vencida' | 'anulada';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, { label: string; color: string; badgeClass: string }> = {
  borrador: { label: 'Borrador', color: 'slate', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  emitida: { label: 'Emitida', color: 'blue', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  parcial: { label: 'Parcial', color: 'amber', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  pagada: { label: 'Pagada', color: 'emerald', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  vencida: { label: 'Vencida', color: 'rose', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  anulada: { label: 'Anulada', color: 'zinc', badgeClass: 'bg-zinc-100 text-zinc-500 border-zinc-300 line-through' },
};

export type QuoteStatus = 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'facturada';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, { label: string; badgeClass: string }> = {
  borrador: { label: 'Borrador', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  enviada: { label: 'Enviada', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  aprobada: { label: 'Aprobada', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rechazada: { label: 'Rechazada', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  facturada: { label: 'Facturada', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export type PaymentMethod = 'transferencia' | 'cheque' | 'efectivo' | 'tarjeta';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: 'Transferencia Bancaria',
  cheque: 'Cheque Comercial',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta de Crédito / Débito',
};

export type ExpenseCategory =
  | 'tasas_judiciales'
  | 'tasas_notariales'
  | 'agrimensura_catastrales'
  | 'combustible_viaticos'
  | 'suministros_oficina'
  | 'servicios_profesionales'
  | 'otros';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  tasas_judiciales: 'Tasas Judiciales e Impuestos de Ley',
  tasas_notariales: 'Gastos Notariales y Legalizaciones',
  agrimensura_catastrales: 'Mensuras y Tasas Catastrales (JI)',
  combustible_viaticos: 'Combustible y Viáticos de Campo',
  suministros_oficina: 'Suministros y Papelería',
  servicios_profesionales: 'Honorarios a Terceros / Peritos',
  otros: 'Otros Gastos Operativos',
};

export type Currency = 'DOP' | 'USD';

export type ItemType =
  | 'honorarios'
  | 'gastos_legales'
  | 'tasas_catastrales'
  | 'agrimensura'
  | 'comision_inmobiliaria'
  | 'otro';

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  honorarios: 'Honorarios Profesionales',
  gastos_legales: 'Gastos y Trámites Legales',
  tasas_catastrales: 'Tasas Catastrales',
  agrimensura: 'Servicios de Agrimensura',
  comision_inmobiliaria: 'Comisión Inmobiliaria',
  otro: 'Otros Conceptos',
};

export interface InvoiceItem {
  id: string;
  description: string;
  itemType: ItemType;
  quantity: number;
  unitPrice: number;
  appliesTax: boolean; // ITBIS 18%
  total: number;
}

export interface Invoice {
  id: string;
  number: string; // Ej: FAC-2024-0089
  ncf: string; // Ej: B0100000145
  ncfType: NCFType;
  clientId: string;
  clientName: string;
  clientRncCedula?: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  currency: Currency;
  exchangeRate?: number; // Ej: 59.50 si es USD
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number; // 18% sobre ítems con appliesTax
  total: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  itemType: ItemType;
  quantity: number;
  unitPrice: number;
  appliesTax: boolean;
  total: number;
}

export interface Quote {
  id: string;
  number: string; // Ej: COT-2024-0034
  clientId: string;
  clientName: string;
  clientRncCedula?: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  issueDate: string;
  validUntil: string;
  currency: Currency;
  items: QuoteItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  status: QuoteStatus;
  notes?: string;
  convertedInvoiceId?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  receiptNumber: string; // Ej: REC-2024-0112
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  caseId?: string;
  amount: number;
  currency: Currency;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  bankAccountId?: string;
  bankAccountName?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  date: string;
  isReimbursable: boolean;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  clientId?: string;
  clientName?: string;
  receiptNumber?: string;
  ncf?: string;
  supplier?: string;
  supplierRnc?: string;
  status: 'pagado' | 'pendiente' | 'reembolsado';
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: 'corriente' | 'ahorros';
  currency: Currency;
  balance: number;
  description?: string;
}

export interface PettyCashMovement {
  id: string;
  date: string;
  type: 'ingreso' | 'egreso';
  concept: string;
  amount: number;
  responsible: string;
  voucherNumber?: string;
  caseNumber?: string;
  balanceAfter: number;
}

export interface ClientAgingSummary {
  clientId: string;
  clientName: string;
  clientRncCedula?: string;
  current: number; // 0 días (no vencido)
  days1To30: number; // 1-30 días
  days31To60: number; // 31-60 días
  days61To90: number; // 61-90 días
  daysOver90: number; // >90 días
  totalDebt: number;
  invoiceCount: number;
}
