'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  FileCheck2,
  Receipt,
  AlertTriangle,
  Upload,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  FileText,
  Building,
} from 'lucide-react';
import { useClientPortalStore } from '../store/useClientPortalStore';
import { CaseTrackingTimeline } from './CaseTrackingTimeline';
import { ClientInvoicesView } from './ClientInvoicesView';
import { ClientDocumentUploadModal } from './ClientDocumentUploadModal';
import { ECFPrintViewModal } from './ECFPrintViewModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export function PortalDashboard() {
  const {
    currentUser,
    cases,
    activeCaseId,
    setActiveCaseId,
    requirements,
    invoices,
    openUploadModal,
  } = useClientPortalStore();

  const [copiedTracking, setCopiedTracking] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('expedientes');

  // Filtrar casos asignados al usuario actual
  const userCases = currentUser
    ? cases.filter((c) => currentUser.assignedCaseIds.includes(c.id))
    : cases;

  const activeCase = userCases.find((c) => c.id === activeCaseId) || userCases[0] || cases[0];

  // Documentos pendientes
  const pendingReqs = requirements.filter((r) => r.status === 'pending');
  const urgentReqs = pendingReqs.filter((r) => r.isUrgent);

  // Saldos pendientes
  const pendingDop = invoices
    .filter((inv) => inv.currency === 'DOP')
    .reduce((sum, inv) => sum + inv.balance, 0);

  const pendingUsd = invoices
    .filter((inv) => inv.currency === 'USD')
    .reduce((sum, inv) => sum + inv.balance, 0);

  const handleCopyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(true);
    toast.success(`Código de rastreo ${code} copiado al portapapeles.`);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Banner de Bienvenida y Resumen Ejecutivo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Portal de Clientes • Emblema Nexus</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Bienvenido, {currentUser ? currentUser.name : 'Estimado Cliente'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {currentUser?.companyName ? `${currentUser.companyName} • ` : ''}
              Supervise el avance técnico-jurídico de sus expedientes, deposite documentos requeridos y consulte sus comprobantes fiscales e-CF.
            </p>
          </div>

          {activeCase && (
            <div className="bg-slate-800/80 backdrop-blur-xs rounded-xl p-4 border border-slate-700 space-y-2 shrink-0 md:max-w-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Expediente Activo en Consulta
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sm text-white">{activeCase.caseNumber}</span>
                <Badge className="bg-slate-700 text-slate-200 text-[10px] font-mono">
                  {activeCase.trackingCode}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 truncate font-medium">{activeCase.title}</p>
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyTrackingCode(activeCase.trackingCode)}
                  className="w-full text-xs bg-slate-900 border-slate-600 text-slate-200 hover:bg-slate-850 hover:text-white"
                >
                  {copiedTracking ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copiar Código de Rastreo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Métrica 1: Expedientes en curso */}
        <Card
          onClick={() => setActiveMainTab('expedientes')}
          className="border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Expedientes en Curso
            </CardDescription>
            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Briefcase className="w-4 h-4 text-slate-700 group-hover:text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-slate-900">{userCases.length}</div>
            <p className="text-xs text-slate-500">
              {activeCase ? activeCase.statusLabel : 'Procesos en trámite activo'}
            </p>
            <div className="pt-2 text-xs font-semibold text-slate-900 flex items-center group-hover:underline">
              Ver avance y cronograma <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </div>
          </CardContent>
        </Card>

        {/* Métrica 2: Requerimientos pendientes */}
        <Card
          onClick={() => setActiveMainTab('documentos')}
          className={`border shadow-xs hover:border-slate-300 transition-all cursor-pointer group ${
            urgentReqs.length > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Requerimientos de Documentos
            </CardDescription>
            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <FileCheck2 className="w-4 h-4 text-slate-700 group-hover:text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="text-3xl font-bold text-slate-900">{pendingReqs.length}</div>
              {urgentReqs.length > 0 && (
                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                  {urgentReqs.length} urgente{urgentReqs.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">Pendientes de subir por su parte</p>
            <div className="pt-2 text-xs font-semibold text-slate-900 flex items-center group-hover:underline">
              Cargar archivos requeridos <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </div>
          </CardContent>
        </Card>

        {/* Métrica 3: Saldo pendiente */}
        <Card
          onClick={() => setActiveMainTab('facturas')}
          className="border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Saldo Pendiente de Pago
            </CardDescription>
            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4 text-slate-700 group-hover:text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-slate-900">
              RD$ {pendingDop.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </div>
            {pendingUsd > 0 && (
              <p className="text-xs font-mono font-medium text-slate-600">
                + ${pendingUsd.toLocaleString('es-DO')} USD
              </p>
            )}
            <div className="pt-2 text-xs font-semibold text-slate-900 flex items-center group-hover:underline">
              Ver facturas y e-CF <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido con Pestañas Principales */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
        <div className="border-b border-slate-200 pb-px">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="expedientes" className="text-xs font-semibold">
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              Expedientes & Cronograma
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs font-semibold">
              <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
              Requerimientos Documentales ({pendingReqs.length})
            </TabsTrigger>
            <TabsTrigger value="facturas" className="text-xs font-semibold">
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              Facturas & Comprobantes e-CF
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Pestaña 1: Expedientes & Cronograma */}
        <TabsContent value="expedientes" className="space-y-6">
          {/* Selector de caso si hay varios */}
          {userCases.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold mr-1">Expediente:</span>
              {userCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCaseId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    c.id === activeCase.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {c.caseNumber} • {c.category}
                </button>
              ))}
            </div>
          )}

          {/* Encabezado del caso seleccionado */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-slate-950">{activeCase.title}</span>
                  <Badge variant="outline" className="border-slate-300 font-medium text-xs">
                    {activeCase.category}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Número Interno: <strong className="text-slate-800">{activeCase.caseNumber}</strong> • Iniciado: {activeCase.openedDate}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Link href={`/portal/tracking/${activeCase.trackingCode}`}>
                  <Button variant="outline" size="sm" className="text-xs font-medium border-slate-300">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Vista Pública de Tracking
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => handleCopyTrackingCode(activeCase.trackingCode)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {activeCase.trackingCode}
                </Button>
              </div>
            </div>

            {/* Cronograma interactivo */}
            <CaseTrackingTimeline caseData={activeCase} showDetails={true} />
          </div>
        </TabsContent>

        {/* Pestaña 2: Requerimientos Documentales */}
        <TabsContent value="documentos" className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Documentación Solicitada por el Equipo Legal & Técnico
                </h3>
                <p className="text-xs text-slate-500">
                  Suba copias legibles y oficiales para dar cumplimiento a los trámites ante la Jurisdicción Inmobiliaria y DGII.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{req.title}</span>
                        {req.isUrgent && (
                          <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-semibold">
                            Urgente
                          </Badge>
                        )}
                        {req.status === 'pending' && (
                          <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-50 text-[10px]">
                            Pendiente
                          </Badge>
                        )}
                        {req.status === 'under_review' && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                            En Revisión
                          </Badge>
                        )}
                        {req.status === 'approved' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            Aprobado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4">
                        <span>Expediente: <strong>{req.caseNumber}</strong></span>
                        <span>Plazo Límite: <strong>{req.dueDate}</strong></span>
                        <span>Formatos: <strong>{req.allowedFormats.join(', ')}</strong> (hasta {req.maxSizeMB} MB)</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {req.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => openUploadModal(req)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Subir Archivo
                        </Button>
                      ) : req.uploadedFile ? (
                        <div className="text-right text-xs">
                          <span className="inline-flex items-center text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            {req.uploadedFile.name}
                          </span>
                          <p className="text-[11px] text-slate-500">{req.uploadedFile.uploadedAt}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {req.reviewNotes && (
                    <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700">
                      <strong className="text-slate-900">Estado de revisión: </strong>
                      {req.reviewNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Pestaña 3: Facturas e-CF */}
        <TabsContent value="facturas" className="space-y-6">
          <ClientInvoicesView />
        </TabsContent>
      </Tabs>

      {/* Modales globales del portal */}
      <ClientDocumentUploadModal />
      <ECFPrintViewModal />
    </div>
  );
}
