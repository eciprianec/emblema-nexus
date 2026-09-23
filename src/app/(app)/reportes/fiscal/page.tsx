import { DgiiReportViewer } from "@/features/reports/components/DgiiReportViewer";

export const metadata = {
  title: "Reportes Fiscales DGII (606, 607, 608) | Emblema Nexus",
  description: "Visor y generador de archivos planos oficiales DGII con e-NCF y validación de RNC",
};

export default function FiscalReportsPage() {
  return (
    <div className="space-y-6">
      <DgiiReportViewer />
    </div>
  );
}
