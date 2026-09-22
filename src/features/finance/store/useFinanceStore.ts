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

const initialInvoices: Invoice[] = [
  {
    id: 'inv-1',
    number: 'FAC-2024-0085',
    ncf: 'B0100000140',
    ncfType: 'B01',
    clientId: 'cl_2',
    clientName: 'Empresa S.R.L.',
    clientRncCedula: '1-31-98765-4',
    caseId: 'case_1',
    caseNumber: 'LEG-2024-0001',
    caseTitle: 'Divorcio Civil y Partición de Bienes',
    issueDate: '2026-08-10',
    dueDate: '2026-09-09',
    currency: 'DOP',
    items: [
      {
        id: 'item-1-1',
        description: 'Honorarios profesionales por redacción de acto de partición amigable',
        itemType: 'honorarios',
        quantity: 1,
        unitPrice: 100000,
        appliesTax: true,
        total: 100000,
      },
      {
        id: 'item-1-2',
        description: 'Gastos de protocolización y legalización notarial',
        itemType: 'gastos_legales',
        quantity: 1,
        unitPrice: 18000,
        appliesTax: false,
        total: 18000,
      },
    ],
    subtotal: 118000,
    taxTotal: 18000,
    total: 136000,
    paidAmount: 136000,
    balance: 0,
    status: 'pagada',
    notes: 'Pago recibido conforme a términos acordados. Saldo liquidado.',
    createdAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'inv-2',
    number: 'FAC-2024-0086',
    ncf: 'B0100000141',
    ncfType: 'B01',
    clientId: 'cl_3',
    clientName: 'Constructora del Este S.A.S.',
    clientRncCedula: '1-01-88421-2',
    caseId: 'case_2',
    caseNumber: 'AGR-2024-0042',
    caseTitle: 'Deslinde y Subdivisión Parcela 15',
    issueDate: '2026-08-25',
    dueDate: '2026-09-24',
    currency: 'DOP',
    items: [
      {
        id: 'item-2-1',
        description: 'Levantamiento topográfico georreferenciado de alta precisión con GPS diferencial',
        itemType: 'agrimensura',
        quantity: 1,
        unitPrice: 150000,
        appliesTax: true,
        total: 150000,
      },
      {
        id: 'item-2-2',
        description: 'Diseño técnico de plano individual y tramitación ante Mensuras Catastrales',
        itemType: 'agrimensura',
        quantity: 1,
        unitPrice: 100000,
        appliesTax: true,
        total: 100000,
      },
      {
        id: 'item-2-3',
        description: 'Sellos de ley y tasas catastrales de radicación (JI)',
        itemType: 'tasas_catastrales',
        quantity: 1,
        unitPrice: 25000,
        appliesTax: false,
        total: 25000,
      },
    ],
    subtotal: 275000,
    taxTotal: 45000,
    total: 320000,
    paidAmount: 160000,
    balance: 160000,
    status: 'parcial',
    notes: 'Primer abono del 50% recibido para inicio de labores de campo.',
    createdAt: '2026-08-25T14:30:00Z',
  },
  {
    id: 'inv-3',
    number: 'FAC-2024-0087',
    ncf: 'B0200000088',
    ncfType: 'B02',
    clientId: 'cl_1',
    clientName: 'Juan Pérez',
    clientRncCedula: '001-0948271-3',
    caseId: 'case_1',
    caseNumber: 'LEG-2024-0001',
    caseTitle: 'Divorcio Civil y Partición de Bienes',
    issueDate: '2026-09-12',
    dueDate: '2026-10-12',
    currency: 'DOP',
    items: [
      {
        id: 'item-3-1',
        description: 'Asesoría y representación en audiencia preliminar de conciliación',
        itemType: 'honorarios',
        quantity: 1,
        unitPrice: 40000,
        appliesTax: true,
        total: 40000,
      },
    ],
    subtotal: 40000,
    taxTotal: 7200,
    total: 47200,
    paidAmount: 0,
    balance: 47200,
    status: 'emitida',
    notes: 'Factura para consumidor final con plazo de 30 días.',
    createdAt: '2026-09-12T09:15:00Z',
  },
  {
    id: 'inv-4',
    number: 'FAC-2024-0088',
    ncf: 'B0100000142',
    ncfType: 'B01',
    clientId: 'cl_4',
    clientName: 'Inmobiliaria Caribe Real S.R.L.',
    clientRncCedula: '1-30-55612-9',
    caseId: 'case_3',
    caseNumber: 'INM-2024-0018',
    caseTitle: 'Regularización Título Turístico',
    issueDate: '2026-07-20',
    dueDate: '2026-08-19',
    currency: 'DOP',
    items: [
      {
        id: 'item-4-1',
        description: 'Debida diligencia inmobiliaria y saneamiento de títulos en Registro de Títulos Higüey',
        itemType: 'honorarios',
        quantity: 1,
        unitPrice: 300000,
        appliesTax: true,
        total: 300000,
      },
    ],
    subtotal: 300000,
    taxTotal: 54000,
    total: 354000,
    paidAmount: 0,
    balance: 354000,
    status: 'vencida',
    notes: 'Seguimiento por departamento de cobros. Factura con mora pendiente de aplicar.',
    createdAt: '2026-07-20T11:00:00Z',
  },
  {
    id: 'inv-5',
    number: 'FAC-2024-0089',
    ncf: 'B0100000143',
    ncfType: 'B01',
    clientId: 'cl_5',
    clientName: 'Desarrollos Punta Cana S.R.L.',
    clientRncCedula: '1-32-11094-1',
    issueDate: '2026-06-15',
    dueDate: '2026-07-15',
    currency: 'DOP',
    items: [
      {
        id: 'item-5-1',
        description: 'Consultoría y dictamen legal sobre régimen de condominios turísticos',
        itemType: 'honorarios',
        quantity: 1,
        unitPrice: 160000,
        appliesTax: true,
        total: 160000,
      },
    ],
    subtotal: 160000,
    taxTotal: 28800,
    total: 188800,
    paidAmount: 0,
    balance: 188800,
    status: 'vencida',
    notes: 'Cliente contactado para acuerdo de pago escalonado.',
    createdAt: '2026-06-15T08:30:00Z',
  },
  {
    id: 'inv-6',
    number: 'FAC-2024-0090',
    ncf: 'B0200000089',
    ncfType: 'B02',
    clientId: 'cl_6',
    clientName: 'María Santos',
    clientRncCedula: '402-2384751-8',
    issueDate: '2026-09-22',
    dueDate: '2026-10-22',
    currency: 'DOP',
    items: [
      {
        id: 'item-6-1',
        description: 'Redacción y compulsa de testamento abierto ante Notario Público',
        itemType: 'honorarios',
        quantity: 1,
        unitPrice: 25000,
        appliesTax: false,
        total: 25000,
      },
    ],
    subtotal: 25000,
    taxTotal: 0,
    total: 25000,
    paidAmount: 0,
    balance: 25000,
    status: 'borrador',
    notes: 'Borrador para validación previa con la solicitante.',
    createdAt: '2026-09-22T10:00:00Z',
  },
];

const initialQuotes: Quote[] = [
  {
    id: 'quo-1',
    number: 'COT-2024-0031',
    clientId: 'cl_3',
    clientName: 'Constructora del Este S.A.S.',
    clientRncCedula: '1-01-88421-2',
    caseId: 'case_2',
    caseNumber: 'AGR-2024-0042',
    caseTitle: 'Deslinde y Subdivisión Parcela 15',
    issueDate: '2026-08-20',
    validUntil: '2026-09-20',
    currency: 'DOP',
    items: [
      {
        id: 'q-item-1-1',
        description: 'Levantamiento topográfico georreferenciado de alta precisión con GPS diferencial',
        itemType: 'agrimensura',
        quantity: 1,
        unitPrice: 150000,
        appliesTax: true,
        total: 150000,
      },
      {
        id: 'q-item-1-2',
        description: 'Diseño técnico de plano individual y tramitación ante Mensuras Catastrales',
        itemType: 'agrimensura',
        quantity: 1,
        unitPrice: 100000,
        appliesTax: true,
        total: 100000,
      },
      {
        id: 'q-item-1-3',
        description: 'Sellos de ley y tasas catastrales de radicación (JI)',
        itemType: 'tasas_catastrales',
        quantity: 1,
        unitPrice: 25000,
        appliesTax: false,
        total: 25000,
      },
    ],
    subtotal: 275000,
    taxTotal: 45000,
    total: 320000,
    status: 'facturada',
    convertedInvoiceId: 'inv-2',
    notes: 'Presupuesto formal aprobado y convertido en Factura FAC-2024-0086.',
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'quo-2',
    number: 'COT-2024-0032',
    clientId: 'cl_7',
    clientName: 'Grupo Hotelero Bahía S.A.',
    clientRncCedula: '1-30-99882-3',
    caseId: 'case_3',
    caseNumber: 'INM-2024-0018',
    caseTitle: 'Regularización Título Turístico',
    issueDate: '2026-09-10',
    validUntil: '2026-10-10',
    currency: 'DOP',
    items: [
      {
        id: 'q-item-2-1',
        description: 'Auditoría integral de deslinde catastral y linderos costeros con batimetría',
        itemType: 'agrimensura',
        quantity: 1,
        unitPrice: 320000,
        appliesTax: true,
        total: 320000,
      },
      {
        id: 'q-item-2-2',
        description: 'Gestión y tramitación de permisos ambientales ante Ministerio de Medio Ambiente',
        itemType: 'honorarios',
        quantity: 1,
        unitPrice: 180000,
        appliesTax: true,
        total: 180000,
      },
    ],
    subtotal: 500000,
    taxTotal: 90000,
    total: 590000,
    status: 'aprobada',
    notes: 'Aprobada por la junta directiva del grupo. Lista para emitir factura con B01.',
    createdAt: '2026-09-10T15:00:00Z',
  },
  {
    id: 'quo-3',
    number: 'COT-2024-0033',
    clientId: 'cl_1',
    clientName: 'Juan Pérez',
    clientRncCedula: '001-0948271-3',
    caseId: 'case_1',
    caseNumber: 'LEG-2024-0001',
    caseTitle: 'Divorcio Civil y Partición de Bienes',
    issueDate: '2026-09-15',
    validUntil: '2026-10-15',
    currency: 'DOP',
    items: [
      {
        id: 'q-item-3-1',
        description: 'Honorarios por recurso extraordinario de casación ante Suprema Corte de Justicia',
        itemType: 'honorarios',
        quantity: 1,
        unitPrice: 120000,
        appliesTax: true,
        total: 120000,
      },
      {
        id: 'q-item-3-2',
        description: 'Depósito de garantías y costas procesales de ley',
        itemType: 'gastos_legales',
        quantity: 1,
        unitPrice: 30000,
        appliesTax: false,
        total: 30000,
      },
    ],
    subtotal: 150000,
    taxTotal: 21600,
    total: 171600,
    status: 'enviada',
    notes: 'Presupuesto remitido al cliente vía correo electrónico institucional.',
    createdAt: '2026-09-15T11:20:00Z',
  },
  {
    id: 'quo-4',
    number: 'COT-2024-0034',
    clientId: 'cl_8',
    clientName: 'Inversiones del Cibao S.R.L.',
    clientRncCedula: '1-31-00293-8',
    issueDate: '2026-09-20',
    validUntil: '2026-10-20',
    currency: 'USD',
    items: [
      {
        id: 'q-item-4-1',
        description: 'Estructuración societaria offshore y fideicomiso de desarrollo inmobiliario',
        itemType: 'honorarios',
        quantity: 1,
        unitPrice: 4500,
        appliesTax: true,
        total: 4500,
      },
    ],
    subtotal: 4500,
    taxTotal: 810,
    total: 5310,
    status: 'borrador',
    notes: 'En proceso de revisión por el socio director.',
    createdAt: '2026-09-20T16:00:00Z',
  },
];

const initialPayments: Payment[] = [
  {
    id: 'pay-1',
    receiptNumber: 'REC-2024-0098',
    invoiceId: 'inv-1',
    invoiceNumber: 'FAC-2024-0085',
    clientId: 'cl_2',
    clientName: 'Empresa S.R.L.',
    caseId: 'case_1',
    amount: 136000,
    currency: 'DOP',
    paymentDate: '2026-08-15',
    paymentMethod: 'transferencia',
    referenceNumber: 'TRF-BANRES-8849201',
    bankAccountId: 'bank-2',
    bankAccountName: 'Banreservas - Cta Corriente',
    notes: 'Liquidación total de honorarios de partición.',
    createdAt: '2026-08-15T16:00:00Z',
  },
  {
    id: 'pay-2',
    receiptNumber: 'REC-2024-0099',
    invoiceId: 'inv-2',
    invoiceNumber: 'FAC-2024-0086',
    clientId: 'cl_3',
    clientName: 'Constructora del Este S.A.S.',
    caseId: 'case_2',
    amount: 160000,
    currency: 'DOP',
    paymentDate: '2026-08-28',
    paymentMethod: 'transferencia',
    referenceNumber: 'BPD-TRF-9921443',
    bankAccountId: 'bank-1',
    bankAccountName: 'Banco Popular - Cta Corriente',
    notes: 'Abono inicial 50% según contrato de agrimensura.',
    createdAt: '2026-08-28T10:30:00Z',
  },
];

const initialExpenses: Expense[] = [
  {
    id: 'exp-1',
    description: 'Sellos de Ley 33-91 y Colegio de Abogados para acto ministerial de intimación',
    category: 'tasas_judiciales',
    amount: 3850,
    currency: 'DOP',
    date: '2026-09-02',
    isReimbursable: true,
    caseId: 'case_1',
    caseNumber: 'LEG-2024-0001',
    caseTitle: 'Divorcio Civil y Partición de Bienes',
    clientId: 'cl_1',
    clientName: 'Juan Pérez',
    receiptNumber: 'SEL-8831',
    ncf: 'B0100000055',
    supplier: 'Colegio de Abogados de la RD',
    supplierRnc: '4-01-00293-1',
    status: 'pagado',
    createdAt: '2026-09-02T09:00:00Z',
  },
  {
    id: 'exp-2',
    description: 'Tasas de radicación de expediente catastral en Dirección Regional de Mensuras',
    category: 'agrimensura_catastrales',
    amount: 12500,
    currency: 'DOP',
    date: '2026-09-05',
    isReimbursable: true,
    caseId: 'case_2',
    caseNumber: 'AGR-2024-0042',
    caseTitle: 'Deslinde y Subdivisión Parcela 15',
    clientId: 'cl_3',
    clientName: 'Constructora del Este S.A.S.',
    receiptNumber: 'JI-REC-109283',
    supplier: 'Consejo del Poder Judicial / JI',
    supplierRnc: '4-01-04982-3',
    status: 'pagado',
    createdAt: '2026-09-05T11:20:00Z',
  },
  {
    id: 'exp-3',
    description: 'Combustible y viáticos para brigada técnica de medición topográfica en Higüey',
    category: 'combustible_viaticos',
    amount: 18200,
    currency: 'DOP',
    date: '2026-09-10',
    isReimbursable: false,
    caseId: 'case_2',
    caseNumber: 'AGR-2024-0042',
    caseTitle: 'Deslinde y Subdivisión Parcela 15',
    clientId: 'cl_3',
    clientName: 'Constructora del Este S.A.S.',
    receiptNumber: 'FS-99120',
    supplier: 'Estación de Servicios Shell El Este',
    supplierRnc: '1-01-99882-1',
    status: 'pagado',
    createdAt: '2026-09-10T17:40:00Z',
  },
  {
    id: 'exp-4',
    description: 'Suministros de papelería, fólderes de archivo y tóner para expedientes judiciales',
    category: 'suministros_oficina',
    amount: 6400,
    currency: 'DOP',
    date: '2026-09-14',
    isReimbursable: false,
    receiptNumber: 'FAC-PAP-209',
    supplier: 'Papelería Moderna S.R.L.',
    supplierRnc: '1-30-88123-4',
    status: 'pagado',
    createdAt: '2026-09-14T14:10:00Z',
  },
  {
    id: 'exp-5',
    description: 'Honorarios a perito calígrafo forense por dictamen pericial documentoscópico',
    category: 'servicios_profesionales',
    amount: 35000,
    currency: 'DOP',
    date: '2026-09-18',
    isReimbursable: true,
    caseId: 'case_1',
    caseNumber: 'LEG-2024-0001',
    caseTitle: 'Divorcio Civil y Partición de Bienes',
    clientId: 'cl_2',
    clientName: 'Empresa S.R.L.',
    receiptNumber: 'PER-2024-11',
    supplier: 'Lic. Rafael Valenzuela - Perito Forense',
    supplierRnc: '001-0982736-2',
    status: 'pendiente',
    createdAt: '2026-09-18T10:00:00Z',
  },
];

const initialBankAccounts: BankAccount[] = [
  {
    id: 'bank-1',
    bankName: 'Banco Popular Dominicano',
    accountNumber: '794821034',
    accountType: 'corriente',
    currency: 'DOP',
    balance: 1485320,
    description: 'Cuenta matriz operativa y recaudaciones principales',
  },
  {
    id: 'bank-2',
    bankName: 'Banreservas',
    accountNumber: '240019283',
    accountType: 'corriente',
    currency: 'DOP',
    balance: 890450,
    description: 'Cuenta institucional para pagos estatales y tasas de ley',
  },
  {
    id: 'bank-3',
    bankName: 'Banco BHD',
    accountNumber: '120938475',
    accountType: 'ahorros',
    currency: 'USD',
    balance: 24500,
    description: 'Cuenta en divisas para clientes internacionales e inmobiliaria',
  },
];

const initialPettyCashMovements: PettyCashMovement[] = [
  {
    id: 'pc-1',
    date: '2026-09-01',
    type: 'ingreso',
    concept: 'Reposición de fondo fijo de caja chica mensual',
    amount: 25000,
    responsible: 'Licda. Altagracia Rosario',
    voucherNumber: 'REP-009',
    balanceAfter: 25000,
  },
  {
    id: 'pc-2',
    date: '2026-09-04',
    type: 'egreso',
    concept: 'Copias certificadas y encuadernación en Palacio de Justicia',
    amount: 1450,
    responsible: 'Manuel Troncoso (Mensajero)',
    voucherNumber: 'EG-101',
    caseNumber: 'LEG-2024-0001',
    balanceAfter: 23550,
  },
  {
    id: 'pc-3',
    date: '2026-09-08',
    type: 'egreso',
    concept: 'Sellos de impuestos de ley para certificación de estado jurídico',
    amount: 2100,
    responsible: 'Lic. Peña',
    voucherNumber: 'EG-102',
    caseNumber: 'INM-2024-0018',
    balanceAfter: 21450,
  },
  {
    id: 'pc-4',
    date: '2026-09-12',
    type: 'egreso',
    concept: 'Combustible y peajes para diligencia al Registro de Títulos San Cristóbal',
    amount: 3000,
    responsible: 'Ing. Vargas',
    voucherNumber: 'EG-103',
    caseNumber: 'AGR-2024-0042',
    balanceAfter: 18450,
  },
];

export const useFinanceStore = create<FinanceState>((set, get) => ({
  invoices: initialInvoices,
  quotes: initialQuotes,
  payments: initialPayments,
  expenses: initialExpenses,
  bankAccounts: initialBankAccounts,
  pettyCashMovements: initialPettyCashMovements,
  pettyCashBalance: 18450,
  pettyCashLimit: 25000,
  pettyCashCustodian: 'Licda. Altagracia Rosario',

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
