"use client";

import { useState, useMemo } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
import {
  BrokerageCommission,
  CommissionStatus,
  formatCurrency,
} from "../types";
import {
  Search,
  Plus,
  BadgeDollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  User,
  Building,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function CommissionList() {
  const {
    commissions,
    openCommissionCreateModal,
    openCommissionPayModal,
    openPropertyDetailModal,
    properties,
  } = useRealEstateStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          c.commissionNumber.toLowerCase().includes(q) ||
          c.propertyTitle.toLowerCase().includes(q) ||
          c.propertyCode.toLowerCase().includes(q) ||
          c.agentName.toLowerCase().includes(q) ||
          c.agentRncOrCedula.toLowerCase().includes(q) ||
          (c.contractNumber && c.contractNumber.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;

      return true;
    });
  }, [commissions, search, statusFilter]);

  const totalGross = commissions.reduce((sum, c) => sum + c.grossCommission, 0);
  const totalISR = commissions.reduce((sum, c) => sum + c.isrWithholdingAmount, 0);
  const totalNet = commissions.reduce((sum, c) => sum + c.netCommission, 0);
  const totalPaid = commissions
    .filter((c) => c.status === "PAGADA")
    .reduce((sum, c) => sum + c.netCommission, 0);
  const totalPending = commissions
    .filter((c) => c.status === "PENDIENTE")
    .reduce((sum, c) => sum + c.netCommission, 0);

  return (
    <div className="space-y-5">
      {/* Tarjetas de Resumen Tributario y Liquidaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Comisiones Brutas</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalGross, 'USD')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Base acumulada de transacciones
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Retención 10% ISR DGII</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {formatCurrency(totalISR, 'USD')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Comprobantes fiscales de retención (B16)
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Comisiones Liquidadas</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {formatCurrency(totalPaid, 'USD')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Monto neto pagado a agentes
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Pendiente de Liquidar</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalPending, 'USD')}
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
            Al cierre de contratos y escrituración
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por código, inmueble, agente o contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue placeholder="Estado de comisión" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las comisiones</SelectItem>
                <SelectItem value="PENDIENTE">Pendientes de Pago</SelectItem>
                <SelectItem value="PAGADA">Pagadas / Liquidadas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={() => openCommissionCreateModal()}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-9 px-3"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Registrar Comisión
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla de Comisiones con Desglose Fiscal */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Ref. / Inmueble</th>
                <th className="py-3 px-4">Agente Perceptor</th>
                <th className="py-3 px-4">Operación & Base</th>
                <th className="py-3 px-4 text-right">Comisión Bruta</th>
                <th className="py-3 px-4 text-right text-amber-700">Ret. 10% ISR</th>
                <th className="py-3 px-4 text-right text-emerald-800 font-bold">Monto Neto</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommissions.map((com) => {
                const linkedProp = properties.find((p) => p.id === com.propertyId);
                return (
                  <tr key={com.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{com.commissionNumber}</div>
                      <div
                        onClick={() => linkedProp && openPropertyDetailModal(linkedProp)}
                        className="text-[11px] text-slate-600 hover:text-blue-900 cursor-pointer line-clamp-1 mt-0.5"
                      >
                        [{com.propertyCode}] {com.propertyTitle}
                      </div>
                      {com.contractNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Contrato: {com.contractNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{com.agentName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{com.agentRncOrCedula}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">
                        {com.operationType === "VENTA" ? "Venta" : "Alquiler"} ({com.commissionPercent}%)
                      </span>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Base: {formatCurrency(com.transactionAmount, com.currency)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      {formatCurrency(com.grossCommission, com.currency)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-amber-700">
                      - {formatCurrency(com.isrWithholdingAmount, com.currency)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(com.netCommission, com.currency)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {com.status === "PAGADA" ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Pagada
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600 text-white text-[10px]">
                          Pendiente
                        </Badge>
                      )}
                      {com.paymentDate && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {com.paymentDate}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {com.status === "PENDIENTE" ? (
                        <Button
                          size="sm"
                          onClick={() => openCommissionPayModal(com)}
                          className="h-7 px-2.5 text-xs bg-slate-900 text-white hover:bg-slate-800"
                        >
                          Liquidar Pago
                        </Button>
                      ) : (
                        <div className="text-[11px] text-slate-500 font-mono" title={com.notes}>
                          {com.paymentReference || "Liquidada"}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCommissions.length === 0 && (
          <div className="p-12 text-center">
            <Receipt className="h-10 w-10 mx-auto text-slate-400 mb-2 stroke-1" />
            <h3 className="text-sm font-semibold text-slate-800">No hay comisiones registradas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Registra las liquidaciones de corretaje con la deducción formal del 10% de ISR.
            </p>
            <Button
              size="sm"
              onClick={() => openCommissionCreateModal()}
              className="mt-4 bg-slate-900 text-white hover:bg-slate-800 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nueva Comisión
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
