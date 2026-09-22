import "server-only";

/**
 * EcfMock — Mock para desarrollo sin credenciales DGII (§153).
 * 
 * NUNCA mostrar una factura simulada como aceptada realmente por DGII.
 * Los mocks solo se permiten durante desarrollo y pruebas.
 */

import type {
  IEcfService,
  InvoiceData,
  EcfSendResult,
  EcfStatusResult,
  EcfDirectoryResult,
} from "./EcfService";

export class EcfMock implements IEcfService {
  private log(method: string, ...args: unknown[]) {
    console.log(`[EcfMock] ${method}:`, ...args);
  }

  isConfigured(): boolean {
    return false;
  }

  async authenticate(): Promise<void> {
    this.log("authenticate", "DGII no configurado — usando mock");
  }

  buildInvoiceXml(invoice: InvoiceData): string {
    this.log("buildInvoiceXml", `Tipo: ${invoice.ecfType}, eNCF: ${invoice.encf}`);
    return `<!-- Mock XML para ${invoice.encf} -->`;
  }

  signXml(xml: string): string {
    this.log("signXml", `${xml.length} caracteres`);
    return xml;
  }

  async sendDocument(
    _signedXml: string,
    fileName: string
  ): Promise<EcfSendResult> {
    this.log("sendDocument", fileName);
    return {
      trackId: `mock-${Date.now()}`,
      message: "Mock: Documento NO enviado a DGII (sin credenciales configuradas)",
      status: "mock_pendiente",
    };
  }

  async checkStatus(trackId: string): Promise<EcfStatusResult> {
    this.log("checkStatus", trackId);
    return {
      trackId,
      code: "0",
      status: "mock_no_configurado",
      rnc: "",
      encf: "",
      messages: ["DGII no configurado — usando mock para desarrollo"],
    };
  }

  async queryDirectory(rnc: string): Promise<EcfDirectoryResult[]> {
    this.log("queryDirectory", rnc);
    return [];
  }
}
