import "server-only";

/**
 * EcfXmlBuilder — Constructor y validador de documentos XML para e-CF (DGII República Dominicana - Ley 32-23).
 * 
 * Genera documentos XML conformes a las especificaciones técnicas oficiales de la DGII para:
 * - E31: Factura de Crédito Fiscal Electrónica
 * - E32: Factura de Consumo Electrónica
 * - E33: Nota de Débito Electrónica
 * - E34: Nota de Crédito Electrónica
 * - E41: Compras Electrónico
 * - E43: Gastos Menores Electrónico
 * - E44: Regímenes Especiales de Tributación Electrónico
 * - E45: Comprobante Gubernamental Electrónico
 * - E46: Pagos al Exterior Electrónico
 * - E47: Exportaciones Electrónico
 */

export type EcfDocType =
  | "E31"
  | "E32"
  | "E33"
  | "E34"
  | "E41"
  | "E43"
  | "E44"
  | "E45"
  | "E46"
  | "E47";

export type EcfPaymentType =
  | "1" // Contado
  | "2" // Crédito
  | "3" // Tarjeta Débito/Crédito
  | "4" // Transferencia / Depósito
  | "5" // Cheque
  | "6" // Permuta
  | "7" // Nota de Crédito
  | "8"; // Mixto

export type EcfIncomeType =
  | "01" // Ingresos por operaciones (no financieros)
  | "02" // Ingresos financieros
  | "03" // Ingresos extraordinarios
  | "04" // Ingresos por arrendamientos
  | "05" // Ingresos por venta de activo depreciable
  | "06"; // Otros ingresos

export type EcfBillingIndicator =
  | 1 // No facturable
  | 2 // Gravado con ITBIS (18%)
  | 3 // Gravado con ITBIS (16%)
  | 4; // Exento de ITBIS

export type EcfGoodOrService =
  | 1 // Bien
  | 2; // Servicio

export type EcfModificationCode =
  | 1 // Corrige texto del documento original
  | 2 // Corrige montos
  | 3 // Reemplazo de NCF emitido en contingencia
  | 4 // Devolución total
  | 5; // Descuento posterior a la emisión

export interface EcfEmitterData {
  rnc: string;
  businessName: string;
  tradeName?: string | null;
  branch?: string | null;
  address?: string | null;
  municipality?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  economicActivity?: string | null;
  issueDate?: string | Date;
}

export interface EcfBuyerData {
  rnc?: string | null;
  identificationType?: "RNC" | "CEDULA" | "PASAPORTE";
  foreignIdentification?: string | null;
  businessName: string;
  contactName?: string | null;
  email?: string | null;
  address?: string | null;
  municipality?: string | null;
  province?: string | null;
}

export interface EcfItemData {
  lineNumber: number;
  name: string;
  goodOrService?: EcfGoodOrService;
  description?: string | null;
  quantity: number;
  unitMeasure?: string | null;
  unitPrice: number;
  discountAmount?: number | null;
  billingIndicator?: EcfBillingIndicator;
  itbisRate?: number | null; // e.g. 18.00
  itbisAmount?: number | null;
  itemCode?: string | null;
  itemCodeType?: string | null;
}

export interface EcfModificationData {
  modifiedNcf: string;
  modifiedNcfDate?: string | Date | null;
  modificationCode: EcfModificationCode;
  modificationReason: string;
}

export interface EcfTotalsData {
  montoGravadoTotal: number;
  montoGravadoI1: number; // ITBIS 18%
  montoGravadoI2: number; // ITBIS 16%
  montoGravadoI3: number; // Otros gravados
  montoExento: number;
  itbis1: number; // Tasa 18.00
  itbis2: number; // Tasa 16.00
  totalItbis: number;
  totalItbis1: number;
  totalItbis2: number;
  totalItbis3: number;
  montoTotal: number;
  totalDescuento?: number;
  montoTotalAdicional?: number;
}

export interface EcfDocumentInput {
  ecfType: EcfDocType;
  encf: string;
  sequenceExpirationDate: string | Date;
  issueDate?: string | Date;
  incomeType?: EcfIncomeType;
  paymentType?: EcfPaymentType;
  paymentDeadline?: string | Date | null;
  paymentTerms?: string | null;
  emitter: EcfEmitterData;
  buyer: EcfBuyerData;
  items: EcfItemData[];
  totals?: Partial<EcfTotalsData>;
  modification?: EcfModificationData | null;
  additionalTaxes?: Array<{ code: string; rate: number; amount: number }>;
  subtotals?: Array<{ lineNumber: number; description: string; subtotal: number }>;
}

export class EcfXmlBuilder {
  /** Tasa estándar de ITBIS en República Dominicana (18%) */
  public static readonly STANDARD_ITBIS_RATE = 18.0;

  /**
   * Obtiene el código numérico de 2 dígitos del e-CF para el tag TipoeCF de la DGII.
   */
  public static getNumericEcfType(ecfType: EcfDocType | string): string {
    const cleaned = ecfType.replace(/^E/, "");
    if (/^\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    throw new Error(`Tipo de e-CF no válido: ${ecfType}. Debe ser un tipo reconocido como E31, E32, E34, etc.`);
  }

  /**
   * Limpia RNC o Cédula eliminando guiones y espacios.
   */
  public static cleanTaxId(taxId?: string | null): string {
    if (!taxId) return "";
    return taxId.replace(/[^0-9]/g, "");
  }

  /**
   * Formatea un valor monetario a exactamente 2 decimales según la DGII.
   */
  public static formatMoney(amount: number): string {
    if (isNaN(amount) || !isFinite(amount)) return "0.00";
    return amount.toFixed(2);
  }

  /**
   * Formatea una fecha a formato estándar DGII: DD-MM-YYYY.
   */
  public static formatDateDominican(dateVal: string | Date): string {
    let d: Date;
    if (typeof dateVal === "string") {
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateVal)) {
        return dateVal;
      }
      d = new Date(dateVal);
    } else {
      d = dateVal;
    }

    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Escapa caracteres especiales de XML para prevenir malformaciones.
   */
  public static escapeXml(text?: string | null): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Valida estrictamente las reglas fiscales dominicanas según el tipo de comprobante.
   */
  public static validate(input: EcfDocumentInput): void {
    const numericType = this.getNumericEcfType(input.ecfType);
    const emitterRnc = this.cleanTaxId(input.emitter.rnc);
    const buyerRnc = this.cleanTaxId(input.buyer.rnc);

    // 1. Validación de RNC Emisor
    if (!emitterRnc || (emitterRnc.length !== 9 && emitterRnc.length !== 11)) {
      throw new Error(`RNC del Emisor inválido: "${input.emitter.rnc}". Debe tener 9 dígitos (RNC) u 11 dígitos (Cédula).`);
    }

    // 2. Validación de e-NCF
    const expectedPrefix = `E${numericType}`;
    if (!input.encf.startsWith(expectedPrefix)) {
      throw new Error(
        `El e-NCF "${input.encf}" no coincide con el tipo de comprobante ${input.ecfType}. Debe iniciar con "${expectedPrefix}".`
      );
    }
    if (input.encf.length !== 13 && input.encf.length !== 11) {
      throw new Error(`Longitud de e-NCF inválida: "${input.encf}". Debe tener 13 caracteres (o 11 según serie).`);
    }

    // 3. Reglas específicas por Tipo de e-CF
    switch (input.ecfType) {
      case "E31": // Factura de Crédito Fiscal
        if (!buyerRnc || (buyerRnc.length !== 9 && buyerRnc.length !== 11)) {
          throw new Error("Para Facturas de Crédito Fiscal (E31), el RNC o Cédula del Comprador es estrictamente obligatorio.");
        }
        break;

      case "E32": // Factura de Consumo
        // Para montos mayores o iguales a DOP $250,000 la DGII exige identificación del comprador
        const estimatedTotal = input.totals?.montoTotal ?? input.items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
        if (estimatedTotal >= 250000 && !buyerRnc) {
          throw new Error(
            `Para Facturas de Consumo (E32) con monto igual o superior a RD$ 250,000.00, se requiere la identificación del comprador.`
          );
        }
        break;

      case "E34": // Nota de Crédito
      case "E33": // Nota de Débito
        if (!input.modification) {
          throw new Error(`Para ${input.ecfType === "E34" ? "Notas de Crédito (E34)" : "Notas de Débito (E33)"}, la sección de Modificaciones es obligatoria.`);
        }
        if (!input.modification.modifiedNcf) {
          throw new Error("Debe especificar el NCF o e-NCF modificado en la Nota de Crédito/Débito.");
        }
        if (!input.modification.modificationReason) {
          throw new Error("Debe especificar la razón o motivo de modificación de la Nota de Crédito/Débito.");
        }
        break;

      case "E44": // Regímenes Especiales de Tributación
        if (!buyerRnc) {
          throw new Error("Para Comprobantes de Regímenes Especiales (E44), el RNC del Comprador es obligatorio.");
        }
        break;

      case "E45": // Gubernamental
        if (!buyerRnc) {
          throw new Error("Para Comprobantes Gubernamentales (E45), el RNC de la entidad pública compradora es obligatorio.");
        }
        break;
    }

    // 4. Validación de Líneas de Ítems
    if (!input.items || input.items.length === 0) {
      throw new Error("El comprobante electrónico debe contener al menos un ítem o línea de detalle.");
    }

    input.items.forEach((item, index) => {
      if (!item.name || item.name.trim().length === 0) {
        throw new Error(`La línea de ítem #${index + 1} no contiene nombre o descripción válida.`);
      }
      if (item.quantity <= 0) {
        throw new Error(`La cantidad en la línea #${index + 1} debe ser mayor que 0.`);
      }
      if (item.unitPrice < 0) {
        throw new Error(`El precio unitario en la línea #${index + 1} no puede ser negativo.`);
      }
    });
  }

  /**
   * Calcula los totales consolidados a partir de las líneas de detalle e información fiscal.
   */
  public static calculateTotals(input: EcfDocumentInput): EcfTotalsData {
    let montoGravadoI1 = 0; // Gravado al 18%
    let montoGravadoI2 = 0; // Gravado al 16%
    let montoGravadoI3 = 0; // Otros gravados
    let montoExento = 0;
    let totalItbis1 = 0;
    let totalItbis2 = 0;
    let totalItbis3 = 0;
    let totalDescuento = 0;

    for (const item of input.items) {
      const grossAmount = item.quantity * item.unitPrice;
      const discount = item.discountAmount || 0;
      totalDescuento += discount;
      const netAmount = Math.max(0, grossAmount - discount);

      const indicator = item.billingIndicator || 2; // Por defecto gravado al 18%

      if (indicator === 2) {
        // Gravado con 18%
        montoGravadoI1 += netAmount;
        const itbis = item.itbisAmount !== undefined && item.itbisAmount !== null
          ? item.itbisAmount
          : netAmount * 0.18;
        totalItbis1 += itbis;
      } else if (indicator === 3) {
        // Gravado con 16%
        montoGravadoI2 += netAmount;
        const itbis = item.itbisAmount !== undefined && item.itbisAmount !== null
          ? item.itbisAmount
          : netAmount * 0.16;
        totalItbis2 += itbis;
      } else if (indicator === 4 || indicator === 1) {
        // Exento o No facturable
        montoExento += netAmount;
      } else {
        montoGravadoI3 += netAmount;
      }
    }

    // Redondear montos a 2 decimales
    montoGravadoI1 = Math.round(montoGravadoI1 * 100) / 100;
    montoGravadoI2 = Math.round(montoGravadoI2 * 100) / 100;
    montoGravadoI3 = Math.round(montoGravadoI3 * 100) / 100;
    montoExento = Math.round(montoExento * 100) / 100;
    totalItbis1 = Math.round(totalItbis1 * 100) / 100;
    totalItbis2 = Math.round(totalItbis2 * 100) / 100;
    totalItbis3 = Math.round(totalItbis3 * 100) / 100;
    totalDescuento = Math.round(totalDescuento * 100) / 100;

    const montoGravadoTotal = montoGravadoI1 + montoGravadoI2 + montoGravadoI3;
    const totalItbis = totalItbis1 + totalItbis2 + totalItbis3;

    let montoTotalAdicional = 0;
    if (input.additionalTaxes && input.additionalTaxes.length > 0) {
      montoTotalAdicional = input.additionalTaxes.reduce((sum, tax) => sum + tax.amount, 0);
      montoTotalAdicional = Math.round(montoTotalAdicional * 100) / 100;
    }

    const calculatedTotal = Math.round((montoGravadoTotal + montoExento + totalItbis + montoTotalAdicional) * 100) / 100;

    // Si los totales fueron provistos externamente, reconciliar discrepancias menores
    const provided = input.totals;
    return {
      montoGravadoTotal: provided?.montoGravadoTotal ?? montoGravadoTotal,
      montoGravadoI1: provided?.montoGravadoI1 ?? montoGravadoI1,
      montoGravadoI2: provided?.montoGravadoI2 ?? montoGravadoI2,
      montoGravadoI3: provided?.montoGravadoI3 ?? montoGravadoI3,
      montoExento: provided?.montoExento ?? montoExento,
      itbis1: provided?.itbis1 ?? this.STANDARD_ITBIS_RATE,
      itbis2: provided?.itbis2 ?? 16.0,
      totalItbis: provided?.totalItbis ?? totalItbis,
      totalItbis1: provided?.totalItbis1 ?? totalItbis1,
      totalItbis2: provided?.totalItbis2 ?? totalItbis2,
      totalItbis3: provided?.totalItbis3 ?? totalItbis3,
      montoTotal: provided?.montoTotal ?? calculatedTotal,
      totalDescuento: provided?.totalDescuento ?? totalDescuento,
      montoTotalAdicional: provided?.montoTotalAdicional ?? montoTotalAdicional,
    };
  }

  /**
   * Construye el documento XML completo en estricta conformidad con el estándar e-CF de la DGII.
   */
  public static buildInvoiceXml(input: EcfDocumentInput): string {
    // 1. Validar reglas de negocio fiscal
    this.validate(input);

    // 2. Calcular o consolidar totales
    const totals = this.calculateTotals(input);

    const numericType = this.getNumericEcfType(input.ecfType);
    const emitterRnc = this.cleanTaxId(input.emitter.rnc);
    const buyerRnc = this.cleanTaxId(input.buyer.rnc);
    const issueDateStr = this.formatDateDominican(input.issueDate || input.emitter.issueDate || new Date());
    const seqExpDateStr = this.formatDateDominican(input.sequenceExpirationDate);

    // Indicador de montos gravados: 1 si hay gravados, 0 si todo es exento
    const hasTaxed = totals.montoGravadoTotal > 0;
    const indicadorMontoGravado = hasTaxed ? "1" : "0";

    const paymentType = input.paymentType || "1"; // Contado por defecto
    const incomeType = input.incomeType || "01"; // Ingresos operacionales por defecto

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<eCF xmlns="http://www.dgii.gov.do/ecf/v1.0">\n`;

    // -------------------------------------------------------------
    // <Encabezado>
    // -------------------------------------------------------------
    xml += `  <Encabezado>\n`;

    // <IdDoc>
    xml += `    <IdDoc>\n`;
    xml += `      <TipoeCF>${numericType}</TipoeCF>\n`;
    xml += `      <eNCF>${this.escapeXml(input.encf)}</eNCF>\n`;
    xml += `      <FechaVencimientoSecuencia>${seqExpDateStr}</FechaVencimientoSecuencia>\n`;
    xml += `      <IndicadorMontoGravado>${indicadorMontoGravado}</IndicadorMontoGravado>\n`;
    xml += `      <TipoIngresos>${incomeType}</TipoIngresos>\n`;
    xml += `      <TipoPago>${paymentType}</TipoPago>\n`;

    if (paymentType === "2" && input.paymentDeadline) {
      xml += `      <FechaLimitePago>${this.formatDateDominican(input.paymentDeadline)}</FechaLimitePago>\n`;
    }
    if (input.paymentTerms) {
      xml += `      <TerminoPago>${this.escapeXml(input.paymentTerms)}</TerminoPago>\n`;
    }

    // Modificaciones (para E34 Nota de Crédito o E33 Nota de Débito)
    if (input.modification) {
      xml += `      <Modificaciones>\n`;
      xml += `        <NCFModificado>${this.escapeXml(input.modification.modifiedNcf)}</NCFModificado>\n`;
      if (input.modification.modifiedNcfDate) {
        xml += `        <FechaNCFModificado>${this.formatDateDominican(input.modification.modifiedNcfDate)}</FechaNCFModificado>\n`;
      }
      xml += `        <CodigoModificacion>${input.modification.modificationCode}</CodigoModificacion>\n`;
      xml += `        <RazonModificacion>${this.escapeXml(input.modification.modificationReason)}</RazonModificacion>\n`;
      xml += `      </Modificaciones>\n`;
    }
    xml += `    </IdDoc>\n`;

    // <Emisor>
    xml += `    <Emisor>\n`;
    xml += `      <RNCEmisor>${emitterRnc}</RNCEmisor>\n`;
    xml += `      <RazonSocialEmisor>${this.escapeXml(input.emitter.businessName)}</RazonSocialEmisor>\n`;
    if (input.emitter.tradeName) {
      xml += `      <NombreComercial>${this.escapeXml(input.emitter.tradeName)}</NombreComercial>\n`;
    }
    if (input.emitter.branch) {
      xml += `      <Sucursal>${this.escapeXml(input.emitter.branch)}</Sucursal>\n`;
    }
    if (input.emitter.address) {
      xml += `      <DireccionEmisor>${this.escapeXml(input.emitter.address)}</DireccionEmisor>\n`;
    }
    if (input.emitter.municipality) {
      xml += `      <Municipio>${this.escapeXml(input.emitter.municipality)}</Municipio>\n`;
    }
    if (input.emitter.province) {
      xml += `      <Provincia>${this.escapeXml(input.emitter.province)}</Provincia>\n`;
    }
    if (input.emitter.phone) {
      xml += `      <TelefonoEmisor>${this.escapeXml(input.emitter.phone)}</TelefonoEmisor>\n`;
    }
    if (input.emitter.email) {
      xml += `      <CorreoEmisor>${this.escapeXml(input.emitter.email)}</CorreoEmisor>\n`;
    }
    if (input.emitter.economicActivity) {
      xml += `      <ActividadEconomica>${this.escapeXml(input.emitter.economicActivity)}</ActividadEconomica>\n`;
    }
    xml += `      <FechaEmision>${issueDateStr}</FechaEmision>\n`;
    xml += `    </Emisor>\n`;

    // <Comprador>
    xml += `    <Comprador>\n`;
    if (buyerRnc) {
      xml += `      <RNCComprador>${buyerRnc}</RNCComprador>\n`;
    }
    if (input.buyer.foreignIdentification) {
      xml += `      <IdentificadorExtranjero>${this.escapeXml(input.buyer.foreignIdentification)}</IdentificadorExtranjero>\n`;
    }
    xml += `      <RazonSocialComprador>${this.escapeXml(input.buyer.businessName || "CONSUMIDOR FINAL")}</RazonSocialComprador>\n`;
    if (input.buyer.contactName) {
      xml += `      <ContactoComprador>${this.escapeXml(input.buyer.contactName)}</ContactoComprador>\n`;
    }
    if (input.buyer.email) {
      xml += `      <CorreoComprador>${this.escapeXml(input.buyer.email)}</CorreoComprador>\n`;
    }
    if (input.buyer.address) {
      xml += `      <DireccionComprador>${this.escapeXml(input.buyer.address)}</DireccionComprador>\n`;
    }
    if (input.buyer.municipality) {
      xml += `      <MunicipioComprador>${this.escapeXml(input.buyer.municipality)}</MunicipioComprador>\n`;
    }
    if (input.buyer.province) {
      xml += `      <ProvinciaComprador>${this.escapeXml(input.buyer.province)}</ProvinciaComprador>\n`;
    }
    xml += `    </Comprador>\n`;

    // <Totales>
    xml += `    <Totales>\n`;
    xml += `      <MontoGravadoTotal>${this.formatMoney(totals.montoGravadoTotal)}</MontoGravadoTotal>\n`;
    xml += `      <MontoGravadoI1>${this.formatMoney(totals.montoGravadoI1)}</MontoGravadoI1>\n`;
    xml += `      <MontoGravadoI2>${this.formatMoney(totals.montoGravadoI2)}</MontoGravadoI2>\n`;
    xml += `      <MontoGravadoI3>${this.formatMoney(totals.montoGravadoI3)}</MontoGravadoI3>\n`;
    xml += `      <MontoExento>${this.formatMoney(totals.montoExento)}</MontoExento>\n`;
    xml += `      <ITBIS1>${this.formatMoney(totals.itbis1)}</ITBIS1>\n`;
    xml += `      <ITBIS2>${this.formatMoney(totals.itbis2)}</ITBIS2>\n`;
    xml += `      <TotalITBIS>${this.formatMoney(totals.totalItbis)}</TotalITBIS>\n`;
    xml += `      <TotalITBIS1>${this.formatMoney(totals.totalItbis1)}</TotalITBIS1>\n`;
    xml += `      <TotalITBIS2>${this.formatMoney(totals.totalItbis2)}</TotalITBIS2>\n`;
    xml += `      <TotalITBIS3>${this.formatMoney(totals.totalItbis3)}</TotalITBIS3>\n`;
    if (totals.totalDescuento && totals.totalDescuento > 0) {
      xml += `      <TotalDescuento>${this.formatMoney(totals.totalDescuento)}</TotalDescuento>\n`;
    }
    if (totals.montoTotalAdicional && totals.montoTotalAdicional > 0) {
      xml += `      <MontoTotalAdicional>${this.formatMoney(totals.montoTotalAdicional)}</MontoTotalAdicional>\n`;
    }
    xml += `      <MontoTotal>${this.formatMoney(totals.montoTotal)}</MontoTotal>\n`;
    xml += `    </Totales>\n`;

    xml += `  </Encabezado>\n`;

    // -------------------------------------------------------------
    // <DetallesItems>
    // -------------------------------------------------------------
    xml += `  <DetallesItems>\n`;
    input.items.forEach((item, index) => {
      const lineNum = item.lineNumber || index + 1;
      const billingInd = item.billingIndicator || 2;
      const goodOrServ = item.goodOrService || 2; // 2 = Servicio por defecto
      const unitMeasure = item.unitMeasure || "UNI";
      const unitPriceStr = this.formatMoney(item.unitPrice);
      const gross = item.quantity * item.unitPrice;
      const disc = item.discountAmount || 0;
      const itemNet = Math.max(0, gross - disc);

      xml += `    <Item>\n`;
      xml += `      <NumeroLinea>${lineNum}</NumeroLinea>\n`;

      if (item.itemCode) {
        xml += `      <TablaCodigosItem>\n`;
        xml += `        <CodItem>\n`;
        xml += `          <TipoCodigo>${this.escapeXml(item.itemCodeType || "INTERNO")}</TipoCodigo>\n`;
        xml += `          <CodigoItem>${this.escapeXml(item.itemCode)}</CodigoItem>\n`;
        xml += `        </CodItem>\n`;
        xml += `      </TablaCodigosItem>\n`;
      }

      xml += `      <IndicadorFacturacion>${billingInd}</IndicadorFacturacion>\n`;
      xml += `      <NombreItem>${this.escapeXml(item.name)}</NombreItem>\n`;
      xml += `      <IndicadorBienoServicio>${goodOrServ}</IndicadorBienoServicio>\n`;
      if (item.description) {
        xml += `      <DescripcionItem>${this.escapeXml(item.description)}</DescripcionItem>\n`;
      }
      xml += `      <CantidadItem>${this.formatMoney(item.quantity)}</CantidadItem>\n`;
      xml += `      <UnidadMedida>${this.escapeXml(unitMeasure)}</UnidadMedida>\n`;
      xml += `      <PrecioUnitarioItem>${unitPriceStr}</PrecioUnitarioItem>\n`;
      if (disc > 0) {
        xml += `      <DescuentoMonto>${this.formatMoney(disc)}</DescuentoMonto>\n`;
      }
      xml += `      <MontoItem>${this.formatMoney(itemNet)}</MontoItem>\n`;
      xml += `      <Subtotal>${this.formatMoney(itemNet)}</Subtotal>\n`;

      // Si el ítem está gravado con ITBIS, incluir bloque de impuestos del ítem
      if (billingInd === 2 || billingInd === 3) {
        const rate = billingInd === 2 ? 18.0 : 16.0;
        const taxVal = item.itbisAmount !== undefined && item.itbisAmount !== null
          ? item.itbisAmount
          : itemNet * (rate / 100);

        xml += `      <ImpuestosItem>\n`;
        xml += `        <Impuesto>\n`;
        xml += `          <TipoImpuesto>001</TipoImpuesto>\n`; // 001 = ITBIS en catálogo DGII
        xml += `          <TasaImpuesto>${this.formatMoney(rate)}</TasaImpuesto>\n`;
        xml += `          <MontoImpuesto>${this.formatMoney(taxVal)}</MontoImpuesto>\n`;
        xml += `        </Impuesto>\n`;
        xml += `      </ImpuestosItem>\n`;
      }

      xml += `    </Item>\n`;
    });
    xml += `  </DetallesItems>\n`;

    // -------------------------------------------------------------
    // <Subtotales> (Opcional)
    // -------------------------------------------------------------
    if (input.subtotals && input.subtotals.length > 0) {
      xml += `  <Subtotales>\n`;
      input.subtotals.forEach((st) => {
        xml += `    <SubtotalLinea>\n`;
        xml += `      <NumeroSubTotal>${st.lineNumber}</NumeroSubTotal>\n`;
        xml += `      <DescripcionSubtotal>${this.escapeXml(st.description)}</DescripcionSubtotal>\n`;
        xml += `      <MontoSubtotal>${this.formatMoney(st.subtotal)}</MontoSubtotal>\n`;
        xml += `    </SubtotalLinea>\n`;
      });
      xml += `  </Subtotales>\n`;
    }

    // -------------------------------------------------------------
    // <ImpuestosAdicionales> (Opcional)
    // -------------------------------------------------------------
    if (input.additionalTaxes && input.additionalTaxes.length > 0) {
      xml += `  <ImpuestosAdicionales>\n`;
      input.additionalTaxes.forEach((tax) => {
        xml += `    <ImpuestoAdicional>\n`;
        xml += `      <TipoImpuesto>${this.escapeXml(tax.code)}</TipoImpuesto>\n`;
        xml += `      <TasaImpuestoAdicional>${this.formatMoney(tax.rate)}</TasaImpuestoAdicional>\n`;
        xml += `      <MontoImpuestoAdicional>${this.formatMoney(tax.amount)}</MontoImpuestoAdicional>\n`;
        xml += `    </ImpuestoAdicional>\n`;
      });
      xml += `  </ImpuestosAdicionales>\n`;
    }

    xml += `</eCF>`;

    return xml;
  }
}
