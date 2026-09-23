"use client";

import { CadastralFileList } from "@/features/survey/components/CadastralFileList";
import { FileCheck2 } from "lucide-react";

export default function CadastralFilesPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
            <FileCheck2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Expedientes Catastrales ante la DNMC
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control y calificación de expedientes de Deslinde, Subdivisión y Saneamiento según la Ley 108-05 de Registro Inmobiliario de la República Dominicana.
            </p>
          </div>
        </div>
      </div>

      <CadastralFileList />
    </div>
  );
}
