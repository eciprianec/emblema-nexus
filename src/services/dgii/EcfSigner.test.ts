import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { EcfSigner } = await import("./EcfSigner");

const hasOpenssl = (() => {
  try {
    execFileSync("openssl", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasOpenssl)("certificado PKCS#12", () => {
  let dir: string;
  let marker: string;
  let password: string;
  let p12Base64: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecf-test-"));
    marker = path.join(dir, "inyectado");
    // Si la contraseña llegara a un shell, este valor crearía el archivo marcador.
    password = `x"; touch ${marker}; echo "`;
    const key = path.join(dir, "k.pem");
    const crt = path.join(dir, "c.pem");
    const p12 = path.join(dir, "c.p12");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt, "-days", "1", "-subj", "/CN=prueba"], { stdio: "ignore" });
    execFileSync("openssl", ["pkcs12", "-export", "-inkey", key, "-in", crt, "-out", p12, "-passout", "env:P12_TEST"], {
      stdio: "ignore",
      env: { ...process.env, P12_TEST: password },
    });
    p12Base64 = fs.readFileSync(p12).toString("base64");
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("abre el certificado con una contraseña maliciosa sin ejecutarla", () => {
    const cert = EcfSigner.parseCertificate(p12Base64, password);
    expect(cert.certificatePem).toContain("BEGIN CERTIFICATE");
    expect(cert.privateKeyPem).toContain("PRIVATE KEY");
    expect(fs.existsSync(marker)).toBe(false);
  });

  it("falla con contraseña incorrecta en vez de firmar con una clave de desarrollo", () => {
    expect(() => EcfSigner.parseCertificate(p12Base64, "incorrecta")).toThrow(/no son válidos/);
  });
});

describe("sin certificado", () => {
  it("en producción falla en vez de usar una clave de desarrollo", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => EcfSigner.parseCertificate(null)).toThrow(/certificado digital/);
    vi.unstubAllEnvs();
  });

  it("un archivo inválido siempre falla", () => {
    expect(() => EcfSigner.parseCertificate("bm8gZXMgdW4gY2VydGlmaWNhZG8=", "x")).toThrow();
  });
});
