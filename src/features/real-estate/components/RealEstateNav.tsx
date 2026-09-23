"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  CalendarCheck,
  BadgeDollarSign,
  Plus,
  Home,
  UserCheck,
  Receipt,
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
import { useRealEstateStore } from "../store/useRealEstateStore";

const navItems = [
  { href: "/inmobiliaria", label: "Catálogo de Propiedades", icon: Home, exact: true },
  { href: "/inmobiliaria/contratos", label: "Contratos y Arrendamientos", icon: FileText },
  { href: "/inmobiliaria/visitas", label: "Visitas y Muestras", icon: CalendarCheck },
  { href: "/inmobiliaria/comisiones", label: "Comisiones de Corretaje", icon: BadgeDollarSign },
];

export function RealEstateNav() {
  const pathname = usePathname();
  const {
    openPropertyCreateModal,
    openContractCreateModal,
    openShowingCreateModal,
    openCommissionCreateModal,
  } = useRealEstateStore();

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-10 pb-1 pt-1 -mt-2 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        {/* Pestañas de Navegación Secundaria */}
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

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => openPropertyCreateModal()}
            className="text-xs font-medium h-8 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Captar Propiedad
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs font-medium h-8 border-slate-300 text-slate-700 hover:bg-slate-100">
                Acciones
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => openPropertyCreateModal()}
                className="text-xs cursor-pointer py-2"
              >
                <Home className="h-4 w-4 mr-2 text-slate-600" />
                Nueva Captación de Inmueble
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openContractCreateModal()}
                className="text-xs cursor-pointer py-2 font-medium text-slate-900"
              >
                <FileText className="h-4 w-4 mr-2 text-slate-700" />
                Registrar Contrato / Arrendamiento
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openShowingCreateModal()}
                className="text-xs cursor-pointer py-2"
              >
                <CalendarCheck className="h-4 w-4 mr-2 text-slate-600" />
                Agendar Visita con Prospecto
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openCommissionCreateModal()}
                className="text-xs cursor-pointer py-2 text-slate-600"
              >
                <Receipt className="h-4 w-4 mr-2 text-slate-500" />
                Registrar Liquidación de Comisión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
