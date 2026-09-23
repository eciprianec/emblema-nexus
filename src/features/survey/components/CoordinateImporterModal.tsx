"use client";

import React, { useState, useMemo } from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import { CoordinatePoint, VertexCode } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Compass,
  FileCheck,
  RefreshCw,
} from "lucide-react";

const SAMPLE_CSV = `P1,2054210.120,541150.250,24.50,HITO_CONCRETO,Mojon NO
P2,2054320.150,541420.780,26.10,VARILLA,Varilla NE
P3,2054110.850,541510.430,22.80,HITO_CONCRETO,Mojon SE
P4,2053980.200,541340.600,20.90,ESQ_MURO,Esquina muro SO
P5,2054040.500,541180.100,21.60,HITO_CONCRETO,Mojon O`;

export function CoordinateImporterModal() {
  const {
    isCoordinateImporterOpen,
    closeCoordinateImporterModal,
    targetParcelIdForImport,
    parcels,
    importCoordinatesToParcel,
  } = useSurveyStore();

  const [selectedParcelId, setSelectedParcelId] = useState<string>(
    targetParcelIdForImport || (parcels[0]?.id || "")
  );

  const [rawText, setRawText] = useState(SAMPLE_CSV);
  const [formatOrder, setFormatOrder] = useState<"PNEZD" | "PENZD">("PNEZD");

  // Mantener actualizado si cambia el targetParcelIdForImport al abrir
  React.useEffect(() => {
    if (targetParcelIdForImport) {
      setSelectedParcelId(targetParcelIdForImport);
    } else if (parcels.length > 0 && !selectedParcelId) {
      setSelectedParcelId(parcels[0].id);
    }
  }, [targetParcelIdForImport, parcels, selectedParcelId]);

  // Manejo de archivo subido
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file);
  };

  // Parser interactivo
  const parsedResult = useMemo(() => {
    if (!rawText.trim()) {
      return { points: [], errors: [] };
    }

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const points: CoordinatePoint[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      // Ignorar encabezados si la línea contiene letras no numéricas en campos 2 o 3
      if (
        index === 0 &&
        (line.toLowerCase().includes("norte") ||
          line.toLowerCase().includes("este") ||
          line.toLowerCase().includes("point") ||
          line.toLowerCase().includes("x") ||
          line.toLowerCase().includes("y"))
      ) {
        return;
      }

      // Separadores: coma, punto y coma, tabulación, espacio
      const tokens = line.split(/[,;\t\s]+/).map((t) => t.trim()).filter(Boolean);

      if (tokens.length < 3) {
        errors.push(`Línea ${index + 1}: Datos insuficientes (${tokens.length} columnas).`);
        return;
      }

      const pNum = tokens[0] || `P${points.length + 1}`;
      let northing = 0;
      let easting = 0;
      let elevation = 0;
      let code: VertexCode = "HITO_CONCRETO";
      let desc = "";

      if (formatOrder === "PNEZD") {
        northing = parseFloat(tokens[1]);
        easting = parseFloat(tokens[2]);
        elevation = tokens[3] ? parseFloat(tokens[3]) : 0;
        code = (tokens[4]?.toUpperCase() as VertexCode) || "HITO_CONCRETO";
        desc = tokens.slice(5).join(" ") || "";
      } else {
        // PENZD
        easting = parseFloat(tokens[1]);
        northing = parseFloat(tokens[2]);
        elevation = tokens[3] ? parseFloat(tokens[3]) : 0;
        code = (tokens[4]?.toUpperCase() as VertexCode) || "HITO_CONCRETO";
        desc = tokens.slice(5).join(" ") || "";
      }

      if (isNaN(northing) || isNaN(easting)) {
        errors.push(`Línea ${index + 1}: Coordenadas inválidas.`);
        return;
      }

      // Validar rango UTM 19N dominicano orientativo
      const isValidDominicanUTM =
        northing >= 1800000 && northing <= 2300000 && easting >= 180000 && easting <= 650000;

      if (!isValidDominicanUTM) {
        errors.push(
          `Línea ${index + 1} (${pNum}): Coordenadas fuera del rango UTM 19N para Rep. Dominicana (N:${northing}, E:${easting}). Verifique el orden (N,E vs E,N).`
        );
      }

      points.push({
        id: `imp-${Date.now()}-${index}`,
        pointNumber: pNum,
        northing,
        easting,
        elevation: isNaN(elevation) ? 0 : elevation,
        code,
        description: desc,
      });
    });

    return { points, errors };
  }, [rawText, formatOrder]);

  const handleApply = () => {
    if (!selectedParcelId || parsedResult.points.length < 3) return;
    importCoordinatesToParcel(selectedParcelId, parsedResult.points);
  };

  const selectedParcel = parcels.find((p) => p.id === selectedParcelId);

  return (
    <Dialog
      open={isCoordinateImporterOpen}
      onOpenChange={(open) => !open && closeCoordinateImporterModal()}
    >
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-md bg-slate-100 text-slate-800">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Importador de Coordenadas Topográficas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Carga masiva de datos desde Estación Total o receptor GNSS (Formato CSV, TXT, ASCII).
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Selector de Parcela y Formato de Entrada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Parcela Destino a Actualizar *
              </Label>
              <Select value={selectedParcelId} onValueChange={setSelectedParcelId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccione una parcela" />
                </SelectTrigger>
                <SelectContent>
                  {parcels.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.designation} (D.C. {p.cadastralDistrict} - {p.province})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Estructura de Columnas
              </Label>
              <Select
                value={formatOrder}
                onValueChange={(v) => setFormatOrder(v as "PNEZD" | "PENZD")}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNEZD" className="text-xs">
                    Punto, Norte (Y), Este (X), Cota (Z), Código [P, N, E, Z, D]
                  </SelectItem>
                  <SelectItem value="PENZD" className="text-xs">
                    Punto, Este (X), Norte (Y), Cota (Z), Código [P, E, N, Z, D]
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subir archivo o Pegar texto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rawText" className="text-xs font-semibold text-slate-700">
                Texto de Coordenadas (o arrastre su archivo .csv / .txt)
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRawText(SAMPLE_CSV)}
                  className="text-xs h-7 text-slate-600 hover:text-slate-900"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Cargar Ejemplo
                </Button>
                <label className="cursor-pointer text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Examinar Archivo...
                  <input
                    type="file"
                    accept=".csv,.txt,.dat"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
            <Textarea
              id="rawText"
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="P1,2054210.12,541150.25,24.50,HITO_CONCRETO&#10;P2,2054320.15,541420.78,26.10,VARILLA"
              className="font-mono text-xs"
            />
          </div>

          {/* Advertencias o Errores de Validación */}
          {parsedResult.errors.length > 0 && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                Advertencias de Formato Topográfico ({parsedResult.errors.length})
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {parsedResult.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parsedResult.errors.length > 3 && (
                  <li>... y {parsedResult.errors.length - 3} advertencias adicionales.</li>
                )}
              </ul>
            </div>
          )}

          {/* Vista previa en tabla de puntos procesados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5" />
                Vista Previa de Vértices Reconocidos ({parsedResult.points.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                {parsedResult.points.length >= 3 ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Polígono cerrado válido
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">
                    Mínimo 3 vértices requeridos
                  </span>
                )}
              </span>
            </div>

            <div className="border border-slate-200 rounded-md max-h-48 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Vértice</th>
                    <th className="py-2 px-3">Norte (Y)</th>
                    <th className="py-2 px-3">Este (X)</th>
                    <th className="py-2 px-3">Cota Z</th>
                    <th className="py-2 px-3">Código</th>
                    <th className="py-2 px-3">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {parsedResult.points.map((pt) => (
                    <tr key={pt.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 font-bold text-slate-900">{pt.pointNumber}</td>
                      <td className="py-1.5 px-3 text-slate-700">{pt.northing.toFixed(3)}</td>
                      <td className="py-1.5 px-3 text-slate-700">{pt.easting.toFixed(3)}</td>
                      <td className="py-1.5 px-3 text-slate-700">{pt.elevation.toFixed(2)}</td>
                      <td className="py-1.5 px-3 font-sans text-[10px] text-slate-600">
                        {pt.code}
                      </td>
                      <td className="py-1.5 px-3 font-sans text-slate-500 truncate max-w-[150px]">
                        {pt.description || "—"}
                      </td>
                    </tr>
                  ))}
                  {parsedResult.points.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500 font-sans">
                        No hay puntos válidos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={closeCoordinateImporterModal}
            className="text-xs h-8 border-slate-300"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={parsedResult.points.length < 3 || !selectedParcelId}
            onClick={handleApply}
            className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
          >
            <FileCheck className="h-3.5 w-3.5 mr-1.5" />
            Asignar Coordenadas a {selectedParcel?.designation || "Parcela"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
