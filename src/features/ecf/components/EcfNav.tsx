"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileCheck2,
  Inbox,
  Settings,
  Plus,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEcfStore } from "../store/useEcfStore";

const navItems = [
  {
    href: "/finanzas/ecf",
    label: "Comprobantes Emitidos",
    icon: FileCheck2,
    exact: true,
  },
  {
    href: "/finanzas/ecf/recibidos",
    label: "Buzón de e-CF Recibidos",
    icon: Inbox,
  },
  {
    href: "/configuracion/ecf",
    label: "Configuración y Certificado",
    icon: Settings,
  },
];

export function EcfNav() {
  const pathname = usePathname();
  const { openEmitModal, config } = useEcfStore();

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

        {/* Acciones y Estado de Ambiente */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Badge
            variant="outline"
            className={
              config.ambiente === "PROD"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold"
                : "bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-semibold"
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                config.ambiente === "PROD" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              }`}
            />
            DGII {config.ambiente === "PROD" ? "PRODUCCIÓN" : "CERTIFICACIÓN"}
          </Badge>

          <Button
            size="sm"
            onClick={() => openEmitModal()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium h-8 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Emitir e-CF
          </Button>
        </div>
      </div>
    </div>
  );
}
