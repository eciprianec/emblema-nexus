import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Case,
  CaseArea,
  CaseStatus,
  CaseParticipant,
  CaseTimelineEvent,
  CreateCaseInput,
  UpdateCaseInput,
} from '../types';

interface CaseState {
  cases: Case[];
  selectedCase: Case | null;
  searchQuery: string;
  areaFilter: string;
  statusFilter: string;

  // Actions
  addCase: (input: CreateCaseInput) => Case;
  updateCase: (id: string, input: UpdateCaseInput) => void;
  deleteCase: (id: string) => void;
  getCaseById: (id: string) => Case | undefined;
  getCasesByClientId: (clientId: string) => Case[];
  advanceStage: (id: string) => void;
  updateCaseStatus: (id: string, status: CaseStatus) => void;
  addTimelineEvent: (id: string, event: Omit<CaseTimelineEvent, 'id' | 'date'>) => void;
  addParticipant: (id: string, participant: Omit<CaseParticipant, 'id'>) => void;
  removeParticipant: (id: string, participantId: string) => void;

  setSearchQuery: (query: string) => void;
  setAreaFilter: (area: string) => void;
  setStatusFilter: (status: string) => void;
}

function generateCaseNumber(area: CaseArea, existingCases: Case[]): string {
  const prefix = area === 'LEGAL' ? 'LEG' : area === 'AGRIMENSURA' ? 'AGR' : 'INM';
  const year = new Date().getFullYear();
  const casesInArea = existingCases.filter((c) => c.area === area);
  const nextSeq = String(casesInArea.length + 1).padStart(4, '0');
  return `${prefix}-${year}-${nextSeq}`;
}

export const useCaseStore = create<CaseState>()(
  persist(
    (set, get) => ({
      cases: [],
      selectedCase: null,
      searchQuery: '',
      areaFilter: 'TODAS',
      statusFilter: 'TODOS',

      addCase: (input) => {
        const now = new Date();
        const nowIso = now.toISOString();
        const formattedDate = now.toLocaleDateString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const caseNumber = generateCaseNumber(input.area, get().cases);

        const initialTimeline: CaseTimelineEvent[] = [
          {
            id: `evt-${Date.now()}-01`,
            type: 'CREATION',
            title: 'Expediente Aperturado',
            desc: `Registro inicial del expediente con número ${caseNumber}. Asignado a ${input.responsable}.`,
            date: formattedDate,
          },
        ];

        const initialParticipants: CaseParticipant[] = [
          {
            id: `part-${Date.now()}-cl`,
            name: input.clientName,
            role: 'Cliente Titular',
            contact: input.clienteId,
          },
          {
            id: `part-${Date.now()}-resp`,
            name: input.responsable,
            role: 'Responsable del Caso',
            contact: input.responsableId,
          },
          ...(input.participants || []),
        ];

        const newCase: Case = {
          id: `case-${Date.now()}`,
          numero: caseNumber,
          titulo: input.titulo,
          area: input.area,
          tipo: input.tipo || 'Trámite General',
          clienteId: input.clienteId,
          clientName: input.clientName,
          responsableId: input.responsableId,
          responsable: input.responsable,
          supervisorId: input.supervisorId,
          prioridad: input.prioridad || 'MEDIA',
          estado: input.estado || 'EN_PROCESO',
          descripcion: input.descripcion || '',
          stage: 1,
          participants: initialParticipants,
          timeline: initialTimeline,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        set((state) => ({
          cases: [newCase, ...state.cases],
        }));

        return newCase;
      },

      updateCase: (id, input) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id ? { ...c, ...input, updatedAt: nowIso } : c
          ),
          selectedCase:
            state.selectedCase?.id === id
              ? { ...state.selectedCase, ...input, updatedAt: nowIso }
              : state.selectedCase,
        }));
      },

      deleteCase: (id) => {
        set((state) => ({
          cases: state.cases.filter((c) => c.id !== id),
          selectedCase: state.selectedCase?.id === id ? null : state.selectedCase,
        }));
      },

      getCaseById: (id) => {
        return get().cases.find((c) => c.id === id || c.numero === id);
      },

      getCasesByClientId: (clientId) => {
        return get().cases.filter((c) => c.clienteId === clientId);
      },

      advanceStage: (id) => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        set((state) => {
          const current = state.cases.find((c) => c.id === id);
          if (!current) return state;

          const nextStage = Math.min(current.stage + 1, 5);
          const newEvent: CaseTimelineEvent = {
            id: `evt-${Date.now()}`,
            type: 'STAGE_CHANGE',
            title: `Avance a Etapa ${nextStage}`,
            desc: `El flujo del expediente avanzó a la fase #${nextStage}.`,
            date: formattedDate,
          };

          const updatedCase: Case = {
            ...current,
            stage: nextStage,
            estado: nextStage === 5 ? 'COMPLETADO' : current.estado,
            timeline: [newEvent, ...current.timeline],
            updatedAt: now.toISOString(),
          };

          return {
            cases: state.cases.map((c) => (c.id === id ? updatedCase : c)),
            selectedCase: state.selectedCase?.id === id ? updatedCase : state.selectedCase,
          };
        });
      },

      updateCaseStatus: (id, status) => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        set((state) => {
          const current = state.cases.find((c) => c.id === id);
          if (!current) return state;

          const newEvent: CaseTimelineEvent = {
            id: `evt-${Date.now()}`,
            type: 'NOTE',
            title: `Estado modificado a ${status}`,
            desc: `El estado del expediente fue actualizado manualmente.`,
            date: formattedDate,
          };

          const updatedCase: Case = {
            ...current,
            estado: status,
            timeline: [newEvent, ...current.timeline],
            updatedAt: now.toISOString(),
          };

          return {
            cases: state.cases.map((c) => (c.id === id ? updatedCase : c)),
            selectedCase: state.selectedCase?.id === id ? updatedCase : state.selectedCase,
          };
        });
      },

      addTimelineEvent: (id, event) => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const newEvent: CaseTimelineEvent = {
          id: `evt-${Date.now()}`,
          ...event,
          date: formattedDate,
        };

        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id ? { ...c, timeline: [newEvent, ...c.timeline], updatedAt: now.toISOString() } : c
          ),
          selectedCase:
            state.selectedCase?.id === id
              ? { ...state.selectedCase, timeline: [newEvent, ...state.selectedCase.timeline], updatedAt: now.toISOString() }
              : state.selectedCase,
        }));
      },

      addParticipant: (id, participant) => {
        const newPart: CaseParticipant = {
          id: `part-${Date.now()}`,
          ...participant,
        };

        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id ? { ...c, participants: [...c.participants, newPart] } : c
          ),
          selectedCase:
            state.selectedCase?.id === id
              ? { ...state.selectedCase, participants: [...state.selectedCase.participants, newPart] }
              : state.selectedCase,
        }));
      },

      removeParticipant: (id, participantId) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id ? { ...c, participants: c.participants.filter((p) => p.id !== participantId) } : c
          ),
          selectedCase:
            state.selectedCase?.id === id
              ? { ...state.selectedCase, participants: state.selectedCase.participants.filter((p) => p.id !== participantId) }
              : state.selectedCase,
        }));
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setAreaFilter: (area) => set({ areaFilter: area }),
      setStatusFilter: (status) => set({ statusFilter: status }),
    }),
    {
      name: 'nexus_cases_store',
    }
  )
);
