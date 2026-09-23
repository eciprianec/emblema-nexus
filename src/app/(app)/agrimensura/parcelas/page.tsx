"use client";

import { ParcelList } from "@/features/survey/components/ParcelList";
import { MapPin } from "lucide-react";

export default function ParcelsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Catálogo de Parcelas y Planos Perimétricos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro de polígonos georreferenciados, cálculo de áreas métricas y tareas dominicanas (m² / 628.86), colindancias y coordenadas UTM Zona 19 Norte.
            </p>
          </div>
        </div>
      </div>

      <ParcelList />
    </div>
  );
}
