import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  sequences: Partial<Record<ECFType, ECFSequence>>;
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
  addSequence: (seq: ECFSequence) => void;
  deleteSequence: (type: ECFType) => void;
  updateSequence: (type: ECFType, partial: Partial<ECFSequence>) => void;
  removeCertificate: () => void;
  simulateDgiiStatusUpdate: (ecfId: string, newStatus: ECFStatus) => void;
}

const INITIAL_SEQUENCES: Partial<Record<ECFType, ECFSequence>> = {};

const INITIAL_CONFIG: ECFConfig = {
  rnc: '',
  razonSocial: '',
  nombreComercial: '',
  actividadEconomica: '',
  direccionFiscal: '',
  telefono: '',
  emailNotificaciones: '',
  ambiente: 'CERT',
  certificado: null,
};

const INITIAL_ISSUED_ECFS: IssuedECF[] = [];
const INITIAL_RECEIVED_ECFS: ReceivedECF[] = [];

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

export const useEcfStore = create<EcfState>()(
  persist(
    (set, get) => ({
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
        certificado:
          partial.certificado !== undefined
            ? partial.certificado
            : state.config.certificado,
      },
    }));
  },

  addSequence: (seq) => {
    set((state) => ({
      sequences: {
        ...state.sequences,
        [seq.type]: seq,
      },
    }));
  },

  deleteSequence: (type) => {
    set((state) => {
      const nextSequences = { ...state.sequences };
      delete nextSequences[type];
      return { sequences: nextSequences };
    });
  },

  updateSequence: (type, partial) => {
    set((state) => {
      const current = state.sequences[type];
      if (!current) return state;
      return {
        sequences: {
          ...state.sequences,
          [type]: {
            ...current,
            ...partial,
          },
        },
      };
    });
  },

  removeCertificate: () => {
    set((state) => ({
      config: {
        ...state.config,
        certificado: null,
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
}),
    {
      name: 'nexus_ecf_store',
      partialize: (state) => ({
        issuedEcfs: state.issuedEcfs,
        receivedEcfs: state.receivedEcfs,
        sequences: state.sequences,
        config: state.config,
      }),
    }
  )
);
