import Link from "next/link";
import { Database, LogIn, Building2 } from "lucide-react";
import type { BillingContext } from "@/services/billing/context";

const MESSAGES = {
  no_database: {
    icon: Database,
    title: "Falta conectar la base de datos",
    body: "La facturación guarda comprobantes fiscales, así que necesita Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local, aplica las migraciones y reinicia la aplicación. Los pasos están en docs/FACTURACION.md.",
    action: null,
  },
  no_session: {
    icon: LogIn,
    title: "Inicia sesión para continuar",
    body: "Cada comprobante queda a nombre de un usuario y protegido por las reglas de la base de datos.",
    action: { href: "/login", label: "Ir al inicio de sesión" },
  },
  no_company: {
    icon: Building2,
    title: "Tu usuario no pertenece a ninguna empresa",
    body: "Pide a un administrador que te asigne a una empresa y un rol con permisos de finanzas. El procedimiento está en docs/FACTURACION.md.",
    action: null,
  },
} as const;

// Los clientes viven en las mismas tablas que la facturación y piden lo mismo.
const CLIENT_BODIES = {
  no_database:
    "Los clientes se comparten con la facturación, así que necesitan Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local, aplica las migraciones y reinicia la aplicación. Los pasos están en docs/FACTURACION.md.",
  no_session:
    "Los clientes se comparten entre los usuarios de la empresa: inicia sesión para verlos.",
  no_company:
    "Pide a un administrador que te asigne a una empresa y un rol con permisos de clientes. El procedimiento está en docs/FACTURACION.md.",
} as const;

export function BillingGate({
  status,
  area = "billing",
}: {
  status: Exclude<BillingContext["status"], "ready">;
  area?: "billing" | "clients";
}) {
  const { icon: Icon, title, action } = MESSAGES[status];
  const body = area === "clients" ? CLIENT_BODIES[status] : MESSAGES[status].body;
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-lg border border-slate-200 bg-white p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
      {action && (
        <Link href={action.href} className="mt-4 inline-block text-sm font-medium text-slate-900 underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function NoPermission({ what = "ver la facturación" }: { what?: string }) {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
      Tu rol no incluye permisos para {what} de esta empresa.
    </div>
  );
}
