import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DgiiEnvironmentCode, EmissionMode, FiscalDocument } from "@/domain/billing";
import type { EcfProviderService, EmitOutcome } from "./mseller/EcfProviderService";

export interface IssueRequest {
  db: SupabaseClient;
  invoiceId: string;
  document: FiscalDocument;
  /** Datos del e-CF cuando se emitió en la plataforma externa. */
  external?: { encf: string; securityCode: string; signedAt: string; trackId?: string | null };
  /** Emisión por proveedor: el servicio y el ambiente configurado. */
  provider?: { service: EcfProviderService; environment: DgiiEnvironmentCode };
}

/**
 * Frontera entre el comprobante y quien le da validez fiscal. El resto del módulo no
 * sabe cómo se emite: para activar la emisión directa basta implementar esta interfaz.
 * Un emisor asíncrono devuelve en qué quedó el envío; los demás terminan al volver.
 */
export interface FiscalIssuer {
  readonly mode: EmissionMode;
  issue(request: IssueRequest): Promise<EmitOutcome | void>;
}

async function callIssue(request: IssueRequest, args: Record<string, unknown> = {}): Promise<void> {
  const { error } = await request.db.rpc("billing_issue_invoice", { p_invoice_id: request.invoiceId, ...args });
  if (error) throw new Error(error.message);
}

/** Serie B: la base de datos asigna el siguiente NCF del rango autorizado. */
class InternalNcfIssuer implements FiscalIssuer {
  readonly mode = "ncf_interno" as const;

  async issue(request: IssueRequest): Promise<void> {
    await callIssue(request);
  }
}

/** Facturador Gratuito de la DGII o proveedor autorizado: se registra lo que ya se emitió allá. */
class ExternalEcfIssuer implements FiscalIssuer {
  readonly mode = "ecf_externo" as const;

  async issue(request: IssueRequest): Promise<void> {
    if (!request.external) {
      throw new Error("Indica el e-NCF, el código de seguridad y la fecha de firma del e-CF.");
    }
    await callIssue(request, {
      p_encf: request.external.encf,
      p_security_code: request.external.securityCode,
      p_signed_at: request.external.signedAt,
      p_track_id: request.external.trackId ?? null,
    });
  }
}

/** Proveedor autorizado por API: el sistema asigna el e-NCF y el proveedor firma y presenta. */
class ProviderEcfIssuer implements FiscalIssuer {
  readonly mode = "ecf_proveedor" as const;

  async issue(request: IssueRequest): Promise<EmitOutcome> {
    if (!request.provider) throw new Error("Falta la configuración del proveedor.");
    return request.provider.service.emit(request.invoiceId, request.provider.environment);
  }
}

/**
 * Emisión directa ante la DGII. Pendiente hasta certificarse como emisor; los pasos
 * están en docs/FACTURACION.md. Partirá de `toEcfDocument` y de `fiscal_sequences`.
 */
class DirectEcfIssuer implements FiscalIssuer {
  readonly mode = "ecf_directo" as const;

  async issue(): Promise<void> {
    throw new Error("La emisión directa de e-CF aún no está disponible.");
  }
}

const ISSUERS: Record<EmissionMode, FiscalIssuer> = {
  ncf_interno: new InternalNcfIssuer(),
  ecf_externo: new ExternalEcfIssuer(),
  ecf_proveedor: new ProviderEcfIssuer(),
  ecf_directo: new DirectEcfIssuer(),
};

export function getIssuer(mode: EmissionMode): FiscalIssuer {
  return ISSUERS[mode];
}
