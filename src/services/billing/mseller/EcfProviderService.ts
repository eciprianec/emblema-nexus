import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { toEcfDocument, type DgiiEnvironmentCode, type EmitterData, type FiscalDocument } from "@/domain/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_BATCH_SIZE,
  MSellerClient,
  mergeSnapshots,
  type BatchEntry,
  type DgiiMessage,
  type DocumentSnapshot,
  type MSellerCredentials,
} from "./client";
import { decryptCredentials, emailHint, encryptCredentials } from "./secrets";

/** Datos fijos de un comprobante ya reservado, listos para traducirlos al formato del proveedor. */
export interface ReservedDocument {
  document: FiscalDocument;
  emitter: EmitterData;
  sequenceExpiry: string | null;
}

export type EmitState =
  /** El proveedor lo tiene; falta la respuesta de la DGII. */
  | "en_proceso"
  /** No llegó al proveedor: el comprobante volvió a borrador. */
  | "devuelto"
  /** Puede haber llegado: se debe verificar antes de reenviar. */
  | "ambiguo"
  /** Un reenvío que el proveedor rechazó: sigue en proceso y lo guardado se puede volver a verificar. */
  | "sin_enviar";

export interface EmitOutcome {
  state: EmitState;
  message?: string;
  messages?: DgiiMessage[];
}

export interface RefreshOutcome {
  final: boolean;
  changed: boolean;
  dgiiStatus: string | null;
  message?: string;
}

export interface ProviderCredentialsStatus {
  configured: boolean;
  emailHint: string | null;
}

/** Quién pide la operación, ya resuelto con su propia sesión. */
export interface EcfProviderContext {
  db: SupabaseClient;
  companyId: string;
  userId: string;
  has: (permission: string) => Promise<boolean>;
}

interface ActiveEcfRow {
  id: string;
  encf: string;
  environment: string;
  dgii_status: string;
  provider_phase: string | null;
  provider_status: string | null;
  security_code: string | null;
  qr_code_url: string | null;
  send_attempts: number;
  last_sent_at: string | null;
}

/** Por qué billing_apply_ecf_status no creyó una respuesta. */
type SnapshotProblem = "sin_envio" | "anterior" | "sin_prueba" | "no_coincide";

interface ApplyResult {
  dgiiStatus: string;
  applied: boolean;
  ignored: SnapshotProblem | null;
}

const ACTIVE_COLUMNS =
  "id, encf, environment, dgii_status, provider_phase, provider_status, security_code, qr_code_url, send_attempts, last_sent_at";

const FINAL_STATUSES = ["aceptado", "condicional", "rechazado"];
/** Un envío que agotó el tiempo aún podría estar procesándose; igual lo exige la base de datos. */
const NOT_RECEIVED_MIN_AGE_MS = 5 * 60 * 1000;
/** Ritmo recomendado por el proveedor para los pendientes: cada 15 a 30 minutos. */
const BATCH_RECHECK_MS = 15 * 60 * 1000;
/**
 * La mayoría responde en minutos. Durante esta primera hora, cada visita a la lista los revisa aunque
 * la página del comprobante acabe de consultarlos; el límite de abajo protege la cuota.
 */
const BATCH_RECENT_WINDOW_MS = 60 * 60 * 1000;
/** Evita una consulta por cada visita a la lista; por instancia del servidor. */
const BATCH_MIN_INTERVAL_MS = 60 * 1000;
const lastBatchAt = new Map<string, number>();

const ROW_ENVIRONMENT: Record<string, DgiiEnvironmentCode> = { DEV: "test", CERT: "cert", PROD: "prod" };

const PROBLEM_MESSAGES: Record<SnapshotProblem, string> = {
  sin_envio: "Este e-CF aún no se ha enviado al proveedor.",
  anterior: "El proveedor todavía muestra un documento anterior con este e-NCF. No se aplicó su estado.",
  sin_prueba: "El proveedor respondió, pero no se puede comprobar que sea de este envío. No se aplicó su estado: verifica más tarde o revísalo con el proveedor.",
  no_coincide: "El proveedor tiene con este e-NCF un documento con otro total o comprador. No se aplicó su estado: revísalo con el proveedor.",
};

/** Sin esta clave el servidor no puede aplicar lo que responde el proveedor. Solo dice si existe. */
export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

const SIGNED_DATE = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * "14-05-2025 03:26:18" en hora de RD (GMT-4) a instante ISO. Los ejemplos del proveedor parecen
 * usar reloj de 12 horas sin indicar AM o PM, así que se toma la lectura más cercana al envío.
 * Es solo para ordenar: lo que se muestra e imprime es el texto original, igual al del QR.
 */
export function parseSignedDate(value: string | null, near?: string | null): string | null {
  const match = SIGNED_DATE.exec(value?.trim() ?? "");
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const base = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}-04:00`);
  if (Number.isNaN(base.getTime())) return null;
  const reference = near ? new Date(near).getTime() : NaN;
  if (Number.isNaN(reference) || Number(hour) > 12) return `${year}-${month}-${day}T${hour}:${minute}:${second}-04:00`;
  const alternative = base.getTime() + (Number(hour) === 12 ? -TWELVE_HOURS_MS : TWELVE_HOURS_MS);
  const closest = Math.abs(alternative - reference) < Math.abs(base.getTime() - reference) ? alternative : base.getTime();
  return new Date(closest).toISOString();
}

export class EcfProviderService {
  private adminClient: SupabaseClient | null = null;

  constructor(
    private readonly ctx: EcfProviderContext,
    private readonly loadReserved: (invoiceId: string) => Promise<ReservedDocument>,
    /** Service role. Solo existe en el servidor, y solo se usa después de comprobar al usuario. */
    private readonly adminFactory: () => SupabaseClient = () => createAdminClient() as unknown as SupabaseClient
  ) {}

  private get db(): SupabaseClient {
    return this.ctx.db;
  }

  private get companyId(): string {
    return this.ctx.companyId;
  }

  private admin(): SupabaseClient {
    if (!this.adminClient) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Falta la variable SUPABASE_SERVICE_ROLE_KEY en el servidor: sin ella no se puede emitir por el proveedor.");
      }
      this.adminClient = this.adminFactory();
    }
    return this.adminClient;
  }

  /**
   * El permiso se comprueba con la sesión del usuario antes de tocar el service role. La empresa
   * ya viene de sus membresías (getTenantContext); la base de datos vuelve a comprobar ambas cosas.
   */
  private async authorize(): Promise<void> {
    const [emit, create] = await Promise.all([this.ctx.has("ecf.emit"), this.ctx.has("finance.create")]);
    if (!emit && !create) throw new Error("No tienes permiso para esta operación (finance.create o ecf.emit).");
    this.admin();
  }

  /** Las fases del proveedor: solo el servidor las llama, nombrando empresa y usuario. */
  private async phase(name: string, args: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await this.admin().rpc(name, {
      p_company_id: this.companyId,
      p_actor: this.ctx.userId,
      ...args,
    });
    fail(error);
    return data;
  }

  private async client(environment: DgiiEnvironmentCode): Promise<MSellerClient> {
    const { data, error } = await this.db.rpc("billing_read_provider_credentials", {
      p_company_id: this.companyId,
      p_environment: environment,
    });
    fail(error);
    if (!data) throw new Error("Faltan las credenciales del proveedor para este ambiente; regístralas en la configuración.");
    return new MSellerClient({
      companyId: this.companyId,
      environment,
      credentials: decryptCredentials(this.companyId, environment, data as string),
    });
  }

  /** Solo de la empresa activa: otra pestaña pudo cambiarla mientras esta sigue consultando. */
  private async activeRow(invoiceId: string): Promise<ActiveEcfRow | null> {
    const { data, error } = await this.db
      .from("ecf_invoices")
      .select(ACTIVE_COLUMNS)
      .eq("company_id", this.companyId)
      .eq("invoice_id", invoiceId)
      .eq("source", "proveedor")
      .neq("dgii_status", "rechazado")
      .maybeSingle();
    fail(error);
    return (data ?? null) as ActiveEcfRow | null;
  }

  // ---- Emisión ------------------------------------------------------------

  async emit(invoiceId: string, environment: DgiiEnvironmentCode): Promise<EmitOutcome> {
    await this.authorize();
    // Sin credenciales utilizables no se toma número.
    let client = await this.client(environment);

    const { data, error } = await this.db.rpc("billing_reserve_ecf", { p_invoice_id: invoiceId });
    fail(error);
    const reserved = data as { ecf_id: string; encf: string; environment: DgiiEnvironmentCode };

    // Manda el ambiente de la reserva: la configuración pudo cambiar entre las dos lecturas.
    if (reserved.environment !== environment) {
      try {
        client = await this.client(reserved.environment);
      } catch (err) {
        return this.release(reserved.ecf_id, err instanceof Error ? err.message : "No se pudo preparar el envío.");
      }
    }

    return this.push(invoiceId, client, { id: reserved.ecf_id, encf: reserved.encf, attempts: 0 });
  }

  /** Continúa un envío que nunca salió o que el proveedor confirmó no haber recibido. */
  async resend(invoiceId: string): Promise<EmitOutcome> {
    await this.authorize();
    const row = await this.activeRow(invoiceId);
    if (!row) throw new Error("Este comprobante no tiene un e-CF pendiente.");
    if (row.provider_phase !== "reservado") {
      throw new Error("Solo se reenvía lo que el proveedor confirmó no haber recibido: primero verifica el estado.");
    }
    const client = await this.client(ROW_ENVIRONMENT[row.environment]);
    if (row.send_attempts > 0) {
      const check = await this.recheck(row, client);
      if (!check.proceed) return { state: "en_proceso", message: check.message };
    }
    return this.push(invoiceId, client, { id: row.id, encf: row.encf, attempts: row.send_attempts });
  }

  /** Vuelve a borrador un e-CF que el proveedor no tiene. Un envío en curso o incierto se verifica primero. */
  async discard(invoiceId: string): Promise<void> {
    await this.authorize();
    const row = await this.activeRow(invoiceId);
    if (!row) throw new Error("Este comprobante no tiene un e-CF pendiente.");
    if (row.provider_phase !== "reservado") {
      throw new Error("Este e-CF se está enviando o pudo haber llegado al proveedor: verifica su estado.");
    }
    let parked = false;
    const reason =
      row.send_attempts > 0
        ? "Se devolvió a borrador: el envío no llegó al proveedor."
        : "Se devolvió a borrador sin enviarlo al proveedor.";
    if (row.send_attempts > 0) {
      const check = await this.recheck(row, await this.client(ROW_ENVIRONMENT[row.environment]));
      if (!check.proceed) throw new Error(check.message ?? "El proveedor sí tiene este documento.");
      // Hay otro documento con ese número: devolverlo a la bolsa haría fallar al siguiente.
      parked = check.occupied;
    }
    await this.phase("billing_release_ecf", {
      p_ecf_id: row.id,
      p_reason: parked ? parkedMessage(row.encf, reason) : reason,
      p_messages: [],
      p_park: parked,
    });
  }

  /**
   * Antes de reenviar o descartar algo que ya salió: la confirmación de que el proveedor no lo
   * tenía pudo quedar vieja. Si ahora aparece, se aplica su estado; si no se puede saber, no se sigue.
   */
  private async recheck(row: ActiveEcfRow, client: MSellerClient): Promise<{ proceed: boolean; occupied: boolean; message?: string }> {
    const batch = await client.getBatch([row.encf]);
    if (batch.kind === "failed") {
      throw new Error(`No se pudo confirmar con el proveedor que no tiene el documento: ${batch.message}`);
    }
    const entry = batch.entries.find((e) => e.ecf === row.encf);
    if (!entry) throw new Error("El proveedor no confirmó si tiene el documento. Verifica más tarde.");
    if (!entry.found) return { proceed: true, occupied: false };

    const result = await this.apply(row.id, entry.snapshot, row.last_sent_at);
    if (result.ignored === "anterior") return { proceed: true, occupied: true };
    if (result.ignored) throw new Error(PROBLEM_MESSAGES[result.ignored]);
    return { proceed: false, occupied: true, message: "El proveedor sí tiene este documento; se actualizó su estado." };
  }

  private async release(
    ecfId: string,
    message: string,
    messages: DgiiMessage[] = [],
    options: { attempt?: number; park?: boolean } = {}
  ): Promise<EmitOutcome> {
    await this.phase("billing_release_ecf", {
      p_ecf_id: ecfId,
      p_reason: message,
      p_messages: messages,
      p_send_attempt: options.attempt ?? null,
      p_park: options.park ?? false,
    });
    return { state: "devuelto", message, messages };
  }

  private async push(
    invoiceId: string,
    client: MSellerClient,
    row: { id: string; encf: string; attempts: number }
  ): Promise<EmitOutcome> {
    // Lo que ya salió alguna vez no se reconstruye: begin_send devuelve exactamente esos bytes.
    if (row.attempts === 0) {
      let built: string;
      try {
        const { document, emitter, sequenceExpiry } = await this.loadReserved(invoiceId);
        built = JSON.stringify(toEcfDocument({ document, emitter, encf: row.encf, sequenceExpiry }));
      } catch (err) {
        return this.release(row.id, err instanceof Error ? err.message : "No se pudo preparar el documento.");
      }
      // Se guarda antes de enviar: cualquier reenvío usa exactamente estos bytes.
      const raw = (await this.phase("billing_ecf_store_payload", { p_ecf_id: row.id, p_raw: built })) as string;

      const validation = await client.validate(raw);
      if (validation.blocked) return this.release(row.id, validation.message, validation.messages);
    }

    const begun = (await this.phase("billing_ecf_begin_send", { p_ecf_id: row.id })) as { raw: string; attempt: number };

    const outcome = await client.send(begun.raw);

    if (outcome.kind === "not_sent") {
      if (row.attempts > 0) {
        // Lo guardado ya salió antes: esta respuesta no prueba que el proveedor no lo tenga.
        await this.phase("billing_ecf_send_refused", { p_ecf_id: row.id, p_reason: outcome.message, p_send_attempt: begun.attempt });
        return { state: "sin_enviar", message: outcome.message, messages: outcome.messages };
      }
      if (outcome.reason === "bad_request") {
        const message = parkedMessage(row.encf, outcome.message);
        return this.release(row.id, message, outcome.messages, { attempt: begun.attempt, park: true });
      }
      return this.release(row.id, outcome.message, outcome.messages, { attempt: begun.attempt });
    }

    if (outcome.kind === "ambiguous") {
      await this.phase("billing_ecf_mark_ambiguous", { p_ecf_id: row.id, p_reason: outcome.message });
      return { state: "ambiguo", message: outcome.message };
    }

    try {
      await this.phase("billing_ecf_record_sent", {
        p_ecf_id: row.id,
        p_security_code: outcome.securityCode,
        p_signed_text: outcome.signedDate,
        p_signed_at: parseSignedDate(outcome.signedDate, new Date().toISOString()),
        p_qr_url: outcome.qrUrl,
        p_internal_track: outcome.internalTrackId,
      });
    } catch {
      // El proveedor ya lo tiene; la verificación recupera el código y el QR.
      return { state: "ambiguo", message: "El proveedor recibió el documento, pero no se pudo guardar su respuesta. Usa Verificar." };
    }
    return { state: "en_proceso" };
  }

  // ---- Estado -------------------------------------------------------------

  private async apply(ecfId: string, snapshot: DocumentSnapshot, lastSentAt: string | null): Promise<ApplyResult> {
    const result = (await this.phase("billing_apply_ecf_status", {
      p_ecf_id: ecfId,
      p_status: snapshot.status,
      p_messages: snapshot.messages.length > 0 ? snapshot.messages : null,
      p_secuencia_utilizada: snapshot.secuenciaUtilizada,
      p_track_id: snapshot.trackId,
      p_status_code: snapshot.statusCode,
      p_security_code: snapshot.securityCode,
      p_signed_text: snapshot.signedDate,
      p_signed_at: parseSignedDate(snapshot.signedDate, lastSentAt),
      p_qr_url: snapshot.qrUrl,
      p_internal_track: snapshot.internalTrackId,
      p_updated_at: snapshot.updatedAt,
      p_doc_total: snapshot.documentTotal,
      p_doc_buyer: snapshot.buyerRnc,
    })) as { applied: boolean; dgii_status: string; ignored?: SnapshotProblem };
    return { dgiiStatus: result.dgii_status, applied: result.applied, ignored: result.ignored ?? null };
  }

  /**
   * Consulta individual. Si no hay confirmación del POST, la consulta en lote completa los datos
   * para comparar y es la única que puede decir que el proveedor no lo conoce.
   */
  async refresh(invoiceId: string): Promise<RefreshOutcome> {
    await this.authorize();
    const row = await this.activeRow(invoiceId);
    if (!row) return { final: true, changed: false, dgiiStatus: null };

    const isFinal = FINAL_STATUSES.includes(row.dgii_status);
    const incomplete = isFinal && (!row.security_code || !row.qr_code_url);
    if (isFinal && !incomplete) return { final: true, changed: false, dgiiStatus: row.dgii_status };
    if (row.provider_phase === "reservado" && row.send_attempts === 0) {
      return { final: false, changed: false, dgiiStatus: row.dgii_status };
    }

    const client = await this.client(ROW_ENVIRONMENT[row.environment]);
    const uncertain = row.provider_phase === "ambiguo" || row.provider_phase === "enviando" || row.provider_phase === "reservado";
    const waiting = (message?: string): RefreshOutcome => ({ final: isFinal, changed: false, dgiiStatus: row.dgii_status, message });

    const fromSnapshot = async (snapshot: DocumentSnapshot): Promise<RefreshOutcome> => {
      const result = await this.apply(row.id, snapshot, row.last_sent_at);
      if (result.ignored === "anterior" && uncertain) return this.notKnown(row);
      if (result.ignored) {
        return { final: isFinal, changed: result.ignored === "no_coincide", dgiiStatus: row.dgii_status, message: PROBLEM_MESSAGES[result.ignored] };
      }
      if (incomplete) {
        const filled = Boolean(snapshot.securityCode && snapshot.qrUrl);
        return {
          final: true,
          changed: Boolean(snapshot.securityCode || snapshot.qrUrl),
          dgiiStatus: result.dgiiStatus,
          message: filled ? undefined : "El proveedor no devuelve el dato que falta para este comprobante. Consúltalo en su portal.",
        };
      }
      return {
        final: FINAL_STATUSES.includes(result.dgiiStatus),
        changed: result.applied || uncertain || snapshot.status !== row.provider_status,
        dgiiStatus: result.dgiiStatus,
      };
    };

    const query = await client.getDocument(row.encf);
    if (query.kind === "failed") return waiting(query.message);
    if (!uncertain) return query.kind === "found" ? fromSnapshot(query.snapshot) : waiting(query.message);
    if (query.kind === "found" && query.snapshot.documentTotal !== null) return fromSnapshot(query.snapshot);

    const batch = await client.getBatch([row.encf]);
    if (batch.kind === "failed") return waiting(batch.message);
    const entry = batch.entries.find((e) => e.ecf === row.encf);
    if (entry?.found) {
      return fromSnapshot(query.kind === "found" ? mergeSnapshots(entry.snapshot, query.snapshot) : entry.snapshot);
    }
    if (!entry) return waiting("El proveedor no confirmó si tiene el documento. No se reenvía: vuelve a verificar más tarde.");
    return this.notKnown(row);
  }

  /** El proveedor no tiene rastro de este envío: pasado el plazo, se permite reenviar lo guardado. */
  private async notKnown(row: ActiveEcfRow): Promise<RefreshOutcome> {
    const pending = (message: string, changed = false): RefreshOutcome => ({ final: false, changed, dgiiStatus: row.dgii_status, message });
    if (row.provider_phase === "reservado") {
      return pending("El proveedor sigue sin reportar este envío: ya puedes reenviarlo o devolverlo a borrador.");
    }
    const age = Date.now() - new Date(row.last_sent_at ?? 0).getTime();
    if (age < NOT_RECEIVED_MIN_AGE_MS) {
      return pending("El proveedor aún no lo reporta, pero podría seguir procesándolo. Verifica de nuevo en unos minutos.");
    }
    await this.phase("billing_ecf_confirm_not_received", { p_ecf_id: row.id });
    return pending("El proveedor confirmó que no recibió el documento: ya puedes reenviarlo.", true);
  }

  /**
   * Revisión en lote de los pendientes. Nunca da nada por no recibido. La pedida a mano no filtra por
   * antigüedad, pero respeta el mismo límite por empresa: `throttled` dice que no se consultó.
   */
  async refreshPending(options: { manual?: boolean } = {}): Promise<{ checked: number; finalized: number; throttled?: boolean }> {
    await this.authorize();
    const last = lastBatchAt.get(this.companyId) ?? 0;
    if (Date.now() - last < BATCH_MIN_INTERVAL_MS) return { checked: 0, finalized: 0, throttled: true };
    lastBatchAt.set(this.companyId, Date.now());

    let query = this.db
      .from("ecf_invoices")
      .select("id, encf, environment, security_code, qr_code_url, last_sent_at")
      .eq("company_id", this.companyId)
      .eq("source", "proveedor")
      .in("dgii_status", ["pendiente", "enviado", "en_proceso"])
      // 'reservado' con intentos: ya salió una vez, y su confirmación de no recibido pudo quedar vieja.
      .in("provider_phase", ["enviado", "ambiguo", "enviando", "reservado"])
      .gt("send_attempts", 0);
    if (!options.manual) query = query.or(batchDueFilter(Date.now()));
    const { data, error } = await query.order("created_at").limit(MAX_BATCH_SIZE);
    fail(error);

    const rows = (data ?? []) as Pick<ActiveEcfRow, "id" | "encf" | "environment" | "security_code" | "qr_code_url" | "last_sent_at">[];
    let finalized = 0;
    for (const environment of new Set(rows.map((r) => r.environment))) {
      const group = rows.filter((r) => r.environment === environment);
      const client = await this.client(ROW_ENVIRONMENT[environment]);
      const batch = await client.getBatch(group.map((r) => r.encf));
      if (batch.kind === "failed") continue;

      for (const row of group) {
        const entry: BatchEntry | undefined = batch.entries.find((e) => e.ecf === row.encf);
        if (entry?.found) {
          const result = await this.apply(row.id, entry.snapshot, row.last_sent_at);
          if (result.applied) finalized += 1;
          // El lote omite el código y el QR de algunos estados finales: la consulta individual los trae.
          const missing = !(row.security_code ?? entry.snapshot.securityCode) || !(row.qr_code_url ?? entry.snapshot.qrUrl);
          if (result.applied && FINAL_STATUSES.includes(result.dgiiStatus) && result.dgiiStatus !== "rechazado" && missing) {
            const query = await client.getDocument(row.encf);
            if (query.kind === "found") await this.apply(row.id, query.snapshot, row.last_sent_at);
          }
        } else {
          // Solo anota la consulta, para respetar el ritmo.
          await this.phase("billing_apply_ecf_status", { p_ecf_id: row.id, p_status: null });
        }
      }
    }
    return { checked: rows.length, finalized };
  }

  // ---- Credenciales -------------------------------------------------------

  async saveCredentials(environment: DgiiEnvironmentCode, credentials: MSellerCredentials): Promise<void> {
    const { error } = await this.db.rpc("billing_save_provider_credentials", {
      p_company_id: this.companyId,
      p_environment: environment,
      p_ciphertext: encryptCredentials(this.companyId, environment, credentials),
      p_email_hint: emailHint(credentials.email),
    });
    fail(error);
  }

  async credentialsStatus(environment: DgiiEnvironmentCode): Promise<ProviderCredentialsStatus> {
    const { data, error } = await this.db
      .rpc("billing_provider_credentials_status", { p_company_id: this.companyId, p_environment: environment })
      .single();
    fail(error);
    const row = data as { configured: boolean; email_hint: string | null };
    return { configured: row.configured, emailHint: row.email_hint };
  }

  async testConnection(environment: DgiiEnvironmentCode): Promise<{ ok: boolean; message: string }> {
    const client = await this.client(environment);
    const result = await client.testConnection();
    return result.ok
      ? { ok: true, message: "Correo y contraseña correctos. La API Key se comprueba en el primer envío." }
      : { ok: false, message: result.message };
  }

  async hasNumberAvailable(prefix: string, environment: DgiiEnvironmentCode): Promise<boolean> {
    const { data, error } = await this.db.rpc("billing_ecf_has_number", {
      p_company_id: this.companyId,
      p_prefix: prefix,
      p_environment: environment,
    });
    fail(error);
    return Boolean(data);
  }
}

/** Qué pendientes toca revisar: los de la primera hora siempre, y los demás al ritmo del proveedor. */
export function batchDueFilter(now: number): string {
  const recheckedBefore = new Date(now - BATCH_RECHECK_MS).toISOString();
  const sentAfter = new Date(now - BATCH_RECENT_WINDOW_MS).toISOString();
  return `checked_at.is.null,checked_at.lt.${recheckedBefore},last_sent_at.gt.${sentAfter}`;
}

/** Un 400 sin explicación pudo deberse a que el número ya se usó en esa cuenta. */
function parkedMessage(encf: string, detail: string): string {
  return `${detail} El e-NCF ${encf} se apartó y no se volverá a usar: la próxima emisión tomará otro número. Revisa con el proveedor si ya estaba usado.`;
}
