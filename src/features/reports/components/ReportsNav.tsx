"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileCheck2,
  TrendingUp,
  Users2,
  Download,
  Calendar,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportsStore } from "../store/useReportsStore";
import { CompanyId, FiscalPeriod } from "../types";

const navItems = [
  { href: "/reportes", label: "Tablero General BI", icon: BarChart3, exact: true },
  { href: "/reportes/fiscal", label: "Reportes Fiscales DGII", icon: FileCheck2 },
  { href: "/reportes/financiero", label: "Rentabilidad y Finanzas", icon: TrendingUp },
  { href: "/reportes/operativo", label: "Rendimiento y Operaciones", icon: Users2 },
  { href: "/reportes/exportador", label: "Exportador Universal", icon: Download },
];

export function ReportsNav() {
  const pathname = usePathname();
  const {
    selectedPeriod,
    selectedCompany,
    setPeriod,
    setCompany,
  } = useReportsStore();

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-10 pb-2 pt-1 -mt-2 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2">
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

        {/* Global Fiscal & Company Filters */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Período Fiscal */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Período:</span>
            <Select
              value={selectedPeriod}
              onValueChange={(val) => setPeriod(val as FiscalPeriod)}
            >
              <SelectTrigger className="h-7 w-[125px] border-0 bg-transparent text-xs font-semibold text-slate-900 focus:ring-0 p-0 shadow-none">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent align="end" className="text-xs">
                <SelectItem value="2026-03" className="text-xs font-medium">Marzo 2026 (Actual)</SelectItem>
                <SelectItem value="2026-02" className="text-xs font-medium">Febrero 2026</SelectItem>
                <SelectItem value="2026-01" className="text-xs font-medium">Enero 2026</SelectItem>
                <SelectItem value="2025-12" className="text-xs font-medium">Diciembre 2025</SelectItem>
                <SelectItem value="2026-ANUAL" className="text-xs font-medium">Año 2026 Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Empresa */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
            <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Empresa:</span>
            <Select
              value={selectedCompany}
              onValueChange={(val) => setCompany(val as CompanyId)}
            >
              <SelectTrigger className="h-7 w-[150px] border-0 bg-transparent text-xs font-semibold text-slate-900 focus:ring-0 p-0 shadow-none">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent align="end" className="text-xs">
                <SelectItem value="todas" className="text-xs font-medium">Todas las Empresas</SelectItem>
                <SelectItem value="emblema-principal" className="text-xs font-medium">Oficina Principal (Santo Domingo)</SelectItem>
                <SelectItem value="emblema-norte" className="text-xs font-medium">Zona Norte (Santiago)</SelectItem>
                <SelectItem value="emblema-este" className="text-xs font-medium">Zona Este (Punta Cana)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Acceso Rápido a Exportación */}
          <Link href="/reportes/exportador">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Exportar</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
