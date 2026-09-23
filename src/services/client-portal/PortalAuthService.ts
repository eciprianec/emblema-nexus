import "server-only";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ClientPortalAccessRow,
  ClientPortalAccessInsert,
  ClientPortalAccessUpdate,
} from "@/types/database.types";

export interface MagicPinResult {
  pin: string;
  expiresAt: string;
  email: string;
}

export interface MagicPinVerificationResult {
  access_token: string;
  client_id: string;
  company_id: string;
  email: string;
}

export interface ValidatedClientAccess {
  access: ClientPortalAccessRow;
  client: {
    id: string;
    company_id: string;
    client_type: "persona_fisica" | "persona_juridica";
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    email: string | null;
    phone: string | null;
    rnc: string | null;
    cedula: string | null;
    is_active: boolean;
  };
}

export class PortalAuthService {
  constructor(private client?: SupabaseClient<Database>) {}

  private async getClient(): Promise<SupabaseClient<Database>> {
    if (this.client) return this.client;
    try {
      return createAdminClient();
    } catch {
      return await createClient();
    }
  }

  /**
   * Genera o regenera un token criptográfico de acceso permanente para el portal de clientes.
   */
  async generateAccessToken(
    companyId: string,
    clientId: string,
    email: string
  ): Promise<ClientPortalAccessRow> {
    const supabase = await this.getClient();
    const cleanEmail = email.trim().toLowerCase();
    const token = crypto.randomBytes(48).toString("hex"); // 96 caracteres seguros

    // Verificar si ya existe acceso configurado para este cliente en la empresa
    const { data: existing, error: searchError } = await (supabase
      .from("client_portal_access" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (searchError) {
      throw new Error(`Error al consultar acceso existente: ${searchError.message}`);
    }

    if (existing) {
      const { data: updated, error: updateError } = await (supabase
        .from("client_portal_access" as any) as any)
        .update({
          access_token: token,
          email: cleanEmail,
          is_active: true,
          updated_at: new Date().toISOString(),
        } as ClientPortalAccessUpdate)
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Error al actualizar token de acceso: ${updateError.message}`);
      }

      return updated as ClientPortalAccessRow;
    }

    // Insertar nuevo registro de acceso
    const { data: created, error: insertError } = await (supabase
      .from("client_portal_access" as any) as any)
      .insert({
        company_id: companyId,
        client_id: clientId,
        email: cleanEmail,
        access_token: token,
        is_active: true,
      } as ClientPortalAccessInsert)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error al crear acceso al portal: ${insertError.message}`);
    }

    return created as ClientPortalAccessRow;
  }

  /**
   * Genera un código PIN de 6 dígitos con validez de 15 minutos para inicio de sesión sin contraseña.
   */
  async generateMagicPin(
    companyId: string,
    email: string
  ): Promise<MagicPinResult> {
    const supabase = await this.getClient();
    const cleanEmail = email.trim().toLowerCase();

    // PIN numérico de 6 dígitos (100000 - 999999)
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 1. Buscar si ya existe el registro de portal
    const { data: existingAccess, error: accessError } = await (supabase
      .from("client_portal_access" as any) as any)
      .select("*")
      .eq("company_id", companyId)
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (accessError) {
      throw new Error(`Error al buscar acceso del portal: ${accessError.message}`);
    }

    if (existingAccess) {
      if (!existingAccess.is_active) {
        throw new Error("El acceso al portal para este cliente se encuentra inactivo.");
      }

      const { error: updateError } = await (supabase
        .from("client_portal_access" as any) as any)
        .update({
          magic_code: pin,
          magic_code_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        } as ClientPortalAccessUpdate)
        .eq("id", existingAccess.id);

      if (updateError) {
        throw new Error(`Error al asignar código PIN temporal: ${updateError.message}`);
      }

      return { pin, expiresAt, email: cleanEmail };
    }

    // 2. Si no tiene registro en client_portal_access, verificar si existe en la tabla clients
    const { data: client, error: clientError } = await (supabase
      .from("clients" as any) as any)
      .select("id, email, is_active")
      .eq("company_id", companyId)
      .ilike("email", cleanEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (clientError) {
      throw new Error(`Error al verificar cliente: ${clientError.message}`);
    }

    if (!client) {
      throw new Error("No se encontró ningún cliente activo registrado con el correo electrónico suministrado.");
    }

    // Crear registro inicial de portal con PIN
    const token = crypto.randomBytes(48).toString("hex");
    const { error: insertError } = await (supabase
      .from("client_portal_access" as any) as any)
      .insert({
        company_id: companyId,
        client_id: client.id,
        email: cleanEmail,
        access_token: token,
        is_active: true,
        magic_code: pin,
        magic_code_expires_at: expiresAt,
      } as ClientPortalAccessInsert);

    if (insertError) {
      throw new Error(`Error al registrar acceso y código PIN: ${insertError.message}`);
    }

    return { pin, expiresAt, email: cleanEmail };
  }

  /**
   * Valida el PIN de 6 dígitos suministrado por el cliente y devuelve las credenciales de sesión.
   */
  async verifyMagicPin(
    email: string,
    pin: string
  ): Promise<MagicPinVerificationResult> {
    const supabase = await this.getClient();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    const { data: access, error } = await (supabase
      .from("client_portal_access" as any) as any)
      .select("*")
      .ilike("email", cleanEmail)
      .eq("magic_code", cleanPin)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al validar PIN: ${error.message}`);
    }

    if (!access) {
      throw new Error("Código PIN inválido o no encontrado.");
    }

    // Verificar si expiró
    if (!access.magic_code_expires_at || new Date(access.magic_code_expires_at) < new Date()) {
      throw new Error("El código PIN ha expirado. Por favor solicite uno nuevo.");
    }

    // Invalidar PIN usado y registrar login
    const nowIso = new Date().toISOString();
    await (supabase.from("client_portal_access" as any) as any)
      .update({
        magic_code: null,
        magic_code_expires_at: null,
        last_login_at: nowIso,
        updated_at: nowIso,
      } as ClientPortalAccessUpdate)
      .eq("id", access.id);

    return {
      access_token: access.access_token,
      client_id: access.client_id,
      company_id: access.company_id,
      email: access.email,
    };
  }

  /**
   * Valida un token de acceso del portal y retorna la sesión y datos del cliente autenticado.
   */
  async validateAccessToken(
    token: string
  ): Promise<ValidatedClientAccess | null> {
    if (!token || typeof token !== "string") {
      return null;
    }

    const supabase = await this.getClient();

    const { data: access, error: accessError } = await (supabase
      .from("client_portal_access" as any) as any)
      .select("*")
      .eq("access_token", token.trim())
      .eq("is_active", true)
      .maybeSingle();

    if (accessError || !access) {
      return null;
    }

    // Obtener datos del cliente
    const { data: client, error: clientError } = await (supabase
      .from("clients" as any) as any)
      .select("id, company_id, client_type, first_name, last_name, business_name, email, phone, rnc, cedula, is_active")
      .eq("id", access.client_id)
      .eq("company_id", access.company_id)
      .eq("is_active", true)
      .maybeSingle();

    if (clientError || !client) {
      return null;
    }

    // Actualizar última actividad
    await (supabase.from("client_portal_access" as any) as any)
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ClientPortalAccessUpdate)
      .eq("id", access.id);

    return {
      access: access as ClientPortalAccessRow,
      client,
    };
  }

  /**
   * Revoca inmediatamente el acceso al portal de un cliente.
   */
  async revokeAccess(companyId: string, clientId: string): Promise<boolean> {
    const supabase = await this.getClient();

    const { error } = await (supabase
      .from("client_portal_access" as any) as any)
      .update({
        is_active: false,
        magic_code: null,
        magic_code_expires_at: null,
        updated_at: new Date().toISOString(),
      } as ClientPortalAccessUpdate)
      .eq("company_id", companyId)
      .eq("client_id", clientId);

    if (error) {
      throw new Error(`Error al revocar acceso del portal: ${error.message}`);
    }

    return true;
  }
}

export const portalAuthService = new PortalAuthService();
