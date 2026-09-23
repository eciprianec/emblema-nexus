"use client";

import { useState, useMemo } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
import {
  RealEstateContract,
  ContractType,
  ContractStatus,
  formatCurrency,
} from "../types";
import {
  Search,
  Plus,
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  ShieldCheck,
  User,
  ChevronRight,
  Filter,
  CheckCircle2,
  Building,
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

export function ContractList() {
  const {
    contracts,
    openContractCreateModal,
    openPropertyDetailModal,
    properties,
  } = useRealEstateStore();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredContracts = useMemo(() => {
    return contracts.filter((ctr) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          ctr.contractNumber.toLowerCase().includes(q) ||
          ctr.propertyTitle.toLowerCase().includes(q) ||
          ctr.client.name.toLowerCase().includes(q) ||
          ctr.ownerName.toLowerCase().includes(q) ||
          (ctr.notes && ctr.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (typeFilter !== "ALL" && ctr.contractType !== typeFilter) return false;
      if (statusFilter !== "ALL" && ctr.status !== statusFilter) return false;

      return true;
    });
  }, [contracts, search, typeFilter, statusFilter]);

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case "VIGENTE":
        return <Badge className="bg-emerald-600 text-white text-[10px]">Vigente</Badge>;
      case "POR_VENCER":
        return <Badge className="bg-amber-600 text-white text-[10px]">Por Vencer</Badge>;
      case "VENCIDO":
        return <Badge className="bg-red-600 text-white text-[10px]">Vencido</Badge>;
      case "CUMPLIDO":
        return <Badge className="bg-blue-600 text-white text-[10px]">Cumplido</Badge>;
      case "CANCELADO":
        return <Badge className="bg-slate-600 text-white text-[10px]">Cancelado</Badge>;
    }
  };

  const getContractTypeLabel = (type: ContractType) => {
    switch (type) {
      case "ALQUILER_RESIDENCIAL":
        return "Alquiler Residencial";
      case "ALQUILER_COMERCIAL":
        return "Alquiler Comercial";
      case "PROMESA_VENTA":
        return "Promesa de Venta";
      case "VENTA_DEFINITIVA":
        return "Compraventa Definitiva";
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por número de contrato, inmueble o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <Button
            size="sm"
            onClick={() => openContractCreateModal()}
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-9 px-3 shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo Contrato
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Tipo de Contrato
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los contratos</SelectItem>
                <SelectItem value="ALQUILER_RESIDENCIAL">Alquiler Residencial</SelectItem>
                <SelectItem value="ALQUILER_COMERCIAL">Alquiler Comercial</SelectItem>
                <SelectItem value="PROMESA_VENTA">Promesa de Venta</SelectItem>
                <SelectItem value="VENTA_DEFINITIVA">Compraventa Definitiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Estado Contractual
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="VIGENTE">Vigente</SelectItem>
                <SelectItem value="POR_VENCER">Por Vencer (Aviso de Renovación)</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="CUMPLIDO">Cumplido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de Contratos */}
      <div className="space-y-3">
        {filteredContracts.map((ctr) => {
          const linkedProp = properties.find((p) => p.id === ctr.propertyId);
          return (
            <div
              key={ctr.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
            >
              {/* Header de la Fila de Contrato */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                      {ctr.contractNumber}
                    </span>
                    <Badge className="bg-slate-900 text-white text-[10px]">
                      {getContractTypeLabel(ctr.contractType)}
                    </Badge>
                    {getStatusBadge(ctr.status)}
                    {ctr.status === "POR_VENCER" && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        Vence en menos de 30 días
                      </span>
                    )}
                  </div>
                  <h3
                    onClick={() => linkedProp && openPropertyDetailModal(linkedProp)}
                    className="text-sm font-bold text-slate-900 hover:text-blue-900 cursor-pointer flex items-center gap-1.5"
                  >
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {ctr.propertyTitle}
                  </h3>
                  <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                    <span>
                      {ctr.clientRole === "INQUILINO" ? "Inquilino" : "Comprador"}:{" "}
                      <strong className="text-slate-900">{ctr.client.name}</strong> ({ctr.client.identificationNumber})
                    </span>
                    <span>•</span>
                    <span>
                      Propietario: <strong className="text-slate-900">{ctr.ownerName}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    {ctr.clientRole === "INQUILINO" ? "Canon de Arrendamiento" : "Monto de la Transacción"}
                  </span>
                  <div className="text-xl font-bold text-slate-900">
                    {formatCurrency(ctr.amount, ctr.currency)}
                    {ctr.clientRole === "INQUILINO" && (
                      <span className="text-xs font-normal text-slate-500"> / mes</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Esquema Dominicano: Depósitos Recibidos & Términos de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Depósitos en Garantía (Esquema RD)
                  </span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {ctr.depositAmountTotal ? formatCurrency(ctr.depositAmountTotal, ctr.currency) : "No especificado"}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {ctr.depositMonths
                      ? `${ctr.depositMonths} meses de depósito + ${ctr.advanceMonths || 1} mes adelantado`
                      : "Pago inicial o separación de arras"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Condiciones de Pago Mensual
                  </span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    Límite: Día {ctr.paymentDayOfMonth || 5} de cada mes
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {ctr.graceDays || 5} días de gracia • Mora del {ctr.lateFeePercent || 5}% tras vencimiento
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Plazo y Notaría
                  </span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {ctr.startDate} al {ctr.endDate}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {ctr.notaryName || "Notario pendiente de legalización"}
                  </p>
                </div>
              </div>

              {ctr.notes && (
                <div className="text-[11px] text-slate-500 italic">
                  Nota: {ctr.notes}
                </div>
              )}
            </div>
          );
        })}

        {filteredContracts.length === 0 && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
            <FileText className="h-10 w-10 mx-auto text-slate-400 mb-2 stroke-1" />
            <h3 className="text-sm font-semibold text-slate-800">No se encontraron contratos</h3>
            <p className="text-xs text-slate-500 mt-1">
              No hay contratos registrados bajo los criterios seleccionados.
            </p>
            <Button
              size="sm"
              onClick={() => openContractCreateModal()}
              className="mt-4 bg-slate-900 text-white hover:bg-slate-800 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Crear Nuevo Contrato
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
