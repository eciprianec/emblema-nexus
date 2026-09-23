"use client";

import { ContractList } from "@/features/real-estate/components/ContractList";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealEstateStore } from "@/features/real-estate/store/useRealEstateStore";

export default function RealEstateContractsPage() {
  const { openContractCreateModal } = useRealEstateStore();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Contratos y Arrendamientos Inmobiliarios
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestión jurídica de contratos de alquiler residencial, comercial y promesas de venta con esquema de depósitos dominicano.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => openContractCreateModal()}
          className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-9"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo Contrato
        </Button>
      </div>

      <ContractList />
    </div>
  );
}
