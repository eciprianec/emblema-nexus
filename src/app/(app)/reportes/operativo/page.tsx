import { TeamProductivityTable } from "@/features/reports/components/TeamProductivityTable";
import { Users2 } from "lucide-react";

export const metadata = {
  title: "Rendimiento & Operaciones del Equipo | Emblema Nexus",
  description: "Métricas de productividad, cumplimiento de plazos SLA y comisiones de abogados y agrimensores",
};

export default function OperationalReportsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users2 className="h-5 w-5 text-slate-700" />
          Rendimiento Operativo y Productividad del Equipo
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Supervisión de casos activos, cumplimiento de plazos legales (SLA), actuaciones procesales concluidas y liquidación de comisiones profesionales.
        </p>
      </div>

      <TeamProductivityTable />
    </div>
  );
}
