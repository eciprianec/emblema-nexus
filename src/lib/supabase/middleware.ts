import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * Actualiza la sesión de Supabase en el middleware de Next.js.
 * Esto refresca tokens expirados automáticamente.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user = null;
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient<Database>(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              supabaseResponse = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );
      const res = await supabase.auth.getUser();
      user = res.data.user;
    } catch {
      user = null;
    }
  }

  const hasAdminSession = request.cookies.get("nexus_admin_session")?.value === "true";
  const isAuthenticated = Boolean(user || hasAdminSession);

  // Rutas del portal de clientes y consultas públicas (tienen su propia autenticación/acceso)
  if (request.nextUrl.pathname.startsWith("/portal")) {
    return supabaseResponse;
  }

  // Rutas de API y endpoints internos (ej. /api/health) manejan su propia respuesta
  if (request.nextUrl.pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  // Rutas públicas que no requieren autenticación
  const publicPaths = ["/login", "/registro", "/recuperar"];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Si no hay usuario autenticado y la ruta no es pública, redirigir al login
  if (!isAuthenticated && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Si está autenticado y está en una ruta pública, redirigir al dashboard
  if (isAuthenticated && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
