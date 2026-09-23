import { ReportsNav } from "@/features/reports/components/ReportsNav";

export const metadata = {
  title: "Reportes & Business Intelligence | Emblema Nexus",
  description: "Centro de Reportes, BI, Dashboards Fiscales DGII y Exportador Universal",
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ReportsNav />
      {children}
    </div>
  );
}
