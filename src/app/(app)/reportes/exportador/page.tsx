import { UniversalExporterView } from "@/features/reports/components/UniversalExporterView";
import { Download, FileSpreadsheet } from "lucide-react";

export const metadata = {
  title: "Exportador Universal de Datos Maestros | Emblema Nexus",
  description: "Exportación flexible de clientes, facturas, expedientes, parcelas e inmuebles a CSV, Excel y JSON",
};

export default function ExporterPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Download className="h-5 w-5 text-slate-700" />
          Centro de Exportación Universal de Datos
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Extraiga información consolidada de los módulos maestros de la firma (Clientes, Facturación, Expedientes, Parcelas, Inmuebles y Contratos) con selección personalizada de columnas y formatos compatibles con Excel (BOM UTF-8), archivos planos o JSON.
        </p>
      </div>

      <UniversalExporterView />
    </div>
  );
}
