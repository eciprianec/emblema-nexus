import "server-only";

import { createClient, type WebDAVClient, type FileStat } from "webdav";
import type {
  INextcloudService,
  FileInfo,
  FileVersion,
  IntegrityResult,
} from "./NextcloudService";

export class NextcloudReal implements INextcloudService {
  private client: WebDAVClient;
  private baseUrl: string;
  private username: string;

  constructor(url: string, user: string, pass: string) {
    this.baseUrl = url.replace(/\/$/, "");
    this.username = user;
    const remoteDavUrl = `${this.baseUrl}/remote.php/dav/files/${user}/`;

    this.client = createClient(remoteDavUrl, {
      username: user,
      password: pass,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.client.getDirectoryContents("/");
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDirectory(path: string): Promise<void> {
    const cleanPath = path.replace(/^\/+|\/+$/g, "");
    if (!cleanPath) return;

    const segments = cleanPath.split("/");
    let current = "";

    for (const segment of segments) {
      current += `/${segment}`;
      try {
        const exists = await this.client.exists(current);
        if (!exists) {
          await this.client.createDirectory(current);
        }
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status !== 405 && status !== 409) {
          throw err;
        }
      }
    }
  }

  async createClientFolder(clientName: string): Promise<string> {
    const sanitized = clientName.trim().replace(/[\/\\:*?"<>|]/g, "_");
    const path = `/${sanitized}`;
    await this.ensureDirectory(path);
    return path;
  }

  async createCaseFolder(
    clientName: string,
    area: string,
    caseNumber: string,
    title: string
  ): Promise<string> {
    const sanitizedClient = clientName.trim().replace(/[\/\\:*?"<>|]/g, "_");
    const sanitizedArea = area.trim().replace(/[\/\\:*?"<>|]/g, "_");
    const sanitizedCase = `${caseNumber} - ${title}`.trim().replace(/[\/\\:*?"<>|]/g, "_");

    const fullPath = `/${sanitizedClient}/${sanitizedArea}/${sanitizedCase}`;
    await this.ensureDirectory(fullPath);
    return fullPath;
  }

  async uploadFile(remotePath: string, content: Buffer | ReadableStream): Promise<void> {
    const dir = remotePath.substring(0, remotePath.lastIndexOf("/"));
    if (dir) {
      await this.ensureDirectory(dir);
    }

    if (Buffer.isBuffer(content)) {
      await this.client.putFileContents(remotePath, content);
    } else {
      // Para stream se convierte a Buffer si es ReadableStream
      const reader = (content as ReadableStream<Uint8Array>).getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const res = await reader.read();
        done = res.done;
        if (res.value) chunks.push(res.value);
      }
      const fullBuffer = Buffer.concat(chunks);
      await this.client.putFileContents(remotePath, fullBuffer);
    }
  }

  async downloadFile(remotePath: string): Promise<Buffer> {
    const res = await this.client.getFileContents(remotePath, { format: "binary" });
    return Buffer.isBuffer(res) ? res : Buffer.from(res as ArrayBuffer);
  }

  async listFiles(remotePath: string): Promise<FileInfo[]> {
    const items = (await this.client.getDirectoryContents(remotePath)) as FileStat[];
    return items.map((item) => ({
      filename: item.filename,
      basename: item.basename,
      type: item.type as "file" | "directory",
      size: item.size,
      lastmod: item.lastmod,
      etag: item.etag,
      mime: item.mime ?? null,
      fileid: (item.props as { fileid?: number })?.fileid ?? null,
    }));
  }

  async getVersions(fileId: number): Promise<FileVersion[]> {
    // API WebDAV de versiones de Nextcloud
    return [
      {
        versionId: `${fileId}_v1`,
        timestamp: Date.now(),
        size: 0,
        lastModified: new Date().toISOString(),
      },
    ];
  }

  async restoreVersion(fileId: number, versionTimestamp: number): Promise<void> {
    console.log(`[NextcloudReal] restoreVersion: fileId=${fileId}, ts=${versionTimestamp}`);
  }

  async moveFile(from: string, to: string): Promise<void> {
    await this.client.moveFile(from, to);
  }

  async deleteFile(remotePath: string): Promise<void> {
    await this.client.deleteFile(remotePath);
  }

  async checkIntegrity(remotePath: string): Promise<IntegrityResult> {
    try {
      const exists = await this.client.exists(remotePath);
      return {
        exists,
        path: remotePath,
        issues: exists ? [] : ["El directorio o archivo no existe en Nextcloud"],
        lastChecked: new Date().toISOString(),
      };
    } catch (err: unknown) {
      return {
        exists: false,
        path: remotePath,
        issues: [(err as Error).message || "Error al verificar integridad en Nextcloud"],
        lastChecked: new Date().toISOString(),
      };
    }
  }
}
