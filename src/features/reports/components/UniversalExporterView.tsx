"use client";

import { useState, useMemo } from "react";
import { useReportsStore } from "../store/useReportsStore";
import {
  Download,
  FileSpreadsheet,
  FileCode,
  FileText,
  Calendar,
  CheckSquare,
  Square,
  Users,
  Receipt,
  Briefcase,
  Compass,
  Building2,
  FileCheck,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExportModule, ExportFormat } from "../types";
import { MODULE_COLUMNS_MAP, MASTER_DATA_SAMPLES } from "../data/reportsData";

const MODULE_OPTIONS: {
  id: ExportModule;
  label: string;
  description: string;
  icon: any;
}[] = [
  {
    id: "clientes",
    label: "Clientes & Personas",
    description: "RNC, cédula, razón social, contactos y estados",
    icon: Users,
  },
  {
    id: "facturas",
    label: "Facturación & e-CF",
    description: "Comprobantes fiscales, montos, ITBIS y cobros",
    icon: Receipt,
  },
  {
    id: "expedientes",
    label: "Expedientes Catastrales & Legales",
    description: "Carátulas, tribunales, abogados y agrimensores",
    icon: Briefcase,
  },
  {
    id: "parcelas",
    label: "Parcelas Catastrales",
    description: "Designaciones, distritos, superficies y coordenadas",
    icon: Compass,
  },
  {
    id: "inmuebles",
    label: "Propiedades Inmobiliarias",
    description: "Inventario de propiedades, valores y ubicaciones",
    icon: Building2,
  },
  {
    id: "contratos",
    label: "Contratos & Acuerdos",
    description: "Contratos de servicios, honorarios y partes",
    icon: FileCheck,
  },
];

export function UniversalExporterView() {
  const { exportMasterData } = useReportsStore();

  const [selectedModule, setSelectedModule] = useState<ExportModule>("facturas");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [dateFrom, setDateFrom] = useState<string>("2026-01-01");
  const [dateTo, setDateTo] = useState<string>("2026-03-31");

  // Columnas activas para el módulo seleccionado
  const availableColumns = MODULE_COLUMNS_MAP[selectedModule] || [];
  const defaultColKeys = useMemo(
    () => availableColumns.filter((c) => c.defaultSelected).map((c) => c.key),
    [availableColumns]
  );

  const [selectedColumns, setSelectedColumns] = useState<string[]>(defaultColKeys);

  // Cuando cambia el módulo, resetear columnas por defecto
  const handleModuleChange = (mod: ExportModule) => {
    setSelectedModule(mod);
    const cols = (MODULE_COLUMNS_MAP[mod] || []).filter((c) => c.defaultSelected).map((c) => c.key);
    setSelectedColumns(cols);
  };

  const handleToggleColumn = (colKey: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colKey) ? prev.filter((k) => k !== colKey) : [...prev, colKey]
    );
  };

  const handleSelectAll = () => {
    setSelectedColumns(availableColumns.map((c) => c.key));
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleExport = () => {
    exportMasterData(selectedModule, selectedFormat, selectedColumns, {
      from: dateFrom,
      to: dateTo,
    });
  };

  // Datos para la vista previa
  const sampleData = MASTER_DATA_SAMPLES[selectedModule] || [];
  const activeColumnsDefs = availableColumns.filter((c) => selectedColumns.includes(c.key));

  return (
    <div className="space-y-6">
      {/* 1. Selector de Módulo */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            1. Seleccione el Módulo de Datos
          </Label>
          <span className="text-xs text-slate-400">
            Exportación conforme a estándares dominicanos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULE_OPTIONS.map((opt) => {
            const isSelected = selectedModule === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleModuleChange(opt.id)}
                className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`p-2 rounded-md shrink-0 ${
                    isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {opt.label}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Rango de Fechas y Formato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rango de Fechas */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              2. Rango Temporal de Registros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-slate-600 mb-1 block">Desde:</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs bg-slate-50 border-slate-200"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-slate-600 mb-1 block">Hasta:</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs bg-slate-50 border-slate-200"
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              Filtra los eventos, emisiones o aperturas comprendidas en el rango.
            </span>
          </CardContent>
        </Card>

        {/* Formato de Archivo */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              3. Formato de Exportación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat("csv")}
                className={`p-2.5 rounded-md border text-center transition-all ${
                  selectedFormat === "csv"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-xs block">CSV (Excel)</span>
                <span className="text-[10px] text-slate-500 font-normal">BOM UTF-8</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat("txt")}
                className={`p-2.5 rounded-md border text-center transition-all ${
                  selectedFormat === "txt"
                    ? "border-slate-900 bg-slate-100 text-slate-900 font-bold"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FileText className="h-4 w-4 mx-auto mb-1 text-slate-700" />
                <span className="text-xs block">Plano Delimitado</span>
                <span className="text-[10px] text-slate-500 font-normal">Separador |</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat("json")}
                className={`p-2.5 rounded-md border text-center transition-all ${
                  selectedFormat === "json"
                    ? "border-blue-600 bg-blue-50 text-blue-900 font-bold"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FileCode className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                <span className="text-xs block">JSON Estructurado</span>
                <span className="text-[10px] text-slate-500 font-normal">API Friendly</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              Compatible con ERPs, hojas de cálculo contables y sistemas catastrales.
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Selector de Columnas */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
                4. Columnas a Incluir en la Exportación ({selectedColumns.length} de {availableColumns.length} seleccionadas)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Marque o desmarque los campos que desea incluir en el archivo final.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 text-xs text-slate-600 hover:text-slate-900 px-2"
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Seleccionar Todas
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="h-7 text-xs text-slate-600 hover:text-slate-900 px-2"
              >
                <Square className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Deseleccionar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {availableColumns.map((col) => {
              const isChecked = selectedColumns.includes(col.key);
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "border-slate-300 bg-slate-50 text-slate-900 font-medium"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleToggleColumn(col.key)}
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. Vista Previa de Datos y Botón de Descarga */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
                5. Vista Previa de Muestra ({sampleData.length} registros simulados)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
              Formato de salida: {selectedFormat.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {activeColumnsDefs.length > 0 ? (
            <div className="rounded-md border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    {activeColumnsDefs.map((col) => (
                      <th key={col.key} className="py-2 px-3 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sampleData.slice(0, 4).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {activeColumnsDefs.map((col) => (
                        <td key={col.key} className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                          {typeof row[col.key] === "number"
                            ? row[col.key].toLocaleString("es-DO")
                            : String(row[col.key] ?? "-")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              Seleccione al menos una columna para ver la vista previa.
            </div>
          )}

          {/* Botón de Ejecución de Descarga */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Se exportarán <strong className="text-slate-800 font-semibold">{sampleData.length} registros</strong> con{" "}
              <strong className="text-slate-800 font-semibold">{selectedColumns.length} columnas</strong> en formato{" "}
              <strong className="text-slate-800 font-semibold">{selectedFormat.toUpperCase()}</strong>.
            </div>

            <Button
              size="default"
              onClick={handleExport}
              disabled={selectedColumns.length === 0}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold px-6 gap-2 shadow-xs"
            >
              <Download className="h-4 w-4" />
              Descargar Archivo de Exportación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
