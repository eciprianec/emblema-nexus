import { create } from 'zustand';
import { CalendarEvent, EventType } from '../types';

interface CalendarState {
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  isModalOpen: boolean;
  filterType: EventType | 'todos';
  addEvent: (event: Omit<CalendarEvent, 'id'>) => CalendarEvent;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  openCreateModal: (defaultDate?: string) => void;
  openEditModal: (event: CalendarEvent) => void;
  closeModal: () => void;
  setFilterType: (type: EventType | 'todos') => void;
}

const getInitialEvents = (): CalendarEvent[] => {
  const now = new Date();
  const formatIsoDate = (d: Date, hours: number, minutes: number) => {
    const copy = new Date(d);
    copy.setHours(hours, minutes, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${copy.getFullYear()}-${pad(copy.getMonth() + 1)}-${pad(copy.getDate())}T${pad(hours)}:${pad(minutes)}`;
  };

  const dayOffset = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  return [
    {
      id: 'evt-1',
      title: 'Audiencia de Fondo - Demanda Civil',
      eventType: 'audiencia',
      startTime: formatIsoDate(dayOffset(1), 9, 0),
      endTime: formatIsoDate(dayOffset(1), 11, 30),
      allDay: false,
      location: 'Palacio de Justicia, 2da Sala Cámara Civil y Comercial',
      virtualMeetingUrl: '',
      caseId: 'case_1',
      caseNumber: 'LEG-2024-0001',
      caseTitle: 'Divorcio y Partición de Bienes',
      description: 'Presentación de pruebas testimoniales y conclusiones sobre liquidación de comunidad conyugal.',
      reminderMinutes: 60,
      status: 'programado',
    },
    {
      id: 'evt-2',
      title: 'Vencimiento: Plazo de Réplica de Conclusiones',
      eventType: 'vencimiento_plazo',
      startTime: formatIsoDate(dayOffset(2), 16, 0),
      endTime: formatIsoDate(dayOffset(2), 17, 0),
      allDay: true,
      location: 'Secretaría del Tribunal de Tierras',
      virtualMeetingUrl: '',
      caseId: 'case_2',
      caseNumber: 'AGR-2024-0042',
      caseTitle: 'Deslinde y Subdivisión Parcela 15',
      description: 'Último día hábil para depositar escrito de réplica formal según providencia del tribunal.',
      reminderMinutes: 1440, // 24 hours
      status: 'programado',
    },
    {
      id: 'evt-3',
      title: 'Mensura de Campo y Levantamiento GPS',
      eventType: 'mensura_campo',
      startTime: formatIsoDate(dayOffset(4), 8, 30),
      endTime: formatIsoDate(dayOffset(4), 14, 0),
      allDay: false,
      location: 'Hato Mayor del Rey, Parcela 112-B',
      virtualMeetingUrl: '',
      caseId: 'case_2',
      caseNumber: 'AGR-2024-0042',
      caseTitle: 'Deslinde y Subdivisión Parcela 15',
      description: 'Fijación de hitos georreferenciados con presencia del agrimensor habilitado y colindantes citados.',
      reminderMinutes: 120,
      status: 'programado',
    },
    {
      id: 'evt-4',
      title: 'Cita con Cliente: Firma de Poder Notarial',
      eventType: 'cita_cliente',
      startTime: formatIsoDate(dayOffset(0), 15, 0),
      endTime: formatIsoDate(dayOffset(0), 16, 0),
      allDay: false,
      location: 'Oficina Principal - Sala de Juntas B',
      virtualMeetingUrl: '',
      caseId: 'case_3',
      caseNumber: 'INM-2024-0018',
      caseTitle: 'Regularización Título Turístico',
      description: 'Firma de poder especial de representación para gestión registral ante el Registro de Títulos.',
      reminderMinutes: 30,
      status: 'programado',
    },
    {
      id: 'evt-5',
      title: 'Reunión de Coordinación de Litigios',
      eventType: 'reunion_interna',
      startTime: formatIsoDate(dayOffset(3), 10, 0),
      endTime: formatIsoDate(dayOffset(3), 11, 0),
      allDay: false,
      location: 'Virtual / Google Meet',
      virtualMeetingUrl: 'https://meet.google.com/emb-nexus-lit',
      caseId: undefined,
      description: 'Revisión semanal de audiencias de la quincena y asignación de expedientes urgentes.',
      reminderMinutes: 15,
      status: 'programado',
    },
    {
      id: 'evt-6',
      title: 'Vencimiento: Pago de Impuestos DGII Transferencia',
      eventType: 'vencimiento_plazo',
      startTime: formatIsoDate(dayOffset(6), 18, 0),
      endTime: formatIsoDate(dayOffset(6), 18, 0),
      allDay: true,
      location: 'Administración Local DGII Los Próceres',
      caseId: 'case_3',
      caseNumber: 'INM-2024-0018',
      caseTitle: 'Regularización Título Turístico',
      description: 'Vencimiento de autorización de pago para liquidación de 3% impuesto a la transferencia inmobiliaria.',
      reminderMinutes: 1440,
      status: 'programado',
    },
    {
      id: 'evt-7',
      title: 'Audiencia de Conciliación Preliminar',
      eventType: 'audiencia',
      startTime: formatIsoDate(dayOffset(9), 11, 0),
      endTime: formatIsoDate(dayOffset(9), 12, 30),
      allDay: false,
      location: 'Juzgado de Paz Especial de Tránsito',
      caseId: 'case_4',
      caseNumber: 'LEG-2024-0105',
      caseTitle: 'Reclamación de Daños y Perjuicios',
      description: 'Comparecencia personal de las partes aseguradas y abogados apoderados.',
      reminderMinutes: 120,
      status: 'programado',
    }
  ];
};

export const useCalendarStore = create<CalendarState>((set) => ({
  events: getInitialEvents(),
  selectedEvent: null,
  isModalOpen: false,
  filterType: 'todos',

  addEvent: (eventData) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `evt-${Date.now()}`,
      status: eventData.status || 'programado',
    };
    set((state) => ({
      events: [...state.events, newEvent],
      isModalOpen: false,
      selectedEvent: null,
    }));
    return newEvent;
  },

  updateEvent: (id, partial) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...partial } : e)),
      isModalOpen: false,
      selectedEvent: null,
    }));
  },

  deleteEvent: (id) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
      isModalOpen: false,
      selectedEvent: null,
    }));
  },

  openCreateModal: (defaultDate) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = defaultDate || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    
    set({
      selectedEvent: {
        id: '',
        title: '',
        eventType: 'audiencia',
        startTime: `${dateStr}T09:00`,
        endTime: `${dateStr}T10:00`,
        allDay: false,
        location: '',
        virtualMeetingUrl: '',
        caseId: '',
        caseNumber: '',
        caseTitle: '',
        description: '',
        reminderMinutes: 30,
        status: 'programado',
      },
      isModalOpen: true,
    });
  },

  openEditModal: (event) => {
    set({
      selectedEvent: { ...event },
      isModalOpen: true,
    });
  },

  closeModal: () => {
    set({
      isModalOpen: false,
      selectedEvent: null,
    });
  },

  setFilterType: (filterType) => {
    set({ filterType });
  },
}));
