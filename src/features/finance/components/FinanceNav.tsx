"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFinanceStore } from "../store/useFinanceStore";

const navItems = [
  { href: "/finanzas", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/finanzas/facturas", label: "Facturas", icon: FileText },
  { href: "/finanzas/ecf", label: "Facturación e-CF", icon: ShieldCheck },
  { href: "/finanzas/cotizaciones", label: "Cotizaciones", icon: FileCheck },
  { href: "/finanzas/cxc", label: "CxC y Cobranzas", icon: Clock },
  { href: "/finanzas/pagos", label: "Cobros e Ingresos", icon: ArrowDownLeft },
  { href: "/finanzas/gastos", label: "Gastos", icon: ArrowUpRight },
  { href: "/finanzas/caja", label: "Caja Chica", icon: Wallet },
  { href: "/finanzas/bancos", label: "Cuentas Bancarias", icon: Building2 },
];

export function FinanceNav() {
  const pathname = usePathname();
  const {
    openQuoteCreateModal,
    openExpenseCreateModal,
  } = useFinanceStore();

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-10 pb-1 pt-1 -mt-2 mb-6 print:hidden">
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

        {/* Global Quick Action Button in Finance */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nueva Transacción
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild className="text-xs cursor-pointer py-2">
                <Link href="/finanzas/facturas/nueva">
                  <FileText className="h-4 w-4 mr-2 text-slate-500" />
                  Nueva Factura
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openQuoteCreateModal()}
                className="text-xs cursor-pointer py-2"
              >
                <FileCheck className="h-4 w-4 mr-2 text-slate-500" />
                Nueva Cotización / Presupuesto
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-xs cursor-pointer py-2">
                <Link href="/finanzas/cxc">
                  <ArrowDownLeft className="h-4 w-4 mr-2 text-emerald-600" />
                  Registrar Cobro de Cliente
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openExpenseCreateModal()}
                className="text-xs cursor-pointer py-2"
              >
                <ArrowUpRight className="h-4 w-4 mr-2 text-rose-600" />
                Registrar Gasto Operativo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
