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
} from '../types';

interface EcfState {
  // Datos principales
  issuedEcfs: IssuedECF[];
  receivedEcfs: ReceivedECF[];
  sequences: Partial<Record<ECFType, ECFSequence>>;
  config: ECFConfig;

  // Estado de modales y vistas
  selectedEcfForPrint: IssuedECF | null;
  isPrintModalOpen: boolean;
  selectedTrackId: string | null;
  selectedEcfForTrackId: IssuedECF | null;
  isTrackIdModalOpen: boolean;
  selectedReceivedEcf: ReceivedECF | null;
  isReceivedDetailOpen: boolean;

  // Acciones
  openPrintModal: (ecf: IssuedECF) => void;
  closePrintModal: () => void;
  openTrackIdModal: (trackId: string, ecf?: IssuedECF) => void;
  closeTrackIdModal: () => void;
  openReceivedDetail: (ecf: ReceivedECF) => void;
  closeReceivedDetail: () => void;

  // Operaciones e-CF
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

export const useEcfStore = create<EcfState>()(
  persist(
    (set, get) => ({
  issuedEcfs: INITIAL_ISSUED_ECFS,
  receivedEcfs: INITIAL_RECEIVED_ECFS,
  sequences: INITIAL_SEQUENCES,
  config: INITIAL_CONFIG,

  selectedEcfForPrint: null,
  isPrintModalOpen: false,
  selectedTrackId: null,
  selectedEcfForTrackId: null,
  isTrackIdModalOpen: false,
  selectedReceivedEcf: null,
  isReceivedDetailOpen: false,

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
