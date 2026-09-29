import "server-only";

/**
 * NextcloudService — Abstracción para gestión documental con Nextcloud (§23-29).
 * 
 * Nextcloud es el repositorio físico oficial de documentos.
 * Supabase almacena metadata, relaciones e historial lógico.
 * 
 * Cuando Nextcloud no esté configurado, se usa NextcloudMock para desarrollo.
 */

export interface FileInfo {
  filename: string;
  basename: string;
  type: "file" | "directory";
  size: number;
  lastmod: string;
  etag: string | null;
  mime: string | null;
  fileid: number | null;
}

export interface FileVersion {
  versionId: string;
  timestamp: number;
  size: number;
  lastModified: string;
}

export interface IntegrityResult {
  exists: boolean;
  path: string;
  issues: string[];
  lastChecked: string;
}

export interface INextcloudService {
  /** Verificar si la conexión está activa */
  checkConnection(): Promise<boolean>;

  /** Crear carpeta para un cliente (§23) */
  createClientFolder(clientName: string, clientId?: string): Promise<string>;

  /** Crear carpeta para un expediente dentro del cliente (§23) */
  createCaseFolder(
    clientName: string,
    area: string,
    caseNumber: string,
    title: string
  ): Promise<string>;

  /** Subir archivo */
  uploadFile(remotePath: string, content: Buffer | ReadableStream): Promise<void>;

  /** Descargar archivo como stream */
  downloadFile(remotePath: string): Promise<Buffer>;

  /** Listar archivos en un directorio */
  listFiles(remotePath: string): Promise<FileInfo[]>;

  /** Obtener versiones de un archivo (§27-28) */
  getVersions(fileId: number): Promise<FileVersion[]>;

  /** Restaurar versión de un archivo (§29) */
  restoreVersion(fileId: number, versionTimestamp: number): Promise<void>;

  /** Mover/renombrar archivo */
  moveFile(from: string, to: string): Promise<void>;

  /** Eliminar archivo (va a papelera de Nextcloud) */
  deleteFile(remotePath: string): Promise<void>;

  /** Verificar integridad de un path (§105) */
  checkIntegrity(remotePath: string): Promise<IntegrityResult>;
}

/**
 * Obtener instancia del servicio Nextcloud.
 * Retorna mock si no hay configuración.
 */
export async function getNextcloudService(): Promise<INextcloudService> {
  const url = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USER;
  const password = process.env.NEXTCLOUD_APP_PASSWORD;

  if (!url || !user || !password) {
    // Retornar mock para desarrollo
    const { NextcloudMock } = await import("./NextcloudMock");
    return new NextcloudMock();
  }

  const { NextcloudReal } = await import("./NextcloudReal");
  return new NextcloudReal(url, user, password);
}
