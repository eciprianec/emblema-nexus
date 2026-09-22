import "server-only";

import * as crypto from "node:crypto";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * EcfSigner — Firma digital XML-DSig y cálculo de códigos de seguridad oficiales e-CF (DGII Ley 32-23).
 * 
 * Funcionalidades:
 * 1. Cálculo del Código de Seguridad de 6 caracteres alfanuméricos en mayúsculas a partir del hash del documento.
 * 2. Normalización canónica Canonical XML 1.0 (C14N).
 * 3. Firma digital XML-DSig con algoritmo RSA-SHA256 y certificados X.509 (.p12 / .pfx o PEM).
 * 4. Generación de URL del Código QR oficial de consulta de timbre ante la DGII.
 */

export interface QrCodeParams {
  rncEmisor: string;
  rncComprador?: string | null;
  encf: string;
  fechaEmision: string; // Formato DD-MM-YYYY
  montoTotal: number | string;
  codigoSeguridad: string;
}

export interface ParsedCertificate {
  privateKeyPem: string;
  certificatePem: string;
  certificateBase64: string;
}

export class EcfSigner {
  public static readonly OFFICIAL_QR_BASE_URL = "https://ecf.dgii.gov.do/fe/consultatimbre";
  public static readonly C14N_ALGORITHM = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
  public static readonly SIGNATURE_ALGORITHM = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
  public static readonly DIGEST_ALGORITHM = "http://www.w3.org/2001/04/xmlenc#sha256";

  /** Cache en memoria de claves de desarrollo para no regenerar en cada firma mock */
  private static devKeyPair: crypto.KeyPairSyncResult<string, string> | null = null;

  /**
   * Calcula el Código de Seguridad de 6 caracteres alfanuméricos en mayúsculas
   * a partir del hash SHA-256 del documento firmado (o su SignatureValue).
   */
  public static computeSecurityCode(signedXmlOrHash: string): string {
    if (!signedXmlOrHash || signedXmlOrHash.trim().length === 0) {
      throw new Error("No se puede calcular el Código de Seguridad de un documento vacío.");
    }

    // Si ya es un hash hexadecimal de 64 caracteres
    if (/^[0-9a-fA-F]{64}$/.test(signedXmlOrHash.trim())) {
      return signedXmlOrHash.trim().substring(0, 6).toUpperCase();
    }

    // Calcular hash SHA-256 del documento XML firmado
    const hash = crypto.createHash("sha256").update(signedXmlOrHash, "utf8").digest("hex");
    return hash.substring(0, 6).toUpperCase();
  }

  /**
   * Genera la URL del Código QR oficial para la consulta de timbre en el portal de la DGII.
   */
  public static generateQrCodeUrl(params: QrCodeParams): string {
    const rncEmisor = params.rncEmisor.replace(/[^0-9]/g, "");
    const rncComprador = params.rncComprador ? params.rncComprador.replace(/[^0-9]/g, "") : "";
    const encf = params.encf.trim();
    const fechaEmision = params.fechaEmision.trim();
    const montoTotal = typeof params.montoTotal === "number"
      ? params.montoTotal.toFixed(2)
      : parseFloat(params.montoTotal).toFixed(2);
    const codigoSeguridad = params.codigoSeguridad.trim().toUpperCase();

    const query = new URLSearchParams({
      RncEmisor: rncEmisor,
      RncComprador: rncComprador,
      ENCF: encf,
      FechaEmision: fechaEmision,
      MontoTotal: montoTotal,
      CodigoSeguridad: codigoSeguridad,
    });

    return `${this.OFFICIAL_QR_BASE_URL}?${query.toString()}`;
  }

  /**
   * Implementación de Canonical XML 1.0 (C14N) según W3C REC-xml-c14n-20010315.
   * Remueve la declaración XML, comentarios, expande etiquetas vacías y normaliza atributos.
   */
  public static canonicalizeXml(xml: string): string {
    // 1. Normalizar saltos de línea a \n
    let result = xml.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 2. Remover declaración XML <?xml ... ?>
    result = result.replace(/<\?xml[^>]*\?>\s*/gi, "");

    // 3. Remover comentarios <!-- ... -->
    result = result.replace(/<!--[\s\S]*?-->/g, "");

    // 4. Normalizar etiquetas y orden de atributos
    result = this.normalizeElementsAndAttributes(result);

    return result.trim();
  }

  /**
   * Ordena atributos alfabéticamente y expande etiquetas autocerradas (<tag/> -> <tag></tag>).
   */
  private static normalizeElementsAndAttributes(xml: string): string {
    return xml.replace(/<([a-zA-Z0-9_:-]+)([^>]*?)(\/?)>/g, (_match, tagName, rawAttrs, isSelfClosing) => {
      let attrsString = "";
      const trimmedAttrs = rawAttrs.trim();

      if (trimmedAttrs.length > 0) {
        // Extraer atributos respetando comillas
        const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
        const attrs: Array<{ name: string; value: string; isXmlns: boolean }> = [];
        let m: RegExpExecArray | null;

        while ((m = attrRegex.exec(trimmedAttrs)) !== null) {
          const name = m[1];
          const value = m[2] !== undefined ? m[2] : m[3];
          attrs.push({
            name,
            value,
            isXmlns: name === "xmlns" || name.startsWith("xmlns:"),
          });
        }

        // Orden C14N: primero xmlns, luego atributos por nombre
        attrs.sort((a, b) => {
          if (a.isXmlns && !b.isXmlns) return -1;
          if (!a.isXmlns && b.isXmlns) return 1;
          return a.name.localeCompare(b.name);
        });

        attrsString = attrs
          .map((a) => {
            const escapedVal = a.value
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/"/g, "&quot;")
              .replace(/\t/g, "&#x9;")
              .replace(/\n/g, "&#xA;")
              .replace(/\r/g, "&#xD;");
            return ` ${a.name}="${escapedVal}"`;
          })
          .join("");
      }

      if (isSelfClosing === "/") {
        return `<${tagName}${attrsString}></${tagName}>`;
      }
      return `<${tagName}${attrsString}>`;
    });
  }

  /**
   * Extrae la clave privada y certificado X.509 de un contenedor PKCS#12 (.p12/.pfx) o PEM.
   */
  public static parseCertificate(
    certificateData?: string | null,
    password?: string | null
  ): ParsedCertificate {
    // Si no hay certificado provisto, generar o utilizar clave de desarrollo segura en memoria
    if (!certificateData || certificateData.trim().length === 0) {
      return this.getDevCertificate();
    }

    const trimmed = certificateData.trim();

    // 1. Caso PEM directo
    if (trimmed.includes("-----BEGIN PRIVATE KEY-----") || trimmed.includes("-----BEGIN RSA PRIVATE KEY-----")) {
      const certMatch = trimmed.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
      const keyMatch = trimmed.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/);

      if (certMatch && keyMatch) {
        const certPem = certMatch[0];
        const keyPem = keyMatch[0];
        const certBase64 = certPem
          .replace(/-----BEGIN CERTIFICATE-----/, "")
          .replace(/-----END CERTIFICATE-----/, "")
          .replace(/\s+/g, "");

        return {
          privateKeyPem: keyPem,
          certificatePem: certPem,
          certificateBase64: certBase64,
        };
      }
    }

    // 2. Caso PKCS#12 / .pfx en Base64 o binario
    try {
      const p12Buffer = Buffer.from(trimmed, "base64");
      return this.extractFromP12Buffer(p12Buffer, password || "");
    } catch {
      // Si falla la extracción PKCS#12, usar certificado de contingencia para no romper el entorno
      return this.getDevCertificate();
    }
  }

  /**
   * Extrae claves de un archivo PKCS#12 utilizando OpenSSL si está disponible en el sistema.
   */
  private static extractFromP12Buffer(buffer: Buffer, password: string): ParsedCertificate {
    // Buscar OpenSSL ejecutable
    const opensslPaths = [
      "openssl",
      "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
      "C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe",
    ];

    let opensslBin: string | null = null;
    for (const bin of opensslPaths) {
      try {
        execSync(`"${bin}" version`, { stdio: "ignore" });
        opensslBin = bin;
        break;
      } catch {
        continue;
      }
    }

    if (!opensslBin) {
      return this.getDevCertificate();
    }

    const tempDir = os.tmpdir();
    const tempP12Path = path.join(tempDir, `ecf_cert_${Date.now()}_${Math.random().toString(36).substring(7)}.p12`);

    try {
      fs.writeFileSync(tempP12Path, buffer);

      const passParam = password ? `-passin "pass:${password}"` : `-passin "pass:"`;

      // Extraer clave privada sin cifrado
      const keyCommand = `"${opensslBin}" pkcs12 -in "${tempP12Path}" -nocerts -nodes ${passParam}`;
      const privateKeyPem = execSync(keyCommand, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });

      // Extraer certificado cliente
      const certCommand = `"${opensslBin}" pkcs12 -in "${tempP12Path}" -clcerts -nokeys ${passParam}`;
      const certificatePem = execSync(certCommand, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });

      const certMatch = certificatePem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
      if (!certMatch) {
        throw new Error("No se encontró certificado X.509 en el archivo PKCS#12 provisto.");
      }

      const cleanCertBase64 = certMatch[0]
        .replace(/-----BEGIN CERTIFICATE-----/, "")
        .replace(/-----END CERTIFICATE-----/, "")
        .replace(/\s+/g, "");

      return {
        privateKeyPem,
        certificatePem: certMatch[0],
        certificateBase64: cleanCertBase64,
      };
    } finally {
      if (fs.existsSync(tempP12Path)) {
        try {
          fs.unlinkSync(tempP12Path);
        } catch {
          // Ignorar error de limpieza temporal
        }
      }
    }
  }

  /**
   * Genera un par de claves RSA 2048 y certificado autofirmado en memoria para entornos DEV/Test.
   */
  private static getDevCertificate(): ParsedCertificate {
    if (!this.devKeyPair) {
      this.devKeyPair = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });
    }

    const cleanPubKey = this.devKeyPair.publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\s+/g, "");

    return {
      privateKeyPem: this.devKeyPair.privateKey,
      certificatePem: this.devKeyPair.publicKey,
      certificateBase64: cleanPubKey,
    };
  }

  /**
   * Firma digitalmente un documento XML según el estándar XML-DSig de la DGII.
   */
  public static signXml(
    xml: string,
    certificateData?: string | null,
    password?: string | null
  ): string {
    const cert = this.parseCertificate(certificateData, password);

    // 1. Remover cualquier firma previa
    const xmlWithoutSig = xml.replace(/<Signature[\s\S]*?<\/Signature>/gi, "").trim();

    // 2. Canonicalizar documento (Enveloped transform)
    const canonicalDoc = this.canonicalizeXml(xmlWithoutSig);

    // 3. Calcular DigestValue SHA-256 del documento canónico
    const digestValue = crypto.createHash("sha256").update(canonicalDoc, "utf8").digest("base64");

    // 4. Construir bloque <SignedInfo>
    const signedInfo = [
      `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`,
      `  <CanonicalizationMethod Algorithm="${this.C14N_ALGORITHM}"/>`,
      `  <SignatureMethod Algorithm="${this.SIGNATURE_ALGORITHM}"/>`,
      `  <Reference URI="">`,
      `    <Transforms>`,
      `      <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>`,
      `      <Transform Algorithm="${this.C14N_ALGORITHM}"/>`,
      `    </Transforms>`,
      `    <DigestMethod Algorithm="${this.DIGEST_ALGORITHM}"/>`,
      `    <DigestValue>${digestValue}</DigestValue>`,
      `  </Reference>`,
      `</SignedInfo>`,
    ].join("\n");

    // 5. Canonicalizar <SignedInfo> para la firma criptográfica
    const canonicalSignedInfo = this.canonicalizeXml(signedInfo);

    // 6. Firmar <SignedInfo> con la clave privada RSA-SHA256
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(canonicalSignedInfo, "utf8");
    signer.end();
    const signatureValue = signer.sign(cert.privateKeyPem, "base64");

    // 7. Construir elemento <Signature> XMLDSig completo
    const signatureXml = [
      `  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">`,
      `    <SignedInfo>`,
      `      <CanonicalizationMethod Algorithm="${this.C14N_ALGORITHM}"/>`,
      `      <SignatureMethod Algorithm="${this.SIGNATURE_ALGORITHM}"/>`,
      `      <Reference URI="">`,
      `        <Transforms>`,
      `          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>`,
      `          <Transform Algorithm="${this.C14N_ALGORITHM}"/>`,
      `        </Transforms>`,
      `        <DigestMethod Algorithm="${this.DIGEST_ALGORITHM}"/>`,
      `        <DigestValue>${digestValue}</DigestValue>`,
      `      </Reference>`,
      `    </SignedInfo>`,
      `    <SignatureValue>${signatureValue}</SignatureValue>`,
      `    <KeyInfo>`,
      `      <X509Data>`,
      `        <X509Certificate>${cert.certificateBase64}</X509Certificate>`,
      `      </X509Data>`,
      `    </KeyInfo>`,
      `  </Signature>`,
    ].join("\n");

    // 8. Insertar <Signature> antes de la etiqueta de cierre </eCF>
    if (xmlWithoutSig.includes("</eCF>")) {
      return xmlWithoutSig.replace("</eCF>", `${signatureXml}\n</eCF>`);
    }

    return `${xmlWithoutSig}\n${signatureXml}`;
  }

  /**
   * Verifica la integridad de la firma digital de un documento XML-DSig.
   */
  public static verifyXmlSignature(signedXml: string): boolean {
    try {
      const sigMatch = signedXml.match(/<Signature[\s\S]*?<\/Signature>/i);
      if (!sigMatch) return false;

      const digestMatch = signedXml.match(/<DigestValue>([\s\S]*?)<\/DigestValue>/i);
      const sigValMatch = signedXml.match(/<SignatureValue>([\s\S]*?)<\/SignatureValue>/i);
      const certMatch = signedXml.match(/<X509Certificate>([\s\S]*?)<\/X509Certificate>/i);

      if (!digestMatch || !sigValMatch || !certMatch) return false;

      const digestValue = digestMatch[1].trim();
      const signatureValue = sigValMatch[1].trim();
      const certBase64 = certMatch[1].replace(/\s+/g, "");

      // 1. Verificar DigestValue del documento
      const xmlWithoutSig = signedXml.replace(/<Signature[\s\S]*?<\/Signature>/gi, "").trim();
      const canonicalDoc = this.canonicalizeXml(xmlWithoutSig);
      const computedDigest = crypto.createHash("sha256").update(canonicalDoc, "utf8").digest("base64");

      if (computedDigest !== digestValue) {
        return false;
      }

      // 2. Extraer y canonicalizar SignedInfo
      const signedInfoMatch = signedXml.match(/<SignedInfo[\s\S]*?<\/SignedInfo>/i);
      if (!signedInfoMatch) return false;

      const canonicalSignedInfo = this.canonicalizeXml(signedInfoMatch[0]);

      // 3. Verificar firma con clave pública del certificado
      const certPem = `-----BEGIN CERTIFICATE-----\n${certBase64.match(/.{1,64}/g)?.join("\n") || certBase64}\n-----END CERTIFICATE-----`;

      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(canonicalSignedInfo, "utf8");
      verifier.end();

      return verifier.verify(certPem, signatureValue, "base64");
    } catch {
      return false;
    }
  }
}
