"use client";

import { RealEstateSummaryCards } from "@/features/real-estate/components/RealEstateSummaryCards";
import { PropertyList } from "@/features/real-estate/components/PropertyList";
import { Building2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealEstateStore } from "@/features/real-estate/store/useRealEstateStore";

export default function RealEstateCatalogPage() {
  const { openPropertyCreateModal } = useRealEstateStore();

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Inmobiliaria y Bienes Raíces
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Cartera de inmuebles residenciales, corporativos y turísticos en República Dominicana, contratos de arrendamiento y corretaje legal.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openPropertyCreateModal}
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Captar Propiedad
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen KPI */}
      <RealEstateSummaryCards />

      {/* Catálogo y Listado de Inmuebles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Catálogo de Inmuebles en Cartera
          </h2>
        </div>
        <PropertyList />
      </div>
    </div>
  );
}
