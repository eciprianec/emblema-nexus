import "server-only";

import { createHash } from "node:crypto";
import { isDgiiQrUrl, type DgiiEnvironmentCode } from "@/domain/billing";

/**
 * Cliente HTTP de MSeller ECF. Es lo único que conoce sus rutas, encabezados y respuestas.
 *
 * La regla que manda: tras un POST sin respuesta clara no se sabe si el documento llegó,
 * y el API no tiene idempotencia. Por eso `send` distingue lo que seguro no llegó de lo
 * ambiguo, y nunca reintenta por su cuenta salvo un 401, que garantiza que no se procesó.
 * Ningún mensaje de este módulo incluye credenciales ni tokens.
 */

const BASE_URL = "https://ecf.api.mseller.app";
const ENVIRONMENT_PATHS: Record<DgiiEnvironmentCode, string> = { test: "TesteCF", cert: "CerteCF", prod: "eCF" };

const TIMEOUT_MS = 20_000;
/** La validación previa es opcional: no debe demorar el envío real. */
const VALIDATE_TIMEOUT_MS = 10_000;
/** El token dura 60 minutos; se renueva antes de que venza. */
const TOKEN_TTL_MS = 55 * 60 * 1000;

export const MAX_BATCH_SIZE = 100;

/** La documentación no fija el código HTTP de este error, solo su cuerpo. */
const VALIDATION_FAILED = "ECF_VALIDATION_FAILED";

const VALIDATION_LEAD = "El proveedor encontró datos inválidos en el comprobante.";

const RATE_LIMIT_MESSAGE =
  "El proveedor rechazó la solicitud por límite de uso. Si se agotó la cuota del mes, no aceptará envíos ni consultas hasta cambiar de plan o hasta el día 1 (hora UTC).";

export interface MSellerCredentials {
  email: string;
  password: string;
  apiKey: string;
}

export interface MSellerClientOptions {
  companyId: string;
  environment: DgiiEnvironmentCode;
  credentials: MSellerCredentials;
  /** Para pruebas. */
  fetchImpl?: typeof fetch;
}

export interface DgiiMessage {
  codigo: number | string | null;
  valor: string;
  /** En una validación del proveedor, lo que explica sobre ese campo. */
  detalle?: string;
}

export type SendOutcome =
  | { kind: "sent"; securityCode: string; signedDate: string | null; qrUrl: string | null; internalTrackId: string | null }
  /**
   * No se registró en el proveedor. `bad_request` es un 400 sin más explicación: nada documenta
   * por qué ocurrió, y un número ya usado en esa cuenta podría ser la causa.
   */
  | { kind: "not_sent"; reason: "validation" | "bad_request" | "auth" | "rate_limit" | "unreachable"; message: string; messages: DgiiMessage[] }
  /** Puede haber llegado: no se reenvía sin verificar. */
  | { kind: "ambiguous"; message: string };

export type ValidationOutcome = { blocked: false } | { blocked: true; message: string; messages: DgiiMessage[] };

export interface DocumentSnapshot {
  status: string;
  securityCode: string | null;
  qrUrl: string | null;
  signedDate: string | null;
  internalTrackId: string | null;
  trackId: string | null;
  statusCode: string | null;
  secuenciaUtilizada: boolean | null;
  messages: DgiiMessage[];
  /** Última actualización en el proveedor: permite saber si la respuesta es de este envío. */
  updatedAt: string | null;
  /** Total y comprador del documento que tiene el proveedor, para compararlos con lo guardado. */
  documentTotal: number | null;
  buyerRnc: string | null;
}

export type QueryOutcome =
  | { kind: "found"; snapshot: DocumentSnapshot }
  /** La consulta individual no documenta qué devuelve un documento desconocido: no prueba nada. */
  | { kind: "unclear"; message: string }
  | { kind: "failed"; message: string };

export type BatchEntry = { ecf: string; found: true; snapshot: DocumentSnapshot } | { ecf: string; found: false };

export type BatchOutcome = { kind: "ok"; entries: BatchEntry[] } | { kind: "failed"; message: string };

export type ConnectionOutcome = { ok: true } | { ok: false; message: string };

class AuthFailure extends Error {}
class Unreachable extends Error {}

interface CachedToken {
  idToken: string;
  expiresAt: number;
  fingerprint: string;
}

/** Por empresa y ambiente. Vive por instancia del servidor; autenticarse no consume cuota. */
const tokenCache = new Map<string, CachedToken>();

export function clearTokenCache(): void {
  tokenCache.clear();
}

/** El reemplazo solo existe para el proveedor simulado de desarrollo; en producción se ignora. */
export function resolveBaseUrl(environment: DgiiEnvironmentCode): string {
  const override = process.env.NODE_ENV !== "production" ? process.env.MSELLER_BASE_URL_OVERRIDE : undefined;
  return `${(override || BASE_URL).replace(/\/+$/, "")}/${ENVIRONMENT_PATHS[environment]}`;
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

function queryFailure(err: unknown): string {
  if (err instanceof AuthFailure || err instanceof Unreachable) return err.message;
  return isTimeout(err) ? "El proveedor no respondió a tiempo." : "No se pudo conectar con el proveedor.";
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await response.json();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** dgiiResponse llega como lista de JSON en texto (u objetos); lo más reciente va al final. */
function parseDgiiResponses(value: unknown): Pick<DocumentSnapshot, "trackId" | "statusCode" | "secuenciaUtilizada" | "messages"> {
  const result: Pick<DocumentSnapshot, "trackId" | "statusCode" | "secuenciaUtilizada" | "messages"> = {
    trackId: null,
    statusCode: null,
    secuenciaUtilizada: null,
    messages: [],
  };
  if (!Array.isArray(value)) return result;

  // El primer envío a la DGII responde {trackId, error, mensaje}: si falló, ahí está el motivo.
  const failures: DgiiMessage[] = [];

  for (const raw of value) {
    let entry: unknown = raw;
    if (typeof raw === "string") {
      try {
        entry = JSON.parse(raw);
      } catch {
        continue;
      }
    }
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    result.trackId = text(record.trackId) ?? result.trackId;
    for (const reason of [text(record.error), text(record.mensaje)]) {
      if (reason && !failures.some((f) => f.valor === reason)) failures.push({ codigo: null, valor: reason });
    }
    if (record.codigo !== undefined && record.codigo !== null) result.statusCode = String(record.codigo);
    if (typeof record.secuenciaUtilizada === "boolean") result.secuenciaUtilizada = record.secuenciaUtilizada;
    if (Array.isArray(record.mensajes)) {
      const messages = record.mensajes
        .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === "object")
        .map((m) => ({ codigo: (m.codigo as number | string | null) ?? null, valor: typeof m.valor === "string" ? m.valor : "" }))
        .filter((m) => m.valor.trim() !== "");
      if (messages.length > 0) result.messages = messages;
    }
  }
  result.messages = [...result.messages, ...failures];
  return result;
}

/** Un parámetro de la URL del QR; el proveedor no es constante con mayúsculas ni con la codificación. */
function qrParam(qrUrl: string | null, name: string): string | null {
  if (!qrUrl) return null;
  const match = new RegExp(`[?&]${name}=([^&]*)`, "i").exec(qrUrl);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function toIso(milliseconds: unknown): string | null {
  const value = typeof milliseconds === "string" ? Number(milliseconds) : milliseconds;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toAmount(value: unknown): number | null {
  const amount = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

/** La consulta no devuelve `signedDate`; la fecha de firma sí viaja en la URL del QR. */
export function signedDateFromQr(qrUrl: string | null): string | null {
  return qrParam(qrUrl, "fechafirma") || null;
}

/** La URL se imprime en un comprobante fiscal: solo se acepta la de la DGII. */
function safeQrUrl(value: unknown): string | null {
  const url = text(value);
  return isDgiiQrUrl(url) ? url : null;
}

function toSnapshot(body: Record<string, unknown>, status: string): DocumentSnapshot {
  const qrUrl = safeQrUrl(body.qr_url);
  return {
    status,
    securityCode: text(body.securityCode),
    qrUrl,
    signedDate: text(body.signedDate) ?? signedDateFromQr(qrUrl),
    internalTrackId: text(body.internalTrackId),
    updatedAt: toIso(body.updateAt),
    documentTotal: toAmount(body.invoiceTotal) ?? toAmount(qrParam(qrUrl, "montototal")),
    buyerRnc: text(body.buyerRnc) ?? qrParam(qrUrl, "rnccomprador"),
    ...parseDgiiResponses(body.dgiiResponse),
  };
}

/** Une lo que dicen la consulta en lote y la individual; ninguna trae siempre todos los datos. */
export function mergeSnapshots(primary: DocumentSnapshot, extra: DocumentSnapshot): DocumentSnapshot {
  return {
    status: primary.status,
    securityCode: primary.securityCode ?? extra.securityCode,
    qrUrl: primary.qrUrl ?? extra.qrUrl,
    signedDate: primary.signedDate ?? extra.signedDate,
    internalTrackId: primary.internalTrackId ?? extra.internalTrackId,
    trackId: primary.trackId ?? extra.trackId,
    statusCode: primary.statusCode ?? extra.statusCode,
    secuenciaUtilizada: primary.secuenciaUtilizada ?? extra.secuenciaUtilizada,
    messages: primary.messages.length > 0 ? primary.messages : extra.messages,
    updatedAt: primary.updatedAt ?? extra.updatedAt,
    documentTotal: primary.documentTotal ?? extra.documentTotal,
    buyerRnc: primary.buyerRnc ?? extra.buyerRnc,
  };
}

/** "1. [CODIGO] Campo: explicación | Details: {...}": la explicación solo viene en el texto. */
function validationDetail(raw: string, code: unknown, field: unknown): string | undefined {
  for (const line of raw.split("\n")) {
    const match = /^\s*\d+\.\s*\[([^\]]+)\]\s*([^:]*?)(?::\s*(.*?))?(?:\s*\|\s*Details:.*)?\s*$/.exec(line);
    if (match && match[1] === code && match[2] === field && match[3]) return match[3];
  }
  return undefined;
}

function validationMessages(body: Record<string, unknown> | null): DgiiMessage[] {
  const raw = text(body?.message)?.trim() ?? "";
  const details = body?.details as { validationErrors?: unknown } | undefined;
  if (!Array.isArray(details?.validationErrors) || details.validationErrors.length === 0) {
    return raw ? [{ codigo: VALIDATION_FAILED, valor: "ECF", detalle: raw }] : [];
  }
  return (details.validationErrors as Record<string, unknown>[]).map((e) => {
    const detalle = validationDetail(raw, e.code, e.field);
    return {
      codigo: typeof e.code === "string" ? e.code : null,
      valor: typeof e.field === "string" ? e.field : "ECF",
      ...(detalle ? { detalle } : {}),
    };
  });
}

export class MSellerClient {
  private readonly base: string;
  private readonly cacheKey: string;
  private readonly fingerprint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: MSellerClientOptions) {
    this.base = resolveBaseUrl(options.environment);
    this.cacheKey = `${options.companyId}:${options.environment}`;
    // Si cambian las credenciales, el token anterior deja de servir aunque no haya vencido.
    this.fingerprint = createHash("sha256")
      .update(`${options.credentials.email}\0${options.credentials.password}`)
      .digest("hex");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async authenticate(): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.base}/customer/authentication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.options.credentials.email, password: this.options.credentials.password }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // Una redirección reenviaría la contraseña a otro destino.
        redirect: "error",
        cache: "no-store",
      });
    } catch {
      throw new Unreachable("No se pudo conectar con el proveedor para autenticarse.");
    }
    if (response.status === 429) throw new AuthFailure(RATE_LIMIT_MESSAGE);
    if (response.status >= 500) throw new Unreachable("El proveedor no pudo autenticar la solicitud; inténtalo más tarde.");
    const body = await readJson(response);
    const idToken = text(body?.idToken);
    if (!response.ok || !idToken) {
      throw new AuthFailure("El proveedor rechazó el correo o la contraseña; revisa las credenciales en la configuración.");
    }
    tokenCache.set(this.cacheKey, { idToken, expiresAt: Date.now() + TOKEN_TTL_MS, fingerprint: this.fingerprint });
    return idToken;
  }

  private async token(): Promise<string> {
    const cached = tokenCache.get(this.cacheKey);
    if (cached && cached.fingerprint === this.fingerprint && cached.expiresAt > Date.now()) return cached.idToken;
    return this.authenticate();
  }

  /** Lanza AuthFailure o Unreachable si nunca se llegó a hacer la petición; los demás errores son de la petición. */
  private async request(path: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
    const attempt = (token: string) =>
      this.fetchImpl(`${this.base}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${token}`,
          "X-API-KEY": this.options.credentials.apiKey,
        },
        signal: AbortSignal.timeout(timeoutMs),
        // Una redirección podría repetir el POST; se trata como respuesta inesperada.
        redirect: "error",
        cache: "no-store",
      });

    const first = await attempt(await this.token());
    if (first.status !== 401) return first;

    // 401: el proveedor no procesó nada. Se reautentica una sola vez.
    tokenCache.delete(this.cacheKey);
    const fresh = await this.authenticate();
    return attempt(fresh);
  }

  /** Solo prueba correo y contraseña: la API Key no se usa en este paso y comprobarla gastaría cuota. */
  async testConnection(): Promise<ConnectionOutcome> {
    tokenCache.delete(this.cacheKey);
    try {
      await this.authenticate();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "No se pudo conectar con el proveedor." };
    }
  }

  /**
   * La validación del proveedor está en fase de pruebas: solo bloquea una respuesta con
   * ECF_VALIDATION_FAILED. Cualquier otro fallo de este paso se ignora; no consume secuencia.
   */
  async validate(rawBody: string): Promise<ValidationOutcome> {
    try {
      const response = await this.request(
        "/documentos-ecf?validate=true",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: rawBody },
        VALIDATE_TIMEOUT_MS
      );
      const body = await readJson(response);
      if (body?.code === VALIDATION_FAILED) {
        return {
          blocked: true,
          message: VALIDATION_LEAD,
          messages: validationMessages(body),
        };
      }
      return { blocked: false };
    } catch {
      return { blocked: false };
    }
  }

  async send(rawBody: string): Promise<SendOutcome> {
    let response: Response;
    try {
      response = await this.request("/documentos-ecf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: rawBody,
      });
    } catch (err) {
      // Solo la autenticación lanza estos dos: el documento nunca salió.
      if (err instanceof AuthFailure) return { kind: "not_sent", reason: "auth", message: err.message, messages: [] };
      if (err instanceof Unreachable) return { kind: "not_sent", reason: "unreachable", message: err.message, messages: [] };
      return {
        kind: "ambiguous",
        message: isTimeout(err)
          ? "El proveedor no respondió a tiempo: no se sabe si recibió el documento."
          : "Se perdió la conexión con el proveedor durante el envío: no se sabe si recibió el documento.",
      };
    }

    const body = await readJson(response);

    // Lo manda el cuerpo, no el código HTTP: la validación dejará de ser opcional en el envío real.
    if (body?.code === VALIDATION_FAILED) {
      return {
        kind: "not_sent",
        reason: "validation",
        message: VALIDATION_LEAD,
        messages: validationMessages(body),
      };
    }

    if (response.ok) {
      const securityCode = text(body?.securityCode);
      if (!body || !securityCode) {
        return { kind: "ambiguous", message: "El proveedor respondió sin código de seguridad: no se sabe si registró el documento." };
      }
      return {
        kind: "sent",
        // Tal cual: el código distingue mayúsculas y minúsculas.
        securityCode,
        signedDate: text(body.signedDate),
        qrUrl: safeQrUrl(body.qr_url),
        internalTrackId: text(body.internalTrackId),
      };
    }

    if (response.status === 429) {
      return { kind: "not_sent", reason: "rate_limit", message: RATE_LIMIT_MESSAGE, messages: [] };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        kind: "not_sent",
        reason: "auth",
        message:
          response.status === 403
            ? "El proveedor rechazó la API Key o no tiene permisos para este ambiente; revísala en la configuración."
            : "El proveedor rechazó la autenticación; revisa las credenciales en la configuración.",
        messages: [],
      };
    }
    if (response.status === 400) {
      return {
        kind: "not_sent",
        reason: "bad_request",
        message: text(body?.message)?.trim() ?? text(body?.error) ?? "El proveedor rechazó el documento sin indicar el motivo.",
        messages: validationMessages(body),
      };
    }

    // 5xx y cualquier otra respuesta no documentada para el envío.
    return {
      kind: "ambiguous",
      message:
        response.status >= 500
          ? "El proveedor tuvo un error interno: no se sabe si registró el documento."
          : "El proveedor dio una respuesta inesperada: no se sabe si registró el documento.",
    };
  }

  async getDocument(encf: string): Promise<QueryOutcome> {
    let response: Response;
    try {
      response = await this.request(`/documentos-ecf?ecf=${encodeURIComponent(encf)}`, { method: "GET" });
    } catch (err) {
      return { kind: "failed", message: queryFailure(err) };
    }
    if (response.status === 429) return { kind: "failed", message: RATE_LIMIT_MESSAGE };
    if (response.status === 401 || response.status === 403) {
      return { kind: "failed", message: "El proveedor rechazó las credenciales; revísalas en la configuración." };
    }
    if (!response.ok) return { kind: "unclear", message: "El proveedor no pudo responder la consulta; intenta más tarde." };

    const body = await readJson(response);
    const status = text(body?.status);
    if (!body || !status) return { kind: "unclear", message: "La consulta no devolvió el estado del documento." };
    // Una respuesta de otro comprobante no se aplica a este.
    if (text(body.ncf) && body.ncf !== encf) return { kind: "unclear", message: "La consulta devolvió otro comprobante." };
    return { kind: "found", snapshot: toSnapshot(body, status) };
  }

  /** Lo único documentado para saber que el proveedor no conoce un documento es `found: false`. */
  async getBatch(encfs: string[]): Promise<BatchOutcome> {
    if (encfs.length === 0) return { kind: "ok", entries: [] };
    if (encfs.length > MAX_BATCH_SIZE) throw new Error(`La consulta en lote admite hasta ${MAX_BATCH_SIZE} documentos.`);

    let response: Response;
    try {
      response = await this.request("/documentos-ecf/status/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ecfs: encfs }),
      });
    } catch (err) {
      return { kind: "failed", message: queryFailure(err) };
    }
    if (response.status === 429) return { kind: "failed", message: RATE_LIMIT_MESSAGE };
    if (!response.ok) return { kind: "failed", message: "El proveedor no pudo responder la consulta; intenta más tarde." };

    const body = await readJson(response);
    if (!Array.isArray(body?.results)) return { kind: "failed", message: "La consulta en lote no devolvió resultados." };

    const entries: BatchEntry[] = [];
    for (const result of body.results as Record<string, unknown>[]) {
      const ecf = text(result?.ecf);
      if (!ecf || !encfs.includes(ecf)) continue;
      if (result.found === false) {
        entries.push({ ecf, found: false });
      } else if (result.found === true) {
        const data = (result.data ?? {}) as Record<string, unknown>;
        const status = text(result.status) ?? text(data.status);
        if (status) entries.push({ ecf, found: true, snapshot: toSnapshot(data, status) });
      }
    }
    return { kind: "ok", entries };
  }
}
