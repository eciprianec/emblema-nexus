"use client";

import React, { useState, useMemo } from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import { Parcel } from "../types";
import {
  MapPin,
  Search,
  Filter,
  Eye,
  Upload,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Plus,
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

export function ParcelList() {
  const {
    parcels,
    openParcelDetailModal,
    openParcelCreateModal,
    openCoordinateImporterModal,
    openCadastralCreateModal,
    cadastralFiles,
  } = useSurveyStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const provinces = useMemo(() => {
    const set = new Set(parcels.map((p) => p.province));
    return Array.from(set);
  }, [parcels]);

  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      const matchSearch =
        searchTerm === "" ||
        p.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cadastralDistrict.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchProvince = provinceFilter === "TODAS" || p.province === provinceFilter;
      const matchStatus = statusFilter === "TODOS" || p.status === statusFilter;

      return matchSearch && matchProvince && matchStatus;
    });
  }, [parcels, searchTerm, provinceFilter, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APROBADA_DNMC":
        return <Badge className="bg-slate-900 text-white text-[10px]">Aprobada DNMC</Badge>;
      case "OBSERVADA":
        return <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">Con Observación</Badge>;
      case "EN_MENSURA":
        return <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px]">En Mensura</Badge>;
      case "TITULADA":
        return <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 text-[10px]">Titulada</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por designación, D.C., municipio, titular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="Provincia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS" className="text-xs">Todas las Provincias</SelectItem>
              {provinces.map((prov) => (
                <SelectItem key={prov} value={prov} className="text-xs">{prov}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">Todos los Estados</SelectItem>
              <SelectItem value="REGISTRADA" className="text-xs">Registrada</SelectItem>
              <SelectItem value="EN_MENSURA" className="text-xs">En Mensura</SelectItem>
              <SelectItem value="OBSERVADA" className="text-xs">Con Observación</SelectItem>
              <SelectItem value="APROBADA_DNMC" className="text-xs">Aprobada DNMC</SelectItem>
              <SelectItem value="TITULADA" className="text-xs">Titulada</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={openParcelCreateModal}
            className="h-9 text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nueva Parcela
          </Button>
        </div>
      </div>

      {/* Tabla de Parcelas */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Designación / D.C.</th>
                <th className="py-3 px-4">Ubicación y Jurisdicción</th>
                <th className="py-3 px-4">Superficie (m² / Tareas)</th>
                <th className="py-3 px-4">Vértices</th>
                <th className="py-3 px-4">Estado Catastral</th>
                <th className="py-3 px-4">Expediente DNMC</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredParcels.map((parcel) => {
                const linkedFile = cadastralFiles.find(
                  (c) => c.parcelId === parcel.id || c.id === parcel.cadastralFileId
                );

                return (
                  <tr
                    key={parcel.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => openParcelDetailModal(parcel)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-blue-900 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        {parcel.designation}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        D.C. {parcel.cadastralDistrict}
                        {parcel.solar ? ` • Solar ${parcel.solar}` : ""}
                        {parcel.block ? ` • Mza ${parcel.block}` : ""}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {parcel.municipality}, {parcel.province}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {parcel.sector || "Área Urbana / Rural"}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">
                        {parcel.areaSqm.toLocaleString("es-DO")} m²
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        {parcel.areaTareas.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        tareas dom.
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                        {parcel.vertices.length} pts
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(parcel.status)}
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[140px]" title={parcel.legalStatus}>
                        {parcel.legalStatus}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {linkedFile ? (
                        <div>
                          <span className="font-mono font-bold text-slate-900 block text-[11px]">
                            {linkedFile.fileNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase">
                            {linkedFile.stage}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Sin radicar
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openParcelDetailModal(parcel)}
                          className="h-7 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Plano
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCoordinateImporterModal(parcel.id)}
                          className="h-7 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2"
                          title="Importar Coordenadas"
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredParcels.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <Layers className="h-8 w-8 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="font-medium text-slate-700">No se encontraron parcelas</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ajuste los filtros o registre una nueva parcela en el sistema.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
