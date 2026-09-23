"use client";

import { ShowingList } from "@/features/real-estate/components/ShowingList";
import { CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealEstateStore } from "@/features/real-estate/store/useRealEstateStore";

export default function RealEstateShowingsPage() {
  const { openShowingCreateModal } = useRealEstateStore();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Agenda de Muestras y Visitas
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Programación de visitas presenciales con clientes prospectos, seguimiento de interés y registro formal de ofertas.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => openShowingCreateModal()}
          className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-9"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Agendar Visita
        </Button>
      </div>

      <ShowingList />
    </div>
  );
}
