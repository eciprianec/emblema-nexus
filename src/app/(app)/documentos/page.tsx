import React from "react";
import { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { NextcloudFileExplorer } from "@/features/documents/components/NextcloudFileExplorer";

export const metadata: Metadata = {
  title: "Gestión Documental & Bóveda Cloud | Emblema Nexus",
  description: "Explorador general de documentos y bóveda Nextcloud WebDAV",
};

export default function DocumentosPage() {
  return (
    <div className="flex-1 space-y-5 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FolderKanban className="h-7 w-7 text-sky-700" />
            Explorador Documental & Bóveda Cloud
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión centralizada de expedientes, clientes y plantillas sincronizadas con Nextcloud WebDAV.
          </p>
        </div>
      </div>

      {/* Explorador de Archivos Nextcloud */}
      <NextcloudFileExplorer />
    </div>
  );
}
