"use client";

import React, { useState } from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import { CadastralFile, DNMCStage, DNMCRegional } from "../types";
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  Calendar,
  ChevronRight,
  Plus,
  ArrowRight,
  ShieldAlert,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STAGES_ORDER: { stage: DNMCStage; label: string; order: number }[] = [
  { stage: "SOLICITUD", label: "1. Solicitud", order: 1 },
  { stage: "AVISO_PERIODICO", label: "2. Aviso Periódico", order: 2 },
  { stage: "TRABAJOS_CAMPO", label: "3. Trabajos Campo", order: 3 },
  { stage: "SOMETIDO_DNMC", label: "4. Sometido DNMC", order: 4 },
  { stage: "OBSERVACIONES", label: "5. Observaciones", order: 5 },
  { stage: "APROBADO", label: "6. Aprobado", order: 6 },
];

export function CadastralFileList() {
  const {
    cadastralFiles,
    advanceCadastralStage,
    resolveObservation,
    openCadastralCreateModal,
    openParcelDetailModal,
    parcels,
  } = useSurveyStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [regionalFilter, setRegionalFilter] = useState("TODAS");
  const [stageFilter, setStageFilter] = useState("TODAS");

  const filteredFiles = cadastralFiles.filter((item) => {
    const matchSearch =
      searchTerm === "" ||
      item.fileNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.parcelDesignation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.surveyorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRegional = regionalFilter === "TODAS" || item.regional === regionalFilter;
    const matchStage = stageFilter === "TODAS" || item.stage === stageFilter;

    return matchSearch && matchRegional && matchStage;
  });

  const getRegionalLabel = (reg: DNMCRegional) => {
    switch (reg) {
      case "REGIONAL_CENTRAL":
        return "DNMC Dir. Regional Central";
      case "REGIONAL_NORTE":
        return "DNMC Dir. Regional Norte (Santiago)";
      case "REGIONAL_ESTE":
        return "DNMC Dir. Regional Este (El Seibo)";
      case "REGIONAL_NORESTE":
        return "DNMC Dir. Regional Noreste";
      default:
        return reg;
    }
  };

  const getStageBadge = (stage: DNMCStage) => {
    switch (stage) {
      case "APROBADO":
        return <Badge className="bg-emerald-600 text-white font-semibold">Aprobado DNMC</Badge>;
      case "OBSERVACIONES":
        return <Badge className="bg-amber-600 text-white font-semibold">Oficio Observación</Badge>;
      case "SOMETIDO_DNMC":
        return <Badge className="bg-slate-900 text-white font-semibold">Sometido a Calificación</Badge>;
      case "TRABAJOS_CAMPO":
        return <Badge className="bg-blue-600 text-white font-semibold">En Campo</Badge>;
      case "AVISO_PERIODICO":
        return <Badge className="bg-indigo-600 text-white font-semibold">Aviso Publicado</Badge>;
      case "SOLICITUD":
        return <Badge className="bg-slate-600 text-white font-semibold">Solicitud Inicial</Badge>;
      default:
        return <Badge variant="outline">{stage}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por No. Expediente, parcela, agrimensor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={regionalFilter} onValueChange={setRegionalFilter}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="Dirección Regional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS" className="text-xs">Todas las Regionales</SelectItem>
              <SelectItem value="REGIONAL_CENTRAL" className="text-xs">Regional Central</SelectItem>
              <SelectItem value="REGIONAL_NORTE" className="text-xs">Regional Norte</SelectItem>
              <SelectItem value="REGIONAL_ESTE" className="text-xs">Regional Este</SelectItem>
              <SelectItem value="REGIONAL_NORESTE" className="text-xs">Regional Noreste</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="Etapa Oficial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS" className="text-xs">Todas las Etapas</SelectItem>
              <SelectItem value="SOLICITUD" className="text-xs">Solicitud Inicial</SelectItem>
              <SelectItem value="AVISO_PERIODICO" className="text-xs">Aviso en Periódico</SelectItem>
              <SelectItem value="TRABAJOS_CAMPO" className="text-xs">Trabajos de Campo</SelectItem>
              <SelectItem value="SOMETIDO_DNMC" className="text-xs">Sometido DNMC</SelectItem>
              <SelectItem value="OBSERVACIONES" className="text-xs">Observaciones</SelectItem>
              <SelectItem value="APROBADO" className="text-xs">Aprobado</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={() => openCadastralCreateModal()}
            className="h-9 text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Radicar Expediente
          </Button>
        </div>
      </div>

      {/* Lista de Expedientes con Semáforo y Pasos */}
      <div className="space-y-4">
        {filteredFiles.map((file) => {
          const parcel = parcels.find((p) => p.id === file.parcelId);
          const currentStageIndex = STAGES_ORDER.findIndex((s) => s.stage === file.stage);

          return (
            <div
              key={file.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs hover:border-slate-300 transition-colors"
            >
              {/* Fila Principal */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {file.fileNumber}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {file.operationType}
                    </Badge>
                    {getStageBadge(file.stage)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                    <span
                      className="font-medium text-slate-900 hover:underline cursor-pointer"
                      onClick={() => parcel && openParcelDetailModal(parcel)}
                    >
                      {file.parcelDesignation}
                    </span>
                    <span>•</span>
                    <span>{getRegionalLabel(file.regional)}</span>
                    <span>•</span>
                    <span>{file.clientName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Selector rápido para avanzar etapa */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        Cambiar Etapa
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="text-xs">Avanzar Expediente</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {STAGES_ORDER.map((item) => (
                        <DropdownMenuItem
                          key={item.stage}
                          onClick={() => advanceCadastralStage(file.id, item.stage)}
                          className={`text-xs cursor-pointer ${
                            file.stage === item.stage ? "font-bold bg-slate-100" : ""
                          }`}
                        >
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {parcel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openParcelDetailModal(parcel)}
                      className="text-xs h-8 text-slate-600 hover:text-slate-900"
                    >
                      Ver Parcela
                    </Button>
                  )}
                </div>
              </div>

              {/* Semáforo / Barra de Progreso Oficial de 6 Etapas */}
              <div className="pt-4 pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {STAGES_ORDER.map((step, idx) => {
                    const isPassed = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    let bgClass = "bg-slate-100 text-slate-400 border-slate-200";
                    if (isPassed) {
                      bgClass = "bg-slate-900 text-white border-slate-900";
                    } else if (isCurrent) {
                      if (step.stage === "OBSERVACIONES") {
                        bgClass = "bg-amber-600 text-white border-amber-600";
                      } else if (step.stage === "APROBADO") {
                        bgClass = "bg-emerald-600 text-white border-emerald-600";
                      } else {
                        bgClass = "bg-slate-800 text-white border-slate-800 ring-2 ring-slate-400";
                      }
                    }

                    return (
                      <div
                        key={step.stage}
                        className={`p-2 rounded border text-center transition-all ${bgClass}`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider truncate">
                          {step.label}
                        </div>
                        <div className="text-[9px] mt-0.5 opacity-90 truncate">
                          {isPassed ? "Completado" : isCurrent ? "En Proceso" : "Pendiente"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Alerta de Oficio de Observación (30 Días para Subsanar) */}
              {file.observationNotice && (
                <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">
                          {file.observationNotice.officialNoticeNumber}
                        </span>{" "}
                        <span className="text-[11px] text-amber-800">
                          (Emitido: {file.observationNotice.issueDate} • Plazo legal:{" "}
                          {file.observationNotice.deadlineDays} días hábiles)
                        </span>
                      </div>
                    </div>

                    {!file.observationNotice.isResolved ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          resolveObservation(file.id, new Date().toISOString().split("T")[0])
                        }
                        className="text-xs h-7 bg-amber-700 hover:bg-amber-800 text-white shrink-0"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Marcar Subsanado
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Subsanado ({file.observationNotice.resolutionDate})
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-amber-900 bg-white/70 p-2 rounded border border-amber-100">
                    {file.observationNotice.reason}
                  </p>
                </div>
              )}

              {/* Metadatos adicionales: Agrimensor CODIA, Periódico, Plazo de objeciones */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>
                    Agrimensor: <strong className="text-slate-700">{file.surveyorName}</strong> ({file.surveyorCodia})
                  </span>
                  {file.newspaperNoticeDate && (
                    <span>
                      Aviso en prensa: <strong className="text-slate-700">{file.newspaperName}</strong> ({file.newspaperNoticeDate})
                    </span>
                  )}
                  {file.objectionDeadline && (
                    <span>
                      Plazo Objeciones: <strong className="text-slate-700">{file.objectionDeadline}</strong>
                    </span>
                  )}
                </div>
                <div>
                  {file.approvalDate && (
                    <span className="text-emerald-700 font-semibold">
                      Aprobación Definitiva: {file.approvalDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredFiles.length === 0 && (
          <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500">
            <FileCheck2 className="h-8 w-8 mx-auto text-slate-300 mb-2 stroke-1" />
            <p className="font-medium text-slate-700">No se encontraron expedientes</p>
            <p className="text-xs text-slate-500 mt-1">
              No hay trámites que coincidan con los criterios de búsqueda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
