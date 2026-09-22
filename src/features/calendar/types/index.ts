export type EventType =
  | 'audiencia'
  | 'cita_cliente'
  | 'mensura_campo'
  | 'vencimiento_plazo'
  | 'reunion_interna'
  | 'otro';

export type EventStatus =
  | 'programado'
  | 'en_proceso'
  | 'completado'
  | 'suspendido'
  | 'cancelado'
  | 'reprogramado';

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: EventType;
  startTime: string; // ISO string or YYYY-MM-DDTHH:mm
  endTime: string;   // ISO string or YYYY-MM-DDTHH:mm
  allDay?: boolean;
  location?: string;
  virtualMeetingUrl?: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  description?: string;
  reminderMinutes?: number;
  status?: EventStatus;
}
