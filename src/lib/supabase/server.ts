import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Crea un cliente Supabase para Server Components y Server Actions.
 * Maneja cookies automáticamente para la sesión del usuario.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://emblema-demo.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.empty";

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll se llama desde Server Component donde no se puede escribir cookies.
            // Se puede ignorar si el middleware refresca la sesión.
          }
        },
      },
    }
  );
}
