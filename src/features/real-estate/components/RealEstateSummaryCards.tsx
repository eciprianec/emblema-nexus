"use client";

import { useRealEstateStore } from "../store/useRealEstateStore";
import { formatCurrency } from "../types";
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  BadgeDollarSign,
  TrendingUp,
  AlertCircle,
  Tag,
  KeyRound,
} from "lucide-react";

export function RealEstateSummaryCards() {
  const { properties, contracts, commissions } = useRealEstateStore();

  const totalProperties = properties.length;
  const forSaleCount = properties.filter(
    (p) => p.operationType === 'VENTA' || p.operationType === 'VENTA_Y_ALQUILER'
  ).length;
  const forRentCount = properties.filter(
    (p) => p.operationType === 'ALQUILER' || p.operationType === 'VENTA_Y_ALQUILER'
  ).length;

  const availableProperties = properties.filter((p) => p.status === 'DISPONIBLE').length;
  const occupiedOrReserved = properties.filter(
    (p) => p.status === 'ALQUILADA' || p.status === 'VENDIDA' || p.status === 'BAJO_CONTRATO' || p.status === 'RESERVADA'
  ).length;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedOrReserved / totalProperties) * 100) : 0;

  const activeContracts = contracts.filter((c) => c.status === 'VIGENTE').length;
  const expiringContracts = contracts.filter((c) => c.status === 'POR_VENCER').length;

  const pendingCommissionsNet = commissions
    .filter((c) => c.status === 'PENDIENTE')
    .reduce((sum, c) => sum + c.netCommission, 0);

  const paidCommissionsNet = commissions
    .filter((c) => c.status === 'PAGADA')
    .reduce((sum, c) => sum + c.netCommission, 0);

  const totalISRWithheld = commissions
    .filter((c) => c.status === 'PAGADA')
    .reduce((sum, c) => sum + c.isrWithholdingAmount, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total en Cartera */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total en Cartera
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-700">
            <Building2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {totalProperties}{" "}
            <span className="text-xs font-normal text-slate-500">inmuebles</span>
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="flex items-center gap-1 text-slate-600">
              <Tag className="h-3 w-3 text-slate-400" />
              {forSaleCount} en Venta
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <KeyRound className="h-3 w-3 text-slate-400" />
              {forRentCount} en Alquiler
            </span>
          </div>
        </div>
      </div>

      {/* 2. Inmuebles Disponibles */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Disponibilidad
          </span>
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {availableProperties}{" "}
            <span className="text-xs font-normal text-slate-500">
              listos para captación
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              {occupancyRate}% colocación
            </span>
            <span className="text-slate-400">
              {occupiedOrReserved} colocados / reservados
            </span>
          </div>
        </div>
      </div>

      {/* 3. Contratos Vigentes */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Contratos Activos
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-700">
            <FileCheck2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {activeContracts}{" "}
            <span className="text-xs font-normal text-slate-500">vigentes</span>
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between border-t border-slate-100 pt-2">
            {expiringContracts > 0 ? (
              <span className="flex items-center gap-1 font-medium text-amber-700">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                {expiringContracts} por vencer (renovación)
              </span>
            ) : (
              <span className="text-slate-500">Sin vencimientos próximos</span>
            )}
            <span className="text-[11px] text-slate-400">Alquiler y Promesas</span>
          </div>
        </div>
      </div>

      {/* 4. Comisiones Generadas */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Comisiones Netas
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-700">
            <BadgeDollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(paidCommissionsNet, 'USD')}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-amber-700 font-medium">
              Pend.: {formatCurrency(pendingCommissionsNet, 'USD')}
            </span>
            <span className="text-[11px] text-slate-500" title="Retención 10% ISR DGII deducida">
              ISR: {formatCurrency(totalISRWithheld, 'USD')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
