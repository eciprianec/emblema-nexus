import "server-only";

import { createClient } from "@/lib/supabase/server";
import { notificationService } from "@/services/notifications/NotificationService";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type CalendarEventType =
  | "audiencia"
  | "cita_cliente"
  | "mensura_campo"
  | "vencimiento_plazo"
  | "reunion_interna"
  | "otro";

export type CalendarEventStatus =
  | "programado"
  | "en_proceso"
  | "completado"
  | "suspendido"
  | "cancelado"
  | "reprogramado";

export type AttendeeStatus = "pendiente" | "confirmado" | "rechazado";

export type CalendarEventRow = Database["public"]["Tables"]["calendar_events"]["Row"];
export type CalendarEventInsert = Database["public"]["Tables"]["calendar_events"]["Insert"];
export type CalendarEventUpdate = Database["public"]["Tables"]["calendar_events"]["Update"];

export type CalendarAttendeeRow = Database["public"]["Tables"]["calendar_event_attendees"]["Row"];

export interface CreateCalendarEventInput {
  title: string;
  description?: string | null;
  eventType?: CalendarEventType;
  event_type?: CalendarEventType;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  allDay?: boolean | null;
  all_day?: boolean | null;
  location?: string | null;
  virtualMeetingUrl?: string | null;
  virtual_meeting_url?: string | null;
  status?: CalendarEventStatus;
  caseId?: string | null;
  case_id?: string | null;
  clientId?: string | null;
  client_id?: string | null;
  reminderMinutes?: number | null;
  reminder_minutes?: number | null;
  createdBy?: string | null;
  created_by?: string | null;
}

export interface GetEventsOptions {
  startDate?: string;
  endDate?: string;
  caseId?: string;
  clientId?: string;
  eventType?: string;
  status?: string;
  userId?: string;
}

export interface CalendarEventWithDetails extends CalendarEventRow {
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  client?: {
    id: string;
    client_type: string;
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
  } | null;
  attendees?: Array<{
    id: string;
    event_id: string;
    user_id: string;
    status: AttendeeStatus;
    is_organizer: boolean | null;
    created_at: string;
    profile?: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    } | null;
  }>;
}

export interface ScheduleConflict {
  userId: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  eventId: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  eventType: CalendarEventType;
}

const EVENT_SELECT_QUERY = `
  *,
  case:cases(id, case_number, title),
  client:clients(id, client_type, first_name, last_name, business_name),
  attendees:calendar_event_attendees(
    id,
    event_id,
    user_id,
    status,
    is_organizer,
    created_at,
    profile:profiles(id, first_name, last_name, avatar_url)
  )
`;

export class CalendarService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  private formatEvent(item: any): CalendarEventWithDetails {
    return {
      ...item,
      case: item.case ?? item.cases ?? null,
      client: item.client ?? item.clients ?? null,
      attendees: (item.attendees ?? item.calendar_event_attendees ?? []).map((att: any) => ({
        ...att,
        profile: att.profile ?? att.profiles ?? null,
      })),
    };
  }

  /**
   * Lista eventos con filtros opcionales (rango de fechas, caso, cliente, tipo, estado o usuario).
   */
  async getEvents(
    companyId: string,
    options?: GetEventsOptions
  ): Promise<CalendarEventWithDetails[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("calendar_events" as any) as any)
      .select(EVENT_SELECT_QUERY)
      .eq("company_id", companyId);

    // Filtro por usuario (creador o asistente)
    if (options?.userId) {
      const { data: attendeeRecords } = await (supabase
        .from("calendar_event_attendees" as any) as any)
        .select("event_id")
        .eq("user_id", options.userId);

      const eventIds = (attendeeRecords || []).map((r: any) => r.event_id);

      if (eventIds.length > 0) {
        query = query.or(`created_by.eq.${options.userId},id.in.(${eventIds.join(",")})`);
      } else {
        query = query.eq("created_by", options.userId);
      }
    }

    // Filtro por fechas
    if (options?.startDate && options?.endDate) {
      query = query.lte("start_time", options.endDate).gte("end_time", options.startDate);
    } else if (options?.startDate) {
      query = query.gte("start_time", options.startDate);
    } else if (options?.endDate) {
      query = query.lte("end_time", options.endDate);
    }

    // Filtros adicionales
    if (options?.caseId) {
      query = query.eq("case_id", options.caseId);
    }
    if (options?.clientId) {
      query = query.eq("client_id", options.clientId);
    }
    if (options?.eventType) {
      query = query.eq("event_type", options.eventType);
    }
    if (options?.status) {
      query = query.eq("status", options.status);
    }

    query = query.order("start_time", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener eventos del calendario:", error);
      throw error;
    }

    return (data || []).map((item: any) => this.formatEvent(item));
  }

  /**
   * Obtiene el detalle completo de un evento por ID.
   */
  async getEventById(
    companyId: string,
    id: string
  ): Promise<CalendarEventWithDetails | null> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase
      .from("calendar_events" as any) as any)
      .select(EVENT_SELECT_QUERY)
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener evento por ID:", error);
      throw error;
    }

    if (!data) return null;

    return this.formatEvent(data);
  }

  /**
   * Crea un nuevo evento de calendario con sus asistentes y notificaciones automáticas.
   */
  async createEvent(
    companyId: string,
    event: CreateCalendarEventInput,
    attendeeUserIds?: string[]
  ): Promise<CalendarEventWithDetails> {
    const supabase = await this.getClient();

    const startTime = event.start_time ?? event.startTime;
    const endTime = event.end_time ?? event.endTime;

    if (!event.title || !startTime || !endTime) {
      throw new Error("El título y las fechas de inicio y fin son obligatorios para el evento.");
    }

    const insertPayload: CalendarEventInsert = {
      company_id: companyId,
      title: event.title.trim(),
      description: event.description ?? null,
      event_type: (event.event_type ?? event.eventType ?? "otro") as any,
      start_time: startTime,
      end_time: endTime,
      all_day: event.all_day ?? event.allDay ?? false,
      location: event.location ?? null,
      virtual_meeting_url: event.virtual_meeting_url ?? event.virtualMeetingUrl ?? null,
      status: (event.status ?? "programado") as any,
      case_id: event.case_id ?? event.caseId ?? null,
      client_id: event.client_id ?? event.clientId ?? null,
      reminder_minutes: event.reminder_minutes ?? event.reminderMinutes ?? 60,
      created_by: event.created_by ?? event.createdBy ?? null,
    };

    const { data: createdEvent, error: insertError } = await (supabase
      .from("calendar_events" as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Error al insertar evento en calendar_events:", insertError);
      throw insertError;
    }

    // Insertar asistentes si se especificaron
    if (attendeeUserIds && attendeeUserIds.length > 0) {
      const uniqueUserIds = Array.from(new Set(attendeeUserIds.filter(Boolean)));

      if (uniqueUserIds.length > 0) {
        const organizerId = createdEvent.created_by;
        const attendeesToInsert = uniqueUserIds.map((userId) => ({
          event_id: createdEvent.id,
          user_id: userId,
          status: (userId === organizerId ? "confirmado" : "pendiente") as AttendeeStatus,
          is_organizer: userId === organizerId,
        }));

        const { error: attError } = await (supabase
          .from("calendar_event_attendees" as any) as any)
          .insert(attendeesToInsert);

        if (attError) {
          console.error("Error al registrar asistentes del evento:", attError);
        }

        // Notificar a cada asistente asignado (excepto al creador/organizador)
        for (const userId of uniqueUserIds) {
          if (userId === organizerId) continue;
          try {
            await notificationService.createNotification({
              companyId,
              userId,
              title: `Invitación a evento: ${createdEvent.title}`,
              message: `Has sido invitado al evento "${createdEvent.title}" programado para el ${new Date(createdEvent.start_time).toLocaleString("es-DO")}.`,
              notificationType: createdEvent.event_type === "audiencia"
                ? "audiencia"
                : createdEvent.event_type === "vencimiento_plazo"
                ? "plazo"
                : "sistema",
              entityType: "calendar_event",
              entityId: createdEvent.id,
            });
          } catch (notifErr) {
            console.error(`Error enviando notificación al asistente ${userId}:`, notifErr);
          }
        }
      }
    }

    const result = await this.getEventById(companyId, createdEvent.id);
    if (!result) {
      throw new Error("No se pudo recuperar el evento recién creado.");
    }

    return result;
  }

  /**
   * Actualiza un evento existente y opcionalmente su lista de asistentes.
   */
  async updateEvent(
    companyId: string,
    id: string,
    event: Partial<CreateCalendarEventInput>,
    attendeeUserIds?: string[]
  ): Promise<CalendarEventWithDetails> {
    const supabase = await this.getClient();

    const updatePayload: CalendarEventUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (event.title !== undefined) updatePayload.title = event.title.trim();
    if (event.description !== undefined) updatePayload.description = event.description;
    if (event.event_type !== undefined || event.eventType !== undefined) {
      updatePayload.event_type = (event.event_type ?? event.eventType) as any;
    }
    if (event.start_time !== undefined || event.startTime !== undefined) {
      updatePayload.start_time = (event.start_time ?? event.startTime)!;
    }
    if (event.end_time !== undefined || event.endTime !== undefined) {
      updatePayload.end_time = (event.end_time ?? event.endTime)!;
    }
    if (event.all_day !== undefined || event.allDay !== undefined) {
      updatePayload.all_day = event.all_day ?? event.allDay;
    }
    if (event.location !== undefined) updatePayload.location = event.location;
    if (event.virtual_meeting_url !== undefined || event.virtualMeetingUrl !== undefined) {
      updatePayload.virtual_meeting_url = event.virtual_meeting_url ?? event.virtualMeetingUrl;
    }
    if (event.status !== undefined) updatePayload.status = event.status as any;
    if (event.case_id !== undefined || event.caseId !== undefined) {
      updatePayload.case_id = event.case_id ?? event.caseId;
    }
    if (event.client_id !== undefined || event.clientId !== undefined) {
      updatePayload.client_id = event.client_id ?? event.clientId;
    }
    if (event.reminder_minutes !== undefined || event.reminderMinutes !== undefined) {
      updatePayload.reminder_minutes = event.reminder_minutes ?? event.reminderMinutes;
    }

    const { data: updatedEvent, error: updateError } = await (supabase
      .from("calendar_events" as any) as any)
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error al actualizar evento:", updateError);
      throw updateError;
    }

    // Gestionar lista de asistentes si se suministró explícitamente
    if (attendeeUserIds !== undefined) {
      const { data: currentAttendees } = await (supabase
        .from("calendar_event_attendees" as any) as any)
        .select("user_id")
        .eq("event_id", id);

      const currentIds = new Set<string>((currentAttendees || []).map((a: any) => a.user_id));
      const targetIds = new Set<string>(attendeeUserIds.filter(Boolean));

      // Asistentes a remover
      const toRemove = Array.from(currentIds).filter((uid) => !targetIds.has(uid));
      if (toRemove.length > 0) {
        await (supabase
          .from("calendar_event_attendees" as any) as any)
          .delete()
          .eq("event_id", id)
          .in("user_id", toRemove);
      }

      // Asistentes a agregar
      const toAdd = Array.from(targetIds).filter((uid) => !currentIds.has(uid));
      if (toAdd.length > 0) {
        const attendeesToInsert = toAdd.map((userId) => ({
          event_id: id,
          user_id: userId,
          status: "pendiente" as AttendeeStatus,
          is_organizer: userId === updatedEvent.created_by,
        }));

        await (supabase
          .from("calendar_event_attendees" as any) as any)
          .insert(attendeesToInsert);

        // Notificar a los nuevos asistentes incorporados
        for (const userId of toAdd) {
          if (userId === updatedEvent.created_by) continue;
          try {
            await notificationService.createNotification({
              companyId,
              userId,
              title: `Asignado a evento: ${updatedEvent.title}`,
              message: `Has sido añadido al evento "${updatedEvent.title}" programado para el ${new Date(updatedEvent.start_time).toLocaleString("es-DO")}.`,
              notificationType: updatedEvent.event_type === "audiencia"
                ? "audiencia"
                : updatedEvent.event_type === "vencimiento_plazo"
                ? "plazo"
                : "sistema",
              entityType: "calendar_event",
              entityId: updatedEvent.id,
            });
          } catch (notifErr) {
            console.error(`Error notificando nuevo asistente ${userId}:`, notifErr);
          }
        }
      }
    }

    const result = await this.getEventById(companyId, id);
    if (!result) {
      throw new Error("No se pudo recuperar el evento actualizado.");
    }

    return result;
  }

  /**
   * Elimina un evento de calendario.
   */
  async deleteEvent(companyId: string, id: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await (supabase
      .from("calendar_events" as any) as any)
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar evento:", error);
      throw error;
    }
  }

  /**
   * Obtiene los próximos vencimientos y audiencias ordenados por start_time ascendente.
   */
  async getUpcomingDeadlines(
    companyId: string,
    days: number = 30
  ): Promise<CalendarEventWithDetails[]> {
    const supabase = await this.getClient();
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + (days > 0 ? days : 30));

    const { data, error } = await (supabase
      .from("calendar_events" as any) as any)
      .select(EVENT_SELECT_QUERY)
      .eq("company_id", companyId)
      .in("event_type", ["vencimiento_plazo", "audiencia"])
      .not("status", "in", '("cancelado","completado")')
      .gte("start_time", now.toISOString())
      .lte("start_time", future.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error al obtener próximos vencimientos:", error);
      throw error;
    }

    return (data || []).map((item: any) => this.formatEvent(item));
  }

  /**
   * Detecta solapamientos de horario para una lista de usuarios en un intervalo de tiempo.
   */
  async checkConflicts(
    companyId: string,
    userIds: string[],
    startTime: string,
    endTime: string,
    excludeEventId?: string
  ): Promise<ScheduleConflict[]> {
    if (!userIds || userIds.length === 0) return [];

    const supabase = await this.getClient();

    // 1. Consultar eventos de la empresa en el rango de fechas que no estén cancelados
    let eventsQuery = (supabase.from("calendar_events" as any) as any)
      .select("id, title, event_type, start_time, end_time, created_by")
      .eq("company_id", companyId)
      .neq("status", "cancelado")
      .lt("start_time", endTime)
      .gt("end_time", startTime);

    if (excludeEventId) {
      eventsQuery = eventsQuery.neq("id", excludeEventId);
    }

    const { data: overlappingEvents, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.error("Error al verificar conflictos en calendar_events:", eventsError);
      throw eventsError;
    }

    if (!overlappingEvents || overlappingEvents.length === 0) {
      return [];
    }

    const eventIds = overlappingEvents.map((e: any) => e.id);
    const eventsMap = new Map<string, any>(overlappingEvents.map((e: any) => [e.id, e]));

    // 2. Comprobar si los usuarios dados son asistentes de alguno de estos eventos
    const { data: attendees, error: attError } = await (supabase
      .from("calendar_event_attendees" as any) as any)
      .select(`
        event_id,
        user_id,
        profile:profiles(id, first_name, last_name)
      `)
      .in("event_id", eventIds)
      .in("user_id", userIds)
      .neq("status", "rechazado");

    if (attError) {
      console.error("Error al buscar asistentes para verificación de conflictos:", attError);
      throw attError;
    }

    const conflicts: ScheduleConflict[] = [];

    // Mapear asistentes con conflicto
    for (const att of (attendees || [])) {
      const ev = eventsMap.get(att.event_id);
      if (ev) {
        conflicts.push({
          userId: att.user_id,
          user: att.profile ?? att.profiles ?? null,
          eventId: ev.id,
          eventTitle: ev.title,
          startTime: ev.start_time,
          endTime: ev.end_time,
          eventType: ev.event_type,
        });
      }
    }

    // Comprobar también si algún usuario es el creador del evento
    for (const ev of overlappingEvents) {
      if (ev.created_by && userIds.includes(ev.created_by)) {
        const alreadyAdded = conflicts.some(
          (c) => c.eventId === ev.id && c.userId === ev.created_by
        );
        if (!alreadyAdded) {
          conflicts.push({
            userId: ev.created_by,
            eventId: ev.id,
            eventTitle: ev.title,
            startTime: ev.start_time,
            endTime: ev.end_time,
            eventType: ev.event_type,
          });
        }
      }
    }

    return conflicts;
  }
}

export const calendarService = new CalendarService();
