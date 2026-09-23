"use client";

import { useSurveyStore } from "../store/useSurveyStore";
import { 
  MapPin, 
  Layers, 
  FileCheck2, 
  CheckCircle2, 
  Users2, 
  Compass,
  AlertTriangle
} from "lucide-react";

export function SurveySummaryCards() {
  const { parcels, cadastralFiles, fieldSessions, equipmentList } = useSurveyStore();

  const totalSqm = parcels.reduce((sum, p) => sum + p.areaSqm, 0);
  const totalTareas = parcels.reduce((sum, p) => sum + p.areaTareas, 0);

  const activeDnmcFiles = cadastralFiles.filter(
    (c) => c.stage !== 'APROBADO'
  ).length;

  const approvedFiles = cadastralFiles.filter(
    (c) => c.stage === 'APROBADO'
  ).length;

  const observedFiles = cadastralFiles.filter(
    (c) => c.stage === 'OBSERVACIONES' && c.observationNotice && !c.observationNotice.isResolved
  ).length;

  const completedSessions = fieldSessions.filter(
    (s) => s.status === 'COMPLETADA'
  ).length;

  const scheduledSessions = fieldSessions.filter(
    (s) => s.status === 'PROGRAMADA' || s.status === 'EN_CURSO'
  ).length;

  const operationalEquipment = equipmentList.filter(
    (eq) => eq.status === 'OPERATIVO'
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Parcelas Registradas */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Parcelas Activas
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-700">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {parcels.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Distritos Catastrales 01, 03, 06
          </p>
        </div>
      </div>

      {/* 2. Superficie Total (m² y Tareas) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Superficie Total
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-700">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {totalSqm.toLocaleString('es-DO')} <span className="text-xs font-medium text-slate-500">m²</span>
          </div>
          <p className="text-[11px] font-medium text-slate-600 mt-1">
            {totalTareas.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tareas dom.
          </p>
        </div>
      </div>

      {/* 3. Expedientes DNMC */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Expedientes DNMC
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-700">
            <FileCheck2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {cadastralFiles.length}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-500">
              {activeDnmcFiles} en proceso
            </span>
            {observedFiles > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <AlertTriangle className="h-2.5 w-2.5" />
                {observedFiles} con oficio
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Aprobaciones Definitivas */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Aprobaciones DNMC
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-700">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {approvedFiles}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Plano definitivo aprobado
          </p>
        </div>
      </div>

      {/* 5. Jornadas y Equipos */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Campo y Equipos
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-700">
            <Compass className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {scheduledSessions} <span className="text-xs font-normal text-slate-500">prog.</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{completedSessions} completadas</span>
            <span className="font-medium text-slate-700">{operationalEquipment} equipos</span>
          </p>
        </div>
      </div>
    </div>
  );
}
