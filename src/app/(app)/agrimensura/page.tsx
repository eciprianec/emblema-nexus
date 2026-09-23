"use client";

import { useSurveyStore } from "@/features/survey/store/useSurveyStore";
import { SurveySummaryCards } from "@/features/survey/components/SurveySummaryCards";
import { ParcelMapViewer } from "@/features/survey/components/ParcelMapViewer";
import Link from "next/link";
import {
  Compass,
  MapPin,
  FileCheck2,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Upload,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SurveyDashboardPage() {
  const {
    parcels,
    cadastralFiles,
    fieldSessions,
    equipmentList,
    openParcelDetailModal,
    openParcelCreateModal,
    openCadastralCreateModal,
    openCoordinateImporterModal,
  } = useSurveyStore();

  const featuredParcel = parcels[0];
  const observedFiles = cadastralFiles.filter(
    (c) => c.stage === "OBSERVACIONES" && c.observationNotice && !c.observationNotice.isResolved
  );

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Agrimensura y Catastro
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestión técnica parcelaria, cartografía UTM 19N WGS84 y seguimiento ante la Dirección Nacional de Mensuras Catastrales (DNMC).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openCoordinateImporterModal()}
            className="text-xs h-8 border-slate-300 text-slate-700"
          >
            <Upload className="h-3.5 w-3.5 mr-1 text-slate-600" />
            Importar Coordenadas
          </Button>
          <Button
            size="sm"
            onClick={openParcelCreateModal}
            className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nueva Parcela
          </Button>
        </div>
      </div>

      {/* Alerta de Oficios de Observación DNMC pendientes */}
      {observedFiles.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-amber-200/70 rounded-full text-amber-900 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">
                  Atención Inmediata: {observedFiles.length} Expediente con Oficio de Observación DNMC
                </h4>
                <p className="text-xs text-amber-900 mt-0.5">
                  El expediente <strong>{observedFiles[0].fileNumber}</strong> ({observedFiles[0].parcelDesignation}) tiene un plazo reglamentario de 30 días para subsanar que vence el <strong>{observedFiles[0].observationNotice?.deadlineDate}</strong>.
                </p>
              </div>
            </div>
            <Link href="/agrimensura/expedientes">
              <Button size="sm" className="bg-amber-800 hover:bg-amber-900 text-white text-xs h-8 shrink-0">
                Ver Oficios y Subsanar
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* KPIs de Agrimensura */}
      <SurveySummaryCards />

      {/* Grid de contenido técnico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda / Central: Parcela Destacada y Plano Interactivo */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjeta del Visor de Parcela */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Visor Topográfico de Parcela Principal
                </h3>
              </div>
              {featuredParcel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openParcelDetailModal(featuredParcel)}
                  className="text-xs h-7 text-slate-600 hover:text-slate-900"
                >
                  Ver Ficha Completa
                  <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>

            {featuredParcel ? (
              <div>
                <ParcelMapViewer
                  vertices={featuredParcel.vertices}
                  parcelDesignation={featuredParcel.designation}
                  areaSqm={featuredParcel.areaSqm}
                  areaTareas={featuredParcel.areaTareas}
                />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div>
                    <strong>{featuredParcel.designation}</strong> • {featuredParcel.municipality}, {featuredParcel.province}
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {featuredParcel.areaSqm.toLocaleString("es-DO")} m² ({featuredParcel.areaTareas.toFixed(2)} tareas)
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
                No hay parcelas registradas.
              </div>
            )}
          </div>

          {/* Estado de Expedientes en la DNMC */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Monitoreo Rápido de Trámites Catastrales
                </h3>
              </div>
              <Link
                href="/agrimensura/expedientes"
                className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {cadastralFiles.slice(0, 3).map((file) => (
                <div
                  key={file.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {file.fileNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {file.operationType}
                      </Badge>
                    </div>
                    <div className="text-slate-600 text-[11px] mt-0.5">
                      {file.parcelDesignation} • {file.regional}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                      {file.stage}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {file.startDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Jornadas, Equipos y Accesos */}
        <div className="space-y-6">
          {/* Próximas Jornadas de Campo */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Jornadas de Campo
                </h3>
              </div>
              <Link
                href="/agrimensura/campo"
                className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                Gestionar
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {fieldSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-md border border-slate-200 bg-slate-50/60 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">
                      {session.code}
                    </span>
                    <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                      {session.status}
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 text-[11px]">
                    {session.parcelDesignation}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                    <span>Fecha: {session.sessionDate}</span>
                    <span>{session.brigade.length} brigadistas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instrumental Topográfico */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Equipos Calibrados
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                100% Certificados
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {equipmentList.slice(0, 4).map((eq) => (
                <div
                  key={eq.id}
                  className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50/50"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-900 truncate text-[11px]">
                      {eq.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      S/N: {eq.serialNumber}
                    </div>
                  </div>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
