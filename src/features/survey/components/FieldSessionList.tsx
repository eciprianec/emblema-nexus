"use client";

import React, { useState } from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import { FieldSession } from "../types";
import {
  Compass,
  Calendar,
  Users2,
  Cpu,
  FileSignature,
  CheckCircle2,
  Clock,
  Plus,
  CloudSun,
  ShieldCheck,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function FieldSessionList() {
  const {
    fieldSessions,
    equipmentList,
    openFieldSessionCreateModal,
    openParcelDetailModal,
    parcels,
  } = useSurveyStore();

  const getStatusBadge = (status: FieldSession["status"]) => {
    switch (status) {
      case "COMPLETADA":
        return <Badge className="bg-emerald-600 text-white text-[10px]">Completada</Badge>;
      case "EN_CURSO":
        return <Badge className="bg-blue-600 text-white text-[10px]">En Curso</Badge>;
      case "PROGRAMADA":
        return <Badge className="bg-slate-900 text-white text-[10px]">Programada</Badge>;
      case "REPROGRAMADA":
        return <Badge className="bg-amber-600 text-white text-[10px]">Reprogramada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Estado de Equipos Topográficos */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-slate-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Flota de Equipos Topográficos y Calibración
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {equipmentList.filter((e) => e.status === "OPERATIVO").length} de {equipmentList.length} operativos
          </span>
        </div>

        {equipmentList.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded border border-dashed border-slate-200">
            No hay equipos topográficos registrados en el inventario.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {equipmentList.map((eq) => (
              <div
                key={eq.id}
                className="p-2.5 rounded border border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 transition-colors text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate" title={eq.name}>
                    {eq.name}
                  </span>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  S/N: {eq.serialNumber}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Calibración: {eq.calibrationExpiry}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Jornadas de Campo */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Jornadas de Medición y Actas de Linderos
            </h3>
            <p className="text-xs text-slate-500">
              Planificación de brigadas, asignación de instrumental y constancias con testigos colindantes.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => openFieldSessionCreateModal()}
            className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Programar Jornada
          </Button>
        </div>

        <div className="space-y-4">
          {fieldSessions.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500">
              <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="font-medium text-slate-700">No hay jornadas de campo programadas</p>
              <p className="text-xs text-slate-500 mt-1">
                Programe una nueva jornada de medición para asignar brigadas y registrar actas de linderos.
              </p>
            </div>
          ) : (
            fieldSessions.map((session) => {
            const parcel = parcels.find((p) => p.id === session.parcelId);

            return (
              <div
                key={session.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
              >
                {/* Cabecera de la jornada */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                      {session.code}
                    </span>
                    <span
                      className="font-bold text-sm text-slate-900 hover:text-blue-900 cursor-pointer"
                      onClick={() => parcel && openParcelDetailModal(parcel)}
                    >
                      {session.parcelDesignation}
                    </span>
                    {getStatusBadge(session.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {session.sessionDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <CloudSun className="h-3.5 w-3.5 text-slate-400" />
                      {session.weather}
                    </span>
                  </div>
                </div>

                {/* Brigada y Equipos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Brigada */}
                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-2">
                      <Users2 className="h-3.5 w-3.5" />
                      Brigada Topográfica ({session.brigade.length} integrantes)
                    </div>
                    <ul className="space-y-1">
                      {session.brigade.map((m) => (
                        <li key={m.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-800 font-medium">{m.name}</span>
                          <span className="text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                            {m.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Equipos */}
                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-2">
                      <Cpu className="h-3.5 w-3.5" />
                      Instrumental Topográfico ({session.equipment.length} equipos)
                    </div>
                    <ul className="space-y-1">
                      {session.equipment.map((eq) => (
                        <li key={eq.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-800 font-medium">{eq.name}</span>
                          <span className="font-mono text-slate-500 text-[10px]">
                            S/N: {eq.serialNumber}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Acta de Linderos con Testigos Colindantes */}
                <div className="p-3.5 bg-slate-900 text-white rounded-md space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-slate-300" />
                      <span className="text-xs font-bold tracking-wide">
                        Acta de Linderos: {session.actaLinderos.actNumber}
                      </span>
                    </div>
                    {session.actaLinderos.isSigned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> Firmada por Colindantes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                        <Clock className="h-3 w-3" /> Pendiente de Firmas
                      </span>
                    )}
                  </div>

                  {/* Testigos */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Testigos y Propietarios Colindantes Notificados:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {session.actaLinderos.witnesses.map((wit) => (
                        <div
                          key={wit.id}
                          className="bg-slate-800/80 p-2 rounded border border-slate-700 text-[11px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-100">{wit.name}</span>
                            <span className="text-[9px] font-mono text-emerald-400">
                              {wit.status === "PRESENTE_CONFORME" ? "Conforme" : wit.status}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Cédula: {wit.idCard} • {wit.boundaryRelation}
                          </div>
                          {wit.comments && (
                            <p className="text-[10px] text-slate-300 italic mt-1">
                              &ldquo;{wit.comments}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {session.actaLinderos.observations && (
                    <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                      {session.actaLinderos.observations}
                    </div>
                  )}
                </div>
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
}
