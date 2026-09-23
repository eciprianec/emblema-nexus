import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Healthcheck endpoint para Docker, Kubernetes y balanceadores de carga.
 * Retorna estado 200 con telemetría básica del proceso.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      service: "emblema-nexus",
      version: process.env.npm_package_version || "0.1.0",
      environment: process.env.NODE_ENV || "production",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
