import { beforeEach, describe, expect, it, vi } from "vitest";
import { MSellerClient, clearTokenCache, mergeSnapshots, resolveBaseUrl, signedDateFromQr, type DocumentSnapshot } from "./client";
import { decryptCredentials, emailHint, encryptCredentials } from "./secrets";

const credentials = { email: "emisor@empresa.do", password: "clave-secreta", apiKey: "api-key-secreta" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const AUTH_OK = { accessToken: "a", idToken: "token-1", refreshToken: "r" };
const SENT_OK = {
  rnc: "102320705",
  ecf: "E310000000001",
  internalTrackId: "track",
  securityCode: "fWCZCV",
  qr_url: "https://ecf.dgii.gov.do/testecf/consultatimbre?encf=E310000000001&FechaFirma=14-05-2025%2002:57:33",
  signedDate: "14-05-2025 02:57:33",
};

/** Atiende según la ruta y deja registro de cada llamada. */
function fakeFetch(routes: Record<string, (init: RequestInit) => Response | Promise<Response>>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    const key = Object.keys(routes).find((route) => url.includes(route));
    if (!key) throw new Error(`Ruta sin respuesta en la prueba: ${url}`);
    return routes[key](init ?? {});
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

function client(impl: typeof fetch, companyId = "empresa-1") {
  return new MSellerClient({ companyId, environment: "test", credentials, fetchImpl: impl });
}

beforeEach(() => clearTokenCache());

describe("autenticación", () => {
  it("reutiliza el token entre llamadas y envía los dos encabezados", async () => {
    const { impl, calls } = fakeFetch({
      "/customer/authentication": () => jsonResponse(200, AUTH_OK),
      "/documentos-ecf": () => jsonResponse(200, SENT_OK),
    });
    const first = await client(impl).send("{}");
    await client(impl).send("{}");
    expect(first.kind).toBe("sent");
    expect(calls.filter((c) => c.url.includes("/customer/authentication"))).toHaveLength(1);
    const headers = calls[1].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-1");
    expect(headers["X-API-KEY"]).toBe("api-key-secreta");
    expect(calls[0].url).toBe("https://ecf.api.mseller.app/TesteCF/customer/authentication");
  });

  it("separa el token por empresa", async () => {
    const { impl, calls } = fakeFetch({
      "/customer/authentication": () => jsonResponse(200, AUTH_OK),
      "/documentos-ecf": () => jsonResponse(200, SENT_OK),
    });
    await client(impl, "empresa-1").send("{}");
    await client(impl, "empresa-2").send("{}");
    expect(calls.filter((c) => c.url.includes("/customer/authentication"))).toHaveLength(2);
  });

  it("ante un 401 se reautentica una sola vez y reenvía los mismos bytes", async () => {
    let sends = 0;
    const { impl, calls } = fakeFetch({
      "/customer/authentication": () => jsonResponse(200, AUTH_OK),
      "/documentos-ecf": () => (++sends === 1 ? jsonResponse(401, {}) : jsonResponse(200, SENT_OK)),
    });
    const outcome = await client(impl).send('{"a":1}');
    expect(outcome.kind).toBe("sent");
    expect(calls.filter((c) => c.url.includes("/customer/authentication"))).toHaveLength(2);
    const bodies = calls.filter((c) => c.url.endsWith("/documentos-ecf")).map((c) => c.init.body);
    expect(bodies).toEqual(['{"a":1}', '{"a":1}']);
  });

  it("dos 401 seguidos son definitivos: no reintenta más", async () => {
    const { impl, calls } = fakeFetch({
      "/customer/authentication": () => jsonResponse(200, AUTH_OK),
      "/documentos-ecf": () => jsonResponse(401, {}),
    });
    const outcome = await client(impl).send("{}");
    expect(outcome).toMatchObject({ kind: "not_sent", reason: "auth" });
    expect(calls.filter((c) => c.url.endsWith("/documentos-ecf"))).toHaveLength(2);
  });

  it("credenciales rechazadas: no llega a enviar el documento", async () => {
    const { impl, calls } = fakeFetch({
      "/customer/authentication": () => jsonResponse(400, { error: "Incorrect username or password.", code: "AUTH_ERROR" }),
    });
    const outcome = await client(impl).send("{}");
    expect(outcome).toMatchObject({ kind: "not_sent", reason: "auth" });
    expect(calls).toHaveLength(1);
  });

  it("la autenticación no sigue redirecciones: la contraseña no sale a otro destino", async () => {
    const { impl, calls } = fakeFetch({
      "/customer/authentication": () => {
        throw new TypeError("fetch failed: unexpected redirect");
      },
    });
    expect(await client(impl).send("{}")).toMatchObject({ kind: "not_sent", reason: "unreachable" });
    expect(calls[0].init.redirect).toBe("error");
  });

  it("sin red al autenticarse el documento tampoco salió", async () => {
    const impl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await client(impl).send("{}")).toMatchObject({ kind: "not_sent", reason: "unreachable" });
  });

  it("los mensajes no exponen credenciales ni tokens", async () => {
    const { impl } = fakeFetch({
      "/customer/authentication": () => jsonResponse(200, AUTH_OK),
      "/documentos-ecf": () => jsonResponse(500, { detail: "fallo" }),
    });
    const outcome = await client(impl).send("{}");
    const text = JSON.stringify(outcome);
    expect(text).not.toContain("clave-secreta");
    expect(text).not.toContain("api-key-secreta");
    expect(text).not.toContain("token-1");
  });
});

describe("envío", () => {
  const authed = (handler: (init: RequestInit) => Response | Promise<Response>) =>
    fakeFetch({ "/customer/authentication": () => jsonResponse(200, AUTH_OK), "/documentos-ecf": handler });

  it("conserva el código de seguridad sin alterar mayúsculas", async () => {
    const { impl } = authed(() => jsonResponse(200, SENT_OK));
    expect(await client(impl).send("{}")).toMatchObject({ kind: "sent", securityCode: "fWCZCV", signedDate: "14-05-2025 02:57:33" });
  });

  it("un tiempo agotado queda ambiguo y no reintenta", async () => {
    const { impl, calls } = authed(() => {
      throw new DOMException("timeout", "TimeoutError");
    });
    const outcome = await client(impl).send("{}");
    expect(outcome.kind).toBe("ambiguous");
    expect(calls.filter((c) => c.url.endsWith("/documentos-ecf"))).toHaveLength(1);
  });

  it("un error de red durante el POST queda ambiguo", async () => {
    const { impl } = authed(() => {
      throw new TypeError("fetch failed");
    });
    expect((await client(impl).send("{}")).kind).toBe("ambiguous");
  });

  it.each([500, 502, 503, 404, 409])("un %i queda ambiguo", async (status) => {
    const { impl } = authed(() => jsonResponse(status, {}));
    expect((await client(impl).send("{}")).kind).toBe("ambiguous");
  });

  it("una respuesta 200 sin código de seguridad queda ambigua", async () => {
    const { impl } = authed(() => jsonResponse(200, { ok: true }));
    expect((await client(impl).send("{}")).kind).toBe("ambiguous");
  });

  it("un 429 explica el límite en español y se sabe que no entró", async () => {
    const { impl } = authed(() => jsonResponse(429, { message: "Too Many Requests" }));
    const outcome = await client(impl).send("{}");
    expect(outcome).toMatchObject({ kind: "not_sent", reason: "rate_limit" });
    expect(outcome.kind === "not_sent" && outcome.message).toMatch(/cuota/);
  });

  it("un 400 sin ECF_VALIDATION_FAILED no se confunde con una validación", async () => {
    const bad = authed(() => jsonResponse(400, { message: "JSON mal formateado" }));
    expect(await client(bad.impl).send("{}")).toMatchObject({ kind: "not_sent", reason: "bad_request", message: "JSON mal formateado" });
    clearTokenCache();
    const empty = authed(() => jsonResponse(400, {}));
    expect(await client(empty.impl).send("{}")).toMatchObject({ kind: "not_sent", reason: "bad_request" });
  });

  it.each([200, 400, 422])("ECF_VALIDATION_FAILED con %i manda sobre el código HTTP", async (status) => {
    const { impl } = authed(() =>
      jsonResponse(status, {
        message: " 1 error(s): falta un campo",
        code: "ECF_VALIDATION_FAILED",
        details: { validationErrors: [{ code: "REQUIRED", field: "ECF.Encabezado.IdDoc.eNCF" }] },
      })
    );
    const outcome = await client(impl).send("{}");
    expect(outcome).toMatchObject({ kind: "not_sent", reason: "validation", message: "El proveedor encontró datos inválidos en el comprobante." });
    expect(outcome.kind === "not_sent" && outcome.messages[0]).toMatchObject({ codigo: "REQUIRED", valor: "ECF.Encabezado.IdDoc.eNCF" });
  });

  it("de ECF_VALIDATION_FAILED guarda la explicación de cada campo, sin los datos internos", async () => {
    const { impl } = authed(() =>
      jsonResponse(400, {
        message:
          ' 2 error(s):\n1. [TIPO_ECF_MISMATCH] ECF.Encabezado.IdDoc.TipoeCF: TipoeCF (322) no coincide | Details: {"expected":32}\n2. [REQUIRED] ECF.Encabezado.IdDoc.eNCF',
        code: "ECF_VALIDATION_FAILED",
        details: {
          validationErrors: [
            { code: "TIPO_ECF_MISMATCH", field: "ECF.Encabezado.IdDoc.TipoeCF" },
            { code: "REQUIRED", field: "ECF.Encabezado.IdDoc.eNCF" },
          ],
        },
      })
    );
    const outcome = await client(impl).send("{}");
    expect(outcome.kind === "not_sent" && outcome.messages).toEqual([
      { codigo: "TIPO_ECF_MISMATCH", valor: "ECF.Encabezado.IdDoc.TipoeCF", detalle: "TipoeCF (322) no coincide" },
      { codigo: "REQUIRED", valor: "ECF.Encabezado.IdDoc.eNCF" },
    ]);
  });

  it("sin el detalle por campo, el texto del proveedor no se pierde", async () => {
    const { impl } = authed(() => jsonResponse(400, { message: " 1 error(s): algo", code: "ECF_VALIDATION_FAILED" }));
    const outcome = await client(impl).send("{}");
    expect(outcome.kind === "not_sent" && outcome.messages).toEqual([{ codigo: "ECF_VALIDATION_FAILED", valor: "ECF", detalle: "1 error(s): algo" }]);
  });

  it("un 500 no le muestra el código HTTP a quien factura", async () => {
    const { impl } = authed(() => jsonResponse(500, {}));
    const outcome = await client(impl).send("{}");
    expect(outcome).toEqual({ kind: "ambiguous", message: "El proveedor tuvo un error interno: no se sabe si registró el documento." });
  });

  it("no guarda un QR que no lleve a la DGII", async () => {
    const { impl } = authed(() => jsonResponse(200, { ...SENT_OK, qr_url: "https://evil.example/phish" }));
    expect(await client(impl).send("{}")).toMatchObject({ kind: "sent", qrUrl: null });
  });

  it("un 403 es definitivo", async () => {
    const forbidden = authed(() => jsonResponse(403, {}));
    expect(await client(forbidden.impl).send("{}")).toMatchObject({ kind: "not_sent", reason: "auth" });
  });
});

describe("validación previa", () => {
  const authed = (handler: (init: RequestInit) => Response | Promise<Response>) =>
    fakeFetch({ "/customer/authentication": () => jsonResponse(200, AUTH_OK), "/documentos-ecf": handler });

  it("solo ECF_VALIDATION_FAILED bloquea", async () => {
    const { impl, calls } = authed(() =>
      jsonResponse(400, {
        message: " 1 error(s):\n1. [TIPO_ECF_MISMATCH]",
        code: "ECF_VALIDATION_FAILED",
        details: { validationErrors: [{ code: "TIPO_ECF_MISMATCH", field: "ECF.Encabezado.IdDoc.TipoeCF" }] },
      })
    );
    const outcome = await client(impl).validate("{}");
    expect(outcome.blocked).toBe(true);
    expect(outcome.blocked && outcome.messages[0]).toMatchObject({ codigo: "TIPO_ECF_MISMATCH" });
    expect(calls[1].url).toContain("validate=true");
  });

  it.each([200, 422])("también bloquea con %i: manda el cuerpo", async (status) => {
    const { impl } = authed(() => jsonResponse(status, { message: "x", code: "ECF_VALIDATION_FAILED" }));
    expect((await client(impl).validate("{}")).blocked).toBe(true);
  });

  it("una respuesta válida no bloquea", async () => {
    const { impl } = authed(() => jsonResponse(200, { valid: true, message: "ok" }));
    expect((await client(impl).validate("{}")).blocked).toBe(false);
  });

  it.each([400, 404, 429, 500])("cualquier otro %i se ignora", async (status) => {
    const { impl } = authed(() => jsonResponse(status, { message: "otro" }));
    expect((await client(impl).validate("{}")).blocked).toBe(false);
  });

  it("un fallo de red o de autenticación también se ignora", async () => {
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect((await client(down).validate("{}")).blocked).toBe(false);
  });
});

describe("consultas", () => {
  const authed = (route: string, handler: () => Response) =>
    fakeFetch({ "/customer/authentication": () => jsonResponse(200, AUTH_OK), [route]: handler });

  it("interpreta dgiiResponse, mensajes y secuenciaUtilizada", async () => {
    const { impl } = authed("/documentos-ecf", () =>
      jsonResponse(200, {
        status: "Rechazado",
        ncf: "E310000000001",
        securityCode: "hhABiM",
        updateAt: 1747250783965,
        invoiceTotal: "637.20",
        buyerRnc: "101023122",
        qr_url: "https://ecf.dgii.gov.do/testecf/consultatimbre?FechaFirma=14-05-2025%2003:26:18",
        dgiiResponse: [
          '{"trackId":"t1","error":null,"mensaje":null}',
          '{"trackId":"t1","codigo":"2","estado":"Rechazado","secuenciaUtilizada":false,"mensajes":[{"valor":"Campo inválido","codigo":1920},{"valor":"","codigo":0}]}',
          "no es json",
        ],
      })
    );
    const outcome = await client(impl).getDocument("E310000000001");
    expect(outcome.kind).toBe("found");
    if (outcome.kind !== "found") return;
    expect(outcome.snapshot).toMatchObject({
      status: "Rechazado",
      securityCode: "hhABiM",
      trackId: "t1",
      statusCode: "2",
      secuenciaUtilizada: false,
      signedDate: "14-05-2025 03:26:18",
      messages: [{ codigo: 1920, valor: "Campo inválido" }],
      updatedAt: new Date(1747250783965).toISOString(),
      documentTotal: 637.2,
      buyerRnc: "101023122",
    });
  });

  it("muestra el motivo de un Error: dgiiResponse puede traerlo en error y mensaje", async () => {
    const { impl } = authed("/documentos-ecf", () =>
      jsonResponse(200, {
        status: "Error",
        ncf: "E310000000001",
        dgiiResponse: ['{"trackId":null,"error":"Servicio no disponible","mensaje":"Fallo de recepcion"}'],
      })
    );
    const outcome = await client(impl).getDocument("E310000000001");
    expect(outcome.kind === "found" && outcome.snapshot.messages).toEqual([
      { codigo: null, valor: "Servicio no disponible" },
      { codigo: null, valor: "Fallo de recepcion" },
    ]);
  });

  it("una consulta no entrega un QR ajeno", async () => {
    const { impl } = authed("/documentos-ecf", () => jsonResponse(200, { status: "Aceptado", ncf: "E310000000001", qr_url: "javascript:alert(1)" }));
    const outcome = await client(impl).getDocument("E310000000001");
    expect(outcome.kind === "found" && outcome.snapshot.qrUrl).toBeNull();
  });

  it("une el lote y la consulta individual sin perder datos", () => {
    const empty: DocumentSnapshot = {
      status: "Aceptado",
      securityCode: null,
      qrUrl: null,
      signedDate: null,
      internalTrackId: null,
      trackId: null,
      statusCode: null,
      secuenciaUtilizada: null,
      messages: [],
      updatedAt: null,
      documentTotal: null,
      buyerRnc: null,
    };
    const merged = mergeSnapshots({ ...empty, documentTotal: 100 }, { ...empty, status: "Rechazado", securityCode: "abcDEF", documentTotal: 5 });
    expect(merged).toMatchObject({ status: "Aceptado", securityCode: "abcDEF", documentTotal: 100 });
  });

  it("un 404 de la consulta individual no prueba que no exista", async () => {
    const { impl } = authed("/documentos-ecf", () => jsonResponse(404, {}));
    expect((await client(impl).getDocument("E310000000001")).kind).toBe("unclear");
  });

  it("no acepta la respuesta de otro comprobante", async () => {
    const { impl } = authed("/documentos-ecf", () => jsonResponse(200, { status: "Aceptado", ncf: "E310000000099" }));
    expect((await client(impl).getDocument("E310000000001")).kind).toBe("unclear");
  });

  it("la consulta en lote distingue found true y false", async () => {
    const { impl } = authed("/status/batch", () =>
      jsonResponse(200, {
        total: 3,
        results: [
          { ecf: "E310000000001", status: "Aceptado", found: true, data: { status: "Aceptado", securityCode: "abcDEF" } },
          { ecf: "E310000000002", status: null, found: false },
          { ecf: "E319999999999", status: "Aceptado", found: true, data: {} },
        ],
      })
    );
    const outcome = await client(impl).getBatch(["E310000000001", "E310000000002"]);
    expect(outcome.kind === "ok" && outcome.entries).toEqual([
      expect.objectContaining({ ecf: "E310000000001", found: true }),
      { ecf: "E310000000002", found: false },
    ]);
  });

  it("limita la consulta en lote a 100", async () => {
    const { impl } = authed("/status/batch", () => jsonResponse(200, { results: [] }));
    await expect(client(impl).getBatch(Array.from({ length: 101 }, (_, i) => `E31${i}`))).rejects.toThrow(/100/);
  });

  it("extrae la fecha de firma del QR", () => {
    expect(signedDateFromQr("https://x/?fechafirma=03-11-2025%2008%3A24%3A42&codigoseguridad=wKL28p")).toBe("03-11-2025 08:24:42");
    expect(signedDateFromQr(null)).toBeNull();
  });
});

/** Las respuestas de ejemplo de la documentación del proveedor, copiadas sin cambios. */
const DOCUMENTED_GET = `{
  "fileName": "102320705E310000009179.xml",
  "updateAt": 1747250783965,
  "customerReceivedAt": "14-05-2025 15:26:21",
  "documentType": "Factura de Crédito Fiscal Electrónico",
  "customerResponse": "{\\"_declaration\\":{\\"_attributes\\":{\\"version\\":\\"1.0\\",\\"encoding\\":\\"utf-8\\"}},\\"ARECF\\":{...}}",
  "status": "Aceptado",
  "dgiiResponse": [
    "{\\"trackId\\":\\"0cc42712-4a99-48be-b66d-346b33e36d7f\\",\\"error\\":null,\\"mensaje\\":null}",
    "{\\"trackId\\":\\"0cc42712-4a99-48be-b66d-346b33e36d7f\\",\\"codigo\\":\\"1\\",\\"estado\\":\\"Aceptado\\",\\"rnc\\":\\"102320705\\",\\"encf\\":\\"E310000009179\\",\\"secuenciaUtilizada\\":true,\\"fechaRecepcion\\":\\"5/14/2025 3:26:21 PM\\",\\"mensajes\\":[{\\"valor\\":\\"\\",\\"codigo\\":0}]}"
  ],
  "createdAt": 1747250778433,
  "securityCode": "hhABiM",
  "signedXml": "102320705/documents/TesteCF/102320705E310000009179.xml",
  "ncf": "E310000009179",
  "internalTrackId": "a118ea44-ac12-466a-b071-c4b650bb5a4f",
  "customerReceived": "0",
  "qr_url": "https://ecf.dgii.gov.do/testecf/consultatimbre?rncemisor=102320705&RncComprador=101023122&encf=E310000009179&FechaEmision=14-05-2025&montototal=637.2&FechaFirma=14-05-2025%2003:26:18&codigoseguridad=hhABiM",
  "customerId": "102320705"
}`;

const DOCUMENTED_BATCH = `{
  "total": 4,
  "results": [
    {
      "ecf": "E320004380895",
      "status": "Aceptado",
      "found": true,
      "data": {
        "buyerRnc": "00115275869",
        "createdAt": 1762217966021,
        "dgiiResponse": [
          "{\\"codigo\\":1,\\"estado\\":\\"Aceptado\\",\\"mensajes\\":null,\\"encf\\":\\"E320004380895\\",\\"secuenciaUtilizada\\":true}"
        ],
        "documentType": "Factura de Consumo Electrónica",
        "fileName": "102320705E320004380895.xml",
        "internalTrackId": "aada68a0-42c6-4a0a-804a-db9c042e1dc6",
        "invoiceTotal": 385.68,
        "ncf": "E320004380895",
        "qr_url": "https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=102320705&encf=E320004380895&montototal=385.68&codigoseguridad=A7HXQC",
        "secretId": "b14ac74e-ab14-4230-8894-ec19929ed7bc",
        "securityCode": "A7HXQC",
        "signedXml": "102320705/documents/TesteCF/102320705E320004380895.xml",
        "status": "Aceptado",
        "summarySignedXml": "102320705/summaries/TesteCF/102320705E320004380895.xml",
        "updateAt": 1762217969008,
        "customerId": "102320705"
      }
    },
    {
      "ecf": "E310000510917",
      "status": "Aceptado",
      "found": true,
      "data": {
        "buyerRnc": "00115275869",
        "createdAt": 1762215883006,
        "documentType": "Factura de Crédito Fiscal Electrónico",
        "invoiceTotal": 952.28,
        "ncf": "E310000510917",
        "qr_url": "https://ecf.dgii.gov.do/testecf/consultatimbre?rncemisor=102320705&RncComprador=00115275869&encf=E310000510917&fechaemision=04-11-2025&montototal=952.28&fechafirma=03-11-2025%2008%3A24%3A42&codigoseguridad=wKL28p",
        "securityCode": "wKL28p",
        "status": "Aceptado",
        "updateAt": 1762215889088,
        "customerId": "102320705"
      }
    },
    {
      "ecf": "E310000510916",
      "status": "Rechazado",
      "found": true,
      "data": {
        "buyerRnc": "00300717659",
        "createdAt": 1762215563667,
        "dgiiResponse": [
          "{\\"trackId\\":\\"32c4f7e0-dbbe-40cc-a1d4-e4cc0ff82c13\\",\\"codigo\\":\\"2\\",\\"estado\\":\\"Rechazado\\",\\"rnc\\":\\"102320705\\",\\"encf\\":\\"E310000510916\\",\\"secuenciaUtilizada\\":true,\\"fechaRecepcion\\":\\"11/3/2025 8:19:30 PM\\",\\"mensajes\\":[{\\"valor\\":\\"El campo MontoGravadoTotal del área Totales de la sección Encabezado\\",\\"codigo\\":1920}]}"
        ],
        "documentType": "Factura de Crédito Fiscal Electrónico",
        "invoiceTotal": 952.28,
        "ncf": "E310000510916",
        "status": "Rechazado",
        "updateAt": 1762215575268,
        "customerId": "102320705"
      }
    },
    {
      "ecf": "E310000510915",
      "status": "Aceptado Condicional",
      "found": true,
      "data": {
        "buyerRnc": "00115275869",
        "createdAt": 1762215210792,
        "dgiiResponse": [
          "{\\"trackId\\":\\"45309489-f05b-425b-bb67-6706d0a77225\\",\\"codigo\\":\\"4\\",\\"estado\\":\\"Aceptado Condicional\\",\\"rnc\\":\\"102320705\\",\\"encf\\":\\"E310000510915\\",\\"secuenciaUtilizada\\":true,\\"fechaRecepcion\\":\\"11/3/2025 8:13:37 PM\\",\\"mensajes\\":[{\\"valor\\":\\"El campo MontoGravadoTotal del área Totales de la sección Encabezado no corresponde con la sumatoria de los items de su factura ya que excede la tolerancia de 100.\\",\\"codigo\\":1924},{\\"valor\\":\\"El campo MontoTotal del área Totales de la sección Encabezado no es válido.El elemento MontoTotal no es correcto\\",\\"codigo\\":11105}]}"
        ],
        "documentType": "Factura de Crédito Fiscal Electrónico",
        "invoiceTotal": 952.28,
        "ncf": "E310000510915",
        "status": "Aceptado Condicional",
        "updateAt": 1762215220782,
        "customerId": "102320705"
      }
    }
  ]
}`;

describe("ejemplos de la documentación", () => {
  const raw = (body: string) => () => new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
  const authed = (route: string, handler: () => Response) =>
    fakeFetch({ "/customer/authentication": () => jsonResponse(200, AUTH_OK), [route]: handler });

  it("interpreta la consulta individual", async () => {
    const { impl } = authed("/documentos-ecf", raw(DOCUMENTED_GET));
    const outcome = await client(impl).getDocument("E310000009179");
    expect(outcome.kind === "found" && outcome.snapshot).toEqual({
      status: "Aceptado",
      securityCode: "hhABiM",
      qrUrl:
        "https://ecf.dgii.gov.do/testecf/consultatimbre?rncemisor=102320705&RncComprador=101023122&encf=E310000009179&FechaEmision=14-05-2025&montototal=637.2&FechaFirma=14-05-2025%2003:26:18&codigoseguridad=hhABiM",
      signedDate: "14-05-2025 03:26:18",
      internalTrackId: "a118ea44-ac12-466a-b071-c4b650bb5a4f",
      trackId: "0cc42712-4a99-48be-b66d-346b33e36d7f",
      statusCode: "1",
      secuenciaUtilizada: true,
      messages: [],
      updatedAt: new Date(1747250783965).toISOString(),
      // Sin invoiceTotal ni buyerRnc en la consulta: salen del QR.
      documentTotal: 637.2,
      buyerRnc: "101023122",
    });
  });

  it("interpreta la consulta en lote, con sus cuatro formas", async () => {
    const { impl } = authed("/status/batch", raw(DOCUMENTED_BATCH));
    const outcome = await client(impl).getBatch(["E320004380895", "E310000510917", "E310000510916", "E310000510915"]);
    if (outcome.kind !== "ok") throw new Error("La consulta debió responder");
    const bySequence = Object.fromEntries(outcome.entries.map((e) => [e.ecf, e.found ? e.snapshot : null]));

    // codigo numérico, mensajes nulos y QR de consumo sin fecha ni comprador.
    expect(bySequence.E320004380895).toMatchObject({
      status: "Aceptado",
      statusCode: "1",
      securityCode: "A7HXQC",
      signedDate: null,
      documentTotal: 385.68,
      buyerRnc: "00115275869",
      messages: [],
      secuenciaUtilizada: true,
      updatedAt: new Date(1762217969008).toISOString(),
    });
    // Aceptado sin dgiiResponse; la fecha de firma viaja codificada en el QR.
    expect(bySequence.E310000510917).toMatchObject({
      status: "Aceptado",
      securityCode: "wKL28p",
      signedDate: "03-11-2025 08:24:42",
      statusCode: null,
      trackId: null,
      documentTotal: 952.28,
    });
    // Rechazado sin código de seguridad ni QR.
    expect(bySequence.E310000510916).toMatchObject({
      status: "Rechazado",
      securityCode: null,
      qrUrl: null,
      statusCode: "2",
      secuenciaUtilizada: true,
      trackId: "32c4f7e0-dbbe-40cc-a1d4-e4cc0ff82c13",
      messages: [{ codigo: 1920, valor: "El campo MontoGravadoTotal del área Totales de la sección Encabezado" }],
    });
    // Condicional sin código ni QR, con sus observaciones.
    expect(bySequence.E310000510915).toMatchObject({ status: "Aceptado Condicional", securityCode: null, qrUrl: null, statusCode: "4" });
    expect(bySequence.E310000510915?.messages).toHaveLength(2);
  });
});

describe("URL base", () => {
  it("usa los tres ambientes oficiales", () => {
    expect(resolveBaseUrl("test")).toBe("https://ecf.api.mseller.app/TesteCF");
    expect(resolveBaseUrl("cert")).toBe("https://ecf.api.mseller.app/CerteCF");
    expect(resolveBaseUrl("prod")).toBe("https://ecf.api.mseller.app/eCF");
  });

  it("solo honra el reemplazo fuera de producción", () => {
    vi.stubEnv("MSELLER_BASE_URL_OVERRIDE", "http://127.0.0.1:4010/");
    expect(resolveBaseUrl("test")).toBe("http://127.0.0.1:4010/TesteCF");
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveBaseUrl("test")).toBe("https://ecf.api.mseller.app/TesteCF");
    vi.unstubAllEnvs();
  });
});

describe("credenciales cifradas", () => {
  const KEY = Buffer.alloc(32, 7).toString("base64");

  it("cifra sin dejar el texto a la vista y se ata a empresa y ambiente", () => {
    vi.stubEnv("BILLING_SECRETS_KEY", KEY);
    const ciphertext = encryptCredentials("empresa-1", "test", credentials);
    expect(ciphertext).not.toContain("clave-secreta");
    expect(ciphertext).not.toContain("emisor@empresa.do");
    expect(decryptCredentials("empresa-1", "test", ciphertext)).toEqual(credentials);
    expect(() => decryptCredentials("empresa-2", "test", ciphertext)).toThrow(/descifrar/);
    expect(() => decryptCredentials("empresa-1", "prod", ciphertext)).toThrow(/descifrar/);
    vi.unstubAllEnvs();
  });

  it("rechaza una etiqueta de autenticación recortada", () => {
    vi.stubEnv("BILLING_SECRETS_KEY", KEY);
    const [version, iv, tag, body] = encryptCredentials("empresa-1", "test", credentials).split(".");
    const short = Buffer.from(tag, "base64").subarray(0, 4).toString("base64");
    expect(() => decryptCredentials("empresa-1", "test", [version, iv, short, body].join("."))).toThrow(/descifrar/);
    vi.unstubAllEnvs();
  });

  it("da un error claro si falta la clave o es inválida", () => {
    vi.stubEnv("BILLING_SECRETS_KEY", "");
    expect(() => encryptCredentials("e", "test", credentials)).toThrow(/BILLING_SECRETS_KEY/);
    vi.stubEnv("BILLING_SECRETS_KEY", "corta");
    expect(() => encryptCredentials("e", "test", credentials)).toThrow(/32 bytes/);
    vi.unstubAllEnvs();
  });

  it("la pista del correo no revela la cuenta completa", () => {
    expect(emailHint("emisor@empresa.do")).toBe("em***@empresa.do");
  });
});
