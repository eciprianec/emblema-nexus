import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Crea un cliente Supabase para el navegador.
 * Usar en componentes 'use client'.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://emblema-demo.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.empty";
  return createBrowserClient<Database>(url, key);
}
