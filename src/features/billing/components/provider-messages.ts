/** Un mensaje del proveedor o de la DGII, tal como queda guardado en el e-CF. */
export interface ProviderMessage {
  codigo: number | string | null;
  valor: string;
  /** Explicación que traía el proveedor junto al campo; suele mezclar nombres técnicos. */
  detalle?: string;
}

/** El último nombre de la ruta del campo, en las palabras del formulario. */
const FIELD_LABELS: Record<string, string> = {
  RNCComprador: "RNC o cédula del comprador",
  IdentificadorExtranjero: "Identificación del comprador extranjero",
  RazonSocialComprador: "Nombre del comprador",
  DireccionComprador: "Dirección del comprador",
  CorreoComprador: "Correo del comprador",
  RNCEmisor: "RNC de la empresa, en la configuración",
  RazonSocialEmisor: "Razón social, en la configuración",
  NombreComercial: "Nombre comercial, en la configuración",
  DireccionEmisor: "Dirección de la empresa, en la configuración",
  TelefonoEmisor: "Teléfono de la empresa, en la configuración",
  TablaTelefonoEmisor: "Teléfono de la empresa, en la configuración",
  CorreoEmisor: "Correo de la empresa, en la configuración",
  FechaEmision: "Fecha de emisión",
  eNCF: "Número e-NCF",
  TipoeCF: "Tipo de comprobante",
  FechaVencimientoSecuencia: "Vencimiento del rango de e-NCF, en la configuración",
  TipoIngresos: "Tipo de ingreso",
  TipoPago: "Tipo de pago",
  FechaLimitePago: "Fecha límite de pago",
  TerminoPago: "Plazo de pago",
  FormaPago: "Forma de pago",
  MontoPago: "Monto del pago",
  TipoMoneda: "Moneda",
  TipoCambio: "Tasa de cambio",
  NombreItem: "Descripción de una línea",
  DescripcionItem: "Detalle de una línea",
  CantidadItem: "Cantidad de una línea",
  UnidadMedida: "Unidad de una línea",
  PrecioUnitarioItem: "Precio de una línea",
  DescuentoMonto: "Descuento de una línea",
  MontoItem: "Monto de una línea",
  IndicadorFacturacion: "ITBIS de una línea",
  IndicadorBienoServicio: "Bien o servicio de una línea",
  NCFModificado: "Comprobante que se modifica",
  FechaNCFModificado: "Fecha del comprobante que se modifica",
  CodigoModificacion: "Código de modificación",
  RazonModificacion: "Razón de la modificación",
  IndicadorNotaCredito: "Antigüedad del comprobante que se modifica",
};

const GENERIC_FIELD_PROBLEM = "Un dato del comprobante no es válido.";

const isFieldPath = (value: string) => /^ECF(\.|$)/.test(value);

function fieldLabel(path: string): string | null {
  const parts = path.replace(/\[\d+\]/g, "").split(".");
  const known = FIELD_LABELS[parts[parts.length - 1]];
  if (known) return known;
  if (parts.includes("Totales")) return "Totales del comprobante";
  if (parts.includes("DetallesItems")) return "Una línea del comprobante";
  if (parts.includes("Comprador")) return "Datos del comprador";
  if (parts.includes("Emisor")) return "Datos de la empresa, en la configuración";
  if (parts.includes("InformacionReferencia")) return "Comprobante que se modifica";
  return null;
}

export interface ProviderMessageView {
  /** Lo que se le dice a la persona, sin repetidos. */
  readable: string[];
  /** Lo que devolvió el proveedor tal cual, para soporte. */
  technical: string[];
}

/**
 * Las validaciones del proveedor llegan como códigos en inglés y rutas de campos. Se traducen a los
 * nombres del formulario y lo original queda aparte. Lo que dice la DGII ya viene en español.
 */
export function describeProviderMessages(messages: ProviderMessage[] | null | undefined): ProviderMessageView {
  const readable = new Set<string>();
  const technical = new Set<string>();

  for (const message of messages ?? []) {
    const value = message.valor.trim();
    if (isFieldPath(value)) {
      const label = fieldLabel(value);
      if (!label) readable.add(GENERIC_FIELD_PROBLEM);
      else readable.add(message.codigo === "REQUIRED" ? `${label}: falta este dato.` : `${label}: revisa este dato.`);
      technical.add(`${message.codigo ? `[${message.codigo}] ` : ""}${value}${message.detalle ? `: ${message.detalle}` : ""}`);
    } else if (value) {
      readable.add(`${message.codigo ? `${message.codigo}: ` : ""}${value}`);
    }
  }
  return { readable: [...readable], technical: [...technical] };
}

/**
 * Qué le toca hacer a la persona después de un intento fallido: que el documento no llegara al
 * proveedor no siempre se corrige en el borrador.
 */
export function attemptClosing(attempt: {
  provider_phase: string | null;
  provider_error: string | null;
  dgii_messages: ProviderMessage[] | null;
}): { text: string; toSettings: boolean } {
  const documentProblem = attempt.provider_phase !== "no_enviado" || Boolean(attempt.dgii_messages?.length);
  if (documentProblem) return { text: "Corrige el borrador y vuelve a emitir.", toSettings: false };

  const toSettings = /configuraci[oó]n/i.test(attempt.provider_error ?? "");
  return {
    text: toSettings
      ? "El borrador está bien: corrige la configuración y vuelve a emitir."
      : "El borrador está bien: vuelve a emitir cuando se resuelva.",
    toSettings,
  };
}
