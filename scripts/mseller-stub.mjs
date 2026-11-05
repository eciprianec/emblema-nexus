#!/usr/bin/env node
// Proveedor MSeller simulado, solo para desarrollo local. No firma ni habla con la DGII.
// Implementa lo que usa la aplicación, con las formas de respuesta de la documentación.
//
//   node scripts/mseller-stub.mjs            # escucha en 127.0.0.1:4010
//   MSELLER_BASE_URL_OVERRIDE=http://127.0.0.1:4010 npm run dev
//
// La API Key válida es "stub-api-key" (STUB_API_KEY); cualquier otra, o ninguna, recibe 403.
// La contraseña "incorrecta" falla al autenticar.
//
// Se configura con variables de entorno al arrancar o con POST /__stub/config y un JSON:
//   outcome          Resultado de la DGII para lo que llegue después: Aceptado (por defecto),
//                    "Aceptado Condicional", Rechazado, RechazadoReusable, "No encontrado", Error.
//                    También POST /__stub/outcome con el nombre en texto. (STUB_OUTCOME)
//   delayMs          Tiempo hasta el resultado. Antes pasa por En Cola, Enviado a la DGII y
//                    En Proceso, en tercios. (STUB_DELAY_MS, 3000)
//   duplicateStatus  Qué responde un POST de un e-NCF que ya tiene un documento vigente. Reenviar
//                    uno Rechazado o con Error lo reemplaza, como dice la documentación; lo demás
//                    no está documentado. (STUB_DUPLICATE_STATUS, 400)
//   validation       ok; fail: ?validate=true responde ECF_VALIDATION_FAILED; fail-post: también
//                    el envío real, porque la validación dejará de ser opcional. (STUB_VALIDATION)
//   validationStatus Código HTTP de ese error, que la documentación no fija. (STUB_VALIDATION_STATUS, 400)
//   sendFailure      none; lost: 500 sin registrar; landed: 500 después de registrar;
//                    hang: registra y no responde, para agotar el tiempo. (STUB_SEND_FAILURE)
//
// GET /__stub/log devuelve las llamadas recibidas y POST /__stub/reset borra los documentos.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.STUB_PORT ?? 4010);
const API_KEY = process.env.STUB_API_KEY ?? "stub-api-key";
const CONSUMER_THRESHOLD = 250_000;

const config = {
  outcome: process.env.STUB_OUTCOME ?? "Aceptado",
  delayMs: Number(process.env.STUB_DELAY_MS ?? 3000),
  duplicateStatus: Number(process.env.STUB_DUPLICATE_STATUS ?? 400),
  validation: process.env.STUB_VALIDATION ?? "ok",
  validationStatus: Number(process.env.STUB_VALIDATION_STATUS ?? 400),
  sendFailure: process.env.STUB_SEND_FAILURE ?? "none",
};

const documents = new Map();
const log = [];

const DGII_PATHS = { TesteCF: "testecf", CerteCF: "certecf", eCF: "ecf" };

const OUTCOMES = {
  Aceptado: { status: "Aceptado", codigo: "1", secuenciaUtilizada: true, mensajes: [{ valor: "", codigo: 0 }] },
  "Aceptado Condicional": {
    status: "Aceptado Condicional",
    codigo: "4",
    secuenciaUtilizada: true,
    mensajes: [{ valor: "El campo MontoGravadoTotal excede la tolerancia de 100.", codigo: 1924 }],
  },
  Rechazado: {
    status: "Rechazado",
    codigo: "2",
    secuenciaUtilizada: true,
    mensajes: [{ valor: "El campo MontoGravadoTotal del área Totales de la sección Encabezado", codigo: 1920 }],
  },
  RechazadoReusable: {
    status: "Rechazado",
    codigo: "2",
    secuenciaUtilizada: false,
    mensajes: [{ valor: "Estructura del XML inválida", codigo: 100 }],
  },
  "No encontrado": { status: "No encontrado", codigo: "0", secuenciaUtilizada: null, mensajes: [] },
  Error: { status: "Error", codigo: null, secuenciaUtilizada: null, mensajes: [], error: "Servicio no disponible", mensaje: "No se pudo enviar a la DGII" },
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

// Hora de RD (GMT-4) en reloj de 12 horas y sin AM ni PM, como en los ejemplos de la documentación.
function dgiiNow() {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return (
    `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ` +
    `${pad(d.getUTCHours() % 12 || 12)}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

// El QR de consumo por debajo del umbral no lleva comprador ni fecha de firma.
function qrUrl({ environment, ecf, rnc, buyerRnc, issueDate, total, signedDate, securityCode }) {
  const path = DGII_PATHS[environment];
  if (ecf.startsWith("E32") && total < CONSUMER_THRESHOLD) {
    return `https://fc.dgii.gov.do/${path}/consultatimbrefc?rncemisor=${rnc}&encf=${ecf}&montototal=${total}&codigoseguridad=${securityCode}`;
  }
  return (
    `https://ecf.dgii.gov.do/${path}/consultatimbre?rncemisor=${rnc}&RncComprador=${buyerRnc ?? ""}&encf=${ecf}` +
    `&FechaEmision=${issueDate}&montototal=${total}&FechaFirma=${encodeURIComponent(signedDate)}&codigoseguridad=${securityCode}`
  );
}

/** En qué va el documento, y desde cuándo: updateAt solo cambia cuando cambia el estado. */
function stateOf(doc) {
  const elapsed = Date.now() - doc.createdAt;
  const third = doc.delayMs / 3;
  if (elapsed >= doc.delayMs) return { outcome: OUTCOMES[doc.outcome], updateAt: doc.createdAt + doc.delayMs };
  if (elapsed >= 2 * third) return { outcome: { status: "En Proceso", codigo: "3", mensajes: [] }, updateAt: doc.createdAt + 2 * third };
  if (elapsed >= third) return { outcome: { status: "Enviado a la DGII", mensajes: [] }, updateAt: doc.createdAt + third };
  return { outcome: { status: "En Cola", mensajes: [] }, updateAt: doc.createdAt };
}

function dgiiResponse(doc, outcome, batch) {
  if (["En Cola", "Enviado a la DGII"].includes(outcome.status)) return undefined;
  const first = { trackId: doc.trackId, error: outcome.error ?? null, mensaje: outcome.mensaje ?? null };
  if (outcome.status === "En Proceso") return [JSON.stringify(first)];
  const last = {
    trackId: doc.trackId,
    codigo: outcome.codigo,
    estado: outcome.status,
    rnc: doc.rnc,
    encf: doc.ecf,
    secuenciaUtilizada: outcome.secuenciaUtilizada,
    mensajes: outcome.mensajes,
  };
  if (!batch) return [JSON.stringify(first), JSON.stringify(last)];

  // Las formas del ejemplo del lote: un Aceptado sin respuesta, o con codigo numérico y mensajes nulos.
  if (outcome.status === "Aceptado") {
    if (doc.ecf.startsWith("E31")) return undefined;
    return [JSON.stringify({ codigo: 1, estado: "Aceptado", mensajes: null, encf: doc.ecf, secuenciaUtilizada: true })];
  }
  return [JSON.stringify(last)];
}

function view(doc, { batch = false } = {}) {
  const { outcome, updateAt } = stateOf(doc);
  const base = {
    fileName: `${doc.rnc}${doc.ecf}.xml`,
    updateAt: Math.round(updateAt),
    documentType: "Stub",
    status: outcome.status,
    createdAt: doc.createdAt,
    ncf: doc.ecf,
    customerId: doc.rnc,
  };
  // El ejemplo del lote trae comprador y total; el de la consulta individual, no.
  if (batch) {
    if (doc.buyerRnc) base.buyerRnc = doc.buyerRnc;
    base.invoiceTotal = doc.total;
  } else {
    base.internalTrackId = doc.internalTrackId;
  }
  // Un Rechazado no trae código ni QR, y en el lote un Condicional tampoco.
  const omitted = outcome.status === "Rechazado" || (batch && outcome.status === "Aceptado Condicional");
  if (!omitted) {
    base.securityCode = doc.securityCode;
    base.qr_url = doc.qrUrl;
  }
  const responses = dgiiResponse(doc, outcome, batch);
  if (responses) base.dgiiResponse = responses;
  return base;
}

function validationError(validationErrors) {
  return {
    message: ` ${validationErrors.length} error(s):\n${validationErrors.map((e, i) => `${i + 1}. [${e.code}] ${e.field}`).join("\n")}`,
    code: "ECF_VALIDATION_FAILED",
    requestId: randomUUID(),
    details: { validationErrors: validationErrors.map((e) => ({ ...e, name: "EcfValidationError" })) },
  };
}

function validate(parsed) {
  const idDoc = parsed?.ECF?.Encabezado?.IdDoc;
  const errors = [];
  if (!idDoc?.eNCF) errors.push({ code: "REQUIRED", field: "ECF.Encabezado.IdDoc.eNCF" });
  if (!parsed?.ECF?.Encabezado?.Emisor?.RNCEmisor) errors.push({ code: "REQUIRED", field: "ECF.Encabezado.Emisor.RNCEmisor" });
  if (idDoc?.eNCF && String(idDoc.TipoeCF) !== idDoc.eNCF.slice(1, 3)) {
    errors.push({ code: "TIPO_ECF_MISMATCH", field: "ECF.Encabezado.IdDoc.TipoeCF" });
  }
  return errors;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = /^\/(TesteCF|CerteCF|eCF)(\/.*)$/.exec(url.pathname);

  if (url.pathname === "/__stub/log") return json(res, 200, log);
  if (url.pathname === "/__stub/outcome" && req.method === "POST") {
    config.outcome = (await readBody(req)).trim();
    return json(res, 200, config);
  }
  if (url.pathname === "/__stub/config" && req.method === "POST") {
    Object.assign(config, JSON.parse((await readBody(req)) || "{}"));
    return json(res, 200, config);
  }
  if (url.pathname === "/__stub/reset" && req.method === "POST") {
    documents.clear();
    log.length = 0;
    return json(res, 200, { ok: true });
  }
  if (!match) return json(res, 404, { error: "Ruta desconocida" });

  const [, environment, path] = match;
  const body = req.method === "POST" ? await readBody(req) : "";
  log.push({ method: req.method, environment, path, query: url.search, bytes: body.length });

  if (path === "/customer/authentication" && req.method === "POST") {
    const { email, password } = JSON.parse(body || "{}");
    if (!email || !password || password === "incorrecta") {
      return json(res, 400, { error: "Incorrect username or password.", code: "AUTH_ERROR" });
    }
    return json(res, 200, { accessToken: "stub-access", idToken: "stub-id-token", refreshToken: "stub-refresh" });
  }

  if (req.headers.authorization !== "Bearer stub-id-token") return json(res, 401, { message: "Unauthorized" });
  if (req.headers["x-api-key"] !== API_KEY) return json(res, 403, { message: "Forbidden" });

  if (path === "/documentos-ecf" && req.method === "POST") {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return json(res, 400, { message: "JSON mal formateado" });
    }

    const errors = validate(parsed);
    const preCheck = url.searchParams.get("validate") === "true";
    if (preCheck && config.validation !== "ok") errors.push({ code: "STUB_VALIDATION", field: "ECF" });
    if (config.validation === "fail-post" && !errors.length) errors.push({ code: "STUB_VALIDATION", field: "ECF" });
    if (errors.length > 0) return json(res, config.validationStatus, validationError(errors));
    if (preCheck) {
      return json(res, 200, { valid: true, message: "El documento ha sido validado correctamente y cumple con todos los requisitos de la DGII" });
    }

    if (config.sendFailure === "lost") return json(res, 500, { message: "Internal Server Error" });

    const encabezado = parsed.ECF.Encabezado;
    const ecf = encabezado.IdDoc.eNCF;
    const rnc = encabezado.Emisor.RNCEmisor;

    // Un Rechazado o con Error se reemplaza; cualquier otro documento vigente es un duplicado.
    const existing = documents.get(ecf);
    if (existing && !["Rechazado", "Error"].includes(stateOf(existing).outcome.status)) {
      return json(res, config.duplicateStatus, { message: `El documento ${ecf} ya existe` });
    }

    // Mayúsculas y minúsculas a propósito: el código no se debe alterar.
    const securityCode = "aB3xYz";
    const signedDate = dgiiNow();
    const total = encabezado.Totales?.MontoTotal;
    const buyerRnc = encabezado.Comprador?.RNCComprador;
    const doc = {
      ecf,
      rnc,
      buyerRnc,
      total,
      securityCode,
      signedDate,
      qrUrl: qrUrl({ environment, ecf, rnc, buyerRnc, issueDate: encabezado.Emisor.FechaEmision, total, signedDate, securityCode }),
      // No se documenta si un reenvío lo conserva: se conserva, que es el caso más difícil.
      internalTrackId: existing?.internalTrackId ?? randomUUID(),
      trackId: randomUUID(),
      createdAt: Date.now(),
      delayMs: config.delayMs,
      outcome: config.outcome,
      body,
    };
    documents.set(ecf, doc);

    if (config.sendFailure === "landed") return json(res, 500, { message: "Internal Server Error" });
    if (config.sendFailure === "hang") return undefined;
    return json(res, 200, { rnc, ecf, internalTrackId: doc.internalTrackId, securityCode, qr_url: doc.qrUrl, signedDate });
  }

  if (path === "/documentos-ecf" && req.method === "GET") {
    const doc = documents.get(url.searchParams.get("ecf"));
    if (!doc) return json(res, 404, { message: "Documento no encontrado" });
    return json(res, 200, view(doc));
  }

  if (path === "/documentos-ecf/status/batch" && req.method === "POST") {
    const { ecfs } = JSON.parse(body);
    const results = ecfs.map((ecf) => {
      const doc = documents.get(ecf);
      if (!doc) return { ecf, status: null, found: false };
      const data = view(doc, { batch: true });
      return { ecf, status: data.status, found: true, data };
    });
    return json(res, 200, { total: results.length, results });
  }

  return json(res, 404, { error: "Ruta desconocida" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Proveedor simulado en http://127.0.0.1:${PORT} (resultado: ${config.outcome})`);
});
