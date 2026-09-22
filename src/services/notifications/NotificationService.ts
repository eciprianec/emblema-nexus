import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type NotificationType =
  | "tarea"
  | "plazo"
  | "audiencia"
  | "expediente"
  | "documento"
  | "sistema";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  title: string;
  message: string;
  notificationType?: NotificationType;
  entityType?: string;
  entityId?: string;
}

export interface GetUserNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export class NotificationService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    return this.client ?? (await createClient());
  }

  private async getWriteClient(): Promise<SupabaseClient<Database>> {
    if (this.client) return this.client;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        return createAdminClient();
      } catch (err) {
        console.warn("createAdminClient falló, usando cliente de sesión:", err);
      }
    }
    return await createClient();
  }

  /**
   * Crea una notificación para un usuario específico.
   * Utiliza el cliente administrativo si está disponible para permitir notificaciones automáticas
   * entre usuarios (evitando el bloqueo por RLS de auth.uid).
   */
  async createNotification(params: CreateNotificationInput): Promise<NotificationRow> {
    const supabase = await this.getWriteClient();

    const insertPayload: NotificationInsert = {
      company_id: params.companyId,
      user_id: params.userId,
      title: params.title,
      message: params.message,
      notification_type: params.notificationType ?? "sistema",
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      read: false,
      read_at: null,
    };

    const { data, error } = await (supabase
      .from("notifications" as any) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error al crear notificación:", error);
      throw error;
    }

    return data as NotificationRow;
  }

  /**
   * Obtiene las notificaciones de un usuario con opciones de filtrado y límite.
   */
  async getUserNotifications(
    companyId: string,
    userId: string,
    options?: GetUserNotificationsOptions
  ): Promise<NotificationRow[]> {
    const supabase = await this.getClient();

    let query = (supabase.from("notifications" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq("read", false);
    }

    if (options?.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener notificaciones del usuario:", error);
      throw error;
    }

    return (data || []) as NotificationRow[];
  }

  /**
   * Retorna el conteo de notificaciones no leídas de un usuario.
   */
  async getUnreadCount(companyId: string, userId: string): Promise<number> {
    const supabase = await this.getClient();

    const { count, error } = await (supabase
      .from("notifications" as any) as any)
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.error("Error al obtener conteo de notificaciones no leídas:", error);
      throw error;
    }

    return count ?? 0;
  }

  /**
   * Marca una notificación específica como leída.
   */
  async markAsRead(
    companyId: string,
    notificationId: string,
    userId: string
  ): Promise<NotificationRow> {
    const supabase = await this.getClient();

    const { data, error } = await (supabase
      .from("notifications" as any) as any)
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error al marcar notificación como leída:", error);
      throw error;
    }

    return data as NotificationRow;
  }

  /**
   * Marca todas las notificaciones pendientes de un usuario como leídas.
   */
  async markAllAsRead(companyId: string, userId: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await (supabase
      .from("notifications" as any) as any)
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.error("Error al marcar todas las notificaciones como leídas:", error);
      throw error;
    }
  }

  /**
   * Elimina una notificación de un usuario.
   */
  async deleteNotification(
    companyId: string,
    notificationId: string,
    userId: string
  ): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await (supabase
      .from("notifications" as any) as any)
      .delete()
      .eq("company_id", companyId)
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error al eliminar notificación:", error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
