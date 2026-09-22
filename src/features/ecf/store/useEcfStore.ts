import { create } from 'zustand';
import {
  ECFType,
  ECFStatus,
  ECFReceptionStatus,
  ECFEnvironment,
  IssuedECF,
  ReceivedECF,
  ECFSequence,
  ECFConfig,
  ECFItem,
} from '../types';

interface EmitEcfInput {
  ecfType: ECFType;
  rncComprador: string;
  razonSocialComprador: string;
  items: Omit<ECFItem, 'id' | 'total'>[];
  currency?: 'DOP' | 'USD';
  exchangeRate?: number;
  invoiceId?: string;
  invoiceNumber?: string;
}

interface EcfState {
  // Datos principales
  issuedEcfs: IssuedECF[];
  receivedEcfs: ReceivedECF[];
  sequences: Record<ECFType, ECFSequence>;
  config: ECFConfig;

  // Estado de modales y vistas
  isEmitModalOpen: boolean;
  emitPrefillData: Partial<EmitEcfInput> | null;
  selectedEcfForPrint: IssuedECF | null;
  isPrintModalOpen: boolean;
  selectedTrackId: string | null;
  selectedEcfForTrackId: IssuedECF | null;
  isTrackIdModalOpen: boolean;
  selectedReceivedEcf: ReceivedECF | null;
  isReceivedDetailOpen: boolean;

  // Acciones
  openEmitModal: (prefill?: Partial<EmitEcfInput>) => void;
  closeEmitModal: () => void;
  openPrintModal: (ecf: IssuedECF) => void;
  closePrintModal: () => void;
  openTrackIdModal: (trackId: string, ecf?: IssuedECF) => void;
  closeTrackIdModal: () => void;
  openReceivedDetail: (ecf: ReceivedECF) => void;
  closeReceivedDetail: () => void;

  // Operaciones e-CF
  emitEcf: (input: EmitEcfInput) => IssuedECF;
  checkTrackIdStatus: (trackId: string) => {
    trackId: string;
    statusCode: string;
    status: ECFStatus;
    message: string;
    lastChecked: string;
  };
  approveReceivedEcf: (id: string) => void;
  rejectReceivedEcf: (id: string, reason: string) => void;
  acknowledgeReceivedEcf: (id: string) => void;
  setEnvironment: (env: ECFEnvironment) => void;
  updateConfig: (partial: Partial<ECFConfig>) => void;
  updateSequence: (type: ECFType, partial: Partial<ECFSequence>) => void;
  simulateDgiiStatusUpdate: (ecfId: string, newStatus: ECFStatus) => void;
}

const INITIAL_SEQUENCES: Record<ECFType, ECFSequence> = {
  E31: {
    type: 'E31',
    name: 'Factura de Crédito Fiscal Electrónica',
    prefix: 'E31',
    startNumber: 1,
    endNumber: 1000,
    currentNumber: 14,
    expirationDate: '2026-12-31',
    isActive: true,
  },
  E32: {
    type: 'E32',
    name: 'Factura de Consumo Electrónica',
    prefix: 'E32',
    startNumber: 1,
    endNumber: 5000,
    currentNumber: 28,
    expirationDate: '2026-12-31',
    isActive: true,
  },
  E34: {
    type: 'E34',
    name: 'Nota de Crédito Electrónica',
    prefix: 'E34',
    startNumber: 1,
    endNumber: 500,
    currentNumber: 4,
    expirationDate: '2026-12-31',
    isActive: true,
  },
  E44: {
    type: 'E44',
    name: 'Comprobante Regímenes Especiales Electrónico',
    prefix: 'E44',
    startNumber: 1,
    endNumber: 250,
    currentNumber: 3,
    expirationDate: '2026-12-31',
    isActive: true,
  },
  E45: {
    type: 'E45',
    name: 'Comprobante Gubernamental Electrónico',
    prefix: 'E45',
    startNumber: 1,
    endNumber: 300,
    currentNumber: 2,
    expirationDate: '2026-12-31',
    isActive: true,
  },
};

const INITIAL_CONFIG: ECFConfig = {
  rnc: '131987654',
  razonSocial: 'EMBLEMA NEXUS S.R.L.',
  nombreComercial: 'Emblema Nexus - Asesoría Legal, Agrimensura & Bienes Raíces',
  actividadEconomica: '6910 - Actividades jurídicas, asesoría legal y servicios de agrimensura catastral',
  direccionFiscal: 'Av. Winston Churchill No. 1099, Torre Acrópolis, Piso 14, Piantini, Santo Domingo, D.N.',
  telefono: '(809) 555-0100',
  emailNotificaciones: 'tributacion@emblemanexus.com.do',
  ambiente: 'PROD',
  certificado: {
    nombreArchivo: 'emblema_nexus_firmadigital_2026.p12',
    emisorCertificado: 'Avansi S.R.L. (Entidad de Certificación Acreditada por INDOTEL)',
    validoHasta: '2027-05-18',
    diasRestantes: 603,
    sha256Fingerprint: 'B4:9C:21:8F:D3:5E:AA:77:01:92:44:8B:E3:67:10:99:A2:81:35:E4:70:9A:88:B1:30:EF:89:12:43:08:76:CD',
    estado: 'activo',
    tieneClave: true,
  },
};

const INITIAL_ISSUED_ECFS: IssuedECF[] = [
  {
    id: 'ecf-001',
    eNCF: 'E3100000010',
    ecfType: 'E31',
    rncEmisor: '131987654',
    razonSocialEmisor: 'EMBLEMA NEXUS S.R.L.',
    rncComprador: '101012345',
    razonSocialComprador: 'Desarrollos Urbanísticos del Caribe S.A.',
    fechaEmision: '2026-09-18',
    fechaVencimientoSecuencia: '2026-12-31',
    montoSubtotal: 100000,
    montoItbis: 18000,
    montoTotal: 118000,
    currency: 'DOP',
    trackId: 'e8f49a21-912c-47b1-b934-8c85e5b3f112',
    codigoSeguridad: '9B2A7F',
    qrUrl:
      'https://ecf.dgii.gov.do/consultatimbre?RncEmisor=131987654&RncComprador=101012345&eNCF=E3100000010&FechaEmision=2026-09-18&MontoTotal=118000.00&CodigoSeguridad=9B2A7F',
    dgiiStatus: 'aceptado',
    dgiiStatusCode: '100',
    dgiiStatusMessage: 'e-CF recibido y validado satisfactoriamente por el validador fiscal DGII. Comprobante con valor fiscal registrado.',
    digitalSignatureDigest: 'SHA256withRSA/4c8d9e2a7b1f3c80a29b4e1f82d09c2a',
    invoiceNumber: 'FAC-2026-0089',
    createdAt: '2026-09-18T10:15:00Z',
    items: [
      {
        id: 'itm-1',
        description: 'Servicio de Deslinde Catastral - Parcela 104-B, Distrito Catastral 06',
        quantity: 1,
        unitPrice: 65000,
        appliesTax: true,
        total: 65000,
      },
      {
        id: 'itm-2',
        description: 'Honorarios Notariales y Legalización de Firmas de Contrato de Venta',
        quantity: 1,
        unitPrice: 35000,
        appliesTax: true,
        total: 35000,
      },
    ],
  },
  {
    id: 'ecf-002',
    eNCF: 'E3100000011',
    ecfType: 'E31',
    rncEmisor: '131987654',
    razonSocialEmisor: 'EMBLEMA NEXUS S.R.L.',
    rncComprador: '130887612',
    razonSocialComprador: 'Inversiones Hoteleras Punta Cana S.R.L.',
    fechaEmision: '2026-09-19',
    fechaVencimientoSecuencia: '2026-12-31',
    montoSubtotal: 240000,
    montoItbis: 43200,
    montoTotal: 283200,
    currency: 'DOP',
    trackId: '7c320a11-e631-4a92-bf39-44d5a9c00421',
    codigoSeguridad: 'F41C02',
    qrUrl:
      'https://ecf.dgii.gov.do/consultatimbre?RncEmisor=131987654&RncComprador=130887612&eNCF=E3100000011&FechaEmision=2026-09-19&MontoTotal=283200.00&CodigoSeguridad=F41C02',
    dgiiStatus: 'aceptado',
    dgiiStatusCode: '100',
    dgiiStatusMessage: 'e-CF aceptado por la DGII. Secuencia y firma digital validadas con éxito.',
    digitalSignatureDigest: 'SHA256withRSA/99a0b12e43ff9981bc098ad23ef112a9',
    invoiceNumber: 'FAC-2026-0091',
    createdAt: '2026-09-19T14:30:00Z',
    items: [
      {
        id: 'itm-3',
        description: 'Auditoría Jurídica Inmobiliaria (Due Diligence) de 4 polígonos turísticos',
        quantity: 1,
        unitPrice: 240000,
        appliesTax: true,
        total: 240000,
      },
    ],
  },
  {
    id: 'ecf-003',
    eNCF: 'E3200000027',
    ecfType: 'E32',
    rncEmisor: '131987654',
    razonSocialEmisor: 'EMBLEMA NEXUS S.R.L.',
    rncComprador: '40219882314',
    razonSocialComprador: 'Lic. Rafael Antonio Marte Peña',
    fechaEmision: '2026-09-20',
    fechaVencimientoSecuencia: '2026-12-31',
    montoSubtotal: 45000,
    montoItbis: 8100,
    montoTotal: 53100,
    currency: 'DOP',
    trackId: '3d91c809-5431-4822-a981-7643bda71288',
    codigoSeguridad: 'A8B1C3',
    qrUrl:
      'https://ecf.dgii.gov.do/consultatimbre?RncEmisor=131987654&RncComprador=40219882314&eNCF=E3200000027&FechaEmision=2026-09-20&MontoTotal=53100.00&CodigoSeguridad=A8B1C3',
    dgiiStatus: 'aceptado',
    dgiiStatusCode: '100',
    dgiiStatusMessage: 'e-CF Consumo aceptado. Verificación de consumidor final conforme.',
    digitalSignatureDigest: 'SHA256withRSA/12cb789dae0943281177af899014bca8',
    invoiceNumber: 'FAC-2026-0094',
    createdAt: '2026-09-20T11:00:00Z',
    items: [
      {
        id: 'itm-4',
        description: 'Constitución de Compañía por Acciones Simplificada (SAS) e inscripción RNC',
        quantity: 1,
        unitPrice: 45000,
        appliesTax: true,
        total: 45000,
      },
    ],
  },
  {
    id: 'ecf-004',
    eNCF: 'E3100000012',
    ecfType: 'E31',
    rncEmisor: '131987654',
    razonSocialEmisor: 'EMBLEMA NEXUS S.R.L.',
    rncComprador: '131009944',
    razonSocialComprador: 'Constructora del Sol Naciente S.R.L.',
    fechaEmision: '2026-09-21',
    fechaVencimientoSecuencia: '2026-12-31',
    montoSubtotal: 80000,
    montoItbis: 14400,
    montoTotal: 94400,
    currency: 'DOP',
    trackId: '992a77f1-8842-49aa-9011-881240cc9145',
    codigoSeguridad: '4D7E2B',
    qrUrl:
      'https://ecf.dgii.gov.do/consultatimbre?RncEmisor=131987654&RncComprador=131009944&eNCF=E3100000012&FechaEmision=2026-09-21&MontoTotal=94400.00&CodigoSeguridad=4D7E2B',
    dgiiStatus: 'en_proceso',
    dgiiStatusCode: '102',
    dgiiStatusMessage: 'Comprobante recibido por el Web Service DGII. En cola de validación asíncrona de sintaxis XML y certificados.',
    digitalSignatureDigest: 'SHA256withRSA/fe884411aacc99008812347711209931',
    createdAt: '2026-09-21T16:45:00Z',
    items: [
      {
        id: 'itm-5',
        description: 'Levantamiento Topográfico Georreferenciado RTK - 12 hectáreas',
        quantity: 1,
        unitPrice: 80000,
        appliesTax: true,
        total: 80000,
      },
    ],
  },
  {
    id: 'ecf-005',
    eNCF: 'E3400000003',
    ecfType: 'E34',
    rncEmisor: '131987654',
    razonSocialEmisor: 'EMBLEMA NEXUS S.R.L.',
    rncComprador: '101012345',
    razonSocialComprador: 'Desarrollos Urbanísticos del Caribe S.A.',
    fechaEmision: '2026-09-22',
    fechaVencimientoSecuencia: '2026-12-31',
    montoSubtotal: 10000,
    montoItbis: 1800,
    montoTotal: 11800,
    currency: 'DOP',
    trackId: '5f1100aa-33bb-44cc-88dd-99ee00112233',
    codigoSeguridad: '8C1F90',
    qrUrl:
      'https://ecf.dgii.gov.do/consultatimbre?RncEmisor=131987654&RncComprador=101012345&eNCF=E3400000003&FechaEmision=2026-09-22&MontoTotal=11800.00&CodigoSeguridad=8C1F90',
    dgiiStatus: 'rechazado',
    dgiiStatusCode: '101',
    dgiiStatusMessage: 'Rechazado por DGII. La Nota de Crédito hace referencia a un comprobante cuya fecha de emisión excede el periodo fiscal admitido sin justificación.',
    dgiiValidationErrors: [
      'Error 4012: El e-NCF modificado reportado no coincide con el balance activo del contribuyente.',
      'Error 5003: Diferencia en el desglose de ITBIS respecto al comprobante original.',
    ],
    digitalSignatureDigest: 'SHA256withRSA/448822001199aaccbbffee1122334455',
    createdAt: '2026-09-22T09:20:00Z',
    items: [
      {
        id: 'itm-6',
        description: 'Ajuste de honorarios por reconsideración catastral parcial',
        quantity: 1,
        unitPrice: 10000,
        appliesTax: true,
        total: 10000,
      },
    ],
  },
  {
    id: 'ecf-006',
    eNCF: 'E4400000002',
    ecfType: 'E44',
    rncEmisor: '131987654',
    razonSocialEmisor: 'EMBLEMA NEXUS S.R.L.',
    rncComprador: '131445566',
    razonSocialComprador: 'Operadora Zona Franca Las Américas S.A.',
    fechaEmision: '2026-09-22',
    fechaVencimientoSecuencia: '2026-12-31',
    montoSubtotal: 150000,
    montoItbis: 0,
    montoTotal: 150000,
    currency: 'DOP',
    trackId: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    codigoSeguridad: '3E9D1A',
    qrUrl:
      'https://ecf.dgii.gov.do/consultatimbre?RncEmisor=131987654&RncComprador=131445566&eNCF=E4400000002&FechaEmision=2026-09-22&MontoTotal=150000.00&CodigoSeguridad=3E9D1A',
    dgiiStatus: 'aceptado',
    dgiiStatusCode: '100',
    dgiiStatusMessage: 'e-CF Régimen Especial validado correctamente. Receptor verificado con exención de ITBIS por Ley 8-90 de Zonas Francas.',
    digitalSignatureDigest: 'SHA256withRSA/aa112233bb445566cc778899dd001122',
    createdAt: '2026-09-22T12:10:00Z',
    items: [
      {
        id: 'itm-7',
        description: 'Servicios de Saneamiento y Refundición de Terrenos Industriales Nave 14',
        quantity: 1,
        unitPrice: 150000,
        appliesTax: false,
        total: 150000,
      },
    ],
  },
];

const INITIAL_RECEIVED_ECFS: ReceivedECF[] = [
  {
    id: 'rec-001',
    eNCF: 'E3100000492',
    ecfType: 'E31',
    rncEmisor: '130889921',
    razonSocialEmisor: 'Geosistemas del Caribe S.R.L.',
    rncComprador: '131987654',
    fechaEmision: '2026-09-17',
    fechaRecepcion: '2026-09-17T11:45:00Z',
    montoSubtotal: 35000,
    montoItbis: 6300,
    montoTotal: 41300,
    currency: 'DOP',
    trackId: '8b193f0a-1120-43aa-a8b2-38e9d1a84f09',
    codigoSeguridad: '7A91D0',
    statusComercial: 'aprobado_comercial',
    acuseReciboEnviado: true,
    fechaAcuseRecibo: '2026-09-17T12:00:00Z',
    items: [
      {
        id: 'rec-itm-1',
        description: 'Calibración, mantenimiento y certificación de estación total Leica TS16',
        quantity: 1,
        unitPrice: 35000,
        appliesTax: true,
        total: 35000,
      },
    ],
  },
  {
    id: 'rec-002',
    eNCF: 'E3100001099',
    ecfType: 'E31',
    rncEmisor: '101994432',
    razonSocialEmisor: 'Notaría Dr. Fernando Gómez & Asoc.',
    rncComprador: '131987654',
    fechaEmision: '2026-09-20',
    fechaRecepcion: '2026-09-20T16:10:00Z',
    montoSubtotal: 25000,
    montoItbis: 4500,
    montoTotal: 29500,
    currency: 'DOP',
    trackId: '6d29aa44-9911-4820-bba1-001928472911',
    codigoSeguridad: 'B32C88',
    statusComercial: 'pendiente_aprobacion',
    acuseReciboEnviado: true,
    fechaAcuseRecibo: '2026-09-20T16:15:00Z',
    items: [
      {
        id: 'rec-itm-2',
        description: 'Protocolización notarial de partición voluntaria de inmueble y compulsa oficial',
        quantity: 1,
        unitPrice: 25000,
        appliesTax: true,
        total: 25000,
      },
    ],
  },
  {
    id: 'rec-003',
    eNCF: 'E3100000812',
    ecfType: 'E31',
    rncEmisor: '102445567',
    razonSocialEmisor: 'Papelería & Suministros Dominicanos S.A.',
    rncComprador: '131987654',
    fechaEmision: '2026-09-21',
    fechaRecepcion: '2026-09-21T09:30:00Z',
    montoSubtotal: 12000,
    montoItbis: 2160,
    montoTotal: 14160,
    currency: 'DOP',
    trackId: '4a1029bb-4411-45aa-9901-772211990022',
    codigoSeguridad: '55E1A9',
    statusComercial: 'pendiente_aprobacion',
    acuseReciboEnviado: false,
    items: [
      {
        id: 'rec-itm-3',
        description: 'Papel especial de plano para plotter, tintas HP DesignJet y carpetas catastrales',
        quantity: 1,
        unitPrice: 12000,
        appliesTax: true,
        total: 12000,
      },
    ],
  },
  {
    id: 'rec-004',
    eNCF: 'E3100000105',
    ecfType: 'E31',
    rncEmisor: '131889901',
    razonSocialEmisor: 'Topografía & Drones del Este S.R.L.',
    rncComprador: '131987654',
    fechaEmision: '2026-09-15',
    fechaRecepcion: '2026-09-15T15:20:00Z',
    montoSubtotal: 48000,
    montoItbis: 8640,
    montoTotal: 56640,
    currency: 'DOP',
    trackId: '11002233-4455-6677-8899-aabbccddeeff',
    codigoSeguridad: 'D90C12',
    statusComercial: 'rechazado_comercial',
    acuseReciboEnviado: true,
    fechaAcuseRecibo: '2026-09-15T15:25:00Z',
    motivoRechazo: 'El servicio facturado de fotogrametría aérea no concuerda con las horas de vuelo ni las coordenadas acordadas en la orden de compra OC-2026-042.',
    items: [
      {
        id: 'rec-itm-4',
        description: 'Vuelo fotogramétrico LiDAR no tripulado sobre sector Verón',
        quantity: 1,
        unitPrice: 48000,
        appliesTax: true,
        total: 48000,
      },
    ],
  },
];

function generateSecurityCode(): string {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateTrackId(): string {
  const hex = (len: number) =>
    Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}

export const useEcfStore = create<EcfState>((set, get) => ({
  issuedEcfs: INITIAL_ISSUED_ECFS,
  receivedEcfs: INITIAL_RECEIVED_ECFS,
  sequences: INITIAL_SEQUENCES,
  config: INITIAL_CONFIG,

  isEmitModalOpen: false,
  emitPrefillData: null,
  selectedEcfForPrint: null,
  isPrintModalOpen: false,
  selectedTrackId: null,
  selectedEcfForTrackId: null,
  isTrackIdModalOpen: false,
  selectedReceivedEcf: null,
  isReceivedDetailOpen: false,

  openEmitModal: (prefill) => {
    set({
      isEmitModalOpen: true,
      emitPrefillData: prefill || null,
    });
  },

  closeEmitModal: () => {
    set({
      isEmitModalOpen: false,
      emitPrefillData: null,
    });
  },

  openPrintModal: (ecf) => {
    set({
      selectedEcfForPrint: ecf,
      isPrintModalOpen: true,
    });
  },

  closePrintModal: () => {
    set({
      selectedEcfForPrint: null,
      isPrintModalOpen: false,
    });
  },

  openTrackIdModal: (trackId, ecf) => {
    set({
      selectedTrackId: trackId,
      selectedEcfForTrackId: ecf || null,
      isTrackIdModalOpen: true,
    });
  },

  closeTrackIdModal: () => {
    set({
      selectedTrackId: null,
      selectedEcfForTrackId: null,
      isTrackIdModalOpen: false,
    });
  },

  openReceivedDetail: (ecf) => {
    set({
      selectedReceivedEcf: ecf,
      isReceivedDetailOpen: true,
    });
  },

  closeReceivedDetail: () => {
    set({
      selectedReceivedEcf: null,
      isReceivedDetailOpen: false,
    });
  },

  emitEcf: (input) => {
    const { sequences, config, issuedEcfs } = get();
    const seq = sequences[input.ecfType];

    if (!seq) {
      throw new Error(`Secuencia no configurada para el tipo ${input.ecfType}`);
    }

    if (seq.currentNumber > seq.endNumber) {
      throw new Error(`La secuencia para ${input.ecfType} ha alcanzado el límite autorizado (${seq.endNumber}). Solicite un nuevo rango a la DGII.`);
    }

    // Formatear e-NCF: Letra + Tipo (2 dígitos) + 8 dígitos del secuencial (total 11 caracteres)
    // Ej: E31 + 00000015 = E3100000015
    const sequenceNumberStr = String(seq.currentNumber).padStart(8, '0');
    const eNCF = `${seq.prefix}${sequenceNumberStr}`;

    // Calcular montos
    let subtotal = 0;
    let itbis = 0;

    const fullItems: ECFItem[] = input.items.map((item, idx) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      if (item.appliesTax) {
        itbis += lineTotal * 0.18;
      }
      return {
        id: `ecf-itm-${Date.now()}-${idx}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        appliesTax: item.appliesTax,
        total: lineTotal,
      };
    });

    const total = subtotal + itbis;
    const trackId = generateTrackId();
    const codigoSeguridad = generateSecurityCode();
    const today = new Date().toISOString().split('T')[0];

    const qrUrl = `https://ecf.dgii.gov.do/consultatimbre?RncEmisor=${config.rnc}&RncComprador=${input.rncComprador}&eNCF=${eNCF}&FechaEmision=${today}&MontoTotal=${total.toFixed(2)}&CodigoSeguridad=${codigoSeguridad}`;

    const newEcf: IssuedECF = {
      id: `ecf-${Date.now()}`,
      eNCF,
      ecfType: input.ecfType,
      rncEmisor: config.rnc,
      razonSocialEmisor: config.razonSocial,
      rncComprador: input.rncComprador,
      razonSocialComprador: input.razonSocialComprador,
      fechaEmision: today,
      fechaVencimientoSecuencia: seq.expirationDate,
      montoSubtotal: subtotal,
      montoItbis: itbis,
      montoTotal: total,
      currency: input.currency || 'DOP',
      exchangeRate: input.exchangeRate,
      trackId,
      codigoSeguridad,
      qrUrl,
      dgiiStatus: 'aceptado',
      dgiiStatusCode: '100',
      dgiiStatusMessage: 'e-CF timbrado y aceptado con éxito en los Web Services de la DGII. Documento fiscal válido.',
      digitalSignatureDigest: `SHA256withRSA/${generateTrackId().replace(/-/g, '').slice(0, 32)}`,
      items: fullItems,
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      createdAt: new Date().toISOString(),
    };

    // Incrementar secuencia
    const updatedSequences = {
      ...sequences,
      [input.ecfType]: {
        ...seq,
        currentNumber: seq.currentNumber + 1,
      },
    };

    set({
      issuedEcfs: [newEcf, ...issuedEcfs],
      sequences: updatedSequences,
    });

    return newEcf;
  },

  checkTrackIdStatus: (trackId: string) => {
    const { issuedEcfs } = get();
    const found = issuedEcfs.find((e) => e.trackId === trackId);
    const now = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (found) {
      return {
        trackId,
        statusCode: found.dgiiStatusCode,
        status: found.dgiiStatus,
        message: found.dgiiStatusMessage,
        lastChecked: now,
      };
    }

    return {
      trackId,
      statusCode: '100',
      status: 'aceptado',
      message: 'TrackId consultado con éxito en la plataforma de recepción DGII. El comprobante está timbrado.',
      lastChecked: now,
    };
  },

  approveReceivedEcf: (id: string) => {
    set((state) => ({
      receivedEcfs: state.receivedEcfs.map((item) =>
        item.id === id ? { ...item, statusComercial: 'aprobado_comercial', motivoRechazo: undefined } : item
      ),
    }));
  },

  rejectReceivedEcf: (id: string, reason: string) => {
    set((state) => ({
      receivedEcfs: state.receivedEcfs.map((item) =>
        item.id === id
          ? {
              ...item,
              statusComercial: 'rechazado_comercial',
              motivoRechazo: reason || 'Discrepancia comercial o fiscal en la factura recibida.',
            }
          : item
      ),
    }));
  },

  acknowledgeReceivedEcf: (id: string) => {
    set((state) => ({
      receivedEcfs: state.receivedEcfs.map((item) =>
        item.id === id
          ? {
              ...item,
              acuseReciboEnviado: true,
              fechaAcuseRecibo: new Date().toISOString(),
            }
          : item
      ),
    }));
  },

  setEnvironment: (env: ECFEnvironment) => {
    set((state) => ({
      config: {
        ...state.config,
        ambiente: env,
      },
    }));
  },

  updateConfig: (partial) => {
    set((state) => ({
      config: {
        ...state.config,
        ...partial,
        certificado: {
          ...state.config.certificado,
          ...(partial.certificado || {}),
        },
      },
    }));
  },

  updateSequence: (type, partial) => {
    set((state) => ({
      sequences: {
        ...state.sequences,
        [type]: {
          ...state.sequences[type],
          ...partial,
        },
      },
    }));
  },

  simulateDgiiStatusUpdate: (ecfId, newStatus) => {
    set((state) => ({
      issuedEcfs: state.issuedEcfs.map((e) => {
        if (e.id !== ecfId) return e;
        const code = newStatus === 'aceptado' ? '100' : newStatus === 'en_proceso' ? '102' : '101';
        const msg =
          newStatus === 'aceptado'
            ? 'Validación exitosa ante la DGII.'
            : newStatus === 'en_proceso'
            ? 'En cola de procesamiento asíncrono.'
            : 'Rechazado por inconsistencia en los catálogos fiscales.';
        return {
          ...e,
          dgiiStatus: newStatus,
          dgiiStatusCode: code,
          dgiiStatusMessage: msg,
        };
      }),
    }));
  },
}));
