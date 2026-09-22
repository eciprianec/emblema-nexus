import "server-only";

import { createClient } from "@/lib/supabase/server";
import { notificationService } from "@/services/notifications/NotificationService";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type TaskPriority = "baja" | "normal" | "alta" | "urgente";
export type TaskStatus =
  | "pendiente"
  | "en_proceso"
  | "en_revision"
  | "completado"
  | "cancelado";

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  caseId?: string | null;
  case_id?: string | null;
  stageInstanceId?: string | null;
  stage_instance_id?: string | null;
  responsibleId?: string | null;
  responsible_id?: string | null;
  supervisorId?: string | null;
  supervisor_id?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  due_date?: string | null;
  completedAt?: string | null;
  completed_at?: string | null;
  checklist?: TaskChecklistItem[] | null;
  notes?: string | null;
  createdBy?: string | null;
  created_by?: string | null;
}

export interface GetTasksFilters {
  caseId?: string;
  responsibleId?: string;
  status?: string;
  priority?: string;
  search?: string;
}

export interface TaskWithDetails extends TaskRow {
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  responsible?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  supervisor?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
}

export interface TasksSummary {
  total: number;
  pendientes: number;
  enProceso: number;
  enRevision: number;
  completadas: number;
  canceladas: number;
  vencidas: number;
  // Aliases en inglés para interoperabilidad
  pending: number;
  inProgress: number;
  inReview: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

const TASK_SELECT_QUERY = `
  *,
  case:cases(id, case_number, title),
  responsible:profiles!tasks_responsible_id_fkey(id, first_name, last_name, avatar_url),
  supervisor:profiles!tasks_supervisor_id_fkey(id, first_name, last_name, avatar_url)
`;

export class TaskService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  private formatTask(item: any): TaskWithDetails {
    return {
      ...item,
      case: item.case ?? item.cases ?? null,
      responsible: item.responsible ?? item.profiles ?? null,
      supervisor: item.supervisor ?? null,
    };
  }

  /**
   * Helper que ejecuta una consulta con relaciones y cuenta con fallback en caso de
   * discrepancias de esquema en PostgREST.
   */
  private async fetchTasksWithRelations(
    supabase: any,
    companyId: string,
    applyFilters: (query: any) => any
  ): Promise<TaskWithDetails[]> {
    try {
      const initialQuery = applyFilters(
        (supabase.from("tasks" as any) as any)
          .select(TASK_SELECT_QUERY)
          .eq("company_id", companyId)
      );

      const { data, error } = await initialQuery;
      if (error) throw error;
      return (data || []).map((t: any) => this.formatTask(t));
    } catch (err: any) {
      // Fallback seguro si la sintaxis de embed de claves foráneas no es reconocida
      const isEmbedError =
        err?.message?.includes("relationship") ||
        err?.message?.includes("embed") ||
        err?.message?.includes("fkey") ||
        err?.code === "PGRST200";

      if (isEmbedError) {
        return await this.fetchTasksFallback(supabase, companyId, applyFilters);
      }
      throw err;
    }
  }

  private async fetchTasksFallback(
    supabase: any,
    companyId: string,
    applyFilters: (query: any) => any
  ): Promise<TaskWithDetails[]> {
    const rawQuery = applyFilters(
      (supabase.from("tasks" as any) as any)
        .select("*")
        .eq("company_id", companyId)
    );

    const { data: rawTasks, error } = await rawQuery;
    if (error) {
      console.error("Error al obtener tareas en fallback:", error);
      throw error;
    }

    if (!rawTasks || rawTasks.length === 0) return [];

    // Cargar casos vinculados
    const caseIds = Array.from(
      new Set(rawTasks.map((t: any) => t.case_id).filter(Boolean))
    );
    const casesMap = new Map<string, any>();
    if (caseIds.length > 0) {
      const { data: casesData } = await (supabase.from("cases" as any) as any)
        .select("id, case_number, title")
        .in("id", caseIds);
      (casesData || []).forEach((c: any) => casesMap.set(c.id, c));
    }

    // Cargar perfiles de usuarios vinculados
    const userIds = Array.from(
      new Set(
        rawTasks
          .flatMap((t: any) => [t.responsible_id, t.supervisor_id])
          .filter(Boolean)
      )
    );
    const profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profilesData } = await (supabase.from("profiles" as any) as any)
        .select("id, first_name, last_name, avatar_url")
        .in("id", userIds);
      (profilesData || []).forEach((p: any) => profilesMap.set(p.id, p));
    }

    return rawTasks.map((t: any) => ({
      ...t,
      case: t.case_id ? casesMap.get(t.case_id) ?? null : null,
      responsible: t.responsible_id ? profilesMap.get(t.responsible_id) ?? null : null,
      supervisor: t.supervisor_id ? profilesMap.get(t.supervisor_id) ?? null : null,
    }));
  }

  /**
   * Obtiene la lista de tareas aplicando filtros opcionales.
   * Incluye el perfil del responsable y los datos del expediente.
   */
  async getTasks(
    companyId: string,
    filters?: GetTasksFilters
  ): Promise<TaskWithDetails[]> {
    const supabase = await this.getClient();

    return this.fetchTasksWithRelations(supabase, companyId, (query) => {
      let q = query;

      if (filters?.caseId) {
        q = q.eq("case_id", filters.caseId);
      }
      if (filters?.responsibleId) {
        q = q.eq("responsible_id", filters.responsibleId);
      }
      if (filters?.status) {
        q = q.eq("status", filters.status);
      }
      if (filters?.priority) {
        q = q.eq("priority", filters.priority);
      }
      if (filters?.search) {
        q = q.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      return q.order("created_at", { ascending: false });
    });
  }

  /**
   * Obtiene el detalle completo de una tarea por ID.
   */
  async getTaskById(
    companyId: string,
    id: string
  ): Promise<TaskWithDetails | null> {
    const supabase = await this.getClient();

    const tasks = await this.fetchTasksWithRelations(supabase, companyId, (query) =>
      query.eq("id", id).limit(1)
    );

    return tasks.length > 0 ? tasks[0] : null;
  }

  /**
   * Crea una nueva tarea y notifica automáticamente al responsable si está asignado.
   */
  async createTask(
    companyId: string,
    task: CreateTaskInput
  ): Promise<TaskWithDetails> {
    const supabase = await this.getClient();

    if (!task.title || !task.title.trim()) {
      throw new Error("El título de la tarea es obligatorio.");
    }

    const responsibleId = task.responsible_id ?? task.responsibleId ?? null;
    const supervisorId = task.supervisor_id ?? task.supervisorId ?? null;
    const caseId = task.case_id ?? task.caseId ?? null;
    const stageInstanceId = task.stage_instance_id ?? task.stageInstanceId ?? null;
    const dueDate = task.due_date ?? task.dueDate ?? null;
    const createdBy = task.created_by ?? task.createdBy ?? null;
    const status: TaskStatus = task.status ?? "pendiente";

    const insertPayload: TaskInsert = {
      company_id: companyId,
      title: task.title.trim(),
      description: task.description ?? null,
      case_id: caseId,
      stage_instance_id: stageInstanceId,
      responsible_id: responsibleId,
      supervisor_id: supervisorId,
      priority: task.priority ?? "normal",
      status,
      due_date: dueDate,
      completed_at: status === "completado" ? new Date().toISOString() : null,
      checklist: (task.checklist as any) ?? [],
      notes: task.notes ?? null,
      created_by: createdBy,
    };

    const { data: createdTask, error: insertError } = await (supabase
      .from("tasks" as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Error al crear tarea:", insertError);
      throw insertError;
    }

    // Notificación automática al usuario responsable si está asignado
    if (responsibleId) {
      try {
        const dueDateText = createdTask.due_date
          ? ` Fecha límite: ${new Date(createdTask.due_date).toLocaleDateString("es-DO")}.`
          : "";

        await notificationService.createNotification({
          companyId,
          userId: responsibleId,
          title: `Nueva tarea asignada: ${createdTask.title}`,
          message: `Se te ha asignado la tarea "${createdTask.title}".${dueDateText}`,
          notificationType: "tarea",
          entityType: "task",
          entityId: createdTask.id,
        });
      } catch (notifErr) {
        console.error("Error enviando notificación al responsable de la tarea:", notifErr);
      }
    }

    const result = await this.getTaskById(companyId, createdTask.id);
    if (!result) {
      throw new Error("No se pudo recuperar la tarea recién creada.");
    }

    return result;
  }

  /**
   * Actualiza una tarea existente.
   * Si el estado cambia a 'completado', registra automáticamente completed_at con la fecha actual.
   * Si cambia a otro estado, reinicia completed_at a null.
   */
  async updateTask(
    companyId: string,
    id: string,
    task: Partial<CreateTaskInput>
  ): Promise<TaskWithDetails> {
    const supabase = await this.getClient();

    // Obtener tarea actual para detectar cambios relevantes (ej. nuevo responsable)
    const currentTask = await this.getTaskById(companyId, id);
    if (!currentTask) {
      throw new Error(`Tarea no encontrada con ID ${id}`);
    }

    const updatePayload: TaskUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (task.title !== undefined) updatePayload.title = task.title.trim();
    if (task.description !== undefined) updatePayload.description = task.description;
    if (task.case_id !== undefined || task.caseId !== undefined) {
      updatePayload.case_id = task.case_id ?? task.caseId;
    }
    if (task.stage_instance_id !== undefined || task.stageInstanceId !== undefined) {
      updatePayload.stage_instance_id = task.stage_instance_id ?? task.stageInstanceId;
    }
    if (task.responsible_id !== undefined || task.responsibleId !== undefined) {
      updatePayload.responsible_id = task.responsible_id ?? task.responsibleId;
    }
    if (task.supervisor_id !== undefined || task.supervisorId !== undefined) {
      updatePayload.supervisor_id = task.supervisor_id ?? task.supervisorId;
    }
    if (task.priority !== undefined) updatePayload.priority = task.priority;
    if (task.notes !== undefined) updatePayload.notes = task.notes;
    if (task.checklist !== undefined) updatePayload.checklist = task.checklist as any;
    if (task.due_date !== undefined || task.dueDate !== undefined) {
      updatePayload.due_date = task.due_date ?? task.dueDate;
    }

    // Manejo de estado y completed_at
    if (task.status !== undefined) {
      updatePayload.status = task.status;
      if (task.status === "completado") {
        updatePayload.completed_at = new Date().toISOString();
      } else if (currentTask.status === "completado") {
        updatePayload.completed_at = null;
      }
    }

    // Permitir sobreescritura explícita de completed_at si se proporciona
    if (task.completed_at !== undefined || task.completedAt !== undefined) {
      updatePayload.completed_at = task.completed_at ?? task.completedAt;
    }

    const { error: updateError } = await (supabase
      .from("tasks" as any) as any)
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", id);

    if (updateError) {
      console.error("Error al actualizar tarea:", updateError);
      throw updateError;
    }

    // Si se asignó un nuevo responsable distinto del anterior, notificarlo
    const newResponsibleId = updatePayload.responsible_id;
    if (
      newResponsibleId &&
      newResponsibleId !== currentTask.responsible_id
    ) {
      try {
        await notificationService.createNotification({
          companyId,
          userId: newResponsibleId,
          title: `Tarea asignada: ${updatePayload.title ?? currentTask.title}`,
          message: `Se te ha asignado la tarea "${updatePayload.title ?? currentTask.title}".`,
          notificationType: "tarea",
          entityType: "task",
          entityId: id,
        });
      } catch (notifErr) {
        console.error("Error notificando reasignación de tarea:", notifErr);
      }
    }

    const result = await this.getTaskById(companyId, id);
    if (!result) {
      throw new Error("No se pudo recuperar la tarea actualizada.");
    }

    return result;
  }

  /**
   * Cambio ágil de estado para Kanban o drag & drop.
   */
  async updateTaskStatus(
    companyId: string,
    id: string,
    status: TaskStatus
  ): Promise<TaskWithDetails> {
    return this.updateTask(companyId, id, { status });
  }

  /**
   * Actualiza el checklist JSONB de una tarea.
   */
  async updateTaskChecklist(
    companyId: string,
    id: string,
    checklist: Array<{ id: string; text: string; completed: boolean }>
  ): Promise<TaskWithDetails> {
    const supabase = await this.getClient();

    const { error } = await (supabase
      .from("tasks" as any) as any)
      .update({
        checklist: checklist as any,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al actualizar checklist de la tarea:", error);
      throw error;
    }

    const result = await this.getTaskById(companyId, id);
    if (!result) {
      throw new Error("No se pudo recuperar la tarea tras actualizar su checklist.");
    }

    return result;
  }

  /**
   * Elimina una tarea por ID.
   */
  async deleteTask(companyId: string, id: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await (supabase
      .from("tasks" as any) as any)
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar tarea:", error);
      throw error;
    }
  }

  /**
   * Obtiene resumen cuantitativo de tareas (pendientes, en proceso, completadas y vencidas).
   */
  async getTasksSummary(
    companyId: string,
    userId?: string
  ): Promise<TasksSummary> {
    const supabase = await this.getClient();

    let query = (supabase.from("tasks" as any) as any)
      .select("status, due_date")
      .eq("company_id", companyId);

    if (userId) {
      query = query.eq("responsible_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al calcular resumen de tareas:", error);
      throw error;
    }

    const now = new Date();
    let pendientes = 0;
    let enProceso = 0;
    let enRevision = 0;
    let completadas = 0;
    let canceladas = 0;
    let vencidas = 0;

    for (const item of (data || [])) {
      switch (item.status) {
        case "pendiente":
          pendientes++;
          break;
        case "en_proceso":
          enProceso++;
          break;
        case "en_revision":
          enRevision++;
          break;
        case "completado":
          completadas++;
          break;
        case "cancelado":
          canceladas++;
          break;
      }

      // Una tarea está vencida si su fecha límite ya pasó y no ha sido completada ni cancelada
      if (
        item.due_date &&
        new Date(item.due_date) < now &&
        item.status !== "completado" &&
        item.status !== "cancelado"
      ) {
        vencidas++;
      }
    }

    const total = (data || []).length;

    return {
      total,
      pendientes,
      enProceso,
      enRevision,
      completadas,
      canceladas,
      vencidas,
      // Compatibilidad y aliases
      pending: pendientes,
      inProgress: enProceso,
      inReview: enRevision,
      completed: completadas,
      cancelled: canceladas,
      overdue: vencidas,
    };
  }
}

export const taskService = new TaskService();
