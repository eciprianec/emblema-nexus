import "server-only";

/**
 * EcfService — Orquestador principal de Facturación Electrónica e-CF (DGII República Dominicana - Ley 32-23).
 * 
 * Centraliza y coordina:
 * 1. Asignación y avance atómico de secuencias fiscales (e-NCF).
 * 2. Construcción rigurosa de documentos XML según esquemas de la DGII.
 * 3. Firma digital XML-DSig con certificados X.509 (.p12/.pfx).
 * 4. Cálculo del Código de Seguridad de 6 caracteres y URL de timbre QR.
 * 5. Envío y consulta de TrackId ante los Web Services de la DGII (CERT y PROD).
 * 6. Gestión comercial B2B de comprobantes electrónicos recibidos.
 */

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logAuditEntry } from "@/services/audit/AuditService";

import {
  EcfXmlBuilder,
  type EcfDocType,
  type EcfDocumentInput,
  type EcfItemData,
  type EcfModificationData,
  type EcfPaymentType,
  type EcfIncomeType,
} from "./EcfXmlBuilder";

import { EcfSigner } from "./EcfSigner";
import { EcfSequenceService } from "./EcfSequenceService";
import {
  EcfDgiiClient,
  type EcfConfigRow,
  type EcfEnvironment,
  type EcfSendResult,
  type EcfStatusResult,
  type EcfDirectoryResult,
} from "./EcfDgiiClient";
import { EcfCommercialService } from "./EcfCommercialService";

// Re-exportar tipos fundamentales para compatibilidad
export type {
  EcfEnvironment,
  EcfSendResult,
  EcfStatusResult,
  EcfDirectoryResult,
  EcfConfigRow,
};

export type EcfInvoiceRow = Database["public"]["Tables"]["ecf_invoices"]["Row"];

export interface EmitEcfOptions {
  sendImmediately?: boolean;
  modification?: EcfModificationData;
  paymentType?: EcfPaymentType;
  incomeType?: EcfIncomeType;
  paymentDeadline?: string | Date | null;
  paymentTerms?: string | null;
  createdBy?: string | null;
}

export interface EmitEcfResult {
  ecfInvoice: EcfInvoiceRow;
  encf: string;
  securityCode: string;
  qrCodeUrl: string;
  signedXml: string;
  trackId?: string | null;
  dgiiStatus: string;
  messages?: string[];
}

export interface InvoiceData {
  ecfType: string;
  encf: string;
  securityCode: string;
  issueDate: string;
  emitterRnc: string;
  emitterName: string;
  emitterTradeName?: string;
  emitterAddress?: string;
  receiverRnc?: string;
  receiverName: string;
  receiverAddress?: string;
  items: InvoiceItem[];
  subtotal: string;
  taxAmount: string;
  total: string;
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
  isConfigured(): boolean;
  authenticate(config?: EcfConfigRow): Promise<string | void>;
  buildInvoiceXml(invoice: InvoiceData | EcfDocumentInput): string;
  signXml(xml: string, certData?: string | null, password?: string | null): string;
  sendDocument(signedXml: string, fileName: string, config?: EcfConfigRow): Promise<EcfSendResult>;
  checkStatus(trackId: string, config?: EcfConfigRow): Promise<EcfStatusResult>;
  queryDirectory(rnc: string, config?: EcfConfigRow): Promise<EcfDirectoryResult[]>;
}

export class EcfService implements IEcfService {
  /**
   * Verifica si el servicio está configurado para la empresa por defecto o entorno.
   */
  public isConfigured(): boolean {
    return Boolean(
      process.env.DGII_P12_BASE64 ||
        process.env.NEXT_PUBLIC_DGII_RNC ||
        process.env.DGII_ENVIRONMENT
    );
  }

  /**
   * Obtiene la configuración de facturación electrónica activa para una empresa.
   */
  public async getCompanyConfig(
    companyId: string,
    customClient?: SupabaseClient<Database>
  ): Promise<EcfConfigRow> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    const { data: config, error } = await db
      .from("ecf_configs")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (error || !config) {
      throw new Error(
        "No existe configuración de facturación electrónica e-CF para la empresa. Configure los datos fiscales y certificados en el panel de Configuración Fiscal."
      );
    }

    return config as EcfConfigRow;
  }

  /**
   * Emite un comprobante electrónico (e-CF) completo orquestando todas las fases:
   * 1. Asignación de secuencia e-NCF atómica
   * 2. Construcción del XML conforme a DGII
   * 3. Firma digital XML-DSig
   * 4. Cálculo de Código de Seguridad y URL QR de timbre
   * 5. Almacenamiento en ecf_invoices
   * 6. Envío opcional a Web Services de DGII
   * 7. Actualización de factura y auditoría
   */
  public async emitEcf(
    companyId: string,
    invoiceId: string,
    ecfType: EcfDocType,
    options?: EmitEcfOptions,
    customClient?: SupabaseClient<Database>
  ): Promise<EmitEcfResult> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    // 1. Obtener configuración fiscal de la empresa
    const config = await this.getCompanyConfig(companyId, supabase);

    // 2. Obtener factura e ítems
    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select(`
        *,
        items:invoice_items(*),
        client:clients(*)
      `)
      .eq("id", invoiceId)
      .eq("company_id", companyId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Factura con ID ${invoiceId} no encontrada para emitir comprobante.`);
    }

    // 3. Obtener y avanzar de forma atómica la secuencia e-NCF
    const seqResult = await EcfSequenceService.getNextEncf(companyId, ecfType, supabase);
    const encf = seqResult.encf;

    // 4. Preparar datos de ítems para el XML
    const rawItems: any[] = invoice.items || [];
    const xmlItems: EcfItemData[] = rawItems.map((item: any, idx: number) => {
      const qty = item.quantity || 1;
      const price = item.unit_price || 0;
      const appliesTax = item.applies_itbis ?? true;
      const disc = item.discount || 0;
      const itemNet = Math.max(0, qty * price - disc);

      return {
        lineNumber: item.order_index || idx + 1,
        name: item.description,
        goodOrService: 2, // 2 = Servicios profesionales
        quantity: qty,
        unitPrice: price,
        discountAmount: disc,
        billingIndicator: appliesTax ? 2 : 4,
        itbisRate: appliesTax ? 18.0 : 0.0,
        itbisAmount: appliesTax ? itemNet * 0.18 : 0,
      };
    });

    // 5. Construir objeto de entrada para EcfXmlBuilder
    const buyerTaxId = invoice.client?.rnc || invoice.client?.cedula || "";
    const buyerName =
      invoice.client?.business_name ||
      `${invoice.client?.first_name || ""} ${invoice.client?.last_name || ""}`.trim() ||
      "CONSUMIDOR FINAL";

    const docInput: EcfDocumentInput = {
      ecfType,
      encf,
      sequenceExpirationDate: seqResult.expirationDate,
      issueDate: invoice.issue_date,
      paymentType: options?.paymentType || (invoice.payment_terms ? "2" : "1"),
      incomeType: options?.incomeType || "01",
      paymentDeadline: options?.paymentDeadline || invoice.due_date,
      paymentTerms: options?.paymentTerms || invoice.payment_terms,
      emitter: {
        rnc: config.rnc,
        businessName: config.business_name,
        tradeName: config.trade_name,
        economicActivity: config.economic_activity,
        issueDate: invoice.issue_date,
      },
      buyer: {
        rnc: buyerTaxId,
        businessName: buyerName,
        email: invoice.client?.email,
        address: invoice.client?.address,
      },
      items: xmlItems,
      modification: options?.modification,
    };

    // 6. Construir XML no firmado
    const xmlUnsigned = EcfXmlBuilder.buildInvoiceXml(docInput);

    // 7. Firmar digitalmente con XML-DSig
    const xmlSigned = EcfSigner.signXml(
      xmlUnsigned,
      config.certificate_data,
      config.certificate_password_hash
    );

    // 8. Calcular Código de Seguridad oficial (6 caracteres alfanuméricos)
    const securityCode = EcfSigner.computeSecurityCode(xmlSigned);

    // 9. Generar URL de consulta de timbre oficial QR
    const qrCodeUrl = EcfSigner.generateQrCodeUrl({
      rncEmisor: config.rnc,
      rncComprador: buyerTaxId,
      encf,
      fechaEmision: EcfXmlBuilder.formatDateDominican(invoice.issue_date),
      montoTotal: invoice.total,
      codigoSeguridad: securityCode,
    });

    // 10. Persistir registro en ecf_invoices
    const { data: ecfInvoice, error: ecfInsertError } = await db
      .from("ecf_invoices")
      .insert({
        company_id: companyId,
        invoice_id: invoiceId,
        encf,
        ecf_type: ecfType,
        environment: config.environment,
        security_code: securityCode,
        sign_date: new Date().toISOString(),
        xml_unsigned: xmlUnsigned,
        xml_signed: xmlSigned,
        qr_code_url: qrCodeUrl,
        dgii_status: "firmado",
        buyer_acceptance_status: "pendiente",
        created_by: options?.createdBy ?? null,
      })
      .select()
      .single();

    if (ecfInsertError || !ecfInvoice) {
      throw new Error(`Error al registrar el e-CF emitido en el sistema: ${ecfInsertError?.message}`);
    }

    const savedInvoice = ecfInvoice as EcfInvoiceRow;

    // 11. Envío a la DGII si auto-send está habilitado
    let trackId: string | null = null;
    let dgiiStatus: string = "firmado";
    let dgiiMessages: string[] = [];

    const shouldSend = options?.sendImmediately ?? (config.auto_send_dgii ?? true);

    if (shouldSend) {
      try {
        const fileName = `${config.rnc}${encf}.xml`;
        const sendResult = await EcfDgiiClient.sendEcf(xmlSigned, fileName, config);

        trackId = sendResult.trackId;
        dgiiStatus = sendResult.status;
        dgiiMessages = sendResult.messages || [sendResult.message];

        // Actualizar estado del e-CF tras el envío
        await db
          .from("ecf_invoices")
          .update({
            track_id: trackId,
            dgii_status: sendResult.status,
            dgii_messages: dgiiMessages,
            updated_at: new Date().toISOString(),
          })
          .eq("id", savedInvoice.id);
      } catch (err: unknown) {
        const sendErrMsg = err instanceof Error ? err.message : String(err);
        dgiiMessages.push(`Fallo en transmisión inmediata: ${sendErrMsg}`);
      }
    }

    // 12. Actualizar el NCF y estado de la factura original
    await db
      .from("invoices")
      .update({
        ncf: encf,
        ncf_type: ecfType,
        status: invoice.status === "borrador" ? "emitida" : invoice.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    // 13. Registrar en bitácora de auditoría
    await logAuditEntry({
      companyId,
      entityType: "ecf_invoices",
      entityId: savedInvoice.id,
      action: "EMIT_ECF",
      newData: {
        encf,
        ecf_type: ecfType,
        security_code: securityCode,
        track_id: trackId,
        dgii_status: dgiiStatus,
      },
    });

    return {
      ecfInvoice: {
        ...savedInvoice,
        track_id: trackId,
        dgii_status: dgiiStatus as any,
        dgii_messages: dgiiMessages,
      },
      encf,
      securityCode,
      qrCodeUrl,
      signedXml: xmlSigned,
      trackId,
      dgiiStatus,
      messages: dgiiMessages,
    };
  }

  /**
   * Consulta el estado actualizado de un e-CF ante la DGII mediante su TrackId y actualiza la BD.
   */
  public async checkTrackId(
    companyId: string,
    ecfInvoiceId: string,
    customClient?: SupabaseClient<Database>
  ): Promise<EcfStatusResult> {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    // 1. Obtener registro de ecf_invoices
    const { data: ecfInvoice, error: fetchError } = await db
      .from("ecf_invoices")
      .select("*")
      .eq("id", ecfInvoiceId)
      .eq("company_id", companyId)
      .single();

    if (fetchError || !ecfInvoice) {
      throw new Error(`Comprobante e-CF con ID ${ecfInvoiceId} no encontrado.`);
    }

    const row = ecfInvoice as EcfInvoiceRow;

    if (!row.track_id) {
      throw new Error(
        `El comprobante ${row.encf} no tiene un TrackId asignado (aún no ha sido transmitido a la DGII).`
      );
    }

    // 2. Obtener configuración
    const config = await this.getCompanyConfig(companyId, supabase);

    // 3. Consultar Web Service DGII
    const statusResult = await EcfDgiiClient.queryStatus(row.track_id, config);

    // 4. Actualizar base de datos
    await db
      .from("ecf_invoices")
      .update({
        dgii_status: statusResult.status,
        dgii_status_code: statusResult.code,
        dgii_messages: statusResult.messages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ecfInvoiceId);

    // 5. Auditoría
    await logAuditEntry({
      companyId,
      entityType: "ecf_invoices",
      entityId: ecfInvoiceId,
      action: "CHECK_TRACK_ID",
      oldData: { dgii_status: row.dgii_status },
      newData: { dgii_status: statusResult.status, code: statusResult.code },
    });

    return statusResult;
  }

  /**
   * Consulta el estado de una recepción comercial de un proveedor.
   */
  public async queryCommercialStatus(
    companyId: string,
    receptionId: string,
    customClient?: SupabaseClient<Database>
  ) {
    const supabase = customClient || (await createClient());
    const db = supabase as any;

    const { data, error } = await db
      .from("ecf_receptions")
      .select("*")
      .eq("id", receptionId)
      .eq("company_id", companyId)
      .single();

    if (error || !data) {
      throw new Error(`Recepción comercial con ID ${receptionId} no encontrada.`);
    }

    return data;
  }

  // =========================================================================
  // Métodos de compatibilidad con interfaz IEcfService
  // =========================================================================

  public async authenticate(config?: EcfConfigRow): Promise<string> {
    if (!config) {
      return "mock-token-fallback";
    }
    return EcfDgiiClient.authenticate(config);
  }

  public buildInvoiceXml(invoice: InvoiceData | EcfDocumentInput): string {
    if ("emitter" in invoice && "items" in invoice) {
      return EcfXmlBuilder.buildInvoiceXml(invoice as EcfDocumentInput);
    }

    const legacy = invoice as InvoiceData;
    const items: EcfItemData[] = legacy.items.map((it) => ({
      lineNumber: it.lineNumber,
      name: it.description,
      goodOrService: 2,
      quantity: parseFloat(it.quantity) || 1,
      unitPrice: parseFloat(it.unitPrice) || 0,
      billingIndicator: 2,
      itbisRate: parseFloat(it.taxRate) || 18,
      itbisAmount: parseFloat(it.taxAmount) || 0,
    }));

    return EcfXmlBuilder.buildInvoiceXml({
      ecfType: (legacy.ecfType || "E31") as EcfDocType,
      encf: legacy.encf,
      sequenceExpirationDate: new Date(),
      issueDate: legacy.issueDate,
      emitter: {
        rnc: legacy.emitterRnc,
        businessName: legacy.emitterName,
        tradeName: legacy.emitterTradeName,
        address: legacy.emitterAddress,
      },
      buyer: {
        rnc: legacy.receiverRnc,
        businessName: legacy.receiverName,
        address: legacy.receiverAddress,
      },
      items,
    });
  }

  public signXml(xml: string, certData?: string | null, password?: string | null): string {
    return EcfSigner.signXml(xml, certData, password);
  }

  public async sendDocument(
    signedXml: string,
    fileName: string,
    config?: EcfConfigRow
  ): Promise<EcfSendResult> {
    if (!config) {
      return {
        trackId: `MOCK-${Date.now()}`,
        message: "Enviado en modo mock sin configuración",
        status: "en_proceso",
      };
    }
    return EcfDgiiClient.sendEcf(signedXml, fileName, config);
  }

  public async checkStatus(trackId: string, config?: EcfConfigRow): Promise<EcfStatusResult> {
    if (!config) {
      return {
        trackId,
        code: "0",
        status: "aceptado",
        rawStatus: "Aceptado",
        rnc: "",
        encf: "",
        messages: ["Modo mock sin configuración"],
        checkedAt: new Date().toISOString(),
      };
    }
    return EcfDgiiClient.queryStatus(trackId, config);
  }

  public async queryDirectory(rnc: string, config?: EcfConfigRow): Promise<EcfDirectoryResult[]> {
    if (!config) {
      return [
        {
          rnc,
          name: "MOCK RECEPTOR SRL",
          url: "",
          isElectronicTaxpayer: true,
        },
      ];
    }
    return EcfDgiiClient.queryDirectory(rnc, config);
  }
}

/** Instancia singleton lista para usar */
export const ecfService = new EcfService();

/**
 * Función de compatibilidad previa getEcfService
 */
export async function getEcfService(): Promise<IEcfService> {
  return ecfService;
}
