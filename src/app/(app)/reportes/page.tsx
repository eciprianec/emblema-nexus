"use client";

import Link from "next/link";
import { useReportsStore } from "@/features/reports/store/useReportsStore";
import { BiMetricCards } from "@/features/reports/components/BiMetricCards";
import { formatMoney } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  FileCheck2,
  Users2,
  Download,
  ArrowRight,
  ShieldCheck,
  Building2,
  Briefcase,
  Layers,
  Sparkles,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COMPANIES_MAP } from "@/features/reports/types";

export default function ReportsDashboardPage() {
  const {
    selectedPeriod,
    selectedCompany,
    getFilteredProfitability,
    getFilteredProductivity,
    getFiltered607,
    getFiltered606,
  } = useReportsStore();

  const companyInfo = COMPANIES_MAP[selectedCompany];
  const cases = getFilteredProfitability();
  const team = getFilteredProductivity();
  const sales = getFiltered607();
  const expenses = getFiltered606();

  // Top 3 casos con mayor margen de rentabilidad
  const topCases = [...cases].sort((a, b) => b.marginPercentage - a.marginPercentage).slice(0, 3);

  // Top 3 especialistas con mayor facturación generada
  const topSpecialists = [...team].sort((a, b) => b.generatedRevenueDOP - a.generatedRevenueDOP).slice(0, 3);

  // Distribución de ingresos por tipo de procedimiento
  const revenueByType = cases.reduce((acc, c) => {
    acc[c.caseType] = (acc[c.caseType] || 0) + c.billedFeesDOP;
    return acc;
  }, {} as Record<string, number>);

  const totalBilledCases = Object.values(revenueByType).reduce((a, b) => a + b, 0);

  const procedureBreakdown = Object.entries(revenueByType).map(([type, amount]) => ({
    type,
    amount,
    pct: totalBilledCases > 0 ? Math.round((amount / totalBilledCases) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Centro de Business Intelligence & Reportes
            </h1>
            <Badge variant="outline" className="bg-slate-100 text-slate-800 text-[11px] font-semibold">
              {companyInfo?.name || "Consolidado"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervisión integral de rentabilidad por expediente, cumplimiento tributario DGII Ley 32-23 y rendimiento operativo.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/reportes/fiscal">
            <Button size="sm" variant="outline" className="text-xs border-slate-300 gap-1.5 h-8">
              <FileCheck2 className="h-3.5 w-3.5 text-slate-600" />
              <span>Ver DGII 606/607</span>
            </Button>
          </Link>
          <Link href="/reportes/exportador">
            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold gap-1.5 h-8">
              <Download className="h-3.5 w-3.5" />
              <span>Exportar Todo</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tarjetas Ejecutivas de BI */}
      <BiMetricCards />

      {/* Grid de 2 Columnas: Análisis de Cartera & Estado Fiscal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Composición de Ingresos por Tipo de Procedimiento */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-700" />
                  Composición de Ingresos por Especialidad Jurídica & Agrimensura
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Distribución proporcional del volumen facturado en el período fiscal {selectedPeriod}
                </CardDescription>
              </div>
              <Link href="/reportes/financiero">
                <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900 gap-1 h-7">
                  Detalle Financiero
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4">
            {procedureBreakdown.map((item) => (
              <div key={item.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{item.type}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 font-normal">{item.pct}%</span>
                    <strong className="text-slate-900">{formatMoney(item.amount, "DOP")}</strong>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-800 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Columna Derecha: Estado de Cumplimiento Tributario DGII */}
        <Card className="border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Auditoría Fiscal DGII
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Validación de comprobantes e-CF y retenciones
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1 space-y-4 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between font-semibold text-emerald-900">
                <span>Estado de Formatos</span>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                  Auditados
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-700">
                0 inconsistencias de RNC/Cédula detectadas en el cruce de información 606 vs 607.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Ventas Facturadas (607):</span>
                <span className="font-mono font-bold text-slate-900">{sales.length} comprobantes</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Compras & Gastos (606):</span>
                <span className="font-mono font-bold text-slate-900">{expenses.length} facturas</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">ITBIS por Adelantar:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatMoney(expenses.reduce((s, e) => s + e.itbisPorAdelantar, 0), "DOP")}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Régimen e-CF DGII:</span>
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 font-mono">
                  E31 / E32 Activos
                </Badge>
              </div>
            </div>

            <Link href="/reportes/fiscal" className="block pt-2">
              <Button variant="outline" className="w-full text-xs font-semibold border-slate-300 gap-1.5 h-8">
                <FileCheck2 className="h-3.5 w-3.5 text-slate-700" />
                Descargar Archivos Planos DGII
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Grid de 2 Columnas Inferiores: Casos más Rentables & Top Especialistas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Casos más Rentables */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Expedientes de Mayor Retorno Bruto
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Mayor porcentaje de margen tras deducir tasas y viáticos directos
                </CardDescription>
              </div>
              <Link href="/reportes/financiero">
                <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900 gap-1 h-7">
                  Ver Todos
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1 space-y-3">
            {topCases.map((c) => (
              <div
                key={c.caseId}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-slate-900">{c.caseCode}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-white text-slate-600">
                      {c.caseType}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-700 font-medium truncate max-w-xs mt-0.5" title={c.title}>
                    {c.title}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Cliente: {c.clientName}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {c.marginPercentage.toFixed(1)}%
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                    {formatMoney(c.grossMarginDOP, "DOP")}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Rendimiento del Equipo */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-slate-700" />
                  Especialistas de Mayor Desempeño
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Honorarios generados y cumplimiento de plazos judiciales/catastrales
                </CardDescription>
              </div>
              <Link href="/reportes/operativo">
                <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900 gap-1 h-7">
                  Ver Equipo
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1 space-y-3">
            {topSpecialists.map((t) => (
              <div
                key={t.memberId}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-xs text-slate-900">{t.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {t.role} • <span className="text-slate-700 font-medium">{t.department}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    SLA a tiempo: <strong className="text-emerald-700">{t.onTimeRate}%</strong> • {t.completedCases} casos concluidos
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Valor Generado</span>
                  <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                    {formatMoney(t.generatedRevenueDOP, "DOP")}
                  </div>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    Comisión: {formatMoney(t.commissionsDOP, "DOP")}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
