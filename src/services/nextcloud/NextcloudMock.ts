import "server-only";

/**
 * NextcloudMock — Mock para desarrollo cuando Nextcloud no está disponible (§154).
 * 
 * Registra las operaciones en consola y simula respuestas exitosas.
 * Solo se permiten mocks durante desarrollo — la implementación final usa Nextcloud real.
 */

import type {
  INextcloudService,
  FileInfo,
  FileVersion,
  IntegrityResult,
} from "./NextcloudService";

export class NextcloudMock implements INextcloudService {
  private log(method: string, ...args: unknown[]) {
    console.log(`[NextcloudMock] ${method}:`, ...args);
  }

  async checkConnection(): Promise<boolean> {
    this.log("checkConnection", "Nextcloud no configurado — usando mock");
    return false;
  }

  async createClientFolder(clientName: string): Promise<string> {
    const path = `/${clientName}`;
    this.log("createClientFolder", path);
    return path;
  }

  async createCaseFolder(
    clientName: string,
    area: string,
    caseNumber: string,
    title: string
  ): Promise<string> {
    const path = `/${clientName}/${area}/${caseNumber} - ${title}`;
    this.log("createCaseFolder", path);
    return path;
  }

  async uploadFile(remotePath: string): Promise<void> {
    this.log("uploadFile", remotePath);
  }

  async downloadFile(remotePath: string): Promise<Buffer> {
    this.log("downloadFile", remotePath);
    return Buffer.from(`Mock content for: ${remotePath}`);
  }

  async listFiles(remotePath: string): Promise<FileInfo[]> {
    this.log("listFiles", remotePath);
    return [];
  }

  async getVersions(fileId: number): Promise<FileVersion[]> {
    this.log("getVersions", `fileId: ${fileId}`);
    return [];
  }

  async restoreVersion(
    fileId: number,
    versionTimestamp: number
  ): Promise<void> {
    this.log("restoreVersion", `fileId: ${fileId}, timestamp: ${versionTimestamp}`);
  }

  async moveFile(from: string, to: string): Promise<void> {
    this.log("moveFile", `${from} → ${to}`);
  }

  async deleteFile(remotePath: string): Promise<void> {
    this.log("deleteFile", remotePath);
  }

  async checkIntegrity(remotePath: string): Promise<IntegrityResult> {
    this.log("checkIntegrity", remotePath);
    return {
      exists: false,
      path: remotePath,
      issues: ["Nextcloud no configurado — usando mock para desarrollo"],
      lastChecked: new Date().toISOString(),
    };
  }
}
