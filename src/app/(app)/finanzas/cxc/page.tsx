"use client";

import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import { CxcAgingTable } from "@/features/finance/components/CxcAgingTable";
import { formatMoney } from "@/lib/utils";
import { Clock, CreditCard, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CxcPage() {
  const { openPaymentCreateModal } = useFinanceStore();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Centro de Cuentas por Cobrar (CxC)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Control de cobranzas, análisis de vencimiento por tramos de antigüedad y gestión de morosidad.
          </p>
        </div>

        <Button
          onClick={() => openPaymentCreateModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium shadow-xs"
        >
          <CreditCard className="h-3.5 w-3.5 mr-1" />
          Registrar Recibo de Cobro
        </Button>
      </div>

      {/* Tabla y KPIs de Antigüedad de Cartera */}
      <CxcAgingTable />
    </div>
  );
}
