import { Dgii606Record, Dgii607Record, Dgii608Record } from '../types';

/**
 * Formatea un número al estándar numérico de la DGII (2 decimales, sin separadores de miles).
 */
export function formatDgiiNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return val.toFixed(2);
}

/**
 * Limpia caracteres de RNC o Cédula (remueve guiones y espacios).
 */
export function cleanRncCedula(val: string): string {
  return val.replace(/[^0-9A-Za-z]/g, '').trim();
}

/**
 * Genera el archivo plano oficial de la DGII para el Formato 606 (Compras y Gastos).
 * Estructura:
 * Encabezado: 606|RNC_EMPRESA|PERIODO_AAAAMM|CANTIDAD_REGISTROS
 * Filas con 23 campos separados por pipe (|)
 */
export function generate606Txt(records: Dgii606Record[], rncCompany: string, periodo: string): string {
  const cleanPeriod = periodo.replace(/[^0-9]/g, '').slice(0, 6); // YYYYMM
  const cleanRnc = cleanRncCedula(rncCompany);
  
  const header = `606|${cleanRnc}|${cleanPeriod}|${records.length}`;
  
  const lines = records.map((r) => {
    const fields = [
      cleanRncCedula(r.rncCedula),
      r.tipoId || '1',
      r.tipoBienesServicios || '02',
      r.ncf.trim(),
      r.ncfModificado?.trim() || '',
      r.fechaComprobante.replace(/[^0-9]/g, ''),
      r.fechaPago ? r.fechaPago.replace(/[^0-9]/g, '') : '',
      formatDgiiNumber(r.montoServicios),
      formatDgiiNumber(r.montoBienes),
      formatDgiiNumber(r.totalFacturado),
      formatDgiiNumber(r.itbisFacturado),
      formatDgiiNumber(r.itbisRetenido),
      formatDgiiNumber(r.itbisSujetoProporcionalidad),
      formatDgiiNumber(r.itbisLlevadoCosto),
      formatDgiiNumber(r.itbisPorAdelantar),
      formatDgiiNumber(r.itbisPercibidoCompras),
      r.tipoRetencionIsr || '',
      formatDgiiNumber(r.retencionRenta),
      formatDgiiNumber(r.isrPercibidoCompras),
      formatDgiiNumber(r.isc),
      formatDgiiNumber(r.otrosImpuestos),
      formatDgiiNumber(r.propinaLegal),
      r.formaPago || '02',
    ];
    return fields.join('|');
  });

  return [header, ...lines].join('\r\n');
}

/**
 * Genera el archivo plano oficial de la DGII para el Formato 607 (Ventas de Bienes y Servicios).
 * Estructura:
 * Encabezado: 607|RNC_EMPRESA|PERIODO_AAAAMM|CANTIDAD_REGISTROS
 * Filas con 23 campos separados por pipe (|)
 */
export function generate607Txt(records: Dgii607Record[], rncCompany: string, periodo: string): string {
  const cleanPeriod = periodo.replace(/[^0-9]/g, '').slice(0, 6);
  const cleanRnc = cleanRncCedula(rncCompany);
  
  const header = `607|${cleanRnc}|${cleanPeriod}|${records.length}`;
  
  const lines = records.map((r) => {
    const fields = [
      cleanRncCedula(r.rncCedula),
      r.tipoId || '1',
      r.ncf.trim(),
      r.ncfModificado?.trim() || '',
      r.tipoIngreso || '01',
      r.fechaComprobante.replace(/[^0-9]/g, ''),
      r.fechaRetencion ? r.fechaRetencion.replace(/[^0-9]/g, '') : '',
      formatDgiiNumber(r.montoFacturado),
      formatDgiiNumber(r.itbisFacturado),
      formatDgiiNumber(r.itbisRetenidoTerceros),
      formatDgiiNumber(r.itbisPercibido),
      formatDgiiNumber(r.retencionRentaTerceros),
      formatDgiiNumber(r.isrPercibido),
      formatDgiiNumber(r.isc),
      formatDgiiNumber(r.otrosImpuestos),
      formatDgiiNumber(r.propinaLegal),
      formatDgiiNumber(r.efectivo),
      formatDgiiNumber(r.chequeTransferencia),
      formatDgiiNumber(r.tarjetaDebitoCredito),
      formatDgiiNumber(r.ventaCredito),
      formatDgiiNumber(r.bonos),
      formatDgiiNumber(r.permuta),
      formatDgiiNumber(r.otrasFormas),
    ];
    return fields.join('|');
  });

  return [header, ...lines].join('\r\n');
}

/**
 * Genera el archivo plano oficial de la DGII para el Formato 608 (Comprobantes Anulados).
 */
export function generate608Txt(records: Dgii608Record[], rncCompany: string, periodo: string): string {
  const cleanPeriod = periodo.replace(/[^0-9]/g, '').slice(0, 6);
  const cleanRnc = cleanRncCedula(rncCompany);
  
  const header = `608|${cleanRnc}|${cleanPeriod}|${records.length}`;
  
  const lines = records.map((r) => {
    const fields = [
      r.ncf.trim(),
      r.fechaAnulacion.replace(/[^0-9]/g, ''),
      r.tipoAnulacion || '05',
    ];
    return fields.join('|');
  });

  return [header, ...lines].join('\r\n');
}

/**
 * Genera contenido CSV con Byte Order Mark (BOM) UTF-8 (\uFEFF) para
 * perfecta visualización en Microsoft Excel y software contable en español.
 */
export function generateCsvWithBom(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const escapeCsvCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  
  // Incluye BOM UTF-8 (\uFEFF)
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Dispara la descarga de un archivo plano o CSV en el cliente.
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
