"use client";

import { useState } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
import { formatCurrency, PropertyStatus } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize2,
  Calendar,
  FileText,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
  Compass,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function PropertyDetailModal() {
  const {
    isPropertyDetailOpen,
    closePropertyDetailModal,
    selectedProperty,
    showings,
    contracts,
    openShowingCreateModal,
    openContractCreateModal,
    setPropertyStatus,
  } = useRealEstateStore();

  const [activeTab, setActiveTab] = useState<"ficha" | "visitas" | "contratos" | "propietario">("ficha");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!selectedProperty) return null;

  const propertyShowings = showings.filter((s) => s.propertyId === selectedProperty.id);
  const propertyContracts = contracts.filter((c) => c.propertyId === selectedProperty.id);

  const getStatusBadge = (status: PropertyStatus) => {
    switch (status) {
      case "DISPONIBLE":
        return <Badge className="bg-emerald-600 text-white text-xs">Disponible</Badge>;
      case "RESERVADA":
        return <Badge className="bg-amber-600 text-white text-xs">Reservada</Badge>;
      case "BAJO_CONTRATO":
        return <Badge className="bg-blue-600 text-white text-xs">Bajo Contrato</Badge>;
      case "ALQUILADA":
        return <Badge className="bg-purple-700 text-white text-xs">Alquilada</Badge>;
      case "VENDIDA":
        return <Badge className="bg-slate-700 text-white text-xs">Vendida</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isPropertyDetailOpen} onOpenChange={closePropertyDetailModal}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Header con Código, Estado y Precios */}
        <div className="p-6 bg-slate-950 text-white">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                  {selectedProperty.code}
                </span>
                {getStatusBadge(selectedProperty.status)}
                {selectedProperty.isExclusive && (
                  <Badge className="bg-amber-500 text-slate-950 text-[10px] font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Exclusividad Emblema Nexus
                  </Badge>
                )}
                <span className="text-xs text-slate-400 capitalize">
                  {selectedProperty.propertyType.toLowerCase()} en {selectedProperty.operationType.toLowerCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-1">
                {selectedProperty.title}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {selectedProperty.address} • {selectedProperty.sector}, {selectedProperty.municipality}, {selectedProperty.province}
                </span>
              </div>
            </div>

            {/* Precios Principales */}
            <div className="text-left md:text-right shrink-0">
              {selectedProperty.operationType === "ALQUILER" && selectedProperty.priceRent && (
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-medium">Canon Mensual</span>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(selectedProperty.priceRent, selectedProperty.currency)}
                    <span className="text-xs font-normal text-slate-400"> / mes</span>
                  </div>
                </div>
              )}
              {selectedProperty.operationType === "VENTA" && selectedProperty.priceSale && (
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-medium">Precio de Venta</span>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(selectedProperty.priceSale, selectedProperty.currency)}
                  </div>
                </div>
              )}
              {selectedProperty.operationType === "VENTA_Y_ALQUILER" && (
                <div>
                  {selectedProperty.priceSale && (
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(selectedProperty.priceSale, selectedProperty.currency)}
                    </div>
                  )}
                  {selectedProperty.priceRent && (
                    <div className="text-sm font-medium text-slate-300">
                      o {formatCurrency(selectedProperty.priceRent, selectedProperty.currency)} / mes
                    </div>
                  )}
                </div>
              )}
              {selectedProperty.maintenanceFee && (
                <div className="text-[11px] text-slate-400 mt-1">
                  Mantenimiento: {formatCurrency(selectedProperty.maintenanceFee, selectedProperty.maintenanceCurrency || "DOP")} / mes
                </div>
              )}
            </div>
          </div>

          {/* Botones de Acción de Cabecera */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 flex-wrap">
            <Button
              size="sm"
              onClick={() => openShowingCreateModal(selectedProperty.id)}
              className="bg-white text-slate-900 hover:bg-slate-100 text-xs font-medium h-8"
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Agendar Visita
            </Button>
            <Button
              size="sm"
              onClick={() => openContractCreateModal(selectedProperty.id)}
              className="bg-slate-800 text-white hover:bg-slate-700 text-xs font-medium h-8 border border-slate-700"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Generar Contrato
            </Button>

            {/* Selector de Cambio de Estado Rápido */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400">Cambiar estado:</span>
              <select
                value={selectedProperty.status}
                onChange={(e) => setPropertyStatus(selectedProperty.id, e.target.value as PropertyStatus)}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-1 focus:outline-none"
              >
                <option value="DISPONIBLE">Disponible</option>
                <option value="RESERVADA">Reservada</option>
                <option value="BAJO_CONTRATO">Bajo Contrato</option>
                <option value="ALQUILADA">Alquilada</option>
                <option value="VENDIDA">Vendida</option>
              </select>
            </div>
          </div>
        </div>

        {/* Galería de Fotos */}
        {selectedProperty.images && selectedProperty.images.length > 0 && (
          <div className="bg-slate-100 p-4 border-b border-slate-200">
            <div className="relative aspect-[16/8] max-h-[340px] w-full rounded-lg overflow-hidden bg-slate-900 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedProperty.images[activeImageIndex] || selectedProperty.images[0]}
                alt={selectedProperty.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-medium backdrop-blur-xs">
                Foto {activeImageIndex + 1} de {selectedProperty.images.length}
              </div>
            </div>

            {/* Miniaturas */}
            {selectedProperty.images.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {selectedProperty.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={cn(
                      "relative w-16 h-12 rounded overflow-hidden shrink-0 border-2 transition-all",
                      activeImageIndex === idx ? "border-slate-900 scale-105 shadow-xs" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navegación de Pestañas Internas */}
        <div className="border-b border-slate-200 px-6 bg-white">
          <nav className="flex space-x-6 text-xs font-medium">
            <button
              onClick={() => setActiveTab("ficha")}
              className={cn(
                "py-3 border-b-2 transition-colors",
                activeTab === "ficha" ? "border-slate-900 text-slate-900 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Ficha Técnica & Ubicación
            </button>
            <button
              onClick={() => setActiveTab("visitas")}
              className={cn(
                "py-3 border-b-2 transition-colors flex items-center gap-1.5",
                activeTab === "visitas" ? "border-slate-900 text-slate-900 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Visitas & Ofertas
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
                {propertyShowings.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("contratos")}
              className={cn(
                "py-3 border-b-2 transition-colors flex items-center gap-1.5",
                activeTab === "contratos" ? "border-slate-900 text-slate-900 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Contratos & Arrendamiento
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
                {propertyContracts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("propietario")}
              className={cn(
                "py-3 border-b-2 transition-colors",
                activeTab === "propietario" ? "border-slate-900 text-slate-900 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Propietario & Captación
            </button>
          </nav>
        </div>

        {/* Contenido de Pestañas */}
        <div className="p-6 space-y-6">
          {/* TAB 1: FICHA TÉCNICA */}
          {activeTab === "ficha" && (
            <div className="space-y-6">
              {/* Cuadrícula de Métricas Principales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <Bed className="h-4 w-4 mx-auto text-slate-500 mb-1" />
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Habitaciones</span>
                  <span className="text-base font-bold text-slate-900">{selectedProperty.bedrooms}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <Bath className="h-4 w-4 mx-auto text-slate-500 mb-1" />
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Baños</span>
                  <span className="text-base font-bold text-slate-900">
                    {selectedProperty.bathrooms}
                    {selectedProperty.halfBathrooms ? `.${selectedProperty.halfBathrooms}` : ""}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <Car className="h-4 w-4 mx-auto text-slate-500 mb-1" />
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Parqueos</span>
                  <span className="text-base font-bold text-slate-900">{selectedProperty.parkingSpaces}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <Maximize2 className="h-4 w-4 mx-auto text-slate-500 mb-1" />
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Construcción</span>
                  <span className="text-base font-bold text-slate-900">
                    {selectedProperty.builtAreaSqm > 0 ? `${selectedProperty.builtAreaSqm} m²` : "-"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center col-span-2">
                  <Building2 className="h-4 w-4 mx-auto text-slate-500 mb-1" />
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Solar / Terreno</span>
                  <span className="text-sm font-bold text-slate-900">
                    {selectedProperty.landAreaSqm > 0
                      ? `${selectedProperty.landAreaSqm.toLocaleString()} m² (${selectedProperty.landAreaTareas.toFixed(2)} Tareas RD)`
                      : "Área común de torre"}
                  </span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">Descripción del Inmueble</h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {selectedProperty.description}
                </p>
              </div>

              {/* Vinculación Catastral (Fase 6 Agrimensura & DNMC) */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-slate-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Vinculación Catastral & Registro Inmobiliario
                    </h4>
                  </div>
                  {selectedProperty.caseId && (
                    <Badge variant="outline" className="text-[10px] bg-white text-slate-700">
                      Caso: {selectedProperty.caseId}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Designación Parcela / Solar</span>
                    <span className="font-semibold text-slate-900">
                      {selectedProperty.cadastralReference?.parcelDesignation || "Por definir en deslinde"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Distrito Catastral</span>
                    <span className="font-semibold text-slate-900">
                      DC {selectedProperty.cadastralReference?.cadastralDistrict || "01"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Matrícula / Certificado de Título</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedProperty.cadastralReference?.titleNumber || "Trámite de emisión"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Amenidades */}
              <div>
                <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">
                  Amenidades y Características ({selectedProperty.amenities.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {selectedProperty.amenities.map((amenity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded bg-white border border-slate-200 text-xs text-slate-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISITAS & OFERTAS */}
          {activeTab === "visitas" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700">
                    Historial de Visitas y Feedback de Prospectos
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Registro de muestras realizadas a este inmueble y ofertas formales recibidas.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openShowingCreateModal(selectedProperty.id)}
                  className="bg-slate-900 text-white text-xs hover:bg-slate-800 h-7"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agendar Nueva Muestra
                </Button>
              </div>

              {propertyShowings.length > 0 ? (
                <div className="space-y-3">
                  {propertyShowings.map((showing) => (
                    <div
                      key={showing.id}
                      className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-xs">
                              {showing.prospectName}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                showing.status === "REALIZADA" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700"
                              )}
                            >
                              {showing.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Fecha: {showing.date} a las {showing.time} • Agente: {showing.assignedAgent}
                          </div>
                        </div>

                        {showing.feedback?.hasOffer && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                              Oferta Presentada
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {formatCurrency(showing.feedback.offeredAmount || 0, showing.feedback.offeredCurrency || "USD")}
                            </span>
                          </div>
                        )}
                      </div>

                      {showing.feedback && (
                        <div className="mt-2 p-2.5 rounded bg-slate-50 text-xs border border-slate-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold text-slate-500">Nivel de Interés:</span>
                            <Badge
                              className={cn(
                                "text-[10px] py-0 px-1.5",
                                showing.feedback.interestLevel === "ALTO"
                                  ? "bg-emerald-700 text-white"
                                  : showing.feedback.interestLevel === "MEDIO"
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-600 text-white"
                              )}
                            >
                              {showing.feedback.interestLevel}
                            </Badge>
                          </div>
                          <p className="text-slate-700 italic">"{showing.feedback.observations}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <Calendar className="h-8 w-8 mx-auto text-slate-400 mb-2 stroke-1" />
                  <p className="text-xs text-slate-600 font-medium">No hay visitas agendadas para este inmueble.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openShowingCreateModal(selectedProperty.id)}
                    className="mt-2 text-xs"
                  >
                    Agendar Primera Visita
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTRATOS */}
          {activeTab === "contratos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700">
                    Contratos de Alquiler o Venta Asociados
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Historial contractual y de arrendamiento formal emitido sobre la propiedad.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openContractCreateModal(selectedProperty.id)}
                  className="bg-slate-900 text-white text-xs hover:bg-slate-800 h-7"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Nuevo Contrato
                </Button>
              </div>

              {propertyContracts.length > 0 ? (
                <div className="space-y-3">
                  {propertyContracts.map((ctr) => (
                    <div
                      key={ctr.id}
                      className="p-4 rounded-lg border border-slate-200 bg-white space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {ctr.contractNumber}
                            </span>
                            <Badge className="bg-slate-900 text-white text-[10px]">
                              {ctr.contractType.replace("_", " ")}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                ctr.status === "VIGENTE" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-amber-50 text-amber-800"
                              )}
                            >
                              {ctr.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {ctr.clientRole === "INQUILINO" ? "Inquilino" : "Comprador"}:{" "}
                            <strong>{ctr.client.name}</strong> ({ctr.client.identificationNumber})
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-bold text-slate-900">
                            {formatCurrency(ctr.amount, ctr.currency)}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {ctr.clientRole === "INQUILINO" ? "/ mes" : "Valor total"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Vigencia</span>
                          <span className="text-slate-800">
                            {ctr.startDate} al {ctr.endDate}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Depósitos / Arras</span>
                          <span className="text-slate-800 font-medium">
                            {ctr.depositAmountTotal ? formatCurrency(ctr.depositAmountTotal, ctr.currency) : "-"}
                            {ctr.depositMonths ? ` (${ctr.depositMonths} meses)` : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Día de Pago & Gracia</span>
                          <span className="text-slate-800">
                            Día {ctr.paymentDayOfMonth || 5} (Gracia: {ctr.graceDays || 5} días)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2 stroke-1" />
                  <p className="text-xs text-slate-600 font-medium">No hay contratos activos para este inmueble.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openContractCreateModal(selectedProperty.id)}
                    className="mt-2 text-xs"
                  >
                    Crear Contrato de Arrendamiento o Venta
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROPIETARIO */}
          {activeTab === "propietario" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {selectedProperty.owner.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedProperty.owner.name}</h4>
                    <span className="text-xs text-slate-500">
                      {selectedProperty.owner.identificationType}: {selectedProperty.owner.identificationNumber}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedProperty.owner.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedProperty.owner.email}</span>
                  </div>
                </div>
              </div>

              {/* Términos de Captación */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-800">Condiciones de Corretaje</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Comisión Pactada</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedProperty.commissionPercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Exclusividad</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedProperty.isExclusive ? "Sí (Exclusiva)" : "No (Abierta)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Agente Asignado</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedProperty.listingAgent.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
