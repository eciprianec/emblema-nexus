"use client";

import { FieldSessionList } from "@/features/survey/components/FieldSessionList";
import { Compass } from "lucide-react";

export default function FieldSessionsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Jornadas de Campo y Brigadas Topográficas
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Programación de levantamientos georreferenciados, instrumental de precisión GNSS/Estación Total y actas de fijación de linderos.
            </p>
          </div>
        </div>
      </div>

      <FieldSessionList />
    </div>
  );
}
