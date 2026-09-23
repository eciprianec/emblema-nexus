import "server-only";

export interface CsvHeaderOption {
  key: string;
  label: string;
}

/**
 * Servicio de Exportación de Datos (Fase 9)
 * Emblema Nexus — República Dominicana
 *
 * Provee utilidades avanzadas para generar archivos CSV con BOM UTF-8
 * (óptima compatibilidad con Microsoft Excel en español) y JSON estructurado.
 */
export class ExportService {
  /**
   * Genera un string CSV con BOM UTF-8 para garantizar que Microsoft Excel
   * interprete correctamente tildes, la letra 'ñ' y caracteres especiales en Windows.
   */
  exportToCsv(
    data: Record<string, any>[],
    headers?: CsvHeaderOption[]
  ): string {
    if (!data || data.length === 0) {
      if (headers && headers.length > 0) {
        // Retornar al menos la cabecera con BOM UTF-8
        const headerRow = headers
          .map((h) => this.escapeCsvField(h.label))
          .join(",");
        return `\uFEFF${headerRow}\r\n`;
      }
      return "\uFEFF";
    }

    // Determinar columnas
    const columns: { key: string; label: string }[] =
      headers && headers.length > 0
        ? headers
        : Object.keys(data[0]).map((key) => ({ key, label: key }));

    // Cabecera
    const headerRow = columns
      .map((col) => this.escapeCsvField(col.label))
      .join(",");

    // Filas de datos
    const rows = data.map((item) => {
      return columns
        .map((col) => {
          const val = item[col.key];
          return this.escapeCsvField(val);
        })
        .join(",");
    });

    // Unir con BOM UTF-8 y CRLF
    return `\uFEFF${[headerRow, ...rows].join("\r\n")}\r\n`;
  }

  /**
   * Exportador estructurado a formato JSON con sangría estándar legible.
   */
  exportToJson(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Escapa un campo individual según el estándar RFC 4180 de CSV.
   * Si contiene comas, comillas dobles o saltos de línea, se encierra entre comillas
   * y las comillas internas se duplican ("").
   */
  private escapeCsvField(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "object") {
      if (value instanceof Date) {
        value = value.toISOString();
      } else {
        value = JSON.stringify(value);
      }
    }

    const stringVal = String(value);

    // Si contiene comillas, comas, saltos de línea o punto y coma
    if (
      stringVal.includes(",") ||
      stringVal.includes('"') ||
      stringVal.includes("\n") ||
      stringVal.includes("\r") ||
      stringVal.includes(";")
    ) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }

    return stringVal;
  }
}

export const exportService = new ExportService();
