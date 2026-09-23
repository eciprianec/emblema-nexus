"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  FileCheck2,
  Compass,
  Plus,
  FileSpreadsheet,
  Upload,
  CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSurveyStore } from "../store/useSurveyStore";

const navItems = [
  { href: "/agrimensura", label: "Resumen Catastral", icon: LayoutDashboard, exact: true },
  { href: "/agrimensura/parcelas", label: "Parcelas y Planos", icon: MapPin },
  { href: "/agrimensura/expedientes", label: "Expedientes DNMC", icon: FileCheck2 },
  { href: "/agrimensura/campo", label: "Jornadas de Campo", icon: Compass },
];

export function SurveyNav() {
  const pathname = usePathname();
  const {
    openParcelCreateModal,
    openCadastralCreateModal,
    openCoordinateImporterModal,
    openFieldSessionCreateModal,
  } = useSurveyStore();

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-10 pb-1 pt-1 -mt-2 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        {/* Subnavigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar scroll-smooth">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Global Quick Action Button in Survey */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openCoordinateImporterModal()}
            className="text-xs font-medium h-8 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
            Importar Coordenadas
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nueva Operación
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => openParcelCreateModal()}
                className="text-xs cursor-pointer py-2"
              >
                <MapPin className="h-4 w-4 mr-2 text-slate-600" />
                Registrar Parcela
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openCadastralCreateModal()}
                className="text-xs cursor-pointer py-2 font-medium text-slate-900"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2 text-slate-700" />
                Radicar Expediente DNMC
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openFieldSessionCreateModal()}
                className="text-xs cursor-pointer py-2"
              >
                <CalendarPlus className="h-4 w-4 mr-2 text-slate-600" />
                Programar Jornada de Campo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openCoordinateImporterModal()}
                className="text-xs cursor-pointer py-2 text-slate-600"
              >
                <Upload className="h-4 w-4 mr-2 text-slate-500" />
                Cargar Puntos GPS / Estación
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
