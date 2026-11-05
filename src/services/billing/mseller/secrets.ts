import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { MSellerCredentials } from "./client";

const VERSION = "v1";
/** Node acepta etiquetas GCM más cortas si no se le fija la longitud; eso debilita la autenticación. */
const AUTH_TAG_BYTES = 16;

/** La clave vive solo en el servidor de Next; la base de datos guarda el texto cifrado. */
function loadKey(): Buffer {
  const encoded = process.env.BILLING_SECRETS_KEY;
  if (!encoded) {
    throw new Error("Falta la variable BILLING_SECRETS_KEY en el servidor: sin ella no se pueden guardar ni usar las credenciales del proveedor.");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("BILLING_SECRETS_KEY debe ser de 32 bytes en base64 (openssl rand -base64 32).");
  }
  return key;
}

export function isSecretsKeyConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

/** Ata el texto a su empresa y ambiente: copiarlo a otra fila no sirve para descifrarlo. */
function additionalData(companyId: string, environment: string): Buffer {
  return Buffer.from(`${companyId}:${environment}`, "utf8");
}

export function encryptCredentials(companyId: string, environment: string, credentials: MSellerCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadKey(), iv, { authTagLength: AUTH_TAG_BYTES });
  cipher.setAAD(additionalData(companyId, environment));
  const body = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}

export function decryptCredentials(companyId: string, environment: string, ciphertext: string): MSellerCredentials {
  const [version, iv, tag, body] = ciphertext.split(".");
  if (version !== VERSION || !iv || !tag || !body) {
    throw new Error("Las credenciales guardadas no tienen el formato esperado; regístralas de nuevo.");
  }
  try {
    const authTag = Buffer.from(tag, "base64");
    if (authTag.length !== AUTH_TAG_BYTES) throw new Error("Etiqueta de autenticación inválida.");
    const decipher = createDecipheriv("aes-256-gcm", loadKey(), Buffer.from(iv, "base64"), { authTagLength: AUTH_TAG_BYTES });
    decipher.setAAD(additionalData(companyId, environment));
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
    return JSON.parse(plain) as MSellerCredentials;
  } catch (err) {
    if (err instanceof Error && err.message.includes("BILLING_SECRETS_KEY")) throw err;
    throw new Error("No se pudieron descifrar las credenciales del proveedor: ¿cambió BILLING_SECRETS_KEY? Regístralas de nuevo.");
  }
}

/** Solo para reconocer la cuenta en pantalla: "de***@empresa.do". */
export function emailHint(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}
