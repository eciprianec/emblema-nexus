"use client";

import React, { useState } from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import { ParcelMapViewer } from "./ParcelMapViewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Compass,
  FileCheck2,
  Calendar,
  Layers,
  Copy,
  Check,
  Upload,
  User,
  ShieldAlert,
} from "lucide-react";

export function ParcelDetailModal() {
  const {
    isParcelDetailOpen,
    closeParcelDetailModal,
    selectedParcel,
    cadastralFiles,
    openCoordinateImporterModal,
    openCadastralCreateModal,
    openFieldSessionCreateModal,
  } = useSurveyStore();

  const [copied, setCopied] = useState(false);

  if (!selectedParcel) return null;

  const linkedCadastralFile = cadastralFiles.find(
    (c) => c.parcelId === selectedParcel.id || c.id === selectedParcel.cadastralFileId
  );

  const handleCopyCoordinates = () => {
    const header = "Punto\tNorte(Y)\tEste(X)\tElevacion(Z)\tCodigo\tDescripcion\n";
    const rows = selectedParcel.vertices
      .map(
        (v) =>
          `${v.pointNumber}\t${v.northing.toFixed(3)}\t${v.easting.toFixed(3)}\t${v.elevation.toFixed(2)}\t${v.code}\t${v.description || ""}`
      )
      .join("\n");
    navigator.clipboard.writeText(header + rows);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APROBADA_DNMC":
        return <Badge className="bg-slate-900 text-white">Aprobada DNMC</Badge>;
      case "OBSERVADA":
        return <Badge className="bg-amber-100 text-amber-900 border-amber-300">Con Observación</Badge>;
      case "EN_MENSURA":
        return <Badge className="bg-blue-100 text-blue-900 border-blue-200">En Mensura</Badge>;
      case "TITULADA":
        return <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200">Titulada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isParcelDetailOpen} onOpenChange={(open) => !open && closeParcelDetailModal()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white">
        {/* Header técnico */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Ficha Técnica Catastral
                </span>
                {getStatusBadge(selectedParcel.status)}
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900 mt-1">
                {selectedParcel.designation}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-0.5">
                D.C. {selectedParcel.cadastralDistrict} • {selectedParcel.municipality}, {selectedParcel.province}
                {selectedParcel.sector ? ` (${selectedParcel.sector})` : ""}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 border-slate-300"
                onClick={() => {
                  closeParcelDetailModal();
                  openCoordinateImporterModal(selectedParcel.id);
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-1 text-slate-600" />
                Actualizar Coordenadas
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => {
                  closeParcelDetailModal();
                  openFieldSessionCreateModal();
                }}
              >
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Programar Jornada
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido en Tabs */}
        <div className="p-6">
          <Tabs defaultValue="plano" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6 max-w-md bg-slate-100">
              <TabsTrigger value="plano" className="text-xs">
                Plano y Geometría
              </TabsTrigger>
              <TabsTrigger value="vertices" className="text-xs">
                Vértices UTM ({selectedParcel.vertices.length})
              </TabsTrigger>
              <TabsTrigger value="legal" className="text-xs">
                Colindancias y Legal
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Visor de Plano y Datos Clave */}
            <TabsContent value="plano" className="space-y-6">
              <ParcelMapViewer
                vertices={selectedParcel.vertices}
                parcelDesignation={selectedParcel.designation}
                areaSqm={selectedParcel.areaSqm}
                areaTareas={selectedParcel.areaTareas}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Superficie Métrica</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedParcel.areaSqm.toLocaleString("es-DO")} m²
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Superficie Tradicional</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedParcel.areaTareas.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    tareas
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Agrimensor Designado</span>
                  <span className="font-semibold text-slate-800 block truncate">
                    {selectedParcel.surveyorName}
                  </span>
                  <span className="text-[10px] text-slate-500">{selectedParcel.surveyorCodia}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Cliente / Propietario</span>
                  <span className="font-semibold text-slate-800 block truncate">
                    {selectedParcel.clientName}
                  </span>
                  {selectedParcel.caseId && (
                    <span className="text-[10px] text-blue-600 block">Caso {selectedParcel.caseId}</span>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Vértices Topográficos UTM 19N */}
            <TabsContent value="vertices" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Cuadro de Construcción y Coordenadas Proyectadas
                  </h4>
                  <p className="text-xs text-slate-500">
                    Sistema UTM Zona 19 Norte • Datum WGS84 • Unidades en metros
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCoordinates}
                  className="text-xs h-8 border-slate-300"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      Copiado al Portapapeles
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1 text-slate-600" />
                      Copiar Tabla
                    </>
                  )}
                </Button>
              </div>

              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Vértice</th>
                      <th className="py-2.5 px-3">Coordenada Norte (m)</th>
                      <th className="py-2.5 px-3">Coordenada Este (m)</th>
                      <th className="py-2.5 px-3">Cota Z (msnm)</th>
                      <th className="py-2.5 px-3">Materialización</th>
                      <th className="py-2.5 px-3">Descripción de Campo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {selectedParcel.vertices.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900">{v.pointNumber}</td>
                        <td className="py-2 px-3 text-slate-700">{v.northing.toFixed(3)}</td>
                        <td className="py-2 px-3 text-slate-700">{v.easting.toFixed(3)}</td>
                        <td className="py-2 px-3 text-slate-700">{v.elevation.toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <span className="font-sans text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {v.code}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                          {v.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 3: Colindancias y Estado Legal */}
            <TabsContent value="legal" className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  Colindancias Oficiales
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <span className="font-bold text-slate-700 block mb-1">Al Norte:</span>
                    <p className="text-slate-600">{selectedParcel.boundaries.north}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <span className="font-bold text-slate-700 block mb-1">Al Sur:</span>
                    <p className="text-slate-600">{selectedParcel.boundaries.south}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <span className="font-bold text-slate-700 block mb-1">Al Este:</span>
                    <p className="text-slate-600">{selectedParcel.boundaries.east}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <span className="font-bold text-slate-700 block mb-1">Al Oeste:</span>
                    <p className="text-slate-600">{selectedParcel.boundaries.west}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  Estado Registral y Expediente DNMC
                </h4>
                {linkedCadastralFile ? (
                  <div className="p-4 rounded-md border border-slate-200 bg-slate-50 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 text-slate-700" />
                        <span className="font-bold text-slate-900 text-sm">
                          {linkedCadastralFile.fileNumber}
                        </span>
                        <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded font-semibold">
                          {linkedCadastralFile.operationType}
                        </span>
                      </div>
                      <Badge className="bg-slate-900 text-white">
                        {linkedCadastralFile.stage}
                      </Badge>
                    </div>
                    <div className="text-slate-600">
                      Regional: <strong>{linkedCadastralFile.regional}</strong> • Fecha Radicación:{" "}
                      <strong>{linkedCadastralFile.startDate}</strong>
                    </div>
                    {linkedCadastralFile.observationNotice && (
                      <div className="mt-2 p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900">
                        <div className="flex items-center gap-1.5 font-bold">
                          <ShieldAlert className="h-4 w-4 text-amber-700" />
                          {linkedCadastralFile.observationNotice.officialNoticeNumber}
                        </div>
                        <p className="mt-1 text-[11px]">
                          {linkedCadastralFile.observationNotice.reason}
                        </p>
                        <p className="mt-1 font-semibold text-[10px]">
                          Plazo de subsanación vence: {linkedCadastralFile.observationNotice.deadlineDate}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-md border border-dashed border-slate-300 text-center">
                    <p className="text-xs text-slate-500 mb-2">
                      Esta parcela aún no cuenta con un expediente de mensura radicado ante la DNMC.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-slate-300"
                      onClick={() => {
                        closeParcelDetailModal();
                        openCadastralCreateModal(selectedParcel.id);
                      }}
                    >
                      <FileCheck2 className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
                      Radicar Expediente DNMC
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
