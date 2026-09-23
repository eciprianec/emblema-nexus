import { create } from 'zustand';
import {
  Parcel,
  CadastralFile,
  FieldSession,
  TopographicEquipment,
  FieldBrigadeMember,
  DNMCStage,
  CoordinatePoint,
  sqmToTareas,
} from '../types';

interface SurveyState {
  // Entidades principales
  parcels: Parcel[];
  cadastralFiles: CadastralFile[];
  fieldSessions: FieldSession[];
  equipmentList: TopographicEquipment[];
  brigadePersonnel: FieldBrigadeMember[];

  // Estados de Modales y Selección
  isParcelCreateOpen: boolean;
  isParcelDetailOpen: boolean;
  selectedParcel: Parcel | null;

  isCadastralCreateOpen: boolean;
  selectedCadastralFile: CadastralFile | null;

  isCoordinateImporterOpen: boolean;
  targetParcelIdForImport: string | null;

  isFieldSessionCreateOpen: boolean;
  isFieldSessionDetailOpen: boolean;
  selectedFieldSession: FieldSession | null;

  // Acciones de Parcelas
  openParcelCreateModal: () => void;
  closeParcelCreateModal: () => void;
  openParcelDetailModal: (parcel: Parcel) => void;
  closeParcelDetailModal: () => void;
  createParcel: (parcelData: Omit<Parcel, 'id' | 'createdAt' | 'updatedAt' | 'areaTareas'> & { areaTareas?: number }) => Parcel;
  updateParcel: (id: string, updates: Partial<Parcel>) => void;
  deleteParcel: (id: string) => void;

  // Acciones de Expedientes DNMC
  openCadastralCreateModal: (defaultParcelId?: string) => void;
  closeCadastralCreateModal: () => void;
  createCadastralFile: (fileData: Omit<CadastralFile, 'id' | 'createdAt' | 'updatedAt'>) => CadastralFile;
  updateCadastralFile: (id: string, updates: Partial<CadastralFile>) => void;
  advanceCadastralStage: (id: string, nextStage: DNMCStage) => void;
  resolveObservation: (id: string, resolutionDate: string) => void;

  // Acciones de Importación de Coordenadas
  openCoordinateImporterModal: (targetParcelId?: string) => void;
  closeCoordinateImporterModal: () => void;
  importCoordinatesToParcel: (parcelId: string, points: CoordinatePoint[]) => void;

  // Acciones de Jornadas de Campo
  openFieldSessionCreateModal: (defaultParcelId?: string) => void;
  closeFieldSessionCreateModal: () => void;
  openFieldSessionDetailModal: (session: FieldSession) => void;
  closeFieldSessionDetailModal: () => void;
  createFieldSession: (sessionData: Omit<FieldSession, 'id' | 'createdAt'>) => FieldSession;
  updateFieldSession: (id: string, updates: Partial<FieldSession>) => void;
}

// Datos iniciales representativos para una firma topográfica dominicana
const initialEquipment: TopographicEquipment[] = [
  {
    id: 'eq-1',
    name: 'Trimble R12i GNSS Receiver (RTK / IMU)',
    type: 'GPS_GNSS',
    serialNumber: '6140J12044',
    calibrationExpiry: '2027-04-15',
    status: 'OPERATIVO',
  },
  {
    id: 'eq-2',
    name: 'Leica TS06 Plus 2" Estación Total',
    type: 'ESTACION_TOTAL',
    serialNumber: '843102-RD',
    calibrationExpiry: '2026-11-30',
    status: 'OPERATIVO',
  },
  {
    id: 'eq-3',
    name: 'Sokkia CX-105 Estación Total',
    type: 'ESTACION_TOTAL',
    serialNumber: '932115',
    calibrationExpiry: '2027-01-10',
    status: 'OPERATIVO',
  },
  {
    id: 'eq-4',
    name: 'Colector de Datos Trimble TSC7',
    type: 'COLECTOR_DATOS',
    serialNumber: 'TC-77401',
    calibrationExpiry: '2027-09-01',
    status: 'OPERATIVO',
  },
  {
    id: 'eq-5',
    name: 'Nivel Óptico Topcon AT-B4 Automático',
    type: 'NIVEL_OPTICO',
    serialNumber: 'TP-109284',
    calibrationExpiry: '2026-12-15',
    status: 'OPERATIVO',
  },
];

const initialBrigade: FieldBrigadeMember[] = [
  {
    id: 'brig-1',
    name: 'Lic. Rafael Mejía, Agrimensor',
    role: 'AGRIMENSOR_LIDER',
    phone: '809-555-0192',
  },
  {
    id: 'brig-2',
    name: 'Ing. Manuel Santana, Agrimensor',
    role: 'AGRIMENSOR_LIDER',
    phone: '829-555-0341',
  },
  {
    id: 'brig-3',
    name: 'Carlos Mendoza',
    role: 'TOPOGRAFO',
    phone: '809-555-0812',
  },
  {
    id: 'brig-4',
    name: 'José Almonte',
    role: 'CADENERO',
    phone: '829-555-0988',
  },
  {
    id: 'brig-5',
    name: 'Radhamés Rosario',
    role: 'CHOFER_LOGISTICA',
    phone: '809-555-0456',
  },
];

const initialParcels: Parcel[] = [
  {
    id: 'parc-1',
    designation: 'Parcela 15-Ref D.C. 03',
    cadastralDistrict: '03',
    portion: '15-Ref',
    province: 'La Altagracia',
    municipality: 'Higüey',
    sector: 'Bávaro - Punta Cana',
    areaSqm: 45280,
    areaTareas: sqmToTareas(45280), // 72.00 tareas
    boundaries: {
      north: 'Parcela 14 D.C. 03 (Inversiones Turísticas Punta Cana S.A.)',
      south: 'Calle de Servidumbre y Parcela 16-A D.C. 03',
      east: 'Bulevar Turístico del Este (Franja de Retiro 25m MOPC)',
      west: 'Parcela 15-Resto D.C. 03 (Sucesión De Los Santos)',
    },
    vertices: [
      { id: 'v-1', pointNumber: 'P1', easting: 541150.25, northing: 2054210.12, elevation: 24.5, code: 'HITO_CONCRETO', description: 'Mojón de hormigón N-O' },
      { id: 'v-2', pointNumber: 'P2', easting: 541420.78, northing: 2054320.15, elevation: 26.1, code: 'VARILLA', description: 'Vértice Noreste en lindero' },
      { id: 'v-3', pointNumber: 'P3', easting: 541510.43, northing: 2054110.85, elevation: 22.8, code: 'HITO_CONCRETO', description: 'Mojón convalidado Bulevar' },
      { id: 'v-4', pointNumber: 'P4', easting: 541340.6, northing: 2053980.2, elevation: 20.9, code: 'ESQ_MURO', description: 'Esquina muro perimetral sur' },
      { id: 'v-5', pointNumber: 'P5', easting: 541180.1, northing: 2054040.5, elevation: 21.6, code: 'HITO_CONCRETO', description: 'Mojón Suroeste servidumbre' },
    ],
    status: 'APROBADA_DNMC',
    legalStatus: 'Aprobación Técnica Definitiva DNMC / En trámite de Título',
    titleNumber: 'Matrícula No. 0400039281',
    cadastralFileId: 'cad-1',
    caseId: 'LEG-2024-0001',
    clientName: 'Desarrollos Hoteleros del Este SAS',
    surveyorName: 'Lic. Rafael Mejía',
    surveyorCodia: 'CODIA #14592',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-03-12T14:30:00Z',
  },
  {
    id: 'parc-2',
    designation: 'Parcela 102-B D.C. 06',
    cadastralDistrict: '06',
    solar: '12',
    block: '405',
    province: 'Santo Domingo',
    municipality: 'Santo Domingo Este',
    sector: 'Alma Rosa I',
    areaSqm: 1250,
    areaTareas: sqmToTareas(1250), // 1.99 tareas
    boundaries: {
      north: 'Solar 11 Mza 405 (Familia Encarnación Pimentel)',
      south: 'Calle Los Palmeros No. 24',
      east: 'Solar 14 Mza 405 (Comercial del Este SRL)',
      west: 'Calle 4ta y servidumbre técnica EDEESTE',
    },
    vertices: [
      { id: 'v-6', pointNumber: 'P1', easting: 405120.3, northing: 2042150.6, elevation: 38.2, code: 'CLAVO', description: 'Clavo de acero en borde acera' },
      { id: 'v-7', pointNumber: 'P2', easting: 405145.3, northing: 2042150.6, elevation: 38.3, code: 'VARILLA', description: 'Varilla corrugada empotrada' },
      { id: 'v-8', pointNumber: 'P3', easting: 405145.3, northing: 2042100.6, elevation: 38.0, code: 'HITO_CONCRETO', description: 'Mojón hito lindero este' },
      { id: 'v-9', pointNumber: 'P4', easting: 405120.3, northing: 2042100.6, elevation: 37.9, code: 'CLAVO', description: 'Clavo de control esquina suroeste' },
    ],
    status: 'OBSERVADA',
    legalStatus: 'Subdivisión con Oficio de Observación DNMC',
    titleNumber: 'Matrícula No. 0100492810',
    cadastralFileId: 'cad-2',
    caseId: 'LEG-2024-0002',
    clientName: 'Inmobiliaria Alma Rosa CxA',
    surveyorName: 'Ing. Manuel Santana',
    surveyorCodia: 'CODIA #18230',
    createdAt: '2026-02-05T10:15:00Z',
    updatedAt: '2026-03-18T16:45:00Z',
  },
  {
    id: 'parc-3',
    designation: 'Parcela 88 D.C. 01',
    cadastralDistrict: '01',
    portion: '88-A',
    province: 'Santiago',
    municipality: 'Santiago de los Caballeros',
    sector: 'Gurabo',
    areaSqm: 18400,
    areaTareas: sqmToTareas(18400), // 29.26 tareas
    boundaries: {
      north: 'Arroyo Gurabo (Riberas dominio público hidráulico) y Sucesores Martínez',
      south: 'Carretera Luperón Km 4.5',
      east: 'Parcela 89 D.C. 01 (Agrícola del Cibao SRL)',
      west: 'Parcela 87 D.C. 01 (Herederos Tavárez)',
    },
    vertices: [
      { id: 'v-10', pointNumber: 'P1', easting: 336210.1, northing: 2148150.4, elevation: 185.0, code: 'HITO_CONCRETO', description: 'Mojón de concreto margen arroyo' },
      { id: 'v-11', pointNumber: 'P2', easting: 336380.5, northing: 2148220.8, elevation: 189.5, code: 'VARILLA', description: 'Varilla en vértice noreste' },
      { id: 'v-12', pointNumber: 'P3', easting: 336440.2, northing: 2148090.2, elevation: 195.2, code: 'HITO_CONCRETO', description: 'Mojón hito frente Carretera Luperón' },
      { id: 'v-13', pointNumber: 'P4', easting: 336270.8, northing: 2148020.1, elevation: 191.0, code: 'ESQ_MURO', description: 'Vértice muro lindero oeste' },
    ],
    status: 'EN_MENSURA',
    legalStatus: 'Saneamiento Catastral ante Tribunal de Tierras de Jurisdicción Original',
    titleNumber: 'Expediente Tribunal No. 2025-00912',
    cadastralFileId: 'cad-3',
    caseId: 'LEG-2024-0003',
    clientName: 'Agropecuaria Gurabo SAS',
    surveyorName: 'Ing. Patricia Peña',
    surveyorCodia: 'CODIA #09841',
    createdAt: '2025-11-20T11:00:00Z',
    updatedAt: '2026-03-01T08:30:00Z',
  },
];

const initialCadastralFiles: CadastralFile[] = [
  {
    id: 'cad-1',
    fileNumber: 'DNMC-2026-004521',
    operationType: 'DESLINDE',
    stage: 'APROBADO',
    regional: 'REGIONAL_ESTE',
    surveyorName: 'Lic. Rafael Mejía',
    surveyorCodia: 'CODIA #14592',
    parcelId: 'parc-1',
    parcelDesignation: 'Parcela 15-Ref D.C. 03 (Higüey)',
    caseId: 'LEG-2024-0001',
    clientName: 'Desarrollos Hoteleros del Este SAS',
    startDate: '2026-01-15',
    submissionDate: '2026-02-10',
    approvalDate: '2026-03-12',
    newspaperNoticeDate: '2026-01-20',
    newspaperName: 'Listín Diario',
    objectionPeriodDays: 30,
    objectionDeadline: '2026-02-20',
    notes: 'Plano definitivo aprobado por Dirección Regional de Mensuras Catastrales Dept. Este (El Seibo). Remitido a Registro de Títulos de Higüey para emisión de Certificado de Título.',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-03-12T14:30:00Z',
  },
  {
    id: 'cad-2',
    fileNumber: 'DNMC-2026-008129',
    operationType: 'SUBDIVISION',
    stage: 'OBSERVACIONES',
    regional: 'REGIONAL_CENTRAL',
    surveyorName: 'Ing. Manuel Santana',
    surveyorCodia: 'CODIA #18230',
    parcelId: 'parc-2',
    parcelDesignation: 'Parcela 102-B D.C. 06 (Santo Domingo Este)',
    caseId: 'LEG-2024-0002',
    clientName: 'Inmobiliaria Alma Rosa CxA',
    startDate: '2026-02-01',
    submissionDate: '2026-02-25',
    newspaperNoticeDate: '2026-02-05',
    newspaperName: 'El Día',
    objectionPeriodDays: 30,
    objectionDeadline: '2026-03-08',
    observationNotice: {
      officialNoticeNumber: 'Oficio Obs. No. 2026-1184',
      issueDate: '2026-03-05',
      deadlineDays: 30,
      deadlineDate: '2026-04-05',
      reason: 'Aclarar discrepancia de 0.15m en la colindancia Oeste con la servidumbre de paso EDEESTE y rectificar acta de linderos firmada por colindante Solar 11.',
      isResolved: false,
    },
    notes: 'Requiere subsanación técnica y depósito de addendum cartográfico antes del plazo fatal de 30 días.',
    createdAt: '2026-02-01T09:30:00Z',
    updatedAt: '2026-03-18T16:45:00Z',
  },
  {
    id: 'cad-3',
    fileNumber: 'DNMC-2025-012944',
    operationType: 'SANEAMIENTO',
    stage: 'TRABAJOS_CAMPO',
    regional: 'REGIONAL_NORTE',
    surveyorName: 'Ing. Patricia Peña',
    surveyorCodia: 'CODIA #09841',
    parcelId: 'parc-3',
    parcelDesignation: 'Parcela 88 D.C. 01 (Santiago)',
    caseId: 'LEG-2024-0003',
    clientName: 'Agropecuaria Gurabo SAS',
    startDate: '2025-11-20',
    newspaperNoticeDate: '2025-12-02',
    newspaperName: 'La Información (Santiago)',
    objectionPeriodDays: 30,
    objectionDeadline: '2026-01-08',
    notes: 'Proceso de saneamiento en curso ante el Tribunal de Tierras de Jurisdicción Original de Santiago. Audiencia fijada para fijación de linderos.',
    createdAt: '2025-11-20T11:00:00Z',
    updatedAt: '2026-03-01T08:30:00Z',
  },
];

const initialFieldSessions: FieldSession[] = [
  {
    id: 'fs-1',
    code: 'JC-2026-0042',
    parcelId: 'parc-1',
    parcelDesignation: 'Parcela 15-Ref D.C. 03 (Higüey)',
    sessionDate: '2026-01-22',
    weather: 'Soleado, vientos 12 km/h ESE',
    brigade: [
      initialBrigade[0], // Lic. Rafael Mejía
      initialBrigade[2], // Carlos Mendoza
      initialBrigade[3], // José Almonte
      initialBrigade[4], // Radhamés Rosario
    ],
    equipment: [
      initialEquipment[0], // Trimble R12i GNSS
      initialEquipment[1], // Leica TS06 Plus
      initialEquipment[3], // Colector Trimble TSC7
    ],
    actaLinderos: {
      actNumber: 'AL-2026-0089',
      isSigned: true,
      executionDate: '2026-01-22',
      witnesses: [
        {
          id: 'wit-1',
          name: 'Lic. Fernando Baquero (Apoderado Inversiones Punta Cana)',
          idCard: '001-0982312-4',
          boundaryRelation: 'Colindante Norte (Parcela 14 D.C. 03)',
          status: 'PRESENTE_CONFORME',
          comments: 'Conforme con la ubicación del mojón P1 y P2 de hormigón.',
        },
        {
          id: 'wit-2',
          name: 'Sr. Ramón De Los Santos',
          idCard: '028-0019283-9',
          boundaryRelation: 'Colindante Oeste (Parcela 15-Resto)',
          status: 'PRESENTE_CONFORME',
          comments: 'Firma en conformidad de estacas colocadas.',
        },
      ],
      observations: 'Levantamiento georreferenciado con estación base CORS La Altagracia y RTK Trimble R12i. Precisión horizontal 0.008m, vertical 0.015m.',
    },
    status: 'COMPLETADA',
    notes: 'Acta de linderos firmada sin oposición.',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'fs-2',
    code: 'JC-2026-0045',
    parcelId: 'parc-2',
    parcelDesignation: 'Parcela 102-B D.C. 06 (Santo Domingo Este)',
    sessionDate: '2026-03-24',
    weather: 'Parcialmente nublado',
    brigade: [
      initialBrigade[1], // Ing. Manuel Santana
      initialBrigade[2], // Carlos Mendoza
      initialBrigade[3], // José Almonte
    ],
    equipment: [
      initialEquipment[1], // Leica TS06 Plus
      initialEquipment[4], // Topcon AT-B4
    ],
    actaLinderos: {
      actNumber: 'AL-2026-0112',
      isSigned: false,
      executionDate: '2026-03-24',
      witnesses: [
        {
          id: 'wit-3',
          name: 'Doña Mercedes Encarnación',
          idCard: '001-0456123-1',
          boundaryRelation: 'Colindante Norte (Solar 11)',
          status: 'PRESENTE_CONFORME',
          comments: 'Se coordinó firma de rectificación de lindero.',
        },
        {
          id: 'wit-4',
          name: 'Ing. Fiscalizador EDEESTE',
          idCard: '001-1823901-5',
          boundaryRelation: 'Servidumbre Eléctrica Oeste',
          status: 'PRESENTE_CONFORME',
          comments: 'Verificación de retiro reglamentario.',
        },
      ],
      observations: 'Jornada para subsanar observaciones del oficio DNMC No. 2026-1184.',
    },
    status: 'PROGRAMADA',
    notes: 'Brigada convocada para las 8:00 AM en sitio.',
    createdAt: '2026-03-19T11:00:00Z',
  },
];

export const useSurveyStore = create<SurveyState>((set, get) => ({
  parcels: initialParcels,
  cadastralFiles: initialCadastralFiles,
  fieldSessions: initialFieldSessions,
  equipmentList: initialEquipment,
  brigadePersonnel: initialBrigade,

  // Modales
  isParcelCreateOpen: false,
  isParcelDetailOpen: false,
  selectedParcel: null,

  isCadastralCreateOpen: false,
  selectedCadastralFile: null,

  isCoordinateImporterOpen: false,
  targetParcelIdForImport: null,

  isFieldSessionCreateOpen: false,
  isFieldSessionDetailOpen: false,
  selectedFieldSession: null,

  // Acciones Parcelas
  openParcelCreateModal: () => set({ isParcelCreateOpen: true }),
  closeParcelCreateModal: () => set({ isParcelCreateOpen: false }),

  openParcelDetailModal: (parcel) => set({ isParcelDetailOpen: true, selectedParcel: parcel }),
  closeParcelDetailModal: () => set({ isParcelDetailOpen: false, selectedParcel: null }),

  createParcel: (data) => {
    const areaTareas = data.areaTareas || sqmToTareas(data.areaSqm);
    const newParcel: Parcel = {
      ...data,
      id: `parc-${Date.now()}`,
      areaTareas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      parcels: [newParcel, ...state.parcels],
      isParcelCreateOpen: false,
    }));
    return newParcel;
  },

  updateParcel: (id, updates) => {
    set((state) => ({
      parcels: state.parcels.map((p) => {
        if (p.id !== id) return p;
        const updatedAreaSqm = updates.areaSqm !== undefined ? updates.areaSqm : p.areaSqm;
        const updatedAreaTareas = updates.areaTareas !== undefined 
          ? updates.areaTareas 
          : updates.areaSqm !== undefined 
            ? sqmToTareas(updatedAreaSqm) 
            : p.areaTareas;
        return {
          ...p,
          ...updates,
          areaSqm: updatedAreaSqm,
          areaTareas: updatedAreaTareas,
          updatedAt: new Date().toISOString(),
        };
      }),
      selectedParcel: state.selectedParcel?.id === id
        ? { ...state.selectedParcel, ...updates, updatedAt: new Date().toISOString() }
        : state.selectedParcel,
    }));
  },

  deleteParcel: (id) => {
    set((state) => ({
      parcels: state.parcels.filter((p) => p.id !== id),
      selectedParcel: state.selectedParcel?.id === id ? null : state.selectedParcel,
    }));
  },

  // Acciones Expedientes DNMC
  openCadastralCreateModal: (defaultParcelId) => {
    set({ isCadastralCreateOpen: true });
    if (defaultParcelId) {
      const p = get().parcels.find((item) => item.id === defaultParcelId);
      if (p) {
        // can be used by modal
      }
    }
  },
  closeCadastralCreateModal: () => set({ isCadastralCreateOpen: false }),

  createCadastralFile: (data) => {
    const newFile: CadastralFile = {
      ...data,
      id: `cad-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      cadastralFiles: [newFile, ...state.cadastralFiles],
      isCadastralCreateOpen: false,
      // update parcel link if exists
      parcels: state.parcels.map((p) =>
        p.id === data.parcelId ? { ...p, cadastralFileId: newFile.id } : p
      ),
    }));
    return newFile;
  },

  updateCadastralFile: (id, updates) => {
    set((state) => ({
      cadastralFiles: state.cadastralFiles.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
      selectedCadastralFile: state.selectedCadastralFile?.id === id
        ? { ...state.selectedCadastralFile, ...updates, updatedAt: new Date().toISOString() }
        : state.selectedCadastralFile,
    }));
  },

  advanceCadastralStage: (id, nextStage) => {
    const now = new Date().toISOString().split('T')[0];
    set((state) => ({
      cadastralFiles: state.cadastralFiles.map((c) => {
        if (c.id !== id) return c;
        const updates: Partial<CadastralFile> = {
          stage: nextStage,
          updatedAt: new Date().toISOString(),
        };
        if (nextStage === 'SOMETIDO_DNMC' && !c.submissionDate) {
          updates.submissionDate = now;
        }
        if (nextStage === 'APROBADO' && !c.approvalDate) {
          updates.approvalDate = now;
        }
        return { ...c, ...updates };
      }),
    }));
  },

  resolveObservation: (id, resolutionDate) => {
    set((state) => ({
      cadastralFiles: state.cadastralFiles.map((c) => {
        if (c.id !== id || !c.observationNotice) return c;
        return {
          ...c,
          observationNotice: {
            ...c.observationNotice,
            isResolved: true,
            resolutionDate,
          },
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  // Acciones Importación de Coordenadas
  openCoordinateImporterModal: (targetParcelId) =>
    set({
      isCoordinateImporterOpen: true,
      targetParcelIdForImport: targetParcelId || null,
    }),
  closeCoordinateImporterModal: () =>
    set({
      isCoordinateImporterOpen: false,
      targetParcelIdForImport: null,
    }),

  importCoordinatesToParcel: (parcelId, points) => {
    set((state) => {
      const updatedParcels = state.parcels.map((p) => {
        if (p.id !== parcelId) return p;
        return {
          ...p,
          vertices: points,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        parcels: updatedParcels,
        selectedParcel:
          state.selectedParcel?.id === parcelId
            ? { ...state.selectedParcel, vertices: points, updatedAt: new Date().toISOString() }
            : state.selectedParcel,
        isCoordinateImporterOpen: false,
        targetParcelIdForImport: null,
      };
    });
  },

  // Acciones Jornadas de Campo
  openFieldSessionCreateModal: () => set({ isFieldSessionCreateOpen: true }),
  closeFieldSessionCreateModal: () => set({ isFieldSessionCreateOpen: false }),

  openFieldSessionDetailModal: (session) =>
    set({ isFieldSessionDetailOpen: true, selectedFieldSession: session }),
  closeFieldSessionDetailModal: () =>
    set({ isFieldSessionDetailOpen: false, selectedFieldSession: null }),

  createFieldSession: (data) => {
    const newSession: FieldSession = {
      ...data,
      id: `fs-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      fieldSessions: [newSession, ...state.fieldSessions],
      isFieldSessionCreateOpen: false,
    }));
    return newSession;
  },

  updateFieldSession: (id, updates) => {
    set((state) => ({
      fieldSessions: state.fieldSessions.map((fs) =>
        fs.id === id ? { ...fs, ...updates } : fs
      ),
      selectedFieldSession:
        state.selectedFieldSession?.id === id
          ? { ...state.selectedFieldSession, ...updates }
          : state.selectedFieldSession,
    }));
  },
}));
