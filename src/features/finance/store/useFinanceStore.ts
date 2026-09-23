import { create } from 'zustand';
import {
  Invoice,
  Quote,
  Payment,
  Expense,
  BankAccount,
  PettyCashMovement,
  ClientAgingSummary,
  InvoiceStatus,
  QuoteStatus,
  NCFType,
  PaymentMethod,
  ExpenseCategory,
  Currency,
} from '../types';

interface FinanceState {
  // Datos
  invoices: Invoice[];
  quotes: Quote[];
  payments: Payment[];
  expenses: Expense[];
  bankAccounts: BankAccount[];
  pettyCashMovements: PettyCashMovement[];
  pettyCashBalance: number;
  pettyCashLimit: number;
  pettyCashCustodian: string;

  // Estados de Modales
  selectedInvoice: Invoice | null;
  isInvoiceDetailOpen: boolean;
  isInvoiceCreateOpen: boolean;
  isQuoteCreateOpen: boolean;
  isPaymentCreateOpen: boolean;
  isExpenseCreateOpen: boolean;
  activePaymentInvoice: Invoice | null;
  defaultCaseIdForModal?: string;
  defaultClientIdForModal?: string;

  // Acciones de Facturación
  createInvoice: (data: Omit<Invoice, 'id' | 'createdAt' | 'balance' | 'paidAmount' | 'subtotal' | 'taxTotal' | 'total'> & {
    items: Invoice['items'];
  }) => Invoice;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  cancelInvoice: (id: string) => void;

  // Acciones de Cotizaciones
  createQuote: (data: Omit<Quote, 'id' | 'createdAt' | 'subtotal' | 'taxTotal' | 'total'> & {
    items: Quote['items'];
  }) => Quote;
  updateQuoteStatus: (id: string, status: QuoteStatus) => void;
  approveQuote: (id: string) => void;
  convertQuoteToInvoice: (quoteId: string, ncfType?: NCFType) => Invoice;

  // Acciones de Pagos y Cobros
  registerPayment: (paymentData: {
    invoiceId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    bankAccountId?: string;
    paymentDate?: string;
    notes?: string;
  }) => Payment;

  // Acciones de Gastos
  registerExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Expense;

  // Acciones de Caja Chica
  addPettyCashMovement: (movement: Omit<PettyCashMovement, 'id' | 'balanceAfter'>) => PettyCashMovement;

  // Modales
  openInvoiceDetail: (invoice: Invoice) => void;
  closeInvoiceDetail: () => void;
  openInvoiceCreateModal: (defaultClientId?: string, defaultCaseId?: string) => void;
  closeInvoiceCreateModal: () => void;
  openQuoteCreateModal: (defaultClientId?: string, defaultCaseId?: string) => void;
  closeQuoteCreateModal: () => void;
  openPaymentCreateModal: (invoice?: Invoice) => void;
  closePaymentCreateModal: () => void;
  openExpenseCreateModal: (defaultCaseId?: string) => void;
  closeExpenseCreateModal: () => void;

  // Consultas y Cálculos
  getAgingReport: () => ClientAgingSummary[];
  getCaseFinance: (caseId: string) => {
    invoices: Invoice[];
    quotes: Quote[];
    expenses: Expense[];
    totalBilled: number;
    totalCollected: number;
    pendingBalance: number;
    totalExpenses: number;
    reimbursableExpenses: number;
  };
  getClientFinance: (clientId: string) => {
    invoices: Invoice[];
    payments: Payment[];
    quotes: Quote[];
    totalBilled: number;
    totalPaid: number;
    balance: number;
  };
}

// Generadores auxiliares de números
let invoiceSequence = 91;
let quoteSequence = 35;
let paymentSequence = 100;
let expenseSequence = 10;
let ncfSequence = 147;

const initialInvoices: Invoice[] = [];
const initialQuotes: Quote[] = [];
const initialPayments: Payment[] = [];
const initialExpenses: Expense[] = [];
const initialBankAccounts: BankAccount[] = [];
const initialPettyCashMovements: PettyCashMovement[] = [];

export const useFinanceStore = create<FinanceState>((set, get) => ({
  invoices: initialInvoices,
  quotes: initialQuotes,
  payments: initialPayments,
  expenses: initialExpenses,
  bankAccounts: initialBankAccounts,
  pettyCashMovements: initialPettyCashMovements,
  pettyCashBalance: 0,
  pettyCashLimit: 0,
  pettyCashCustodian: '',

  selectedInvoice: null,
  isInvoiceDetailOpen: false,
  isInvoiceCreateOpen: false,
  isQuoteCreateOpen: false,
  isPaymentCreateOpen: false,
  isExpenseCreateOpen: false,
  activePaymentInvoice: null,
  defaultCaseIdForModal: undefined,
  defaultClientIdForModal: undefined,

  createInvoice: (data) => {
    const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const taxTotal = data.items.reduce(
      (sum, item) => (item.appliesTax ? sum + item.total * 0.18 : sum),
      0
    );
    const total = subtotal + taxTotal;

    invoiceSequence += 1;
    ncfSequence += 1;

    const numStr = String(invoiceSequence).padStart(4, '0');
    const ncfStr = `${data.ncfType}${String(ncfSequence).padStart(8, '0')}`;

    const newInvoice: Invoice = {
      ...data,
      id: `inv-${Date.now()}`,
      number: data.number || `FAC-2024-${numStr}`,
      ncf: data.ncf || ncfStr,
      subtotal,
      taxTotal,
      total,
      paidAmount: 0,
      balance: total,
      status: data.status || 'emitida',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      invoices: [newInvoice, ...state.invoices],
      isInvoiceCreateOpen: false,
    }));

    return newInvoice;
  },

  updateInvoiceStatus: (id, status) => {
    set((state) => ({
      invoices: state.invoices.map((inv) => (inv.id === id ? { ...inv, status } : inv)),
      selectedInvoice:
        state.selectedInvoice?.id === id
          ? { ...state.selectedInvoice, status }
          : state.selectedInvoice,
    }));
  },

  cancelInvoice: (id) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id ? { ...inv, status: 'anulada', balance: 0 } : inv
      ),
      selectedInvoice:
        state.selectedInvoice?.id === id
          ? { ...state.selectedInvoice, status: 'anulada', balance: 0 }
          : state.selectedInvoice,
    }));
  },

  createQuote: (data) => {
    const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const taxTotal = data.items.reduce(
      (sum, item) => (item.appliesTax ? sum + item.total * 0.18 : sum),
      0
    );
    const total = subtotal + taxTotal;

    quoteSequence += 1;
    const numStr = String(quoteSequence).padStart(4, '0');

    const newQuote: Quote = {
      ...data,
      id: `quo-${Date.now()}`,
      number: data.number || `COT-2024-${numStr}`,
      subtotal,
      taxTotal,
      total,
      status: data.status || 'enviada',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      quotes: [newQuote, ...state.quotes],
      isQuoteCreateOpen: false,
    }));

    return newQuote;
  },

  updateQuoteStatus: (id, status) => {
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? { ...q, status } : q)),
    }));
  },

  approveQuote: (id) => {
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? { ...q, status: 'aprobada' } : q)),
    }));
  },

  convertQuoteToInvoice: (quoteId, ncfType = 'B01') => {
    const quote = get().quotes.find((q) => q.id === quoteId);
    if (!quote) throw new Error('Cotización no encontrada');

    invoiceSequence += 1;
    ncfSequence += 1;
    const numStr = String(invoiceSequence).padStart(4, '0');
    const ncfStr = `${ncfType}${String(ncfSequence).padStart(8, '0')}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      number: `FAC-2024-${numStr}`,
      ncf: ncfStr,
      ncfType,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientRncCedula: quote.clientRncCedula,
      caseId: quote.caseId,
      caseNumber: quote.caseNumber,
      caseTitle: quote.caseTitle,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: quote.currency,
      items: quote.items.map((it) => ({ ...it })),
      subtotal: quote.subtotal,
      taxTotal: quote.taxTotal,
      total: quote.total,
      paidAmount: 0,
      balance: quote.total,
      status: 'emitida',
      notes: `Generada a partir de cotización ${quote.number}`,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      invoices: [newInvoice, ...state.invoices],
      quotes: state.quotes.map((q) =>
        q.id === quoteId
          ? { ...q, status: 'facturada', convertedInvoiceId: newInvoice.id }
          : q
      ),
    }));

    return newInvoice;
  },

  registerPayment: ({
    invoiceId,
    amount,
    paymentMethod,
    referenceNumber,
    bankAccountId,
    paymentDate,
    notes,
  }) => {
    const state = get();
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('Factura no encontrada');

    const bankAccount = state.bankAccounts.find((b) => b.id === bankAccountId);

    paymentSequence += 1;
    const recStr = `REC-2024-${String(paymentSequence).padStart(4, '0')}`;

    const newPaidAmount = invoice.paidAmount + amount;
    const newBalance = Math.max(0, invoice.total - newPaidAmount);
    const newStatus: InvoiceStatus = newBalance === 0 ? 'pagada' : 'parcial';

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      receiptNumber: recStr,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      caseId: invoice.caseId,
      amount,
      currency: invoice.currency,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod,
      referenceNumber,
      bankAccountId,
      bankAccountName: bankAccount ? `${bankAccount.bankName} - ${bankAccount.accountNumber}` : undefined,
      notes,
      createdAt: new Date().toISOString(),
    };

    // Actualizar cuenta bancaria si aplica
    const updatedBankAccounts = state.bankAccounts.map((acc) => {
      if (acc.id === bankAccountId) {
        return { ...acc, balance: acc.balance + amount };
      }
      return acc;
    });

    // Actualizar facturas y pagos
    const updatedInvoices = state.invoices.map((inv) => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        };
      }
      return inv;
    });

    const updatedSelected =
      state.selectedInvoice?.id === invoiceId
        ? {
            ...state.selectedInvoice,
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newStatus,
          }
        : state.selectedInvoice;

    set({
      invoices: updatedInvoices,
      payments: [newPayment, ...state.payments],
      bankAccounts: updatedBankAccounts,
      selectedInvoice: updatedSelected,
      isPaymentCreateOpen: false,
      activePaymentInvoice: null,
    });

    return newPayment;
  },

  registerExpense: (data) => {
    expenseSequence += 1;
    const newExpense: Expense = {
      ...data,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      expenses: [newExpense, ...state.expenses],
      isExpenseCreateOpen: false,
    }));

    return newExpense;
  },

  addPettyCashMovement: (movement) => {
    const state = get();
    const delta = movement.type === 'ingreso' ? movement.amount : -movement.amount;
    const newBalance = state.pettyCashBalance + delta;

    const newMovement: PettyCashMovement = {
      ...movement,
      id: `pc-${Date.now()}`,
      balanceAfter: newBalance,
    };

    set({
      pettyCashMovements: [newMovement, ...state.pettyCashMovements],
      pettyCashBalance: newBalance,
    });

    return newMovement;
  },

  openInvoiceDetail: (invoice) => {
    set({ selectedInvoice: invoice, isInvoiceDetailOpen: true });
  },

  closeInvoiceDetail: () => {
    set({ selectedInvoice: null, isInvoiceDetailOpen: false });
  },

  openInvoiceCreateModal: (defaultClientId, defaultCaseId) => {
    set({
      isInvoiceCreateOpen: true,
      defaultClientIdForModal: defaultClientId,
      defaultCaseIdForModal: defaultCaseId,
    });
  },

  closeInvoiceCreateModal: () => {
    set({
      isInvoiceCreateOpen: false,
      defaultClientIdForModal: undefined,
      defaultCaseIdForModal: undefined,
    });
  },

  openQuoteCreateModal: (defaultClientId, defaultCaseId) => {
    set({
      isQuoteCreateOpen: true,
      defaultClientIdForModal: defaultClientId,
      defaultCaseIdForModal: defaultCaseId,
    });
  },

  closeQuoteCreateModal: () => {
    set({
      isQuoteCreateOpen: false,
      defaultClientIdForModal: undefined,
      defaultCaseIdForModal: undefined,
    });
  },

  openPaymentCreateModal: (invoice) => {
    set({
      isPaymentCreateOpen: true,
      activePaymentInvoice: invoice || null,
    });
  },

  closePaymentCreateModal: () => {
    set({
      isPaymentCreateOpen: false,
      activePaymentInvoice: null,
    });
  },

  openExpenseCreateModal: (defaultCaseId) => {
    set({
      isExpenseCreateOpen: true,
      defaultCaseIdForModal: defaultCaseId,
    });
  },

  closeExpenseCreateModal: () => {
    set({
      isExpenseCreateOpen: false,
      defaultCaseIdForModal: undefined,
    });
  },

  getAgingReport: () => {
    const { invoices } = get();
    const today = new Date();
    const clientMap = new Map<string, ClientAgingSummary>();

    invoices
      .filter((inv) => inv.balance > 0 && inv.status !== 'anulada')
      .forEach((inv) => {
        const dueDate = new Date(inv.dueDate);
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let entry = clientMap.get(inv.clientId);
        if (!entry) {
          entry = {
            clientId: inv.clientId,
            clientName: inv.clientName,
            clientRncCedula: inv.clientRncCedula,
            current: 0,
            days1To30: 0,
            days31To60: 0,
            days61To90: 0,
            daysOver90: 0,
            totalDebt: 0,
            invoiceCount: 0,
          };
          clientMap.set(inv.clientId, entry);
        }

        entry.invoiceCount += 1;
        entry.totalDebt += inv.balance;

        if (diffDays <= 0) {
          entry.current += inv.balance;
        } else if (diffDays <= 30) {
          entry.days1To30 += inv.balance;
        } else if (diffDays <= 60) {
          entry.days31To60 += inv.balance;
        } else if (diffDays <= 90) {
          entry.days61To90 += inv.balance;
        } else {
          entry.daysOver90 += inv.balance;
        }
      });

    return Array.from(clientMap.values());
  },

  getCaseFinance: (caseId) => {
    const { invoices, quotes, expenses } = get();
    const caseInvoices = invoices.filter((inv) => inv.caseId === caseId);
    const caseQuotes = quotes.filter((q) => q.caseId === caseId);
    const caseExpenses = expenses.filter((e) => e.caseId === caseId);

    const totalBilled = caseInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalCollected = caseInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const pendingBalance = caseInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    const totalExpenses = caseExpenses.reduce((sum, e) => sum + e.amount, 0);
    const reimbursableExpenses = caseExpenses
      .filter((e) => e.isReimbursable)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      invoices: caseInvoices,
      quotes: caseQuotes,
      expenses: caseExpenses,
      totalBilled,
      totalCollected,
      pendingBalance,
      totalExpenses,
      reimbursableExpenses,
    };
  },

  getClientFinance: (clientId) => {
    const { invoices, payments, quotes } = get();
    const clientInvoices = invoices.filter((inv) => inv.clientId === clientId);
    const clientPayments = payments.filter((pay) => pay.clientId === clientId);
    const clientQuotes = quotes.filter((q) => q.clientId === clientId);

    const totalBilled = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = clientPayments.reduce((sum, pay) => sum + pay.amount, 0);
    const balance = clientInvoices.reduce((sum, inv) => sum + inv.balance, 0);

    return {
      invoices: clientInvoices,
      payments: clientPayments,
      quotes: clientQuotes,
      totalBilled,
      totalPaid,
      balance,
    };
  },
}));
