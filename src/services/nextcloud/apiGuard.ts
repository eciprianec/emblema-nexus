import "server-only";

import { NextResponse } from "next/server";
import { getTenantContext } from "@/services/tenant/context";

/**
 * Exige una sesión real y al menos uno de los permisos en la empresa activa.
 * Devuelve la respuesta de rechazo, o null si la petición puede continuar.
 */
export async function requireAnyPermission(permissions: string[]): Promise<NextResponse | null> {
  const ctx = await getTenantContext();

  if (ctx.status === "no_database") {
    return NextResponse.json({ success: false, error: "Base de datos no disponible." }, { status: 503 });
  }
  if (ctx.status === "no_session") {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }
  if (ctx.status === "no_company") {
    return NextResponse.json({ success: false, error: "Sin empresa asignada." }, { status: 403 });
  }

  const granted = await Promise.all(permissions.map((permission) => ctx.has(permission)));
  if (!granted.some(Boolean)) {
    return NextResponse.json({ success: false, error: "No tienes permiso para esta operación." }, { status: 403 });
  }
  return null;
}
