export type FiscalPeriod = string; // e.g. '2026-03', '2026-02', '2026-01', '2025-12', '2026-ANUAL'

export type CompanyId = 'todas' | 'emblema-principal' | 'emblema-norte' | 'emblema-este';

export interface CompanyInfo {
  id: CompanyId;
  name: string;
  rnc: string;
  address: string;
}

export const COMPANIES_MAP: Record<CompanyId, CompanyInfo> = {
  'todas': {
    id: 'todas',
    name: 'Consolidado Todas las Empresas',
    rnc: '131897452',
    address: 'República Dominicana',
  },
  'emblema-principal': {
    id: 'emblema-principal',
    name: 'Emblema Nexus / Oficina Principal',
    rnc: '131897452',
    address: 'Av. Winston Churchill #1099, Torre Acrópolis, Piso 18, Piantini, Santo Domingo',
  },
  'emblema-norte': {
    id: 'emblema-norte',
    name: 'Emblema Nexus / Zona Norte',
    rnc: '132458913',
    address: 'Av. Juan Pablo Duarte #45, Edif. Empresarial Cibao, Santiago de los Caballeros',
  },
  'emblema-este': {
    id: 'emblema-este',
    name: 'Emblema Nexus / Zona Este',
    rnc: '133789014',
    address: 'Boulevard Turístico del Este, Plaza San Juan Shopping Center, Punta Cana, La Altagracia',
  },
};

export const DGII_606_BIENES_SERVICIOS: Record<string, string> = {
  '01': '01 - Gastos de Personal',
  '02': '02 - Gastos por Trabajos, Suministros y Servicios',
  '03': '03 - Arrendamientos',
  '04': '04 - Gastos de Activos Fijo',
  '05': '05 - Gastos de Representación',
  '06': '06 - Otras Deducciones Admitidas',
  '07': '07 - Gastos Financieros',
  '08': '08 - Gastos Extraordinarios',
  '09': '09 - Compras y Gastos que forman parte del Costo de Venta',
  '10': '10 - Adquisiciones de Activos',
  '11': '11 - Gastos de Seguros',
};

export const DGII_FORMAS_PAGO: Record<string, string> = {
  '01': '01 - Efectivo',
  '02': '02 - Cheque / Transferencia / Depósito',
  '03': '03 - Tarjeta Débito / Crédito',
  '04': '04 - Compra / Venta a Crédito',
  '05': '05 - Permuta',
  '06': '06 - Nota de Crédito',
  '07': '07 - Mixto',
};

export const DGII_607_TIPOS_INGRESO: Record<string, string> = {
  '01': '01 - Ingresos por Operaciones (No Financieros)',
  '02': '02 - Ingresos Financieros',
  '03': '03 - Ingresos Extraordinarios',
  '04': '04 - Ingresos por Arrendamientos',
  '05': '05 - Ingresos por Venta de Activo Depreciable',
  '06': '06 - Otros Ingresos',
};

export const DGII_608_TIPOS_ANULACION: Record<string, string> = {
  '01': '01 - Deterioro de Factura',
  '02': '02 - Errores de Impresión (Factura Preimpresa)',
  '03': '03 - Impresión Defectuosa',
  '04': '04 - Duplicidad de Factura',
  '05': '05 - Corrección de la Información',
  '06': '06 - Cambio de Productos',
  '07': '07 - Devolución de Productos',
  '08': '08 - Omisión de Productos',
  '09': '09 - Errores en Secuencia de NCF',
};

export interface Dgii606Record {
  id: string;
  line: number;
  rncCedula: string;
  tipoId: '1' | '2' | '3'; // 1: RNC, 2: Cédula, 3: Pasaporte
  supplierName: string;
  tipoBienesServicios: string; // '01' to '11'
  ncf: string; // e.g. B0100000124 or E3100000055
  ncfModificado?: string;
  fechaComprobante: string; // YYYYMMDD
  fechaPago?: string; // YYYYMMDD
  montoServicios: number;
  montoBienes: number;
  totalFacturado: number;
  itbisFacturado: number;
  itbisRetenido: number;
  itbisSujetoProporcionalidad: number;
  itbisLlevadoCosto: number;
  itbisPorAdelantar: number;
  itbisPercibidoCompras: number;
  tipoRetencionIsr?: string;
  retencionRenta: number;
  isrPercibidoCompras: number;
  isc: number;
  otrosImpuestos: number;
  propinaLegal: number;
  formaPago: string; // '01' to '07'
  companyId: CompanyId;
  periodo: string; // YYYY-MM
  esElectronico: boolean;
}

export interface Dgii607Record {
  id: string;
  line: number;
  rncCedula: string;
  tipoId: '1' | '2' | '3';
  clientName: string;
  ncf: string; // e.g. E3100000089, E3200000012, B0100000078
  ncfModificado?: string;
  tipoIngreso: string; // '01' to '06'
  fechaComprobante: string; // YYYYMMDD
  fechaRetencion?: string; // YYYYMMDD
  montoFacturado: number;
  itbisFacturado: number;
  itbisRetenidoTerceros: number;
  itbisPercibido: number;
  retencionRentaTerceros: number;
  isrPercibido: number;
  isc: number;
  otrosImpuestos: number;
  propinaLegal: number;
  efectivo: number;
  chequeTransferencia: number;
  tarjetaDebitoCredito: number;
  ventaCredito: number;
  bonos: number;
  permuta: number;
  otrasFormas: number;
  companyId: CompanyId;
  periodo: string; // YYYY-MM
  esElectronico: boolean;
}

export interface Dgii608Record {
  id: string;
  line: number;
  ncf: string;
  fechaAnulacion: string; // YYYYMMDD
  tipoAnulacion: string; // '01' to '09'
  motivo: string;
  companyId: CompanyId;
  periodo: string; // YYYY-MM
  esElectronico: boolean;
}

export interface CaseProfitability {
  caseId: string;
  caseCode: string; // e.g. 'EXP-2026-0042'
  title: string;
  clientName: string;
  caseType: 'Deslinde' | 'Saneamiento' | 'Litigio Inmobiliario' | 'Refundición' | 'Constitución Condominio' | 'Transferencia Título' | 'Partición Hereditaria';
  billedFeesDOP: number; // Honorarios Facturados
  directExpensesDOP: number; // Gastos Directos Cargados (tasas judiciales, agrimensura, viáticos, notaría)
  grossMarginDOP: number; // Billed - Direct Expenses
  marginPercentage: number; // (grossMargin / billed) * 100
  status: 'En Progreso' | 'Cerrado' | 'Facturado' | 'En Audiencia' | 'Resolución Catastral';
  leadLawyer: string;
  surveyor: string;
  companyId: CompanyId;
  period: string; // YYYY-MM
}

export interface TeamProductivity {
  memberId: string;
  name: string;
  avatarUrl?: string;
  role: 'Abogado Senior' | 'Abogado Litigante' | 'Agrimensor Asociado' | 'Agrimensor Contratista' | 'Asesor Inmobiliario' | 'Oficial Notarial';
  department: 'Legal' | 'Agrimensura' | 'Inmobiliaria' | 'Notaría';
  activeCases: number;
  completedCases: number;
  onTimeRate: number; // SLA %
  completedTasks: number;
  generatedRevenueDOP: number;
  commissionsDOP: number;
  companyId: CompanyId;
  period: string;
}

export interface BiConsolidatedMetrics {
  totalRevenueDOP: number;
  totalRevenueUSD: number;
  totalExpensesDOP: number;
  netOperatingMarginDOP: number;
  netOperatingMarginPercentage: number;
  collectionsDOP: number;
  collectionsUSD: number;
  pendingCollectionsDOP: number;
  dgiiComplianceRate: number; // e.g. 100%
  totalInvoicesCount: number;
  totalExpensesCount: number;
  activeCasesCount: number;
  avgCaseProfitability: number;
  previousPeriodComparison: {
    revenueChangePct: number;
    marginChangePct: number;
    collectionsChangePct: number;
    complianceChangePct: number;
  };
}

export type ExportModule = 
  | 'clientes' 
  | 'facturas' 
  | 'expedientes' 
  | 'parcelas' 
  | 'inmuebles' 
  | 'contratos';

export type ExportFormat = 'csv' | 'txt' | 'json';

export interface ModuleColumnDefinition {
  key: string;
  label: string;
  defaultSelected: boolean;
}
