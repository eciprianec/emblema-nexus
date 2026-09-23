'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  KeyRound,
  Search,
  Scale,
  Sparkles,
  ArrowRight,
  Briefcase,
  FileCheck2,
  Receipt,
} from 'lucide-react';
import { useClientPortalStore } from '@/features/client-portal/store/useClientPortalStore';
import { PortalDashboard } from '@/features/client-portal/components/PortalDashboard';
import { Button } from '@/components/ui/button';

export default function PortalPage() {
  const { isAuthenticated } = useClientPortalStore();

  if (isAuthenticated) {
    return <PortalDashboard />;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-16 space-y-10">
      {/* Portada para usuarios no autenticados */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Acceso Exclusivo para Clientes de Emblema Nexus</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
          Portal Jurídico & Inmobiliario
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Plataforma centralizada para dar seguimiento a sus trámites de deslinde, saneamiento, litigios de tierras y comprobantes fiscales electrónicos e-CF.
        </p>
      </div>

      {/* Tarjetas de Acceso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opción 1: Iniciar Sesión con PIN o Magic Link */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-950">
              Ingresar con Credenciales
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Inicie sesión utilizando el código PIN de 6 dígitos suministrado por su abogado o mediante el Magic Link recibido en su correo electrónico.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Link href="/portal/login" className="block w-full">
              <Button className="w-full bg-slate-950 hover:bg-slate-850 text-white text-xs font-semibold h-11">
                Acceder a Mi Cuenta
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Opción 2: Tracking Público sin Autenticación */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-950">
              Tracking de Expediente
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Consulte de forma inmediata el estatus procesal de un caso utilizando su código único de rastreo <span className="font-mono font-semibold text-slate-900">(TRK-...)</span> sin requerir contraseña.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Link href="/portal/tracking" className="block w-full">
              <Button variant="outline" className="w-full border-slate-300 text-slate-900 hover:bg-slate-50 text-xs font-semibold h-11">
                Consultar por Código TRK
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/portal/consulta" className="block w-full">
              <Button variant="ghost" className="w-full text-xs text-slate-600 hover:text-slate-900 h-10">
                <Scale className="w-3.5 h-3.5 mr-1.5" />
                Solicitar Cotización o Nueva Consulta
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Características del Portal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
        <div className="p-4 bg-slate-100/70 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center text-xs font-bold text-slate-900">
            <Briefcase className="w-4 h-4 mr-1.5 text-slate-700" />
            Cronograma en Tiempo Real
          </div>
          <p className="text-[11px] text-slate-500">
            Hitos actualizados en DNMC, Tribunales de Tierras y Catastro.
          </p>
        </div>

        <div className="p-4 bg-slate-100/70 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center text-xs font-bold text-slate-900">
            <FileCheck2 className="w-4 h-4 mr-1.5 text-slate-700" />
            Requerimientos Digitales
          </div>
          <p className="text-[11px] text-slate-500">
            Depósito seguro de títulos, actas y poderes notariales desde casa.
          </p>
        </div>

        <div className="p-4 bg-slate-100/70 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center text-xs font-bold text-slate-900">
            <Receipt className="w-4 h-4 mr-1.5 text-slate-700" />
            Comprobantes e-CF Oficiales
          </div>
          <p className="text-[11px] text-slate-500">
            Facturas electrónicas válidas ante la DGII bajo la Ley 32-23.
          </p>
        </div>
      </div>
    </div>
  );
}
