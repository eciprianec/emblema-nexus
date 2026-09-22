"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Asumimos que esta configuración puede venir de config/navigation
// import { quickCreateOptions } from "@/config/navigation";

export function QuickCreate() {
  const router = useRouter();

  // Fallback si no está importado
  const options = [
    { label: "Nuevo Cliente", href: "/clientes/nuevo" },
    { label: "Nuevo Expediente", href: "/expedientes/nuevo" },
    { label: "Nueva Factura", href: "/finanzas/facturas" },
    { label: "Nueva Tarea", href: "/tareas/nuevo" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-semibold text-slate-900 dark:text-slate-100">Creación Rápida</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.href}
            onClick={() => router.push(opt.href)}
            className="cursor-pointer text-slate-700 focus:bg-slate-100 focus:text-slate-900 dark:text-slate-300 dark:focus:bg-slate-800 dark:focus:text-slate-50"
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
