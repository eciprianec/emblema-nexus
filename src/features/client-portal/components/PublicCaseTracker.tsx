'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Clock,
  Building,
  HelpCircle,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { useClientPortalStore } from '../store/useClientPortalStore';
import { ClientCase } from '../types';
import { CaseTrackingTimeline } from './CaseTrackingTimeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface PublicCaseTrackerProps {
  initialCode?: string;
}

export function PublicCaseTracker({ initialCode = '' }: PublicCaseTrackerProps) {
  const router = useRouter();
  const { getPublicCaseByTrackingCode } = useClientPortalStore();

  const [inputCode, setInputCode] = useState(initialCode);
  const [searchedCode, setSearchedCode] = useState(initialCode);
  const [caseData, setCaseData] = useState<ClientCase | null>(null);
  const [hasSearched, setHasSearched] = useState(Boolean(initialCode));

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      setSearchedCode(initialCode);
      const found = getPublicCaseByTrackingCode(initialCode);
      setCaseData(found);
      setHasSearched(true);
    }
  }, [initialCode, getPublicCaseByTrackingCode]);

  const handleSearch = (codeToSearch?: string) => {
    const target = (codeToSearch || inputCode).trim().toUpperCase();
    if (!target) return;

    setSearchedCode(target);
    setHasSearched(true);
    const found = getPublicCaseByTrackingCode(target);
    setCaseData(found);
  };


  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Encabezado del Rastreador Público */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistema Oficial de Consulta Pública de Expedientes</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
          Seguimiento de Expediente en Línea
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Ingrese el código de seguimiento suministrado por Emblema Nexus (ej: <span className="font-mono font-semibold text-slate-900">TRK-2026-X89B2</span>) para consultar el estado en tiempo real ante la Jurisdicción Inmobiliaria, Catastro y Tribunales de Tierras.
        </p>
      </div>

      {/* Caja de Búsqueda */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Ingrese código de rastreo (ej: TRK-2026-X89B2)"
              className="pl-11 h-12 text-base font-mono uppercase bg-slate-50 border-slate-300 focus:bg-white transition-colors"
            />
          </div>
          <Button
            type="submit"
            className="w-full sm:w-auto h-12 px-8 bg-slate-950 hover:bg-slate-850 text-white font-semibold text-sm shadow-sm shrink-0"
          >
            Consultar Estado
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </div>

      {/* Resultados de la Consulta */}
      {hasSearched && (
        <div>
          {caseData ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              {/* Encabezado del Expediente */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {caseData.trackingCode}
                    </span>
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      {caseData.category}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      {caseData.statusLabel}
                    </Badge>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-1">
                    {caseData.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Número de Radicación Interno: <strong className="text-slate-800">{caseData.caseNumber}</strong> • Fecha de Inicio: {caseData.openedDate}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="text-xs border-slate-300 font-medium"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Imprimir Informe
                  </Button>
                </div>
              </div>

              {/* Cronograma Interactivo */}
              <CaseTrackingTimeline caseData={caseData} showDetails={true} />

              {/* Nota Legal Informativa */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center font-bold text-slate-900">
                  <HelpCircle className="w-4 h-4 mr-1.5 text-slate-500" />
                  Aviso Legal y Validez Informativa
                </div>
                <p className="text-[11px] leading-relaxed">
                  Los datos mostrados corresponden al estado procesal registrado en el sistema de gestión de Emblema Nexus en coordinación con las dependencias de la Jurisdicción Inmobiliaria (Tribunal de Tierras, Dirección Nacional de Mensuras Catastrales y Registro de Títulos). Para emitir constancias oficiales con efectos frente a terceros, debe tramitarse una Certificación del Estado Jurídico del Inmueble ante el Registro de Títulos correspondiente.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Expediente No Encontrado
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No hemos localizado ningún expediente registrado con el código <strong className="font-mono text-slate-800">{searchedCode}</strong>.
                </p>
              </div>
              <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-lg max-w-md mx-auto border border-slate-200 text-left space-y-1">
                <p className="font-semibold text-slate-900">Sugerencias:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Asegúrese de incluir el prefijo <strong>TRK-</strong> (ejemplo: TRK-2026-X89B2).</li>
                  <li>Revise el comprobante entregado por su abogado o agrimensor.</li>
                  <li>Si el expediente fue radicado recientemente, el código puede tardar hasta 24 horas en activarse.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
