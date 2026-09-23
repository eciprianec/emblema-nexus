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

const getInitialEvents = (): CalendarEvent[] => [];

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
