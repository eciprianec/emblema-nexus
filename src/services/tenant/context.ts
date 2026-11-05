import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_COMPANY_COOKIE = "billing_company";

export type TenantContext =
  | { status: "no_database" }
  | { status: "no_session" }
  | { status: "no_company" }
  | {
      status: "ready";
      /** Sin tipos generados para las tablas nuevas; los servicios tipan cada resultado. */
      db: SupabaseClient;
      userId: string;
      companyId: string;
      companies: { id: string; name: string }[];
      has: (permission: string) => Promise<boolean>;
    };

export type ReadyTenantContext = Extract<TenantContext, { status: "ready" }>;

/**
 * Resuelve el usuario y la empresa activa, siempre desde la sesión real de Supabase:
 * estos datos se comparten entre usuarios y dependen de las reglas de la base de datos.
 */
export async function getTenantContext(): Promise<TenantContext> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { status: "no_database" };
  }

  const db = (await createClient()) as unknown as SupabaseClient;

  let userId: string | undefined;
  try {
    const { data } = await db.auth.getUser();
    userId = data.user?.id;
  } catch {
    return { status: "no_database" };
  }
  if (!userId) return { status: "no_session" };

  const { data: memberships, error } = await db
    .from("company_members")
    .select("company_id, companies(id, name)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) return { status: "no_database" };

  const companies = (memberships ?? []).flatMap((m) => {
    const company = m.companies as unknown as { id: string; name: string } | null;
    return company ? [{ id: company.id, name: company.name }] : [];
  });
  if (companies.length === 0) return { status: "no_company" };
  companies.sort((a, b) => a.name.localeCompare(b.name));

  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;
  const companyId = companies.some((c) => c.id === wanted) ? (wanted as string) : companies[0].id;

  return {
    status: "ready",
    db,
    userId,
    companyId,
    companies,
    has: async (permission) => {
      const { data } = await db.rpc("has_permission", { p_company_id: companyId, p_permission_key: permission });
      return data === true;
    },
  };
}
