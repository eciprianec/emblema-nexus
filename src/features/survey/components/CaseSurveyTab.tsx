"use client";

import React from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import { ParcelMapViewer } from "./ParcelMapViewer";
import {
  MapPin,
  Compass,
  FileCheck2,
  Calendar,
  Layers,
  Upload,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CaseSurveyTabProps {
  caseId: string;
}

export function CaseSurveyTab({ caseId }: CaseSurveyTabProps) {
  const {
    parcels,
    cadastralFiles,
    fieldSessions,
    openParcelDetailModal,
    openParcelCreateModal,
    openCoordinateImporterModal,
    openCadastralCreateModal,
  } = useSurveyStore();

  // Buscar parcelas vinculadas a este caso
  const caseParcels = parcels.filter((p) => p.caseId === caseId);

  const activeParcel = caseParcels[0] || null;
  const linkedCadastralFile = activeParcel
    ? cadastralFiles.find(
        (c) => c.parcelId === activeParcel.id || c.id === activeParcel.cadastralFileId
      )
    : null;

  const linkedSessions = activeParcel
    ? fieldSessions.filter((s) => s.parcelId === activeParcel.id)
    : [];

  if (!activeParcel) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg">
        <Compass className="h-10 w-10 mx-auto text-slate-400 mb-2 stroke-1" />
        <h4 className="text-sm font-semibold text-slate-800">
          Sin Parcela Catastral Vinculada
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
          Este expediente legal aún no tiene una parcela o plano catastral asignado.
        </p>
        <Button
          size="sm"
          onClick={openParcelCreateModal}
          className="text-xs bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Registrar Parcela para este Caso
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera de la Parcela en el Caso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-slate-200 text-slate-800">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Inmueble Catastral Vinculado
            </span>
            <Badge className="bg-slate-900 text-white text-[10px]">
              {activeParcel.status}
            </Badge>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            {activeParcel.designation}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Distrito Catastral {activeParcel.cadastralDistrict} • {activeParcel.municipality}, {activeParcel.province}
            {activeParcel.sector ? ` (${activeParcel.sector})` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openCoordinateImporterModal(activeParcel.id)}
            className="text-xs h-8 border-slate-300"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
            Importar Coordenadas
          </Button>
          <Button
            size="sm"
            onClick={() => openParcelDetailModal(activeParcel)}
            className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
          >
            <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
            Ficha Técnica y Vértices
          </Button>
        </div>
      </div>

      {/* Grid: Visor de Plano y Datos Técnicos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visor interactivo del Polígono UTM */}
        <div className="lg:col-span-2">
          <ParcelMapViewer
            vertices={activeParcel.vertices}
            parcelDesignation={activeParcel.designation}
            areaSqm={activeParcel.areaSqm}
            areaTareas={activeParcel.areaTareas}
          />
        </div>

        {/* Resumen de Datos Clave y Colindancias */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Superficie y Métricas
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Superficie Métrica:</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeParcel.areaSqm.toLocaleString("es-DO")} m²
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Tareas Dominicanas:</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeParcel.areaTareas.toFixed(2)} tareas
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Vértices Geodésicos:</span>
                <span className="font-mono text-slate-700">
                  {activeParcel.vertices.length} puntos UTM 19N
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                <span className="text-slate-500">Agrimensor:</span>
                <span className="font-medium text-slate-800 text-right truncate max-w-[140px]">
                  {activeParcel.surveyorName}
                </span>
              </div>
            </div>
          </div>

          {/* Colindancias Registrales */}
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Colindancias Oficiales
            </h4>
            <div className="text-[11px] space-y-1.5">
              <div>
                <strong className="text-slate-700 block">Norte:</strong>
                <span className="text-slate-600">{activeParcel.boundaries.north}</span>
              </div>
              <div>
                <strong className="text-slate-700 block">Sur:</strong>
                <span className="text-slate-600">{activeParcel.boundaries.south}</span>
              </div>
              <div>
                <strong className="text-slate-700 block">Este:</strong>
                <span className="text-slate-600">{activeParcel.boundaries.east}</span>
              </div>
              <div>
                <strong className="text-slate-700 block">Oeste:</strong>
                <span className="text-slate-600">{activeParcel.boundaries.west}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expediente ante la DNMC vinculado */}
      <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-slate-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Trámite ante la Dirección Nacional de Mensuras Catastrales
            </h4>
          </div>
          {linkedCadastralFile && (
            <Badge className="bg-slate-900 text-white text-[10px]">
              {linkedCadastralFile.stage}
            </Badge>
          )}
        </div>

        {linkedCadastralFile ? (
          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-slate-900">
                  {linkedCadastralFile.fileNumber}
                </span>{" "}
                <span className="text-slate-500">({linkedCadastralFile.operationType})</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {linkedCadastralFile.regional} • Radicado: {linkedCadastralFile.startDate}
              </div>
            </div>

            {linkedCadastralFile.observationNotice && (
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  {linkedCadastralFile.observationNotice.officialNoticeNumber} (Plazo de 30 días)
                </div>
                <p className="mt-1 text-[11px]">
                  {linkedCadastralFile.observationNotice.reason}
                </p>
                <div className="mt-1 font-semibold text-[10px] text-amber-900">
                  Vencimiento: {linkedCadastralFile.observationNotice.deadlineDate}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded border border-dashed border-slate-300 text-center">
            <p className="text-xs text-slate-500 mb-2">
              No hay expediente DNMC formalmente radicado para esta parcela.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openCadastralCreateModal(activeParcel.id)}
              className="text-xs border-slate-300"
            >
              <FileCheck2 className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
              Radicar Expediente DNMC
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
