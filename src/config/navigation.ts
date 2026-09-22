/**
 * Configuración de navegación principal de Emblema Nexus.
 * §95 — Menú lateral con módulos y submódulos.
 */

import {
  LayoutDashboard,
  Calendar,
  Users,
  FolderKanban,
  FileText,
  Wallet,
  Building2,
  Map,
  BarChart3,
  Settings,
  Receipt,
  CreditCard,
  Banknote,
  PiggyBank,
  HandCoins,
  TrendingDown,
  Building,
  Home,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  permission?: string;
  children?: NavItem[];
  badge?: string;
}

export const mainNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: Calendar,
    permission: "calendar.view",
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
    permission: "clients.view",
    children: [
      { label: "Todos", href: "/clientes" },
      { label: "Personas", href: "/clientes?tipo=persona_fisica" },
      { label: "Empresas", href: "/clientes?tipo=persona_juridica" },
    ],
  },
  {
    label: "Expedientes",
    href: "/expedientes",
    icon: FolderKanban,
    permission: "cases.view",
    children: [
      { label: "Todos", href: "/expedientes" },
      { label: "Legal", href: "/expedientes?area=legal" },
      { label: "Agrimensura", href: "/expedientes?area=agrimensura" },
      { label: "Inmobiliaria", href: "/expedientes?area=inmobiliaria" },
    ],
  },
  {
    label: "Documentos",
    href: "/documentos",
    icon: FileText,
    permission: "documents.view",
  },
  {
    label: "Finanzas",
    href: "/finanzas",
    icon: Wallet,
    permission: "finance.view",
    children: [
      { label: "Cuentas por cobrar", href: "/finanzas/cxc", icon: HandCoins },
      { label: "Cuentas por pagar", href: "/finanzas/cxp", icon: TrendingDown },
      { label: "Facturas", href: "/finanzas/facturas", icon: Receipt },
      { label: "Pagos", href: "/finanzas/pagos", icon: CreditCard },
      { label: "Gastos", href: "/finanzas/gastos", icon: Banknote },
      { label: "Bancos", href: "/finanzas/bancos", icon: Landmark },
      { label: "Caja", href: "/finanzas/caja", icon: PiggyBank },
    ],
  },
  {
    label: "Inmobiliaria",
    href: "/inmobiliaria",
    icon: Building2,
    permission: "properties.view",
    children: [
      { label: "Proyectos", href: "/inmobiliaria/proyectos", icon: Building },
      { label: "Propiedades", href: "/inmobiliaria/propiedades", icon: Home },
    ],
  },
  {
    label: "Agrimensura",
    href: "/agrimensura",
    icon: Map,
    permission: "cases.view",
  },
  {
    label: "Reportes",
    href: "/reportes",
    icon: BarChart3,
    permission: "reports.view",
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: Settings,
    permission: "config.manage",
    children: [
      { label: "Empresa", href: "/configuracion/empresa" },
      { label: "Usuarios", href: "/configuracion/usuarios" },
      { label: "Roles", href: "/configuracion/roles" },
      { label: "Permisos", href: "/configuracion/permisos" },
      { label: "Áreas", href: "/configuracion/areas" },
      { label: "Tipos de expediente", href: "/configuracion/tipos-expediente" },
      { label: "Workflows", href: "/configuracion/workflows" },
      { label: "Integraciones", href: "/configuracion/integraciones" },
      { label: "Fiscal", href: "/configuracion/fiscal" },
    ],
  },
];

/**
 * Opciones del botón "+ Nuevo" (§96)
 */
export const quickCreateOptions: NavItem[] = [
  { label: "Cliente", href: "/clientes/nuevo", icon: Users, permission: "clients.create" },
  { label: "Expediente", href: "/expedientes/nuevo", icon: FolderKanban, permission: "cases.create" },
  { label: "Tarea", href: "#nueva-tarea", icon: Calendar, permission: "calendar.create" },
  { label: "Documento", href: "#nuevo-documento", icon: FileText, permission: "documents.upload" },
  { label: "Factura", href: "/finanzas/facturas/nueva", icon: Receipt, permission: "ecf.create" },
  { label: "Gasto", href: "/finanzas/gastos/nuevo", icon: Banknote, permission: "finance.create" },
  { label: "Proveedor", href: "#nuevo-proveedor", icon: Building2, permission: "vendors.create" },
  { label: "Propiedad", href: "/inmobiliaria/propiedades/nueva", icon: Home, permission: "properties.create" },
];
