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

// Datos de demostración iniciales
const INITIAL_USERS: ClientPortalUser[] = [
  {
    id: 'CLI-001',
    name: 'Ing. Alejandro Morales',
    rncOrCedula: '1-31-89421-4',
    email: 'amorales@inversionescaribenas.do',
    phone: '(809) 555-0142',
    companyName: 'Inversiones Caribeñas SRL',
    assignedCaseIds: ['case-trk-01', 'case-trk-02'],
    portalPin: '202642',
    magicToken: 'mag-98f12a-amorales',
    status: 'active',
  },
  {
    id: 'CLI-002',
    name: 'Dra. María Altagracia Peña',
    rncOrCedula: '001-1829441-2',
    email: 'maria.pena@consultinglegal.com',
    phone: '(809) 555-0199',
    companyName: 'Consultores Peña & Asociados',
    assignedCaseIds: ['case-trk-01'],
    portalPin: '883012',
    magicToken: 'mag-44a19b-mpena',
    status: 'active',
  },
];

const INITIAL_CASES: ClientCase[] = [
  {
    id: 'case-trk-01',
    caseNumber: 'LEG-2026-0042',
    trackingCode: 'TRK-2026-X89B2',
    title: 'Deslinde y Subdivisión Parcela 42-B, Distrito Catastral 03, Higüey',
    category: 'Agrimensura',
    status: 'revision_dnmc',
    statusLabel: 'Expediente en revisión DNMC',
    progressPercentage: 75,
    openedDate: '12 de enero de 2026',
    estimatedEndDate: '30 de mayo de 2026',
    courtOrOffice: 'Dirección Regional de Mensuras Catastrales - Departamento Este',
    cadastralDesignation: 'Distrito Catastral 03, Porción Parcela 42-B, Matrícula 0300049182, Municipio Higüey',
    assignedAttorney: 'Lic. Carlos Manuel Mendoza',
    assignedSurveyor: 'Agrim. Rafael Peña Ramos (CODIA 28419)',
    publicNotes: 'Levantamiento topográfico completado y conforme. Expediente técnico actualmente en calificación por los agrimensores revisores de la Dirección Nacional de Mensuras Catastrales.',
    lastUpdate: '15 de marzo de 2026 - 10:45 AM',
    milestones: [
      {
        id: 'm-1',
        title: 'Recepción e Instrucción del Caso',
        status: 'completed',
        date: '12 Ene 2026',
        institution: 'Emblema Nexus - Departamento Legal',
        description: 'Verificación de títulos, antecedentes registrales y suscripción del contrato de servicios.',
      },
      {
        id: 'm-2',
        title: 'Mensura de campo completada',
        status: 'completed',
        date: '03 Feb 2026',
        institution: 'Dirección Regional de Mensuras Catastrales Este',
        description: 'Levantamiento perimétrico con tecnología GNSS RTK y suscripción de actas de conformidad con colindantes.',
      },
      {
        id: 'm-3',
        title: 'Audiencia fijada y aprobada',
        status: 'completed',
        date: '28 Feb 2026',
        institution: 'Tribunal de Tierras de Jurisdicción Original de Higüey',
        description: 'Audiencia celebrada con dictamen no objetado por la Abogacía del Estado ni colindantes.',
      },
      {
        id: 'm-4',
        title: 'Expediente en revisión DNMC',
        status: 'in_progress',
        date: '15 Mar 2026',
        institution: 'Dirección Nacional de Mensuras Catastrales (DNMC)',
        description: 'Control de calidad cartográfico y validación de coordenadas UTM definitivas.',
        notes: 'En proceso de aprobación técnica final antes del pase al Registro de Títulos.',
      },
      {
        id: 'm-5',
        title: 'Dictamen favorable y Emisión de Título',
        status: 'pending',
        date: null,
        institution: 'Registro de Títulos de La Altagracia',
        description: 'Cancelación de constancia anotada y emisión de Certificado de Título con designación catastral definitiva.',
      },
    ],
  },
  {
    id: 'case-trk-02',
    caseNumber: 'AGR-2026-0118',
    trackingCode: 'TRK-2026-D44K1',
    title: 'Saneamiento y Determinación de Herederos, Parcela 104, Las Terrenas, Samaná',
    category: 'Legal Inmobiliario',
    status: 'audiencia_fijada',
    statusLabel: 'Audiencia fijada',
    progressPercentage: 50,
    openedDate: '20 de noviembre de 2025',
    estimatedEndDate: '15 de julio de 2026',
    courtOrOffice: 'Tribunal de Tierras de Jurisdicción Original de Samaná',
    cadastralDesignation: 'Distrito Catastral 07, Parcela 104, Sector Cosón, Municipio Las Terrenas',
    assignedAttorney: 'Licda. Patricia Valdez',
    assignedSurveyor: 'Agrim. Marcos E. Santana (CODIA 31902)',
    publicNotes: 'Audiencia preliminar fijada para el 18 de abril de 2026. Documentación sucesoral depositada formalmente.',
    lastUpdate: '10 de marzo de 2026 - 03:20 PM',
    milestones: [
      {
        id: 'm-201',
        title: 'Instancia de Inicio y Radicación',
        status: 'completed',
        date: '20 Nov 2025',
        institution: 'Abogado del Estado ante la JI',
        description: 'Solicitud formal de autorización de saneamiento y comprobación de posesión continua y pacífica.',
      },
      {
        id: 'm-202',
        title: 'Mensura de campo completada',
        status: 'completed',
        date: '18 Dic 2025',
        institution: 'Dirección Regional de Mensuras Catastrales Norte',
        description: 'Posicionamiento geodésico de hitos y levantamiento topográfico de la porción reclamada.',
      },
      {
        id: 'm-203',
        title: 'Audiencia fijada',
        status: 'in_progress',
        date: '18 Abr 2026',
        institution: 'Tribunal de Tierras de Samaná',
        description: 'Convocatoria judicial formal a los comparecientes, colindantes y representantes del Estado Dominicano.',
        notes: 'Preparación de memorial de conclusiones por el equipo litigante.',
      },
      {
        id: 'm-204',
        title: 'Expediente en revisión DNMC',
        status: 'pending',
        date: null,
        institution: 'Dirección Nacional de Mensuras Catastrales',
        description: 'Remisión de plano definitivo aprobado luego de la sentencia de saneamiento.',
      },
      {
        id: 'm-205',
        title: 'Dictamen favorable y Sentencia de Adjudicación',
        status: 'pending',
        date: null,
        institution: 'Registro de Títulos de Samaná',
        description: 'Registro de la sentencia de adjudicación y expedición de certificados de títulos saneados.',
      },
    ],
  },
];

const INITIAL_INVOICES: ClientInvoice[] = [
  {
    id: 'inv-portal-01',
    caseId: 'case-trk-01',
    caseNumber: 'LEG-2026-0042',
    invoiceNumber: 'FAC-2026-0089',
    eNcf: 'E3100000045',
    rncEmisor: '1-32-45892-1',
    razonSocialEmisor: 'Emblema Nexus Legal & Survey Group SRL',
    rncComprador: '1-31-89421-4',
    razonSocialComprador: 'Inversiones Caribeñas SRL',
    issueDate: '15 de enero de 2026',
    dueDate: '15 de febrero de 2026',
    currency: 'DOP',
    subtotal: 156779.66,
    itbis: 28220.34,
    total: 185000.0,
    balance: 0.0,
    status: 'paid',
    dgiiStatus: 'Aceptado',
    trackIdDgii: 'TRK-DGII-89214490',
    securityCode: '7A3B9F',
    items: [
      {
        id: 'it-1',
        description: 'Honorarios profesionales: Inicio de proceso de Deslinde y Subdivisión Parcela 42-B Higüey',
        quantity: 1,
        unitPrice: 110169.49,
        total: 110169.49,
      },
      {
        id: 'it-2',
        description: 'Servicios de Agrimensura Georreferenciada con GPS RTK y brigada de campo',
        quantity: 1,
        unitPrice: 46610.17,
        total: 46610.17,
      },
    ],
    paymentReceipts: [
      {
        id: 'rec-01',
        date: '20 de enero de 2026',
        amount: 185000.0,
        paymentMethod: 'Transferencia Bancaria BPD',
        reference: 'TRF-BPD-992100481',
      },
    ],
  },
  {
    id: 'inv-portal-02',
    caseId: 'case-trk-01',
    caseNumber: 'LEG-2026-0042',
    invoiceNumber: 'FAC-2026-0134',
    eNcf: 'E3100000078',
    rncEmisor: '1-32-45892-1',
    razonSocialEmisor: 'Emblema Nexus Legal & Survey Group SRL',
    rncComprador: '1-31-89421-4',
    razonSocialComprador: 'Inversiones Caribeñas SRL',
    issueDate: '02 de marzo de 2026',
    dueDate: '02 de abril de 2026',
    currency: 'DOP',
    subtotal: 203389.83,
    itbis: 36610.17,
    total: 240000.0,
    balance: 95000.0,
    status: 'partially_paid',
    dgiiStatus: 'Aceptado',
    trackIdDgii: 'TRK-DGII-90184411',
    securityCode: '3E91BC',
    items: [
      {
        id: 'it-3',
        description: 'Etapa II: Representación y defensa técnica en Audiencia Tribunal de Tierras y depósito DNMC',
        quantity: 1,
        unitPrice: 203389.83,
        total: 203389.83,
      },
    ],
    paymentReceipts: [
      {
        id: 'rec-02',
        date: '10 de marzo de 2026',
        amount: 145000.0,
        paymentMethod: 'Cheque Certificado Banreservas',
        reference: 'CHK-BR-440219',
      },
    ],
  },
  {
    id: 'inv-portal-03',
    caseId: 'case-trk-02',
    caseNumber: 'AGR-2026-0118',
    invoiceNumber: 'FAC-2026-0165',
    eNcf: 'E3200000012',
    rncEmisor: '1-32-45892-1',
    razonSocialEmisor: 'Emblema Nexus Legal & Survey Group SRL',
    rncComprador: '1-31-89421-4',
    razonSocialComprador: 'Inversiones Caribeñas SRL',
    issueDate: '12 de marzo de 2026',
    dueDate: '27 de marzo de 2026',
    currency: 'USD',
    subtotal: 3500.0,
    itbis: 0.0,
    total: 3500.0,
    balance: 3500.0,
    status: 'pending',
    dgiiStatus: 'Aceptado',
    trackIdDgii: 'TRK-DGII-91200384',
    securityCode: 'F81C92',
    items: [
      {
        id: 'it-4',
        description: 'Dictamen de Saneamiento y Estudio de Títulos Internacional Las Terrenas Samaná',
        quantity: 1,
        unitPrice: 3500.0,
        total: 3500.0,
      },
    ],
    paymentReceipts: [],
  },
];

const INITIAL_REQUIREMENTS: DocumentRequirement[] = [
  {
    id: 'req-01',
    caseId: 'case-trk-01',
    caseNumber: 'LEG-2026-0042',
    caseTitle: 'Deslinde y Subdivisión Parcela 42-B, Higüey',
    title: 'Copia Certificada de Certificado de Título Original',
    description: 'Copia escaneada nítida en color de ambas caras del Certificado de Título o Constancia Anotada expedida por el Registro de Títulos competente.',
    dueDate: '28 de marzo de 2026',
    allowedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 15,
    status: 'pending',
    isUrgent: true,
  },
  {
    id: 'req-02',
    caseId: 'case-trk-01',
    caseNumber: 'LEG-2026-0042',
    caseTitle: 'Deslinde y Subdivisión Parcela 42-B, Higüey',
    title: 'Poder Especial Notarial con Legalización de Firma',
    description: 'Poder otorgado ante Notario Público con número de matrícula de colegio y certificación de firma legalizada en la Procuraduría General.',
    dueDate: '05 de abril de 2026',
    allowedFormats: ['PDF'],
    maxSizeMB: 10,
    status: 'pending',
    isUrgent: false,
  },
  {
    id: 'req-03',
    caseId: 'case-trk-02',
    caseNumber: 'AGR-2026-0118',
    caseTitle: 'Saneamiento Parcela 104, Las Terrenas',
    title: 'Actas del Estado Civil Legalizadas (Nacimiento / Defunción)',
    description: 'Acta de defunción del causante y actas de nacimiento legalizadas en la JCE correspondientes a todos los sucesores declarados.',
    dueDate: '15 de marzo de 2026',
    allowedFormats: ['PDF'],
    maxSizeMB: 25,
    status: 'under_review',
    isUrgent: false,
    uploadedFile: {
      name: 'Actas_Herederos_Morales_LasTerrenas.pdf',
      size: 4982000,
      uploadedAt: '14 de marzo de 2026 - 11:20 AM',
      url: '#',
    },
    reviewNotes: 'Documento en proceso de verificación por el Departamento de Litigios.',
  },
  {
    id: 'req-04',
    caseId: 'case-trk-01',
    caseNumber: 'LEG-2026-0042',
    caseTitle: 'Deslinde Parcela 42-B',
    title: 'Cédula de Identidad del Representante Legal',
    description: 'Cédula de identidad y electoral vigente escaneada por ambos lados.',
    dueDate: '10 de enero de 2026',
    allowedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 5,
    status: 'approved',
    isUrgent: false,
    uploadedFile: {
      name: 'Cedula_Ing_Alejandro_Morales.pdf',
      size: 1120000,
      uploadedAt: '08 de enero de 2026 - 04:15 PM',
      url: '#',
    },
  },
];

const INITIAL_INQUIRIES: PublicInquiry[] = [
  {
    id: 'inq-01',
    trackingNumber: 'REQ-2026-8912',
    fullName: 'Roberto De la Cruz',
    email: 'rdelacruz@grupoconglomerado.com',
    phone: '(809) 555-9123',
    idNumber: '1-30-55412-8',
    serviceType: 'Deslinde y Subdivisión Inmobiliaria',
    location: 'Punta Cana, La Altagracia',
    message: 'Requerimos cotización formal para el deslinde de un polígono de 45,000 m2 con vocación hotelera en Macao.',
    createdAt: '18 de marzo de 2026',
    status: 'in_review',
  },
];

const INITIAL_CREDENTIALS: PortalAccessCredential[] = [
  {
    clientId: 'CLI-001',
    clientName: 'Ing. Alejandro Morales',
    pin: '202642',
    magicToken: 'mag-98f12a-amorales',
    magicLinkUrl: 'https://emblemanexus.com/portal/login?token=mag-98f12a-amorales',
    isActive: true,
    expiresAt: '31 de diciembre de 2026',
    createdAt: '12 de enero de 2026',
  },
  {
    clientId: 'CLI-002',
    clientName: 'Dra. María Altagracia Peña',
    pin: '883012',
    magicToken: 'mag-44a19b-mpena',
    magicLinkUrl: 'https://emblemanexus.com/portal/login?token=mag-44a19b-mpena',
    isActive: true,
    expiresAt: '31 de diciembre de 2026',
    createdAt: '01 de febrero de 2026',
  },
];

export const useClientPortalStore = create<ClientPortalState>((set, get) => ({
  // Estado inicial autenticado por defecto para simular experiencia de cliente demo
  isAuthenticated: true,
  currentUser: INITIAL_USERS[0],
  activeCaseId: 'case-trk-01',

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
    const user = INITIAL_USERS.find((u) => u.portalPin === pin.trim());
    if (!user) {
      return { success: false, message: 'El código PIN ingresado es inválido o ha expirado.' };
    }
    if (user.status === 'revoked') {
      return { success: false, message: 'El acceso al portal para este cliente ha sido revocado.' };
    }
    set({
      isAuthenticated: true,
      currentUser: user,
      activeCaseId: user.assignedCaseIds[0] || null,
    });
    return { success: true, message: `Bienvenido, ${user.name}.` };
  },

  // Autenticación por Magic Link Token
  loginWithMagicToken: (token: string) => {
    const user = INITIAL_USERS.find((u) => u.magicToken === token.trim());
    if (!user) {
      return { success: false, message: 'El enlace de acceso (Magic Link) es inválido o ha caducado.' };
    }
    if (user.status === 'revoked') {
      return { success: false, message: 'El acceso asignado a este enlace se encuentra suspendido.' };
    }
    set({
      isAuthenticated: true,
      currentUser: user,
      activeCaseId: user.assignedCaseIds[0] || null,
    });
    return { success: true, message: `Acceso concedido mediante Magic Link. Bienvenido, ${user.name}.` };
  },

  loginDemo: (clientId = 'CLI-001') => {
    const user = INITIAL_USERS.find((u) => u.id === clientId) || INITIAL_USERS[0];
    set({
      isAuthenticated: true,
      currentUser: user,
      activeCaseId: user.assignedCaseIds[0] || null,
    });
  },

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
