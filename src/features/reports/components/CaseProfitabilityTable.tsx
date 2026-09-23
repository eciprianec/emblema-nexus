"use client";

import { useState, useMemo } from "react";
import { useReportsStore } from "../store/useReportsStore";
import { formatMoney } from "@/lib/utils";
import {
  TrendingUp,
  Download,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  Briefcase,
  UserCheck,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export function CaseProfitabilityTable() {
  const { getFilteredProfitability, downloadProfitabilityCsv, selectedPeriod } = useReportsStore();
  const cases = getFilteredProfitability();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [selectedMarginLevel, setSelectedMarginLevel] = useState<string>("todos");

  // Filtrado reactivo
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchSearch =
        c.caseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.leadLawyer.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = selectedType === "todos" || c.caseType === selectedType;

      const matchMargin =
        selectedMarginLevel === "todos" ||
        (selectedMarginLevel === "alta" && c.marginPercentage >= 75) ||
        (selectedMarginLevel === "media" && c.marginPercentage >= 50 && c.marginPercentage < 75) ||
        (selectedMarginLevel === "baja" && c.marginPercentage < 50);

      return matchSearch && matchType && matchMargin;
    });
  }, [cases, searchTerm, selectedType, selectedMarginLevel]);

  // Cálculos consolidados
  const totalBilled = filteredCases.reduce((sum, c) => sum + c.billedFeesDOP, 0);
  const totalExpenses = filteredCases.reduce((sum, c) => sum + c.directExpensesDOP, 0);
  const totalGrossMargin = totalBilled - totalExpenses;
  const weightedMarginPct = totalBilled > 0 ? Math.round((totalGrossMargin / totalBilled) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen de Rentabilidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Honorarios Facturados
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatMoney(totalBilled, "DOP")}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {filteredCases.length} expedientes activos
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Gastos Directos Reembolsables
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatMoney(totalExpenses, "DOP")}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Tasas judiciales, viáticos y mensuras
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Margen Bruto Consolidado
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatMoney(totalGrossMargin, "DOP")}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              Retorno neto directo
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Rentabilidad Ponderada
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
              <span>{weightedMarginPct}%</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Óptima
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Meta estándar de la firma: 65%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Búsqueda */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar expediente o cliente..."
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>

          {/* Filtro por Tipo de Caso */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-8 w-[160px] text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Tipo de Caso" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="todos">Todos los Tipos</SelectItem>
              <SelectItem value="Deslinde">Deslindes</SelectItem>
              <SelectItem value="Litigio Inmobiliario">Litigios Inmobiliarios</SelectItem>
              <SelectItem value="Saneamiento">Saneamientos</SelectItem>
              <SelectItem value="Constitución Condominio">Régimen Condominio</SelectItem>
              <SelectItem value="Refundición">Refundiciones</SelectItem>
              <SelectItem value="Transferencia Título">Transferencias</SelectItem>
              <SelectItem value="Partición Hereditaria">Particiones</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Semáforo de Margen */}
          <Select value={selectedMarginLevel} onValueChange={setSelectedMarginLevel}>
            <SelectTrigger className="h-8 w-[150px] text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Rango Rentabilidad" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="todos">Todas las Rentabilidades</SelectItem>
              <SelectItem value="alta">Margen Alto (≥ 75%)</SelectItem>
              <SelectItem value="media">Margen Medio (50% - 74%)</SelectItem>
              <SelectItem value="baja">Margen Bajo (&lt; 50%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={downloadProfitabilityCsv}
          className="text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100 h-8 gap-1.5 shrink-0"
        >
          <Download className="h-3.5 w-3.5 text-slate-600" />
          Descargar CSV
        </Button>
      </div>

      {/* Tabla Ejecutiva de Casos */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Expediente</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Tipo de Caso</th>
                <th className="py-2.5 px-3">Responsables</th>
                <th className="py-2.5 px-3 text-right">Honorarios Facturados</th>
                <th className="py-2.5 px-3 text-right">Gastos Directos</th>
                <th className="py-2.5 px-3 text-right">Margen Bruto</th>
                <th className="py-2.5 px-3 text-center">Rentabilidad</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCases.map((c) => {
                // Semáforo sobrio
                const isHigh = c.marginPercentage >= 75;
                const isMedium = c.marginPercentage >= 50 && c.marginPercentage < 75;

                return (
                  <tr key={c.caseId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-slate-900">{c.caseCode}</div>
                      <div className="text-[11px] text-slate-500 max-w-xs truncate" title={c.title}>
                        {c.title}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {c.clientName}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px] font-normal bg-slate-50 text-slate-700 border-slate-200">
                        {c.caseType}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-800">
                        <UserCheck className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{c.leadLawyer}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                        <Compass className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{c.surveyor}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatMoney(c.billedFeesDOP, "DOP")}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatMoney(c.directExpensesDOP, "DOP")}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatMoney(c.grossMarginDOP, "DOP")}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isHigh ? "bg-emerald-500" : isMedium ? "bg-amber-500" : "bg-rose-500"
                          }`}
                        />
                        <span className="font-mono font-bold text-slate-900">
                          {c.marginPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-300">
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No se encontraron expedientes con los criterios seleccionados.
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
