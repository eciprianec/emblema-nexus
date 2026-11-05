import type {
  FiscalType,
  IncomeType,
  ModificationCode,
  PaymentForm,
  PaymentType,
} from "./catalogs";
import type { LineInput } from "./calculate";

export interface BuyerData {
  taxId?: string | null;
  foreignId?: string | null;
  name?: string | null;
  address?: string | null;
  email?: string | null;
}

export interface EmitterData {
  rnc: string;
  legalName: string;
  tradeName?: string | null;
  address: string;
  phone?: string | null;
  email?: string | null;
}

export interface DocumentReference {
  /** NCF o e-NCF del comprobante modificado. */
  modifiedNumber: string;
  /** Fecha de emisión del comprobante modificado (YYYY-MM-DD). */
  modifiedDate: string;
  modifiedFiscalType?: FiscalType | null;
  /** Monto total del comprobante modificado, en su moneda. */
  modifiedTotal: number;
  /** Lo que aún se puede acreditar: total menos notas de crédito previas. */
  availableToCredit: number;
  code: ModificationCode;
  reason: string;
}

/** Comprobante en términos neutrales: no depende de cómo se obtenga su validez fiscal. */
export interface FiscalDocument {
  fiscalType: FiscalType;
  issueDate: string;
  dueDate?: string | null;
  currency: "DOP" | "USD";
  exchangeRate: number;
  incomeType: IncomeType;
  paymentType: PaymentType;
  paymentForms?: { form: PaymentForm; amount: number }[];
  paymentTerm?: string | null;
  buyer: BuyerData;
  lines: LineInput[];
  withholding?: { itbisRate?: number; isrRate?: number };
  reference?: DocumentReference | null;
}
