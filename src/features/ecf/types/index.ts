export type ECFType = 'E31' | 'E32' | 'E34' | 'E44' | 'E45';

export interface ECFTypeInfo {
  code: ECFType;
  name: string;
  shortName: string;
  description: string;
  requiresRnc: boolean;
}

export const ECF_TYPE_MAP: Record<ECFType, ECFTypeInfo> = {
  E31: {
    code: 'E31',
    name: 'Factura de Crédito Fiscal Electrónica',
    shortName: 'Crédito Fiscal e-CF',
    description: 'Válida para crédito fiscal y deducible de ISR/ITBIS (RNC 9 u 11 dígitos obligatorio).',
    requiresRnc: true,
  },
  E32: {
    code: 'E32',
    name: 'Factura de Consumo Electrónica',
    shortName: 'Consumo e-CF',
    description: 'Válida para consumidor final. Si supera RD$250,000 requiere RNC o Cédula.',
    requiresRnc: false,
  },
  E34: {
    code: 'E34',
    name: 'Nota de Crédito Electrónica',
    shortName: 'Nota de Crédito e-CF',
    description: 'Modifica o anula montos de un e-CF emitido previamente.',
    requiresRnc: true,
  },
  E44: {
    code: 'E44',
    name: 'Comprobante Regímenes Especiales Electrónico',
    shortName: 'Régimen Especial e-CF',
    description: 'Para entidades acogidas a regímenes especiales de tributación (zonas francas, embajadas).',
    requiresRnc: true,
  },
  E45: {
    code: 'E45',
    name: 'Comprobante Gubernamental Electrónico',
    shortName: 'Gubernamental e-CF',
    description: 'Para ventas de bienes y servicios prestados a instituciones del Estado dominicano.',
    requiresRnc: true,
  },
};

export type ECFStatus = 'aceptado' | 'en_proceso' | 'rechazado';

export const ECF_STATUS_MAP: Record<
  ECFStatus,
  { label: string; badgeClass: string; dotClass: string; description: string }
> = {
  aceptado: {
    label: 'Aceptado por DGII',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    description: 'Comprobante validado y registrado formalmente en la DGII.',
  },
  en_proceso: {
    label: 'En Proceso DGII',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500 animate-pulse',
    description: 'Enviado a los Web Services de la DGII; pendiente respuesta de timbrado.',
  },
  rechazado: {
    label: 'Rechazado por DGII',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
    description: 'Rechazado en validación de sintaxis, firma o secuencia fiscal.',
  },
};

export type ECFReceptionStatus =
  | 'pendiente_aprobacion'
  | 'aprobado_comercial'
  | 'rechazado_comercial';

export const ECF_RECEPTION_STATUS_MAP: Record<
  ECFReceptionStatus,
  { label: string; badgeClass: string; description: string }
> = {
  pendiente_aprobacion: {
    label: 'Pendiente Aprobación',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Recibido del proveedor; pendiente conformidad técnica o comercial.',
  },
  aprobado_comercial: {
    label: 'Aprobación Comercial B2B',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Aprobado comercialmente por la empresa para pago.',
  },
  rechazado_comercial: {
    label: 'Rechazo Comercial B2B',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Rechazado por discrepancia en montos, ítems o condiciones.',
  },
};

export type ECFEnvironment = 'CERT' | 'PROD';

export interface ECFItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  appliesTax: boolean; // 18% ITBIS
  total: number;
}

export interface IssuedECF {
  id: string;
  eNCF: string; // ej. E3100000001
  ecfType: ECFType;
  rncEmisor: string;
  razonSocialEmisor: string;
  rncComprador: string;
  razonSocialComprador: string;
  fechaEmision: string; // YYYY-MM-DD
  fechaVencimientoSecuencia: string; // YYYY-MM-DD
  montoSubtotal: number;
  montoItbis: number;
  montoTotal: number;
  currency: 'DOP' | 'USD';
  exchangeRate?: number;
  trackId: string;
  codigoSeguridad: string; // 6 caracteres alfanuméricos
  qrUrl: string;
  dgiiStatus: ECFStatus;
  dgiiStatusCode: string;
  dgiiStatusMessage: string;
  dgiiValidationErrors?: string[];
  digitalSignatureDigest: string;
  items: ECFItem[];
  invoiceId?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export interface ReceivedECF {
  id: string;
  eNCF: string;
  ecfType: ECFType;
  rncEmisor: string;
  razonSocialEmisor: string;
  rncComprador: string;
  fechaEmision: string;
  fechaRecepcion: string;
  montoSubtotal: number;
  montoItbis: number;
  montoTotal: number;
  currency: 'DOP' | 'USD';
  trackId: string;
  codigoSeguridad: string;
  statusComercial: ECFReceptionStatus;
  acuseReciboEnviado: boolean;
  fechaAcuseRecibo?: string;
  motivoRechazo?: string;
  items: ECFItem[];
}

export interface ECFSequence {
  type: ECFType;
  name: string;
  prefix: string;
  startNumber: number;
  endNumber: number;
  currentNumber: number;
  expirationDate: string;
  isActive: boolean;
}

export interface ECFConfig {
  rnc: string;
  razonSocial: string;
  nombreComercial: string;
  actividadEconomica: string;
  direccionFiscal: string;
  telefono: string;
  emailNotificaciones: string;
  ambiente: ECFEnvironment;
  certificado: {
    nombreArchivo: string;
    emisorCertificado: string;
    validoHasta: string;
    diasRestantes: number;
    sha256Fingerprint: string;
    estado: 'activo' | 'por_vencer' | 'vencido';
    tieneClave: boolean;
  };
}
