import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase con permisos de service role.
 * SOLO usar server-side para operaciones administrativas.
 * Este cliente bypasea RLS — usar con extremo cuidado.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
