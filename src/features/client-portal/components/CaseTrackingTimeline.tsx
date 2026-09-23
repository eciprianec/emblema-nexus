'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Info,
  Calendar,
  UserCheck,
  Compass,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClientCase, CaseMilestone } from '../types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CaseTrackingTimelineProps {
  caseData: ClientCase;
  showDetails?: boolean;
}

export function CaseTrackingTimeline({
  caseData,
  showDetails = true,
}: CaseTrackingTimelineProps) {
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(
    caseData.milestones.find((m) => m.status === 'in_progress')?.id || null
  );

  const completedCount = caseData.milestones.filter((m) => m.status === 'completed').length;
  const totalCount = caseData.milestones.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  const getStatusBadge = (status: CaseMilestone['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completado
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-medium text-xs">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            En Proceso
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-slate-500 border-slate-300 font-normal text-xs">
            Pendiente
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen del Progreso General */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                Estado Actual del Proceso
              </span>
              <Badge className="bg-slate-900 text-white font-semibold text-xs">
                {caseData.statusLabel}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Última actualización: <strong className="text-slate-800">{caseData.lastUpdate}</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold text-slate-900">{percent}%</span>
            <span className="text-xs text-slate-500 block">
              {completedCount} de {totalCount} fases completadas
            </span>
          </div>
        </div>

        <Progress value={percent} className="h-2.5 bg-slate-200" />

        {caseData.publicNotes && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">Nota del Equipo a Cargo: </span>
              {caseData.publicNotes}
            </div>
          </div>
        )}
      </div>

      {/* Datos Clave del Expediente (si se solicita) */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-1">
            <div className="flex items-center text-slate-500 font-medium">
              <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Sede o Tribunal Asignado
            </div>
            <div className="font-semibold text-slate-900">{caseData.courtOrOffice}</div>
          </div>

          <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-1">
            <div className="flex items-center text-slate-500 font-medium">
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Abogado Responsable
            </div>
            <div className="font-semibold text-slate-900">{caseData.assignedAttorney}</div>
          </div>

          <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-1">
            <div className="flex items-center text-slate-500 font-medium">
              <Compass className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Agrimensor Contratista
            </div>
            <div className="font-semibold text-slate-900">
              {caseData.assignedSurveyor || 'No aplica'}
            </div>
          </div>

          {caseData.cadastralDesignation && (
            <div className="md:col-span-3 p-3.5 bg-white rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center text-slate-500 font-medium">
                <FileCheck className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Designación Catastral Oficial
              </div>
              <div className="font-mono text-slate-800 font-medium">
                {caseData.cadastralDesignation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Línea de Tiempo Vertical */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {caseData.milestones.map((milestone, index) => {
          const isCompleted = milestone.status === 'completed';
          const isInProgress = milestone.status === 'in_progress';
          const isPending = milestone.status === 'pending';
          const isExpanded = expandedMilestoneId === milestone.id;

          return (
            <div key={milestone.id} className="relative group">
              {/* Punto indicador del nodo */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : isInProgress
                    ? 'bg-amber-500 border-amber-500 text-white shadow-md ring-4 ring-amber-100 animate-pulse'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : isInProgress ? (
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <span className="text-[10px] sm:text-xs font-bold">{index + 1}</span>
                )}
              </div>

              {/* Tarjeta del Hito */}
              <div
                className={`rounded-xl border transition-all ${
                  isInProgress
                    ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                    : isCompleted
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                }`}
              >
                <div
                  onClick={() =>
                    setExpandedMilestoneId(isExpanded ? null : milestone.id)
                  }
                  className="p-4 sm:p-5 cursor-pointer flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {milestone.title}
                      </span>
                      {getStatusBadge(milestone.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {milestone.date && (
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {milestone.date}
                        </span>
                      )}
                      {milestone.institution && (
                        <span className="flex items-center text-slate-600">
                          <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {milestone.institution}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Expandir o colapsar detalles del hito"
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-slate-100 text-xs space-y-2">
                    <p className="text-slate-700 leading-relaxed">
                      {milestone.description}
                    </p>
                    {milestone.notes && (
                      <div className="p-2.5 bg-amber-100/60 rounded-md text-amber-900 border border-amber-200">
                        <strong className="font-semibold">Anotación adicional: </strong>
                        {milestone.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
