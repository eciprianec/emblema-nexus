export const NEXTCLOUD_NOT_CONFIGURED =
  "Nextcloud no está configurado en el servidor (NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_APP_PASSWORD).";

const STORAGE_ROOT = "/nexus_storage";

/** Credenciales solo desde el entorno del servidor: nunca del navegador ni del código. */
export function getNextcloudEnv(
  env: Record<string, string | undefined> = process.env
): { baseUrl: string; username: string; password: string } | null {
  const url = env.NEXTCLOUD_URL?.trim();
  const username = env.NEXTCLOUD_USER?.trim();
  const password = env.NEXTCLOUD_APP_PASSWORD?.trim();
  if (!url || !username || !password) return null;

  const withScheme = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return { baseUrl: withScheme.replace(/\/$/, ""), username, password };
}

/** La cuenta de Nextcloud puede tener otros archivos: la aplicación se limita a su carpeta. */
export function isStoragePath(path: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  const normalized = decoded.startsWith("/") ? decoded : `/${decoded}`;
  if (normalized.split(/[\\/]/).includes("..")) return false;
  return normalized === STORAGE_ROOT || normalized.startsWith(`${STORAGE_ROOT}/`);
}

const PRIVATE_HOST =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[.*\])$/i;

/** Evita usar la prueba de conexión para sondear la red interna (SSRF). */
export function isAllowedServerUrl(url: string, allowPrivate = false): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (allowPrivate) return parsed.protocol === "https:" || parsed.protocol === "http:";
  return parsed.protocol === "https:" && !PRIVATE_HOST.test(parsed.hostname);
}
