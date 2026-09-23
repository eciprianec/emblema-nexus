"use client";

import { useReportsStore } from "../store/useReportsStore";
import { formatMoney } from "@/lib/utils";
import {
  TrendingUp,
  Percent,
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  Building,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function BiMetricCards() {
  const { getConsolidatedMetrics, selectedPeriod, selectedCompany } = useReportsStore();
  const metrics = getConsolidatedMetrics();

  const isPositiveGrowth = metrics.previousPeriodComparison.revenueChangePct >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Ingresos Brutos Facturados */}
      <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-all bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ingresos Brutos
            </span>
            <div className="p-2 rounded-md bg-slate-100 text-slate-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatMoney(metrics.totalRevenueDOP, "DOP")}
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Equivalente: <strong className="text-slate-700 font-semibold">{formatMoney(metrics.totalRevenueUSD, "USD")}</strong></span>
              <span className="text-[11px] text-slate-400">TC ~60.50</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+{metrics.previousPeriodComparison.revenueChangePct}%</span>
            </div>
            <span className="text-slate-400 text-[11px]">vs. mes anterior</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Margen Operativo Neto */}
      <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-all bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Margen Operativo
            </span>
            <div className="p-2 rounded-md bg-slate-100 text-slate-700">
              <Percent className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-slate-900 flex items-baseline gap-2">
              <span>{metrics.netOperatingMarginPercentage}%</span>
              <span className="text-xs font-normal text-slate-500">neto</span>
            </div>
            <div className="text-xs text-slate-500">
              Margen neto: <strong className="text-slate-700 font-semibold">{formatMoney(metrics.netOperatingMarginDOP, "DOP")}</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+{metrics.previousPeriodComparison.marginChangePct}%</span>
            </div>
            <span className="text-slate-400 text-[11px]">rentabilidad óptima</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Recaudos Efectivos & Cartera */}
      <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-all bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recaudos en Caja/Banco
            </span>
            <div className="p-2 rounded-md bg-slate-100 text-slate-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatMoney(metrics.collectionsDOP, "DOP")}
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Dólares: <strong className="text-slate-700 font-semibold">{formatMoney(metrics.collectionsUSD, "USD")}</strong></span>
              <span className="text-amber-700 font-medium text-[11px]">CxC: {formatMoney(metrics.pendingCollectionsDOP, "DOP")}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+{metrics.previousPeriodComparison.collectionsChangePct}%</span>
            </div>
            <span className="text-slate-400 text-[11px]">cobranza efectiva</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Cumplimiento Fiscal DGII */}
      <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-all bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cumplimiento DGII
            </span>
            <div className="p-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>100%</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                Al Día
              </Badge>
            </div>
            <div className="text-xs text-slate-500">
              Formatos 606 & 607 auditados sin inconsistencias
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>e-CF Timbrados</span>
            </div>
            <span className="text-slate-400 text-[11px]">Ley 32-23</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
