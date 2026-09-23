export type PropertyType = 
  | 'APARTAMENTO' 
  | 'CASA' 
  | 'VILLA' 
  | 'PENTHOUSE' 
  | 'SOLAR' 
  | 'COMERCIAL' 
  | 'OFICINA' 
  | 'NAVE_INDUSTRIAL';

export type PropertyOperation = 
  | 'VENTA' 
  | 'ALQUILER' 
  | 'VENTA_Y_ALQUILER';

export type PropertyStatus = 
  | 'DISPONIBLE' 
  | 'RESERVADA' 
  | 'BAJO_CONTRATO' 
  | 'ALQUILADA' 
  | 'VENDIDA';

export type Currency = 'USD' | 'DOP';

export interface PropertyOwner {
  id?: string;
  name: string;
  phone: string;
  email: string;
  identificationType: 'CEDULA' | 'RNC' | 'PASAPORTE';
  identificationNumber: string;
}

export interface ListingAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface CadastralLinkage {
  parcelDesignation?: string; // ej. Parcela 15-Ref
  cadastralDistrict?: string; // ej. 01, 03
  portion?: string;
  solar?: string;
  block?: string;
  titleNumber?: string;       // Matrícula o Certificado de Título
  surveyParcelId?: string;    // ID en el módulo de mensura
}

export interface Property {
  id: string;
  code: string;               // ej. PROP-2026-001
  title: string;
  description: string;
  propertyType: PropertyType;
  operationType: PropertyOperation;
  status: PropertyStatus;
  currency: Currency;
  priceSale?: number;
  priceRent?: number;
  maintenanceFee?: number;
  maintenanceCurrency?: Currency;
  
  // Especificaciones y Dimensiones
  bedrooms: number;
  bathrooms: number;
  halfBathrooms?: number;
  parkingSpaces: number;
  levels?: number;
  floorNumber?: number;
  builtAreaSqm: number;       // Superficie de construcción en m²
  landAreaSqm: number;        // Superficie de terreno / solar en m²
  landAreaTareas: number;     // Tareas dominicanas (m² / 628.86)
  yearBuilt?: number;
  
  // Ubicación
  province: string;
  municipality: string;
  sector: string;
  address: string;
  cadastralReference?: CadastralLinkage;
  
  // Vinculación con expediente legal
  caseId?: string;

  // Características
  amenities: string[];
  images: string[];
  isExclusive: boolean;
  commissionPercent: number; // e.g. 5%
  
  // Personas
  owner: PropertyOwner;
  listingAgent: ListingAgent;

  createdAt: string;
  updatedAt: string;
}

export type ContractType = 
  | 'ALQUILER_RESIDENCIAL' 
  | 'ALQUILER_COMERCIAL' 
  | 'PROMESA_VENTA' 
  | 'VENTA_DEFINITIVA';

export type ContractStatus = 
  | 'VIGENTE' 
  | 'POR_VENCER' 
  | 'VENCIDO' 
  | 'CUMPLIDO' 
  | 'CANCELADO';

export interface RealEstateContract {
  id: string;
  contractNumber: string;     // CTR-INM-2026-001
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  contractType: ContractType;
  status: ContractStatus;
  currency: Currency;
  amount: number;             // Canon mensual o valor total pactado
  
  // Esquema dominicano de depósitos y pagos
  depositMonths?: number;     // ej. 2 meses de depósito de garantía
  advanceMonths?: number;     // ej. 1 mes por adelantado
  depositAmountTotal?: number;// Monto total en depósitos retenidos
  paymentDayOfMonth?: number; // Día límite de pago (ej. día 5 de cada mes)
  graceDays?: number;         // Días de gracia (ej. 5 días)
  lateFeePercent?: number;    // % de mora tras los días de gracia (ej. 5%)

  startDate: string;
  endDate: string;
  
  clientRole: 'INQUILINO' | 'COMPRADOR';
  client: {
    id?: string;
    name: string;
    identificationNumber: string;
    phone: string;
    email: string;
  };
  ownerName: string;
  agentName: string;
  notaryName?: string;
  notes?: string;
  caseId?: string;
  createdAt: string;
}

export type ShowingStatus = 
  | 'PROGRAMADA' 
  | 'REALIZADA' 
  | 'CANCELADA' 
  | 'NO_ASISTIO';

export interface ShowingFeedback {
  interestLevel: 'ALTO' | 'MEDIO' | 'BAJO' | 'DESCARTADO';
  observations: string;
  hasOffer: boolean;
  offeredAmount?: number;
  offeredCurrency?: Currency;
  feedbackDate: string;
}

export interface RealEstateShowing {
  id: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  date: string;               // YYYY-MM-DD
  time: string;               // HH:mm
  status: ShowingStatus;
  prospectName: string;
  prospectPhone: string;
  prospectEmail: string;
  assignedAgent: string;
  feedback?: ShowingFeedback;
  createdAt: string;
}

export type CommissionStatus = 'PENDIENTE' | 'PAGADA' | 'CANCELADA';

export interface BrokerageCommission {
  id: string;
  commissionNumber: string;   // COM-2026-001
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  contractId?: string;
  contractNumber?: string;
  operationType: 'VENTA' | 'ALQUILER';
  currency: Currency;
  transactionAmount: number;  // Valor base de la operación
  commissionPercent: number;  // % acordado (ej. 5% venta, 1 mes alquiler)
  grossCommission: number;    // Bruto = Base * %
  isrWithholdingRate: number; // 0.10 (10% Retención ISR DGII Personas Físicas)
  isrWithholdingAmount: number;// Retención 10%
  netCommission: number;      // Neto = Bruto - Retención ISR
  agentName: string;
  agentRncOrCedula: string;
  status: CommissionStatus;
  paymentDate?: string;
  paymentMethod?: 'TRANSFERENCIA' | 'CHEQUE' | 'EFECTIVO';
  paymentReference?: string;
  notes?: string;
  createdAt: string;
}

// 1 Tarea Dominicana = 628.86 m²
export const DOMINICAN_TAREA_SQM = 628.86;

export function sqmToTareas(sqm: number): number {
  if (!sqm || isNaN(sqm)) return 0;
  return Number((sqm / DOMINICAN_TAREA_SQM).toFixed(2));
}

export function tareasToSqm(tareas: number): number {
  if (!tareas || isNaN(tareas)) return 0;
  return Number((tareas * DOMINICAN_TAREA_SQM).toFixed(2));
}

export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
