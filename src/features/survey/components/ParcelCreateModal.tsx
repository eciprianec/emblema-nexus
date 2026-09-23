"use client";

import React, { useState } from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import { DOMINICAN_TAREA_SQM, sqmToTareas, tareasToSqm, CoordinatePoint } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, MapPin, User, Check, Layers } from "lucide-react";

export function ParcelCreateModal() {
  const { isParcelCreateOpen, closeParcelCreateModal, createParcel } = useSurveyStore();

  const [designation, setDesignation] = useState("");
  const [cadastralDistrict, setCadastralDistrict] = useState("01");
  const [portion, setPortion] = useState("");
  const [solar, setSolar] = useState("");
  const [block, setBlock] = useState("");
  const [province, setProvince] = useState("Santo Domingo");
  const [municipality, setMunicipality] = useState("Santo Domingo Este");
  const [sector, setSector] = useState("");
  const [areaSqm, setAreaSqm] = useState<number | "">(1000);
  const [areaTareas, setAreaTareas] = useState<number | "">(sqmToTareas(1000));
  const [northBoundary, setNorthBoundary] = useState("");
  const [southBoundary, setSouthBoundary] = useState("");
  const [eastBoundary, setEastBoundary] = useState("");
  const [westBoundary, setWestBoundary] = useState("");
  const [clientName, setClientName] = useState("");
  const [surveyorName, setSurveyorName] = useState("Lic. Rafael Mejía");
  const [surveyorCodia, setSurveyorCodia] = useState("CODIA #14592");
  const [caseId, setCaseId] = useState("");

  const handleSqmChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setAreaSqm(num);
      setAreaTareas(sqmToTareas(num));
    } else {
      setAreaSqm("");
      setAreaTareas("");
    }
  };

  const handleTareasChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setAreaTareas(num);
      setAreaSqm(tareasToSqm(num));
    } else {
      setAreaTareas("");
      setAreaSqm("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation.trim()) return;

    const finalAreaSqm = typeof areaSqm === "number" ? areaSqm : 1000;
    const finalAreaTareas = typeof areaTareas === "number" ? areaTareas : sqmToTareas(finalAreaSqm);

    // Generar 4 vértices iniciales UTM 19N orientativos si no se importan de inmediato
    const sideMeters = Math.sqrt(finalAreaSqm);
    const baseE = 405000;
    const baseN = 2042000;

    const initialVertices: CoordinatePoint[] = [
      {
        id: `v-init-1-${Date.now()}`,
        pointNumber: "P1",
        easting: baseE,
        northing: baseN + sideMeters,
        elevation: 35.0,
        code: "HITO_CONCRETO",
        description: "Vértice Noroeste",
      },
      {
        id: `v-init-2-${Date.now()}`,
        pointNumber: "P2",
        easting: baseE + sideMeters,
        northing: baseN + sideMeters,
        elevation: 35.2,
        code: "VARILLA",
        description: "Vértice Noreste",
      },
      {
        id: `v-init-3-${Date.now()}`,
        pointNumber: "P3",
        easting: baseE + sideMeters,
        northing: baseN,
        elevation: 34.8,
        code: "HITO_CONCRETO",
        description: "Vértice Sureste",
      },
      {
        id: `v-init-4-${Date.now()}`,
        pointNumber: "P4",
        easting: baseE,
        northing: baseN,
        elevation: 34.5,
        code: "CLAVO",
        description: "Vértice Suroeste",
      },
    ];

    createParcel({
      designation: designation.trim(),
      cadastralDistrict: cadastralDistrict.trim(),
      portion: portion.trim() || undefined,
      solar: solar.trim() || undefined,
      block: block.trim() || undefined,
      province,
      municipality,
      sector: sector.trim() || undefined,
      areaSqm: finalAreaSqm,
      areaTareas: finalAreaTareas,
      boundaries: {
        north: northBoundary || "Propiedad privada colindante",
        south: southBoundary || "Calle / Vía pública de acceso",
        east: eastBoundary || "Propiedad privada colindante",
        west: westBoundary || "Propiedad privada colindante",
      },
      vertices: initialVertices,
      status: "REGISTRADA",
      legalStatus: "Levantamiento catastral preliminar registrado",
      clientName: clientName || "Cliente Corporativo",
      surveyorName,
      surveyorCodia,
      caseId: caseId.trim() || undefined,
    });
  };

  return (
    <Dialog open={isParcelCreateOpen} onOpenChange={(open) => !open && closeParcelCreateModal()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-md bg-slate-100 text-slate-800">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Registrar Nueva Parcela Catastral
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Ingreso de designación catastral, ubicación geográfica, cálculo métrico/tareas y colindancias.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Sección 1: Identificación y Ubicación */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Designación y Ubicación Geográfica
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="designation" className="text-xs font-semibold text-slate-700">
                    Designación Catastral *
                  </Label>
                  <Input
                    id="designation"
                    placeholder="ej. Parcela 15-Ref, Solar 12 Mza 4"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cadastralDistrict" className="text-xs font-semibold text-slate-700">
                    Distrito Catastral (D.C.) *
                  </Label>
                  <Input
                    id="cadastralDistrict"
                    placeholder="ej. 03"
                    value={cadastralDistrict}
                    onChange={(e) => setCadastralDistrict(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="portion" className="text-xs text-slate-600">Porción</Label>
                  <Input
                    id="portion"
                    placeholder="ej. A"
                    value={portion}
                    onChange={(e) => setPortion(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="block" className="text-xs text-slate-600">Manzana</Label>
                  <Input
                    id="block"
                    placeholder="ej. 405"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="solar" className="text-xs text-slate-600">Solar</Label>
                  <Input
                    id="solar"
                    placeholder="ej. 12"
                    value={solar}
                    onChange={(e) => setSolar(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="province" className="text-xs text-slate-600">Provincia</Label>
                  <Input
                    id="province"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="municipality" className="text-xs text-slate-600">Municipio</Label>
                  <Input
                    id="municipality"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sector" className="text-xs text-slate-600">Sector / Paraje</Label>
                  <Input
                    id="sector"
                    placeholder="ej. Verón, Gurabo"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Cálculo Interactivo de Superficie */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5 text-slate-600" />
                  Cálculo de Superficie (Metros Cuadrados y Tareas Dominicanas)
                </h4>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  1 Tarea = {DOMINICAN_TAREA_SQM} m²
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="areaSqm" className="text-xs font-semibold text-slate-700">
                    Superficie en Metros Cuadrados (m²) *
                  </Label>
                  <div className="relative">
                    <Input
                      id="areaSqm"
                      type="number"
                      step="any"
                      min="0"
                      value={areaSqm}
                      onChange={(e) => handleSqmChange(e.target.value)}
                      required
                      className="h-9 text-xs pr-10 font-mono font-bold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                      m²
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="areaTareas" className="text-xs font-semibold text-slate-700">
                    Equivalente en Tareas Dominicanas
                  </Label>
                  <div className="relative">
                    <Input
                      id="areaTareas"
                      type="number"
                      step="any"
                      min="0"
                      value={areaTareas}
                      onChange={(e) => handleTareasChange(e.target.value)}
                      className="h-9 text-xs pr-14 font-mono font-bold text-slate-800"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                      tareas
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Colindancias Registrales */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Colindancias Registrales / Linderos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="northBoundary" className="text-xs text-slate-700">Colindancia Norte</Label>
                  <Input
                    id="northBoundary"
                    placeholder="ej. Parcela 14 D.C. 03 (Propiedad de...)"
                    value={northBoundary}
                    onChange={(e) => setNorthBoundary(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="southBoundary" className="text-xs text-slate-700">Colindancia Sur</Label>
                  <Input
                    id="southBoundary"
                    placeholder="ej. Calle Los Palmeros / Servidumbre"
                    value={southBoundary}
                    onChange={(e) => setSouthBoundary(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eastBoundary" className="text-xs text-slate-700">Colindancia Este</Label>
                  <Input
                    id="eastBoundary"
                    placeholder="ej. Bulevar Turístico / Solar 14"
                    value={eastBoundary}
                    onChange={(e) => setEastBoundary(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="westBoundary" className="text-xs text-slate-700">Colindancia Oeste</Label>
                  <Input
                    id="westBoundary"
                    placeholder="ej. Parcela 15-Resto / Calle 4ta"
                    value={westBoundary}
                    onChange={(e) => setWestBoundary(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Sección 4: Cliente, Agrimensor y Vinculación */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Profesional Responsable y Titular
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="clientName" className="text-xs text-slate-700">Cliente / Propietario</Label>
                  <Input
                    id="clientName"
                    placeholder="Nombre o Razón Social"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="surveyorName" className="text-xs text-slate-700">Agrimensor CODIA</Label>
                  <Input
                    id="surveyorName"
                    value={surveyorName}
                    onChange={(e) => setSurveyorName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="caseId" className="text-xs text-slate-700">Caso Legal Vinculado</Label>
                  <Input
                    id="caseId"
                    placeholder="ej. LEG-2024-0001"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeParcelCreateModal}
              className="text-xs h-8 border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
            >
              Registrar Parcela
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
