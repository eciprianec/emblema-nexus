import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

const initialEquipment: TopographicEquipment[] = [];
const initialBrigade: FieldBrigadeMember[] = [];

const initialParcels: Parcel[] = [];
const initialCadastralFiles: CadastralFile[] = [];
const initialFieldSessions: FieldSession[] = [];

export const useSurveyStore = create<SurveyState>()(
  persist(
    (set, get) => ({
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
}),
    {
      name: 'nexus_survey_store',
      partialize: (state) => ({
        parcels: state.parcels,
        cadastralFiles: state.cadastralFiles,
        fieldSessions: state.fieldSessions,
        equipmentList: state.equipmentList,
        brigadePersonnel: state.brigadePersonnel,
      }),
    }
  )
);
