'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Briefcase,
  Receipt,
  FileUp,
  Search,
  LogOut,
  LogIn,
  ChevronDown,
  Building2,
  PhoneCall,
  User,
} from 'lucide-react';
import { useClientPortalStore } from '../store/useClientPortalStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function PortalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isAuthenticated,
    currentUser,
    cases,
    activeCaseId,
    setActiveCaseId,
    logout,
  } = useClientPortalStore();

  const userCases = isAuthenticated && currentUser
    ? cases.filter((c) => currentUser.assignedCaseIds.includes(c.id))
    : [];

  const activeCase = cases.find((c) => c.id === activeCaseId) || userCases[0] || null;

  const handleLogout = () => {
    logout();
    router.push('/portal/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      {/* Barra superior de contacto rápido y aviso legal */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4">
          <div className="flex items-center space-x-4">
            <span className="flex items-center text-slate-400">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Sede Central: Av. Winston Churchill esq. 27 de Febrero, Piantini, D.N.
            </span>
            <span className="hidden md:inline-flex items-center text-slate-400">
              <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              (809) 566-0099
            </span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>RNC Institucional: 1-32-45892-1</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Conexión Cifrada SSL 256-bit
            </span>
          </div>
        </div>
      </div>

      {/* Navegación principal del Portal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div className="flex items-center space-x-4">
            <Link href="/portal" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-md bg-slate-950 flex items-center justify-center text-white font-bold text-lg shadow-sm border border-slate-800 group-hover:bg-slate-900 transition-colors">
                EN
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-slate-950 tracking-tight leading-none group-hover:text-slate-800">
                  EMBLEMA NEXUS
                </span>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">
                  Portal Jurídico & Agrimensura
                </span>
              </div>
            </Link>

            {/* Separador vertical */}
            <div className="hidden lg:block h-6 w-px bg-slate-200 ml-2" />

            {/* Selector de Expediente Activo (si está autenticado y tiene múltiples casos) */}
            {isAuthenticated && userCases.length > 0 && (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-normal border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 max-w-[260px] truncate"
                    >
                      <Briefcase className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
                      <span className="truncate font-medium text-slate-900">
                        {activeCase ? activeCase.caseNumber : 'Seleccionar Expediente'}
                      </span>
                      <ChevronDown className="w-3 h-3 ml-1.5 text-slate-400 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-80">
                    <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase">
                      Expedientes del Cliente
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {userCases.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => setActiveCaseId(c.id)}
                        className={`cursor-pointer text-xs flex flex-col items-start py-2 ${
                          c.id === activeCaseId ? 'bg-slate-100 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-slate-900">{c.caseNumber}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {c.category}
                          </Badge>
                        </div>
                        <span className="text-slate-600 text-[11px] truncate w-full mt-0.5">
                          {c.title}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Menú de Navegación */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/portal"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/portal'
                  ? 'text-slate-950 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Mi Portal
            </Link>

            <Link
              href="/portal/tracking"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/portal/tracking')
                  ? 'text-slate-950 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Search className="w-4 h-4 mr-1.5 text-slate-500" />
              Tracking Público
            </Link>

            <Link
              href="/portal/consulta"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/portal/consulta'
                  ? 'text-slate-950 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Consultas & Cotizaciones
            </Link>
          </nav>

          {/* Área de Usuario / Autenticación */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-left p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-xs">
                      {currentUser.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="hidden xl:flex flex-col text-left">
                      <span className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">
                        {currentUser.name}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {currentUser.companyName || currentUser.rncOrCedula}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-semibold text-slate-900">{currentUser.name}</span>
                      <span className="text-xs text-slate-500">{currentUser.email}</span>
                      <span className="text-[11px] font-mono text-slate-400">RNC/Cédula: {currentUser.rncOrCedula}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer text-xs">
                    <Link href="/portal" className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-2 text-slate-500" />
                      Panel del Cliente
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer text-xs">
                    <Link href="/portal/tracking" className="flex items-center">
                      <Search className="w-4 h-4 mr-2 text-slate-500" />
                      Consultar otro Expediente
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-xs text-red-600 focus:text-red-600 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión del Portal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/portal/login">
                  <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs">
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                    Ingresar al Portal
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
