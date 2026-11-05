import { describe, expect, it } from "vitest";
import { getNextcloudEnv, isAllowedServerUrl, isStoragePath } from "./guards";

describe("credenciales de Nextcloud", () => {
  it("sin variables de entorno no hay conexión ni valores por defecto", () => {
    expect(getNextcloudEnv({})).toBeNull();
    expect(getNextcloudEnv({ NEXTCLOUD_URL: "https://x.test", NEXTCLOUD_USER: "a" })).toBeNull();
  });

  it("normaliza la URL del servidor", () => {
    const env = { NEXTCLOUD_URL: "x.test/", NEXTCLOUD_USER: "a", NEXTCLOUD_APP_PASSWORD: "b" };
    expect(getNextcloudEnv(env)?.baseUrl).toBe("https://x.test");
  });
});

describe("rutas de almacenamiento", () => {
  it("permite solo la carpeta de la aplicación", () => {
    expect(isStoragePath("/nexus_storage")).toBe(true);
    expect(isStoragePath("/nexus_storage/Clientes/a.pdf")).toBe(true);
    expect(isStoragePath("nexus_storage/a.pdf")).toBe(true);
  });

  it("rechaza salir de la carpeta", () => {
    expect(isStoragePath("/")).toBe(false);
    expect(isStoragePath("/Documents/privado.pdf")).toBe(false);
    expect(isStoragePath("/nexus_storage_otro/a")).toBe(false);
    expect(isStoragePath("/nexus_storage/../secreto")).toBe(false);
    expect(isStoragePath("/nexus_storage/%2e%2e/secreto")).toBe(false);
    expect(isStoragePath("/nexus_storage/..\\secreto")).toBe(false);
    expect(isStoragePath("/nexus_storage/%zz")).toBe(false);
  });
});

describe("URL de prueba de conexión", () => {
  it("acepta servidores públicos con https", () => {
    expect(isAllowedServerUrl("https://cloud.example.com")).toBe(true);
  });

  it("rechaza http y la red interna en producción", () => {
    for (const url of [
      "http://cloud.example.com",
      "https://localhost:8080",
      "https://127.0.0.1",
      "https://10.0.0.5",
      "https://192.168.1.1",
      "https://172.16.0.1",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]",
      "https://db.internal",
      "file:///etc/passwd",
      "no es url",
    ]) {
      expect(isAllowedServerUrl(url), url).toBe(false);
    }
  });

  it("en desarrollo admite un servidor local", () => {
    expect(isAllowedServerUrl("http://localhost:8080", true)).toBe(true);
    expect(isAllowedServerUrl("file:///etc/passwd", true)).toBe(false);
  });
});
