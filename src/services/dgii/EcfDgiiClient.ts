import "server-only";

import type { Database } from "@/types/database.types";
import { EcfSigner } from "./EcfSigner";

export type EcfConfigRow = Database["public"]["Tables"]["ecf_configs"]["Row"];
export type EcfEnvironment = "DEV" | "CERT" | "PROD";

export type DgiiNormalizedStatus =
  | "borrador"
  | "firmado"
  | "enviado"
  | "aceptado"
  | "rechazado"
  | "condicional"
  | "en_proceso"
  | "anulado";

export interface EcfSendResult {
  trackId: string;
  message: string;
  status: DgiiNormalizedStatus | string;
  receptionDate?: string;
  messages?: string[];
}

export interface EcfStatusResult {
  trackId: string;
  code: string;
  status: DgiiNormalizedStatus | string;
  rawStatus?: string;
  rnc: string;
  encf: string;
  messages: string[];
  checkedAt?: string;
}

export interface EcfDirectoryResult {
  rnc: string;
  name: string;
  url: string;
  isElectronicTaxpayer: boolean;
  acceptedDocTypes?: string[];
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

export class EcfDgiiClient {
  /** Endpoints oficiales DGII */
  private static readonly ENDPOINTS = {
    CERT: {
      seed: "https://ecf.dgii.gov.do/testecf/autenticacion/api/Autenticacion/Semilla",
      validateSeed: "https://ecf.dgii.gov.do/testecf/autenticacion/api/Autenticacion/ValidarSemilla",
      reception: "https://ecf.dgii.gov.do/testecf/recepcion/api/FacturasElectronicas",
      status: "https://ecf.dgii.gov.do/testecf/consultaresultado/api/Consultas/Estado",
      directory: "https://ecf.dgii.gov.do/testecf/consultadirectorio/api/Consultas/Directorio",
      commercial: "https://ecf.dgii.gov.do/testecf/recepcionfcf/api/Recepcion/AprobacionComercial",
    },
    PROD: {
      seed: "https://ecf.dgii.gov.do/autenticacion/api/Autenticacion/Semilla",
      validateSeed: "https://ecf.dgii.gov.do/autenticacion/api/Autenticacion/ValidarSemilla",
      reception: "https://ecf.dgii.gov.do/recepcion/api/FacturasElectronicas",
      status: "https://ecf.dgii.gov.do/consultaresultado/api/Consultas/Estado",
      directory: "https://ecf.dgii.gov.do/consultadirectorio/api/Consultas/Directorio",
      commercial: "https://ecf.dgii.gov.do/recepcionfcf/api/Recepcion/AprobacionComercial",
    },
  };

  /** Caché en memoria para reutilizar tokens JWT durante su ventana de validez (1 hora) */
  private static tokenCache: Map<string, CachedToken> = new Map();

  /**
   * Obtiene la URL base según el ambiente fiscal configurado.
   */
  public static getEndpoints(env: EcfEnvironment) {
    if (env === "PROD") {
      return this.ENDPOINTS.PROD;
    }
    return this.ENDPOINTS.CERT;
  }

  /**
   * Autenticación con DGII mediante intercambio de semilla firmada digitalmente.
   * Retorna el token de sesión Bearer (JWT).
   */
  public static async authenticate(config: EcfConfigRow): Promise<string> {
    const env = config.environment;

    // Simulación inteligente para desarrollo o sin certificado (§153)
    if (env === "DEV" || !config.has_certificate || !config.certificate_data) {
      return `MOCK_JWT_TOKEN_${config.rnc}_${Date.now()}`;
    }

    const cacheKey = `${config.rnc}_${env}`;
    const cached = this.tokenCache.get(cacheKey);
    const now = Date.now();

    // Reutilizar si faltan más de 5 minutos para expirar
    if (cached && cached.expiresAt - now > 5 * 60 * 1000) {
      return cached.token;
    }

    const endpoints = this.getEndpoints(env);

    try {
      // 1. Solicitar Semilla (XML) a la DGII
      const seedResponse = await fetch(endpoints.seed, {
        method: "GET",
        headers: { Accept: "application/xml, text/xml, */*" },
      });

      if (!seedResponse.ok) {
        throw new Error(
          `Error DGII al solicitar semilla de autenticación (HTTP ${seedResponse.status}): ${await seedResponse.text()}`
        );
      }

      const seedXml = await seedResponse.text();

      // 2. Firmar digitalmente la semilla con el certificado de la empresa
      const signedSeed = EcfSigner.signXml(
        seedXml,
        config.certificate_data,
        config.certificate_password_hash
      );

      // 3. Validar semilla firmada ante la DGII para obtener el Token
      const tokenResponse = await fetch(endpoints.validateSeed, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          Accept: "application/json",
        },
        body: signedSeed,
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Error DGII al validar semilla firmada (HTTP ${tokenResponse.status}): ${errorText}`);
      }

      const tokenJson = await tokenResponse.json();
      const token = tokenJson.token || tokenJson.valor;

      if (!token) {
        throw new Error("La DGII no devolvió un token de sesión válido.");
      }

      // 4. Almacenar en caché por 50 minutos
      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: now + 50 * 60 * 1000,
      });

      return token;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Fallo en autenticación con Web Service DGII (${env}): ${msg}`);
    }
  }

  /**
   * Envía el documento e-CF firmado a la DGII empaquetado en multipart/form-data.
   * Devuelve el TrackId oficial para seguimiento.
   */
  public static async sendEcf(
    signedXml: string,
    fileName: string,
    config: EcfConfigRow
  ): Promise<EcfSendResult> {
    const env = config.environment;

    // Modo simulación inteligente para DEV o sin credenciales (§153)
    if (env === "DEV" || !config.has_certificate || !config.certificate_data) {
      const mockTrackId = `MOCK-TRK-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

      return {
        trackId: mockTrackId,
        message: "[SIMULACIÓN §153] Comprobante recibido y encolado para timbrado en ambiente DEV.",
        status: "en_proceso",
        receptionDate: new Date().toISOString(),
        messages: ["Documento simulado para desarrollo - Sin impacto tributario real"],
      };
    }

    try {
      const token = await this.authenticate(config);
      const endpoints = this.getEndpoints(env);

      // Preparar payload multipart con el archivo XML
      const formData = new FormData();
      const xmlBlob = new Blob([signedXml], { type: "application/xml" });
      formData.append("xml", xmlBlob, fileName.endsWith(".xml") ? fileName : `${fileName}.xml`);

      const response = await fetch(endpoints.reception, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en recepción DGII (HTTP ${response.status}): ${errorText}`);
      }

      const resData = await response.json();

      const trackId = resData.trackId || resData.TrackId || resData.id;
      const rawStatus = (resData.estado || resData.status || "En Proceso").toLowerCase();

      let normalizedStatus: DgiiNormalizedStatus = "en_proceso";
      if (rawStatus.includes("aceptad")) {
        normalizedStatus = "aceptado";
      } else if (rawStatus.includes("rechazad")) {
        normalizedStatus = "rechazado";
      } else if (rawStatus.includes("condicion")) {
        normalizedStatus = "condicional";
      }

      const messages: string[] = [];
      if (Array.isArray(resData.mensajes)) {
        resData.mensajes.forEach((m: { mensaje?: string; text?: string } | string) => {
          if (typeof m === "string") messages.push(m);
          else if (m.mensaje) messages.push(m.mensaje);
          else if (m.text) messages.push(m.text);
        });
      }

      return {
        trackId: trackId || `REC-${Date.now()}`,
        message: resData.mensaje || "Comprobante recibido satisfactoriamente por la DGII.",
        status: normalizedStatus,
        receptionDate: resData.fechaRecepcion || new Date().toISOString(),
        messages,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Error al enviar e-CF a la DGII: ${msg}`);
    }
  }

  /**
   * Consulta el estado de procesamiento de un comprobante ante la DGII mediante su TrackId.
   */
  public static async queryStatus(trackId: string, config: EcfConfigRow): Promise<EcfStatusResult> {
    const env = config.environment;

    // Caso de simulación DEV (§153)
    if (trackId.startsWith("MOCK-") || env === "DEV" || !config.has_certificate) {
      return {
        trackId,
        code: "0",
        status: "aceptado",
        rawStatus: "Aceptado",
        rnc: config.rnc,
        encf: "E3100000001",
        messages: ["[MODO SIMULACIÓN §153] Comprobante validado satisfactoriamente en ambiente DEV."],
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const token = await this.authenticate(config);
      const endpoints = this.getEndpoints(env);

      const url = `${endpoints.status}?trackId=${encodeURIComponent(trackId)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error consultando TrackId en DGII (HTTP ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawStatus = data.estado || data.status || "En Proceso";
      const lower = rawStatus.toLowerCase();

      let normalizedStatus: DgiiNormalizedStatus = "en_proceso";
      if (lower.includes("aceptad") && lower.includes("condicion")) {
        normalizedStatus = "condicional";
      } else if (lower.includes("aceptad")) {
        normalizedStatus = "aceptado";
      } else if (lower.includes("rechazad")) {
        normalizedStatus = "rechazado";
      } else if (lower.includes("anulad")) {
        normalizedStatus = "anulado";
      }

      const messages: string[] = [];
      if (Array.isArray(data.mensajes)) {
        data.mensajes.forEach((m: { mensaje?: string } | string) => {
          if (typeof m === "string") messages.push(m);
          else if (m.mensaje) messages.push(m.mensaje);
        });
      }

      return {
        trackId,
        code: String(data.codigo ?? "0"),
        status: normalizedStatus,
        rawStatus,
        rnc: data.rnc || config.rnc,
        encf: data.encf || "",
        messages,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Error al consultar TrackId "${trackId}" en DGII: ${msg}`);
    }
  }

  /**
   * Consulta el Directorio de Contribuyentes Electrónicos de la DGII para verificar
   * si un RNC receptor está facultado para emitir y recibir e-CF y cuáles tipos soporta.
   */
  public static async queryDirectory(
    rnc: string,
    config: EcfConfigRow
  ): Promise<EcfDirectoryResult[]> {
    const cleanRnc = rnc.replace(/[^0-9]/g, "");
    const env = config.environment;

    if (env === "DEV" || !config.has_certificate) {
      // Retornar contribuyente ficticio en modo desarrollo
      return [
        {
          rnc: cleanRnc,
          name: "CONTRIBUYENTE SIMULADO SRL",
          url: "https://ejemplo.com/fe/recepcion",
          isElectronicTaxpayer: true,
          acceptedDocTypes: ["E31", "E32", "E34", "E44", "E45"],
        },
      ];
    }

    try {
      const token = await this.authenticate(config);
      const endpoints = this.getEndpoints(env);

      const url = `${endpoints.directory}?RNC=${encodeURIComponent(cleanRnc)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Error en consulta de directorio DGII (HTTP ${response.status})`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : [data];

      return list.map((item) => ({
        rnc: item.rnc || cleanRnc,
        name: item.nombre || item.razonSocial || "",
        url: item.urlRecepcion || item.url || "",
        isElectronicTaxpayer: item.esEmisor ?? true,
        acceptedDocTypes: item.comprobantesAceptados || ["E31", "E32", "E34"],
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Error al consultar directorio DGII para RNC ${cleanRnc}: ${msg}`);
    }
  }
}
