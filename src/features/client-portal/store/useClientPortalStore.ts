import { create } from 'zustand';
import {
  ClientPortalUser,
  ClientCase,
  ClientInvoice,
  DocumentRequirement,
  PublicInquiry,
  PortalAccessCredential,
} from '../types';

interface ClientPortalState {
  // Autenticación de Cliente en Portal
  isAuthenticated: boolean;
  currentUser: ClientPortalUser | null;
  activeCaseId: string | null;

  // Colecciones de Datos
  cases: ClientCase[];
  invoices: ClientInvoice[];
  requirements: DocumentRequirement[];
  inquiries: PublicInquiry[];
  credentials: PortalAccessCredential[];

  // Estados de Modales y Vistas
  isUploadModalOpen: boolean;
  activeRequirement: DocumentRequirement | null;
  isEcfPrintModalOpen: boolean;
  activeInvoice: ClientInvoice | null;
  isAccessModalOpen: boolean;
  selectedClientForAccess: { id: string; name: string } | null;

  // Acciones de Autenticación
  loginWithPin: (pin: string) => { success: boolean; message: string };
  loginWithMagicToken: (token: string) => { success: boolean; message: string };
  loginDemo: (clientId?: string) => void;
  logout: () => void;

  // Acciones de Gestión de Casos
  setActiveCaseId: (caseId: string | null) => void;
  getPublicCaseByTrackingCode: (code: string) => ClientCase | null;

  // Acciones de Documentos
  openUploadModal: (requirement: DocumentRequirement) => void;
  closeUploadModal: () => void;
  uploadDocumentForRequirement: (requirementId: string, file: { name: string; size: number }) => void;

  // Acciones de Facturas e-CF
  openEcfPrintModal: (invoice: ClientInvoice) => void;
  closeEcfPrintModal: () => void;

  // Acciones Administrativas (Acceso a Portal)
  openAccessModal: (client: { id: string; name: string }) => void;
  closeAccessModal: () => void;
  generateAccessCredential: (clientId: string, clientName: string) => PortalAccessCredential;
  revokeAccessCredential: (clientId: string) => void;
  getAccessCredentialByClientId: (clientId: string) => PortalAccessCredential | undefined;

  // Acciones de Consulta Pública
  submitPublicInquiry: (data: Omit<PublicInquiry, 'id' | 'trackingNumber' | 'createdAt' | 'status'>) => string;
}

const INITIAL_USERS: ClientPortalUser[] = [];
const INITIAL_CASES: ClientCase[] = [];
const INITIAL_INVOICES: ClientInvoice[] = [];
const INITIAL_REQUIREMENTS: DocumentRequirement[] = [];
const INITIAL_INQUIRIES: PublicInquiry[] = [];
const INITIAL_CREDENTIALS: PortalAccessCredential[] = [];

export const useClientPortalStore = create<ClientPortalState>((set, get) => ({
  isAuthenticated: false,
  currentUser: null,
  activeCaseId: null,

  cases: INITIAL_CASES,
  invoices: INITIAL_INVOICES,
  requirements: INITIAL_REQUIREMENTS,
  inquiries: INITIAL_INQUIRIES,
  credentials: INITIAL_CREDENTIALS,

  isUploadModalOpen: false,
  activeRequirement: null,
  isEcfPrintModalOpen: false,
  activeInvoice: null,
  isAccessModalOpen: false,
  selectedClientForAccess: null,

  // Autenticación por PIN
  loginWithPin: (pin: string) => {
    const cred = get().credentials.find((c) => c.pin === pin.trim());
    if (!cred) {
      return { success: false, message: 'El código PIN ingresado es inválido o no existe.' };
    }
    if (!cred.isActive) {
      return { success: false, message: 'El acceso al portal para este cliente ha sido revocado.' };
    }
    const user: ClientPortalUser = {
      id: cred.clientId,
      name: cred.clientName,
      rncOrCedula: '',
      email: '',
      phone: '',
      companyName: cred.clientName,
      assignedCaseIds: [],
      portalPin: cred.pin,
      magicToken: cred.magicToken,
      status: 'active',
    };
    set({
      isAuthenticated: true,
      currentUser: user,
      activeCaseId: null,
    });
    return { success: true, message: `Bienvenido, ${user.name}.` };
  },

  // Autenticación por Magic Link Token
  loginWithMagicToken: (token: string) => {
    const cred = get().credentials.find((c) => c.magicToken === token.trim());
    if (!cred) {
      return { success: false, message: 'El enlace de acceso (Magic Link) es inválido o ha caducado.' };
    }
    if (!cred.isActive) {
      return { success: false, message: 'El acceso asignado a este enlace se encuentra suspendido.' };
    }
    const user: ClientPortalUser = {
      id: cred.clientId,
      name: cred.clientName,
      rncOrCedula: '',
      email: '',
      phone: '',
      companyName: cred.clientName,
      assignedCaseIds: [],
      portalPin: cred.pin,
      magicToken: cred.magicToken,
      status: 'active',
    };
    set({
      isAuthenticated: true,
      currentUser: user,
      activeCaseId: null,
    });
    return { success: true, message: `Acceso concedido mediante Magic Link. Bienvenido, ${user.name}.` };
  },

  loginDemo: () => {},

  logout: () => {
    set({
      isAuthenticated: false,
      currentUser: null,
      activeCaseId: null,
    });
  },

  setActiveCaseId: (caseId) => set({ activeCaseId: caseId }),

  // Búsqueda de expediente público por código de rastreo (ej: TRK-2026-X89B2)
  getPublicCaseByTrackingCode: (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = get().cases.find((c) => c.trackingCode.toUpperCase() === cleanCode);
    return found || null;
  },

  // Manejo de Modal de Subida de Documentos
  openUploadModal: (requirement) => {
    set({ isUploadModalOpen: true, activeRequirement: requirement });
  },

  closeUploadModal: () => {
    set({ isUploadModalOpen: false, activeRequirement: null });
  },

  uploadDocumentForRequirement: (requirementId, file) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })} - ${now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}`;

    set((state) => ({
      requirements: state.requirements.map((req) =>
        req.id === requirementId
          ? {
              ...req,
              status: 'under_review',
              uploadedFile: {
                name: file.name,
                size: file.size,
                uploadedAt: formattedDate,
                url: '#',
              },
              reviewNotes: 'Documento recibido y puesto en cola de revisión por el equipo técnico.',
            }
          : req
      ),
      isUploadModalOpen: false,
      activeRequirement: null,
    }));
  },

  // Modal de Representación Impresa e-CF
  openEcfPrintModal: (invoice) => {
    set({ isEcfPrintModalOpen: true, activeInvoice: invoice });
  },

  closeEcfPrintModal: () => {
    set({ isEcfPrintModalOpen: false, activeInvoice: null });
  },

  // Modal de Gestión Administrativa de Acceso a Portal
  openAccessModal: (client) => {
    set({
      isAccessModalOpen: true,
      selectedClientForAccess: client,
    });
  },

  closeAccessModal: () => {
    set({
      isAccessModalOpen: false,
      selectedClientForAccess: null,
    });
  },

  generateAccessCredential: (clientId, clientName) => {
    // Generar PIN aleatorio de 6 dígitos numéricos
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const randomToken = `mag-${Math.random().toString(36).substring(2, 8)}-${clientId.toLowerCase()}`;
    const magicLinkUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://emblemanexus.com'}/portal/login?token=${randomToken}`;

    const newCredential: PortalAccessCredential = {
      clientId,
      clientName,
      pin: randomPin,
      magicToken: randomToken,
      magicLinkUrl,
      isActive: true,
      expiresAt: '31 de diciembre de 2026',
      createdAt: new Date().toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    };

    set((state) => {
      const filtered = state.credentials.filter((c) => c.clientId !== clientId);
      return { credentials: [...filtered, newCredential] };
    });

    return newCredential;
  },

  revokeAccessCredential: (clientId) => {
    set((state) => ({
      credentials: state.credentials.map((c) =>
        c.clientId === clientId ? { ...c, isActive: false } : c
      ),
    }));
  },

  getAccessCredentialByClientId: (clientId) => {
    return get().credentials.find((c) => c.clientId === clientId);
  },

  // Envío de Formulario Público de Consulta
  submitPublicInquiry: (data) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `REQ-2026-${randomNum}`;

    const newInquiry: PublicInquiry = {
      ...data,
      id: `inq-${Date.now()}`,
      trackingNumber,
      createdAt: new Date().toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      status: 'received',
    };

    set((state) => ({
      inquiries: [newInquiry, ...state.inquiries],
    }));

    return trackingNumber;
  },
}));
