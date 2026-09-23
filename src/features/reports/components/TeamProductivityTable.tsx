"use client";

import { useState, useMemo } from "react";
import { useReportsStore } from "../store/useReportsStore";
import { formatMoney } from "@/lib/utils";
import {
  Users2,
  Download,
  Award,
  CheckCircle,
  Clock,
  Briefcase,
  TrendingUp,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TeamProductivityTable() {
  const { getFilteredProductivity, downloadProductivityCsv, selectedPeriod } = useReportsStore();
  const team = getFilteredProductivity();

  const [selectedDept, setSelectedDept] = useState<string>("todos");

  const filteredTeam = useMemo(() => {
    return team.filter((t) => {
      return selectedDept === "todos" || t.department === selectedDept;
    });
  }, [team, selectedDept]);

  // Cálculos consolidados
  const totalGeneratedRevenue = filteredTeam.reduce((sum, t) => sum + t.generatedRevenueDOP, 0);
  const totalCommissions = filteredTeam.reduce((sum, t) => sum + t.commissionsDOP, 0);
  const totalTasks = filteredTeam.reduce((sum, t) => sum + t.completedTasks, 0);
  const avgSla = filteredTeam.length > 0 
    ? Math.round(filteredTeam.reduce((sum, t) => sum + t.onTimeRate, 0) / filteredTeam.length) 
    : 0;

  const getInitials = (name: string) => {
    return name
      .replace(/^(Lic\.|Ing\.|Licda\.|Dra\.|Dr\.)\s*/, "")
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas Ejecutivas de Rendimiento del Equipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Honorarios Producidos
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatMoney(totalGeneratedRevenue, "DOP")}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Generado por {filteredTeam.length} especialistas
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Comisiones Devengadas
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatMoney(totalCommissions, "DOP")}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Incentivos por metas alcanzadas
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              SLA de Cumplimiento a Tiempo
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
              <span>{avgSla}%</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Alta Eficiencia
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Resolución de expedientes en plazo
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Tareas y Actos Procesales
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {totalTasks}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Actuaciones culminadas este mes
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Filtrar por Departamento:</span>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="h-8 w-[170px] text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="todos">Todos los Departamentos</SelectItem>
              <SelectItem value="Legal">Legal y Litigios</SelectItem>
              <SelectItem value="Agrimensura">Agrimensura y Catastro</SelectItem>
              <SelectItem value="Inmobiliaria">Inmobiliaria y Proyectos</SelectItem>
              <SelectItem value="Notaría">Notaría Pública</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={downloadProductivityCsv}
          className="text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100 h-8 gap-1.5 shrink-0"
        >
          <Download className="h-3.5 w-3.5 text-slate-600" />
          Descargar Informe CSV
        </Button>
      </div>

      {/* Tabla de Rendimiento de Equipo */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Profesional / Especialista</th>
                <th className="py-2.5 px-3">Departamento & Rol</th>
                <th className="py-2.5 px-3 text-center">Casos Asignados</th>
                <th className="py-2.5 px-3 text-center">Casos Concluidos</th>
                <th className="py-2.5 px-3 text-center w-36">Cumplimiento SLA</th>
                <th className="py-2.5 px-3 text-center">Tareas Completadas</th>
                <th className="py-2.5 px-3 text-right">Valor Generado</th>
                <th className="py-2.5 px-3 text-right">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTeam.map((t) => {
                const initials = getInitials(t.name);
                const isOptimalSla = t.onTimeRate >= 95;

                return (
                  <tr key={t.memberId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900">{t.name}</div>
                          <span className="text-[10px] text-slate-500">ID: {t.memberId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{t.role}</div>
                      <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0 bg-slate-50 text-slate-600 border-slate-200">
                        {t.department}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-900">
                      {t.activeCases}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-emerald-700">
                      {t.completedCases}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1 items-center">
                        <div className="flex items-center justify-between w-full text-[11px] font-mono">
                          <span className="font-semibold text-slate-800">{t.onTimeRate}%</span>
                          <span className={`text-[10px] ${isOptimalSla ? "text-emerald-600" : "text-amber-600"}`}>
                            {isOptimalSla ? "Sobresaliente" : "Adecuado"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isOptimalSla ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${t.onTimeRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                      {t.completedTasks}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatMoney(t.generatedRevenueDOP, "DOP")}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatMoney(t.commissionsDOP, "DOP")}
                    </td>
                  </tr>
                );
              })}
              {filteredTeam.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No se encontraron miembros en el departamento seleccionado.
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
