import { CaseProfitabilityTable } from "@/features/reports/components/CaseProfitabilityTable";
import { TrendingUp, FileSpreadsheet } from "lucide-react";

export const metadata = {
  title: "Rentabilidad & Finanzas por Expediente | Emblema Nexus",
  description: "Análisis financiero detallado por caso, honorarios facturados, costos directos y margen neto",
};

export default function FinancialReportsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-700" />
          Análisis de Rentabilidad por Expediente y Cartera
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Auditoría de retorno neto por expediente legal, deslinde y saneamiento catastral deduciendo gastos directos asignados (tasas judiciales, viáticos de campo y aranceles notariales).
        </p>
      </div>

      <CaseProfitabilityTable />
    </div>
  );
}
