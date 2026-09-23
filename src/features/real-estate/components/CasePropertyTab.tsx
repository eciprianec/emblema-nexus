"use client";

import { useRealEstateStore } from "../store/useRealEstateStore";
import { formatCurrency } from "../types";
import {
  Building2,
  FileText,
  MapPin,
  Calendar,
  CheckCircle2,
  Plus,
  Compass,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CasePropertyTabProps {
  caseId: string;
}

export function CasePropertyTab({ caseId }: CasePropertyTabProps) {
  const {
    properties,
    contracts,
    commissions,
    openPropertyDetailModal,
    openPropertyCreateModal,
    openContractCreateModal,
    openCommissionCreateModal,
  } = useRealEstateStore();

  // Buscar inmuebles vinculados a este expediente
  const caseProperties = properties.filter(
    (p) => p.caseId === caseId || (!p.caseId && caseId === "LEG-2024-0001" && (p.id === "prop-1" || p.id === "prop-4"))
  );

  const activeProperty = caseProperties[0];
  const linkedContracts = contracts.filter(
    (c) => c.caseId === caseId || (activeProperty && c.propertyId === activeProperty.id)
  );
  const linkedCommissions = commissions.filter(
    (com) => activeProperty && com.propertyId === activeProperty.id
  );

  if (!activeProperty) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg">
        <Building2 className="h-10 w-10 mx-auto text-slate-400 mb-2 stroke-1" />
        <h4 className="text-sm font-semibold text-slate-800">
          Sin Inmueble Vinculado al Expediente
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
          Este caso legal aún no tiene una propiedad, contrato de compraventa o arrendamiento inmobiliario asociado.
        </p>
        <Button
          size="sm"
          onClick={openPropertyCreateModal}
          className="text-xs bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Vincular o Captar Propiedad para este Caso
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera del Inmueble en el Caso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-slate-900 text-white">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Inmueble Objeto del Expediente Legal
            </span>
            <Badge className="bg-slate-900 text-white text-[10px]">
              {activeProperty.status}
            </Badge>
            {activeProperty.isExclusive && (
              <Badge className="bg-amber-500 text-slate-950 text-[10px] font-semibold">
                Exclusiva
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            [{activeProperty.code}] {activeProperty.title}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {activeProperty.sector}, {activeProperty.municipality}, {activeProperty.province} • {activeProperty.address}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openPropertyDetailModal(activeProperty)}
            className="text-xs font-medium border-slate-300 text-slate-800 hover:bg-slate-100"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Ver Ficha Completa
          </Button>
          <Button
            size="sm"
            onClick={() => openContractCreateModal(activeProperty.id)}
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Emitir Contrato
          </Button>
        </div>
      </div>

      {/* Métricas y Datos Catastrales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dimensiones */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Dimensiones & Superficie
          </span>
          <div className="text-sm font-semibold text-slate-900">
            {activeProperty.builtAreaSqm > 0 ? `${activeProperty.builtAreaSqm} m² de construcción` : "Terreno virgen"}
          </div>
          {activeProperty.landAreaSqm > 0 && (
            <div className="text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded">
              Solar: {activeProperty.landAreaSqm.toLocaleString()} m² ={" "}
              <strong className="text-emerald-700">{activeProperty.landAreaTareas.toFixed(2)} Tareas dominicanas</strong>
            </div>
          )}
          <div className="text-xs text-slate-500 pt-1">
            {activeProperty.bedrooms} Hab • {activeProperty.bathrooms} Baños • {activeProperty.parkingSpaces} Parqueos
          </div>
        </div>

        {/* Vinculación Catastral (Fase 6 Agrimensura) */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Catastro & Título Inmobiliario
            </span>
            <Compass className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="text-xs space-y-1">
            <div>
              <span className="text-slate-400 text-[10px]">Parcela: </span>
              <span className="font-semibold text-slate-800">
                {activeProperty.cadastralReference?.parcelDesignation || "Designación pendiente"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">Distrito Catastral: </span>
              <span className="font-semibold text-slate-800">
                DC {activeProperty.cadastralReference?.cadastralDistrict || "01"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">Matrícula / Título: </span>
              <span className="font-mono font-semibold text-slate-900">
                {activeProperty.cadastralReference?.titleNumber || "Emisión en curso"}
              </span>
            </div>
          </div>
        </div>

        {/* Propietario / Captador */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Propietario & Corretaje
          </span>
          <div className="text-xs font-semibold text-slate-900">
            {activeProperty.owner.name}
          </div>
          <div className="text-[11px] text-slate-500">
            {activeProperty.owner.identificationType}: {activeProperty.owner.identificationNumber}
          </div>
          <div className="text-xs text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Agente: {activeProperty.listingAgent.name}</span>
            <span className="font-bold text-slate-900">{activeProperty.commissionPercent}% com.</span>
          </div>
        </div>
      </div>

      {/* Contratos Asociados a este Expediente */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
            Contratos Inmobiliarios del Expediente ({linkedContracts.length})
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openContractCreateModal(activeProperty.id)}
            className="text-xs text-slate-600 hover:text-slate-900 h-7"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nuevo Contrato
          </Button>
        </div>

        {linkedContracts.length > 0 ? (
          <div className="space-y-2">
            {linkedContracts.map((ctr) => (
              <div
                key={ctr.id}
                className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{ctr.contractNumber}</span>
                    <Badge className="bg-slate-900 text-white text-[10px]">
                      {ctr.contractType.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300">
                      {ctr.status}
                    </Badge>
                  </div>
                  <div className="text-slate-600 mt-1">
                    Cliente: <strong>{ctr.client.name}</strong> ({ctr.client.identificationNumber}) • Vigencia: {ctr.startDate} al {ctr.endDate}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900 text-sm">
                    {formatCurrency(ctr.amount, ctr.currency)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {ctr.depositAmountTotal ? `Depósito: ${formatCurrency(ctr.depositAmountTotal, ctr.currency)}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
            No se han formalizado contratos de venta o alquiler en este expediente.
          </div>
        )}
      </div>

      {/* Comisiones Vinculadas */}
      {linkedCommissions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
            Liquidaciones de Corretaje del Expediente ({linkedCommissions.length})
          </h4>
          <div className="space-y-2">
            {linkedCommissions.map((com) => (
              <div
                key={com.id}
                className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">{com.commissionNumber}</span>
                  <span className="text-slate-500 ml-2">Agente: {com.agentName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 font-mono">Bruto: {formatCurrency(com.grossCommission, com.currency)}</span>
                  <span className="text-amber-700 font-mono">ISR: -{formatCurrency(com.isrWithholdingAmount, com.currency)}</span>
                  <span className="font-bold font-mono text-emerald-700">Neto: {formatCurrency(com.netCommission, com.currency)}</span>
                  <Badge variant="outline" className={com.status === "PAGADA" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}>
                    {com.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
