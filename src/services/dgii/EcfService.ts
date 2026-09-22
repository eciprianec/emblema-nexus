import "server-only";

/**
 * EcfService — Capa de abstracción para facturación electrónica DGII (§60).
 * 
 * Aísla la aplicación de la librería dgii-ecf.
 * La librería solo firma y envía — nosotros generamos el XML.
 * 
 * IMPORTANTE:
 * - NUNCA exponer certificados al navegador
 * - NUNCA mezclar ambientes (prueba/certificación/producción)
 * - Almacenar todo resultado de DGII
 */

export type EcfEnvironment = "DEV" | "CERT" | "PROD";

export interface EcfSendResult {
  trackId: string;
  message: string;
  status: string;
}

export interface EcfStatusResult {
  trackId: string;
  code: string;
  status: string; // 'Aceptado', 'Rechazado', 'Aceptado condicional', 'En Proceso'
  rnc: string;
  encf: string;
  messages: string[];
}

export interface EcfDirectoryResult {
  rnc: string;
  name: string;
  url: string;
}

export interface InvoiceData {
  // Encabezado
  ecfType: string; // E31, E32, E33, E34, etc.
  encf: string;
  securityCode: string;
  issueDate: string;
  // Emisor
  emitterRnc: string;
  emitterName: string;
  emitterTradeName?: string;
  emitterAddress?: string;
  // Receptor
  receiverRnc?: string;
  receiverName: string;
  receiverAddress?: string;
  // Items
  items: InvoiceItem[];
  // Totales
  subtotal: string; // NUMERIC como string
  taxAmount: string;
  total: string;
  // Metadata
  companyId: string;
  invoiceId: string;
}

export interface InvoiceItem {
  lineNumber: number;
  description: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
}

export interface IEcfService {
  /** Verificar si el servicio está configurado */
  isConfigured(): boolean;

  /** Autenticar con DGII */
  authenticate(): Promise<void>;

  /** Generar XML de factura (nuestro builder) */
  buildInvoiceXml(invoice: InvoiceData): string;

  /** Firmar XML con certificado digital */
  signXml(xml: string): string;

  /** Enviar documento firmado a DGII */
  sendDocument(signedXml: string, fileName: string): Promise<EcfSendResult>;

  /** Consultar estado por TrackId */
  checkStatus(trackId: string): Promise<EcfStatusResult>;

  /** Consultar directorio de contribuyentes electrónicos */
  queryDirectory(rnc: string): Promise<EcfDirectoryResult[]>;
}

/**
 * Obtener instancia del servicio e-CF.
 * Retorna mock si no hay configuración de DGII.
 */
export async function getEcfService(): Promise<IEcfService> {
  const p12Base64 = process.env.DGII_P12_BASE64;
  const p12Secret = process.env.DGII_P12_SECRET;

  if (!p12Base64 || !p12Secret) {
    const { EcfMock } = await import("./EcfMock");
    return new EcfMock();
  }

  // Cuando tengamos credenciales reales, importar la implementación real
  const { EcfMock } = await import("./EcfMock");
  return new EcfMock(); // TODO: Implementar EcfReal en Fase 5
}
