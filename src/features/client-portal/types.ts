export type CaseMilestoneStatus = 'completed' | 'in_progress' | 'pending';

export interface CaseMilestone {
  id: string;
  title: string;
  status: CaseMilestoneStatus;
  date: string | null;
  description: string;
  institution?: string; // ej: DNMC, Tribunal de Tierras, Registro de Títulos
  notes?: string;
}

export type ClientCaseStatus = 
  | 'recepcion'
  | 'mensura_campo'
  | 'audiencia_fijada'
  | 'revision_dnmc'
  | 'dictamen_favorable'
  | 'completado';

export interface ClientCase {
  id: string;
  caseNumber: string;
  trackingCode: string;
  title: string;
  category: 'Agrimensura' | 'Legal Inmobiliario' | 'Corporativo' | 'Litigio de Tierras';
  status: ClientCaseStatus;
  statusLabel: string;
  progressPercentage: number;
  openedDate: string;
  estimatedEndDate: string;
  courtOrOffice: string;
  cadastralDesignation?: string;
  assignedAttorney: string;
  assignedSurveyor?: string;
  milestones: CaseMilestone[];
  publicNotes?: string;
  lastUpdate: string;
}

export type RequirementStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface DocumentRequirement {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  title: string;
  description: string;
  dueDate: string;
  allowedFormats: string[];
  maxSizeMB: number;
  status: RequirementStatus;
  isUrgent: boolean;
  uploadedFile?: {
    name: string;
    size: number;
    uploadedAt: string;
    url: string;
  };
  reviewNotes?: string;
}

export interface InvoiceReceipt {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  reference: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ClientInvoice {
  id: string;
  caseId?: string;
  caseNumber?: string;
  invoiceNumber: string;
  eNcf: string; // ej: E3100000045
  rncEmisor: string;
  razonSocialEmisor: string;
  rncComprador: string;
  razonSocialComprador: string;
  issueDate: string;
  dueDate: string;
  currency: 'DOP' | 'USD';
  subtotal: number;
  itbis: number;
  total: number;
  balance: number;
  status: 'paid' | 'pending' | 'partially_paid' | 'overdue';
  dgiiStatus: 'Aceptado' | 'En Proceso' | 'Aceptado Condicional';
  trackIdDgii: string;
  securityCode: string;
  paymentReceipts: InvoiceReceipt[];
  items: InvoiceItem[];
}

export interface ClientPortalUser {
  id: string;
  name: string;
  rncOrCedula: string;
  email: string;
  phone: string;
  companyName?: string;
  assignedCaseIds: string[];
  portalPin: string;
  magicToken: string;
  status: 'active' | 'revoked';
}

export interface PortalAccessCredential {
  clientId: string;
  clientName: string;
  pin: string;
  magicToken: string;
  magicLinkUrl: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface PublicInquiry {
  id: string;
  trackingNumber: string;
  fullName: string;
  email: string;
  phone: string;
  idNumber: string; // Cédula o RNC
  serviceType: string;
  location?: string;
  message: string;
  createdAt: string;
  status: 'received' | 'in_review' | 'contacted';
}
