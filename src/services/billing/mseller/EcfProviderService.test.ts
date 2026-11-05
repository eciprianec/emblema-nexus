import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FiscalDocument } from "@/domain/billing";
import { clearTokenCache } from "./client";
import { EcfProviderService, batchDueFilter, isServiceRoleConfigured, parseSignedDate, type ReservedDocument } from "./EcfProviderService";
import { encryptCredentials } from "./secrets";

const KEY = Buffer.alloc(32, 7).toString("base64");
const COMPANY_A = "11111111-1111-1111-1111-111111111111";
const USER = "22222222-2222-2222-2222-222222222222";
const INVOICE = "33333333-3333-3333-3333-333333333333";
const ECF = "44444444-4444-4444-4444-444444444444";
const ENCF = "E310000000001";
const credentials = { email: "emisor@empresa.do", password: "clave-secreta", apiKey: "api-key-secreta" };

type Row = {
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
  company_id?: string;
};

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: ECF,
    encf: ENCF,
    environment: "DEV",
    dgii_status: "pendiente",
    provider_phase: "reservado",
    provider_status: null,
    security_code: null,
    qr_code_url: null,
    send_attempts: 0,
    last_sent_at: null,
    company_id: COMPANY_A,
    ...overrides,
  };
}

interface Harness {
  service: EcfProviderService;
  userRpc: ReturnType<typeof vi.fn>;
  adminRpc: ReturnType<typeof vi.fn>;
  filters: Record<string, unknown>[];
  selects: string[];
  has: ReturnType<typeof vi.fn>;
  adminFactory: ReturnType<typeof vi.fn>;
}

/** Sesión del usuario y service role por separado, para ver qué pasa por cada uno. */
function harness(options: {
  rows?: Row[];
  permissions?: string[];
  adminResults?: Record<string, unknown>;
  reserved?: { ecf_id: string; encf: string; environment: string };
  companyId?: string;
} = {}): Harness {
  const companyId = options.companyId ?? COMPANY_A;
  const filters: Record<string, unknown>[] = [];
  const selects: string[] = [];
  const rows = options.rows ?? [row()];

  const from = () => {
    const applied: Record<string, unknown> = {};
    filters.push(applied);
    const builder = {
      select: (columns: string) => {
        selects.push(columns);
        return builder;
      },
      eq: (column: string, value: unknown) => {
        applied[column] = value;
        return builder;
      },
      neq: () => builder,
      in: () => builder,
      gt: () => builder,
      or: (filter: string) => {
        applied.or = filter;
        return builder;
      },
      order: () => builder,
      limit: () => Promise.resolve({ data: rows.filter((r) => r.company_id === applied.company_id), error: null }),
      maybeSingle: () => {
        // La misma regla que el filtro real: solo lo de la empresa pedida.
        const found = rows.filter((r) => r.company_id === applied.company_id);
        return Promise.resolve({ data: found[0] ?? null, error: null });
      },
    };
    return builder;
  };

  const userRpc = vi.fn(async (name: string) => {
    if (name === "billing_read_provider_credentials") {
      return { data: encryptCredentials(companyId, "test", credentials), error: null };
    }
    if (name === "billing_reserve_ecf") {
      return { data: options.reserved ?? { ecf_id: ECF, encf: ENCF, environment: "test" }, error: null };
    }
    throw new Error(`RPC inesperada con la sesión del usuario: ${name}`);
  });

  const adminRpc = vi.fn(async (name: string, args: { p_raw?: string }) => {
    const results: Record<string, unknown> = {
      billing_ecf_store_payload: args?.p_raw,
      billing_ecf_begin_send: { raw: '{"ECF":{}}', attempt: 1 },
      billing_apply_ecf_status: { applied: true, dgii_status: "enviado", invoice_status: "en_proceso" },
      ...options.adminResults,
    };
    return { data: results[name] ?? null, error: null };
  });

  const permissions = options.permissions ?? ["ecf.emit", "finance.create"];
  const has = vi.fn(async (permission: string) => permissions.includes(permission));
  const adminFactory = vi.fn(() => ({ rpc: adminRpc }) as unknown as SupabaseClient);

  const reservedDoc: ReservedDocument = {
    document: {
      fiscalType: "31",
      issueDate: "2026-11-01",
      currency: "DOP",
      exchangeRate: 1,
      incomeType: "01",
      paymentType: 1,
      buyer: { taxId: "131880738", name: "Cliente" },
      lines: [{ description: "Honorarios", quantity: 1, unitPrice: 1000, billingIndicator: 1, goodOrService: 2 }],
    } as unknown as FiscalDocument,
    emitter: { rnc: "131880738", legalName: "Empresa", address: "Santo Domingo" } as ReservedDocument["emitter"],
    sequenceExpiry: "2028-12-31",
  };

  const service = new EcfProviderService(
    { db: { rpc: userRpc, from } as unknown as SupabaseClient, companyId, userId: USER, has },
    async () => reservedDoc,
    adminFactory as unknown as () => SupabaseClient
  );
  return { service, userRpc, adminRpc, filters, selects, has, adminFactory };
}

const adminCall = (h: Harness, name: string) => h.adminRpc.mock.calls.find(([called]) => called === name)?.[1];
const adminNames = (h: Harness) => h.adminRpc.mock.calls.map(([called]) => called as string);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Proveedor simulado por ruta; cada prueba solo define lo que le importa. */
function provider(routes: { send?: () => Response | Promise<Response>; get?: () => Response; batch?: () => Response }) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("/customer/authentication")) return jsonResponse(200, { idToken: "token" });
      if (url.includes("/status/batch")) return (routes.batch ?? (() => jsonResponse(500, {})))();
      if (url.includes("validate=true")) return jsonResponse(200, { valid: true });
      if (init?.method === "POST") return (routes.send ?? (() => jsonResponse(500, {})))();
      return (routes.get ?? (() => jsonResponse(404, {})))();
    })
  );
  return calls;
}

const SENT = { rnc: "131880738", ecf: ENCF, internalTrackId: "t", securityCode: "aB3xYz", qr_url: "https://ecf.dgii.gov.do/testecf/consultatimbre?x=1", signedDate: "14-05-2026 02:57:33" };
const batchFound = (data: Record<string, unknown>) => () =>
  jsonResponse(200, { total: 1, results: [{ ecf: ENCF, status: data.status, found: true, data }] });
const batchMissing = () => jsonResponse(200, { total: 1, results: [{ ecf: ENCF, status: null, found: false }] });

beforeEach(() => {
  clearTokenCache();
  vi.stubEnv("BILLING_SECRETS_KEY", KEY);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-de-prueba");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("service role", () => {
  it("sin permiso del usuario no se llega a usar el service role", async () => {
    const h = harness({ permissions: [] });
    for (const action of [() => h.service.emit(INVOICE, "test"), () => h.service.refresh(INVOICE), () => h.service.resend(INVOICE), () => h.service.discard(INVOICE), () => h.service.refreshPending()]) {
      await expect(action()).rejects.toThrow(/No tienes permiso/);
    }
    expect(h.adminFactory).not.toHaveBeenCalled();
    expect(h.userRpc).not.toHaveBeenCalled();
  });

  it("cualquiera de los dos permisos basta", async () => {
    const h = harness({ permissions: ["ecf.emit"] });
    provider({ send: () => jsonResponse(200, SENT) });
    await expect(h.service.emit(INVOICE, "test")).resolves.toMatchObject({ state: "en_proceso" });
  });

  it("la reserva va con la sesión del usuario; las fases, por service role con empresa y usuario", async () => {
    const h = harness();
    provider({ send: () => jsonResponse(200, SENT) });
    await h.service.emit(INVOICE, "test");
    expect(h.userRpc.mock.calls.map(([name]) => name)).toEqual(["billing_read_provider_credentials", "billing_reserve_ecf"]);
    expect(adminNames(h)).toEqual(["billing_ecf_store_payload", "billing_ecf_begin_send", "billing_ecf_record_sent"]);
    for (const [, args] of h.adminRpc.mock.calls) {
      expect(args).toMatchObject({ p_company_id: COMPANY_A, p_actor: USER });
    }
  });

  it("el documento se arma en el servidor, y lo guardado no se lee con la sesión del usuario", async () => {
    const h = harness({ rows: [row({ send_attempts: 1, provider_phase: "enviado" })] });
    provider({ get: () => jsonResponse(200, { status: "En Cola", ncf: ENCF, updateAt: Date.now() }) });
    await h.service.refresh(INVOICE);
    expect(h.selects.join(" ")).not.toContain("provider_payload");

    const fresh = harness();
    provider({ send: () => jsonResponse(200, SENT) });
    await fresh.service.emit(INVOICE, "test");
    expect(JSON.parse(adminCall(fresh, "billing_ecf_store_payload").p_raw).ECF.Encabezado.IdDoc.eNCF).toBe(ENCF);
  });

  it("sin la clave lo dice claro y no toma número", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(isServiceRoleConfigured()).toBe(false);
    const h = harness();
    await expect(h.service.emit(INVOICE, "test")).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(h.userRpc).not.toHaveBeenCalled();
  });
});

describe("otra empresa", () => {
  it("con la empresa activa cambiada, la factura de otra no se consulta con las credenciales equivocadas", async () => {
    const other = "99999999-9999-9999-9999-999999999999";
    const h = harness({ companyId: other, rows: [row({ company_id: COMPANY_A, provider_phase: "enviado", send_attempts: 1 })] });
    const calls = provider({ get: () => jsonResponse(200, { status: "Aceptado", ncf: ENCF, updateAt: Date.now() }) });

    await expect(h.service.refresh(INVOICE)).resolves.toMatchObject({ final: true, changed: false, dgiiStatus: null });
    await expect(h.service.resend(INVOICE)).rejects.toThrow(/no tiene un e-CF pendiente/);
    await expect(h.service.discard(INVOICE)).rejects.toThrow(/no tiene un e-CF pendiente/);

    expect(h.filters.every((f) => f.company_id === other)).toBe(true);
    expect(calls).toEqual([]);
    expect(h.adminRpc).not.toHaveBeenCalled();
  });
});

describe("liberar el número", () => {
  it("el intento que sabe que falló libera con su número de intento", async () => {
    const h = harness();
    provider({ send: () => jsonResponse(403, {}) });
    await expect(h.service.emit(INVOICE, "test")).resolves.toMatchObject({ state: "devuelto" });
    expect(adminCall(h, "billing_release_ecf")).toMatchObject({ p_send_attempt: 1, p_park: false });
  });

  it.each(["enviando", "ambiguo", "enviado"])("volver a borrador en fase %s se niega", async (phase) => {
    const h = harness({ rows: [row({ provider_phase: phase, send_attempts: 1, last_sent_at: new Date().toISOString() })] });
    await expect(h.service.discard(INVOICE)).rejects.toThrow(/verifica su estado/);
    expect(h.adminRpc).not.toHaveBeenCalled();
  });

  it("sin nada enviado se vuelve a borrador sin consultar al proveedor", async () => {
    const h = harness();
    const calls = provider({});
    await h.service.discard(INVOICE);
    expect(calls).toEqual([]);
    expect(adminCall(h, "billing_release_ecf")).toMatchObject({ p_park: false, p_reason: "Se devolvió a borrador sin enviarlo al proveedor." });
    expect(adminCall(h, "billing_release_ecf").p_send_attempt).toBeUndefined();
  });

  it("un 400 sin ECF_VALIDATION_FAILED aparta el número y lo dice", async () => {
    const h = harness();
    provider({ send: () => jsonResponse(400, { message: "Documento duplicado" }) });
    const outcome = await h.service.emit(INVOICE, "test");
    expect(outcome.state).toBe("devuelto");
    expect(outcome.message).toContain("Documento duplicado");
    expect(outcome.message).toContain(`${ENCF} se apartó`);
    expect(outcome.message).toContain("tomará otro número");
    expect(adminCall(h, "billing_release_ecf")).toMatchObject({ p_park: true, p_send_attempt: 1 });
  });

  it("ECF_VALIDATION_FAILED en el envío real sí devuelve el número a la bolsa", async () => {
    const h = harness();
    provider({ send: () => jsonResponse(422, { code: "ECF_VALIDATION_FAILED", message: "Campo inválido" }) });
    await expect(h.service.emit(INVOICE, "test")).resolves.toMatchObject({
      state: "devuelto",
      message: "El proveedor encontró datos inválidos en el comprobante.",
      messages: [{ detalle: "Campo inválido" }],
    });
    expect(adminCall(h, "billing_release_ecf")).toMatchObject({ p_park: false });
  });

  it("un resultado ambiguo no libera", async () => {
    const h = harness();
    provider({ send: () => jsonResponse(500, {}) });
    await expect(h.service.emit(INVOICE, "test")).resolves.toMatchObject({ state: "ambiguo" });
    expect(adminNames(h)).toContain("billing_ecf_mark_ambiguous");
    expect(adminNames(h)).not.toContain("billing_release_ecf");
  });
});

describe("lo que ya salió alguna vez", () => {
  const sentBefore = row({ provider_phase: "reservado", send_attempts: 1, last_sent_at: new Date(Date.now() - 3_600_000).toISOString() });

  it.each([400, 403, 429])("un %i en un reenvío no libera: vuelve a reservado", async (status) => {
    const h = harness({ rows: [sentBefore], adminResults: { billing_ecf_begin_send: { raw: "{}", attempt: 2 } } });
    provider({ batch: batchMissing, send: () => jsonResponse(status, { message: "No" }) });
    const outcome = await h.service.resend(INVOICE);
    expect(outcome.state).toBe("sin_enviar");
    expect(adminCall(h, "billing_ecf_send_refused")).toMatchObject({ p_send_attempt: 2 });
    expect(adminNames(h)).not.toContain("billing_release_ecf");
    expect(adminNames(h)).not.toContain("billing_ecf_store_payload");
  });

  it("reenviar consulta antes; si la consulta falla, no se reenvía", async () => {
    const h = harness({ rows: [sentBefore] });
    const calls = provider({ batch: () => jsonResponse(500, {}) });
    await expect(h.service.resend(INVOICE)).rejects.toThrow(/No se pudo confirmar/);
    expect(adminNames(h)).toEqual([]);
    expect(calls.filter((c) => c.endsWith("/documentos-ecf"))).toEqual([]);
  });

  it("descartar consulta antes; si la consulta falla, no se descarta", async () => {
    const h = harness({ rows: [sentBefore] });
    provider({ batch: () => jsonResponse(429, {}) });
    await expect(h.service.discard(INVOICE)).rejects.toThrow(/No se pudo confirmar/);
    expect(adminNames(h)).not.toContain("billing_release_ecf");
  });

  it("si el documento apareció, se aplica su estado en vez de reenviar", async () => {
    const h = harness({ rows: [sentBefore], adminResults: { billing_apply_ecf_status: { applied: true, dgii_status: "aceptado" } } });
    const calls = provider({ batch: batchFound({ status: "Aceptado", ncf: ENCF, updateAt: Date.now(), invoiceTotal: 1180 }) });
    await expect(h.service.resend(INVOICE)).resolves.toMatchObject({ state: "en_proceso" });
    expect(adminNames(h)).toEqual(["billing_apply_ecf_status"]);
    expect(calls.filter((c) => c.startsWith("POST") && c.endsWith("/documentos-ecf"))).toEqual([]);

    const again = harness({ rows: [sentBefore], adminResults: { billing_apply_ecf_status: { applied: true, dgii_status: "aceptado" } } });
    await expect(again.service.discard(INVOICE)).rejects.toThrow(/sí tiene este documento/);
    expect(adminNames(again)).not.toContain("billing_release_ecf");
  });

  it("con un documento anterior a este envío, descartar aparta el número", async () => {
    const h = harness({ rows: [sentBefore], adminResults: { billing_apply_ecf_status: { applied: false, ignored: "anterior", dgii_status: "enviado" } } });
    provider({ batch: batchFound({ status: "Rechazado", ncf: ENCF, updateAt: 1_000, invoiceTotal: 1180 }) });
    await h.service.discard(INVOICE);
    expect(adminCall(h, "billing_release_ecf")).toMatchObject({ p_park: true });
  });

  it("si lo encontrado no coincide, no se reenvía ni se descarta", async () => {
    const h = harness({ rows: [sentBefore], adminResults: { billing_apply_ecf_status: { applied: false, ignored: "no_coincide", dgii_status: "enviado" } } });
    provider({ batch: batchFound({ status: "Aceptado", ncf: ENCF, updateAt: Date.now(), invoiceTotal: 1 }) });
    await expect(h.service.resend(INVOICE)).rejects.toThrow(/otro total o comprador/);
    await expect(h.service.discard(INVOICE)).rejects.toThrow(/otro total o comprador/);
    expect(adminNames(h)).not.toContain("billing_release_ecf");
  });

  it("refresh también consulta una fila reservada que ya salió", async () => {
    const h = harness({ rows: [sentBefore] });
    const calls = provider({ get: () => jsonResponse(404, {}), batch: batchMissing });
    const outcome = await h.service.refresh(INVOICE);
    expect(calls.some((c) => c.includes("/status/batch"))).toBe(true);
    expect(outcome.message).toMatch(/sigue sin reportar/);
    expect(adminNames(h)).not.toContain("billing_ecf_confirm_not_received");
  });
});

describe("respuestas que no prueban nada", () => {
  const ambiguous = (age: number) => row({ provider_phase: "ambiguo", send_attempts: 1, last_sent_at: new Date(Date.now() - age).toISOString() });
  const OLD_REJECTED = { status: "Rechazado", ncf: ENCF, updateAt: 1_000, invoiceTotal: 1180, dgiiResponse: ['{"secuenciaUtilizada":false}'] };

  it("pasa a la base de datos lo necesario para comprobar el envío", async () => {
    const h = harness({ rows: [ambiguous(60_000)] });
    provider({ get: () => jsonResponse(200, { ...OLD_REJECTED, buyerRnc: "131880738", internalTrackId: "int", dgiiResponse: ['{"trackId":"trk"}'] }) });
    await h.service.refresh(INVOICE);
    expect(adminCall(h, "billing_apply_ecf_status")).toMatchObject({
      p_ecf_id: ECF,
      p_status: "Rechazado",
      p_updated_at: new Date(1_000).toISOString(),
      p_doc_total: 1180,
      p_doc_buyer: "131880738",
      p_internal_track: "int",
      p_track_id: "trk",
    });
  });

  it("un rechazo anterior a este envío no se da por no recibido antes de los 5 minutos", async () => {
    const h = harness({ rows: [ambiguous(60_000)], adminResults: { billing_apply_ecf_status: { applied: false, ignored: "anterior", dgii_status: "pendiente" } } });
    provider({ get: () => jsonResponse(200, OLD_REJECTED) });
    const outcome = await h.service.refresh(INVOICE);
    expect(outcome).toMatchObject({ final: false, changed: false });
    expect(outcome.message).toMatch(/podría seguir procesándolo/);
    expect(adminNames(h)).toEqual(["billing_apply_ecf_status"]);
  });

  it("pasados los 5 minutos, un documento anterior no deja atascado el comprobante", async () => {
    const h = harness({ rows: [ambiguous(600_000)], adminResults: { billing_apply_ecf_status: { applied: false, ignored: "anterior", dgii_status: "pendiente" } } });
    provider({ get: () => jsonResponse(200, OLD_REJECTED) });
    await h.service.refresh(INVOICE);
    expect(adminNames(h)).toEqual(["billing_apply_ecf_status", "billing_ecf_confirm_not_received"]);
  });

  it.each(["sin_prueba", "no_coincide"])("con %s no se confirma nada y se explica", async (ignored) => {
    const h = harness({ rows: [ambiguous(600_000)], adminResults: { billing_apply_ecf_status: { applied: false, ignored, dgii_status: "pendiente" } } });
    provider({ get: () => jsonResponse(200, { status: "Aceptado", ncf: ENCF, updateAt: Date.now(), invoiceTotal: 5 }) });
    const outcome = await h.service.refresh(INVOICE);
    expect(outcome.final).toBe(false);
    expect(outcome.message).toBeTruthy();
    expect(adminNames(h)).toEqual(["billing_apply_ecf_status"]);
  });

  it("sin datos para comparar en la consulta individual, completa con el lote", async () => {
    const h = harness({ rows: [ambiguous(60_000)] });
    provider({
      get: () => jsonResponse(200, { status: "Rechazado", ncf: ENCF, updateAt: Date.now(), internalTrackId: "int" }),
      batch: batchFound({ status: "Rechazado", ncf: ENCF, updateAt: Date.now(), invoiceTotal: 1180, buyerRnc: "131880738" }),
    });
    await h.service.refresh(INVOICE);
    expect(adminCall(h, "billing_apply_ecf_status")).toMatchObject({ p_doc_total: 1180, p_doc_buyer: "131880738", p_internal_track: "int" });
  });

  it("solo found:false con 5 minutos confirma que no se recibió", async () => {
    const young = harness({ rows: [ambiguous(60_000)] });
    provider({ get: () => jsonResponse(404, {}), batch: batchMissing });
    await young.service.refresh(INVOICE);
    expect(adminNames(young)).toEqual([]);

    const old = harness({ rows: [ambiguous(600_000)] });
    await old.service.refresh(INVOICE);
    expect(adminNames(old)).toEqual(["billing_ecf_confirm_not_received"]);
  });
});

describe("datos que faltan en un e-CF final", () => {
  it("refresh corre sobre un final al que le falta el código o el QR", async () => {
    const h = harness({ rows: [row({ dgii_status: "condicional", provider_phase: "enviado", send_attempts: 1 })], adminResults: { billing_apply_ecf_status: { applied: false, dgii_status: "condicional" } } });
    provider({ get: () => jsonResponse(200, { status: "Aceptado Condicional", ncf: ENCF, updateAt: Date.now(), securityCode: "abcDEF", qr_url: SENT.qr_url }) });
    const outcome = await h.service.refresh(INVOICE);
    expect(outcome).toMatchObject({ final: true, changed: true });
    expect(adminCall(h, "billing_apply_ecf_status")).toMatchObject({ p_security_code: "abcDEF", p_qr_url: SENT.qr_url });
  });

  it("dice si el proveedor tampoco lo devuelve", async () => {
    const h = harness({ rows: [row({ dgii_status: "aceptado", provider_phase: "enviado", send_attempts: 1 })], adminResults: { billing_apply_ecf_status: { applied: false, dgii_status: "aceptado" } } });
    provider({ get: () => jsonResponse(200, { status: "Aceptado", ncf: ENCF, updateAt: Date.now() }) });
    expect((await h.service.refresh(INVOICE)).message).toMatch(/no devuelve el dato/);
  });

  it("un final completo no gasta consultas", async () => {
    const h = harness({ rows: [row({ dgii_status: "aceptado", provider_phase: "enviado", send_attempts: 1, security_code: "x", qr_code_url: SENT.qr_url })] });
    const calls = provider({});
    await expect(h.service.refresh(INVOICE)).resolves.toMatchObject({ final: true, changed: false });
    expect(calls).toEqual([]);
  });

  it("si el lote finaliza sin código ni QR, los pide a la consulta individual", async () => {
    const company = "55555555-5555-5555-5555-555555555555";
    const pending = row({ provider_phase: "ambiguo", send_attempts: 1, last_sent_at: new Date().toISOString(), company_id: company });
    const h = harness({ companyId: company, rows: [pending], adminResults: { billing_apply_ecf_status: { applied: true, dgii_status: "condicional" } } });
    const calls = provider({
      batch: batchFound({ status: "Aceptado Condicional", ncf: ENCF, updateAt: Date.now(), invoiceTotal: 1180 }),
      get: () => jsonResponse(200, { status: "Aceptado Condicional", ncf: ENCF, updateAt: Date.now(), securityCode: "abcDEF", qr_url: SENT.qr_url }),
    });
    await expect(h.service.refreshPending()).resolves.toEqual({ checked: 1, finalized: 1 });
    expect(calls.some((c) => c.startsWith("GET") && c.includes(`ecf=${ENCF}`))).toBe(true);
    const applied = h.adminRpc.mock.calls.filter(([name]) => name === "billing_apply_ecf_status");
    expect(applied).toHaveLength(2);
    expect(applied[1][1]).toMatchObject({ p_security_code: "abcDEF" });
  });

  describe("qué revisa el lote", () => {
    /** Evalúa el filtro como lo haría la API: basta con cumplir una de las condiciones. */
    const isDue = (now: number, checkedAgoMs: number | null, sentAgoMs: number) => {
      const checkedAt = checkedAgoMs === null ? null : new Date(now - checkedAgoMs).toISOString();
      const sentAt = new Date(now - sentAgoMs).toISOString();
      return batchDueFilter(now).split(",").some((condition) => {
        const [column, operator, ...rest] = condition.split(".");
        const value = rest.join(".");
        const actual = column === "checked_at" ? checkedAt : sentAt;
        if (operator === "is") return actual === null;
        if (actual === null) return false;
        return operator === "lt" ? actual < value : actual > value;
      });
    };
    const now = Date.parse("2026-11-04T15:00:00Z");
    const MINUTE = 60_000;

    it("un recién enviado se revisa aunque la página acabe de consultarlo", () => {
      expect(isDue(now, 10_000, 30_000)).toBe(true);
      expect(isDue(now, MINUTE, 5 * MINUTE)).toBe(true);
    });

    it("pasada la primera hora vuelve al ritmo del proveedor", () => {
      expect(isDue(now, 5 * MINUTE, 120 * MINUTE)).toBe(false);
      expect(isDue(now, 16 * MINUTE, 120 * MINUTE)).toBe(true);
    });

    it("lo que nunca se consultó siempre toca", () => {
      expect(isDue(now, null, 120 * MINUTE)).toBe(true);
    });

    it("la lista aplica ese filtro; pedirlo a mano no filtra, pero respeta el límite", async () => {
      const company = "77777777-7777-7777-7777-777777777777";
      const pending = row({ provider_phase: "enviado", send_attempts: 1, last_sent_at: new Date().toISOString(), company_id: company });
      const auto = harness({ companyId: company, rows: [pending], adminResults: { billing_apply_ecf_status: { applied: true, dgii_status: "aceptado" } } });
      provider({ batch: batchFound({ status: "Aceptado", ncf: ENCF, updateAt: Date.now(), invoiceTotal: 1180, securityCode: "abcDEF", qr_url: SENT.qr_url }) });
      await expect(auto.service.refreshPending()).resolves.toEqual({ checked: 1, finalized: 1 });
      expect(auto.filters.some((f) => String(f.or).includes("last_sent_at.gt."))).toBe(true);

      const again = harness({ companyId: company, rows: [pending] });
      await expect(again.service.refreshPending({ manual: true })).resolves.toEqual({ checked: 0, finalized: 0, throttled: true });

      const other = "88888888-8888-8888-8888-888888888888";
      const manual = harness({ companyId: other, rows: [row({ ...pending, company_id: other })], adminResults: { billing_apply_ecf_status: { applied: false, dgii_status: "enviado" } } });
      provider({ batch: batchFound({ status: "En Proceso", ncf: ENCF, updateAt: Date.now(), invoiceTotal: 1180 }) });
      await expect(manual.service.refreshPending({ manual: true })).resolves.toEqual({ checked: 1, finalized: 0 });
      expect(manual.filters.some((f) => "or" in f)).toBe(false);
    });
  });

  it("el lote no da nada por no recibido", async () => {
    const company = "66666666-6666-6666-6666-666666666666";
    const pending = row({ provider_phase: "ambiguo", send_attempts: 1, last_sent_at: new Date(Date.now() - 3_600_000).toISOString(), company_id: company });
    const h = harness({ companyId: company, rows: [pending] });
    provider({ batch: batchMissing });
    await h.service.refreshPending();
    expect(adminNames(h)).toEqual(["billing_apply_ecf_status"]);
    expect(adminCall(h, "billing_apply_ecf_status")).toMatchObject({ p_status: null });
  });
});

describe("ambiente", () => {
  it("el envío usa el ambiente que devolvió la reserva", async () => {
    const h = harness({ reserved: { ecf_id: ECF, encf: ENCF, environment: "cert" } });
    h.userRpc.mockImplementation(async (name: string, args: { p_environment?: string }) => {
      if (name === "billing_read_provider_credentials") {
        return { data: encryptCredentials(COMPANY_A, args.p_environment as string, credentials), error: null };
      }
      return { data: { ecf_id: ECF, encf: ENCF, environment: "cert" }, error: null };
    });
    const calls = provider({ send: () => jsonResponse(200, SENT) });
    await h.service.emit(INVOICE, "test");
    expect(calls.some((c) => c.includes("/CerteCF/documentos-ecf"))).toBe(true);
    expect(calls.some((c) => c.includes("/TesteCF/documentos-ecf"))).toBe(false);
  });
});

describe("fecha de firma", () => {
  it("sin referencia conserva la lectura de 24 horas", () => {
    expect(parseSignedDate("14-05-2025 15:26:18")).toBe("2025-05-14T15:26:18-04:00");
    expect(parseSignedDate("14-05-2025 03:26:18")).toBe("2025-05-14T03:26:18-04:00");
    expect(parseSignedDate("no es fecha")).toBeNull();
    expect(parseSignedDate(null)).toBeNull();
  });

  it("toma la lectura más cercana al envío: el ejemplo del proveedor parece de 12 horas", () => {
    // createdAt del ejemplo: 15:26:18 en RD, con FechaFirma 03:26:18.
    const sentAt = new Date(1747250778433).toISOString();
    expect(parseSignedDate("14-05-2025 03:26:18", sentAt)).toBe(new Date("2025-05-14T15:26:18-04:00").toISOString());
    expect(new Date(parseSignedDate("14-05-2025 15:26:18", sentAt) as string).getTime()).toBe(new Date("2025-05-14T15:26:18-04:00").getTime());
    // Mediodía o medianoche: 12:xx también puede ser 00:xx.
    const earlyMorning = new Date("2025-05-14T00:30:00-04:00").toISOString();
    expect(parseSignedDate("14-05-2025 12:30:00", earlyMorning)).toBe(new Date("2025-05-14T00:30:00-04:00").toISOString());
  });
});
