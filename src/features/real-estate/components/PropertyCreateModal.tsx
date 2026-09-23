"use client";

import { useState, useEffect } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
import { useSurveyStore } from "@/features/survey/store/useSurveyStore";
import {
  PropertyType,
  PropertyOperation,
  Currency,
  sqmToTareas,
  DOMINICAN_TAREA_SQM,
} from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  MapPin,
  Sparkles,
  UserCheck,
  Check,
  DollarSign,
  Compass,
} from "lucide-react";

const AVAILABLE_AMENITIES = [
  "Piscina",
  "Piscina Infinity",
  "Gimnasio Equipado",
  "Ascensor",
  "2+ Ascensores",
  "Planta Eléctrica Full",
  "Seguridad 24/7",
  "Lobby Climatizado",
  "Gas Común con Medidor",
  "Balcón",
  "Terraza Privada",
  "Jacuzzi",
  "Portón Eléctrico",
  "Locker / Depósito",
  "Cuarto de Servicio con Baño",
  "Estar Familiar",
  "Cocina Caliente",
  "Área Infantil",
  "Salón Multiuso",
  "Cámaras de Seguridad CCTV",
  "Pozo de Agua Tubular",
  "Deslinde Aprobado",
];

const DOMINICAN_SECTORS = [
  { sector: "Piantini", municipality: "Santo Domingo", province: "Distrito Nacional" },
  { sector: "Bella Vista Sur", municipality: "Santo Domingo", province: "Distrito Nacional" },
  { sector: "Naco", municipality: "Santo Domingo", province: "Distrito Nacional" },
  { sector: "Arroyo Hondo", municipality: "Santo Domingo", province: "Distrito Nacional" },
  { sector: "Evaristo Morales", municipality: "Santo Domingo", province: "Distrito Nacional" },
  { sector: "La Julia", municipality: "Santo Domingo", province: "Distrito Nacional" },
  { sector: "Punta Cana Resort", municipality: "Higüey", province: "La Altagracia" },
  { sector: "Cap Cana", municipality: "Higüey", province: "La Altagracia" },
  { sector: "Bávaro", municipality: "Higüey", province: "La Altagracia" },
  { sector: "Casa de Campo", municipality: "La Romana", province: "La Romana" },
  { sector: "Las Terrenas", municipality: "Las Terrenas", province: "Samaná" },
  { sector: "Cerros de Gurabo", municipality: "Santiago de los Caballeros", province: "Santiago" },
];

export function PropertyCreateModal() {
  const { isPropertyCreateOpen, closePropertyCreateModal, addProperty } = useRealEstateStore();
  
  // Opcional: Obtener parcelas registradas en Agrimensura (Fase 6)
  const surveyParcels = useSurveyStore((state) => state.parcels) || [];

  const [activeTab, setActiveTab] = useState<"general" | "dimensions" | "amenities" | "owner">("general");

  // Campos del formulario
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("APARTAMENTO");
  const [operationType, setOperationType] = useState<PropertyOperation>("VENTA");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [priceSale, setPriceSale] = useState<string>("");
  const [priceRent, setPriceRent] = useState<string>("");
  const [maintenanceFee, setMaintenanceFee] = useState<string>("");

  // Dimensiones y ubicación
  const [builtAreaSqm, setBuiltAreaSqm] = useState<string>("");
  const [landAreaSqm, setLandAreaSqm] = useState<string>("");
  const [bedrooms, setBedrooms] = useState<string>("3");
  const [bathrooms, setBathrooms] = useState<string>("2");
  const [halfBathrooms, setHalfBathrooms] = useState<string>("1");
  const [parkingSpaces, setParkingSpaces] = useState<string>("2");
  const [levels, setLevels] = useState<string>("1");
  const [floorNumber, setFloorNumber] = useState<string>("1");

  const [province, setProvince] = useState("Distrito Nacional");
  const [municipality, setMunicipality] = useState("Santo Domingo");
  const [sector, setSector] = useState("Piantini");
  const [address, setAddress] = useState("");

  // Vinculación Catastral
  const [selectedParcelId, setSelectedParcelId] = useState<string>("");
  const [titleNumber, setTitleNumber] = useState("");
  const [parcelDesignation, setParcelDesignation] = useState("");

  // Amenidades seleccionadas
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "Planta Eléctrica Full",
    "Seguridad 24/7",
    "Ascensor",
    "Lobby Climatizado",
  ]);

  // Captador y Comisión
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerIdType, setOwnerIdType] = useState<"CEDULA" | "RNC" | "PASAPORTE">("CEDULA");
  const [ownerIdNumber, setOwnerIdNumber] = useState("");
  const [commissionPercent, setCommissionPercent] = useState<string>("5.0");
  const [isExclusive, setIsExclusive] = useState<boolean>(true);
  const [agentName, setAgentName] = useState("");

  // Reactividad instantánea m² a Tareas dominicanas
  const numericLandSqm = parseFloat(landAreaSqm) || 0;
  const calculatedTareas = sqmToTareas(numericLandSqm);

  // Inicializar código sugerido al abrir
  useEffect(() => {
    if (isPropertyCreateOpen && !code) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setCode(`PROP-${new Date().getFullYear()}-${randomSuffix}`);
    }
  }, [isPropertyCreateOpen, code]);

  // Si selecciona una parcela de agrimensura, autollenar datos catastrales
  const handleParcelSelect = (parcelId: string) => {
    setSelectedParcelId(parcelId);
    const found = surveyParcels.find((p) => p.id === parcelId);
    if (found) {
      setParcelDesignation(found.designation);
      setTitleNumber(found.titleNumber || "");
      if (found.province) setProvince(found.province);
      if (found.municipality) setMunicipality(found.municipality);
      if (found.sector) setSector(found.sector);
      if (found.areaSqm && !landAreaSqm) {
        setLandAreaSqm(found.areaSqm.toString());
      }
    }
  };

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSectorChange = (sectorName: string) => {
    setSector(sectorName);
    const found = DOMINICAN_SECTORS.find((s) => s.sector === sectorName);
    if (found) {
      setMunicipality(found.municipality);
      setProvince(found.province);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !code.trim()) {
      alert("Por favor completa al menos el código y el título del inmueble.");
      return;
    }

    addProperty({
      code: code.trim(),
      title: title.trim(),
      description: description.trim() || "Propiedad captada en cartera formal de Emblema Nexus.",
      propertyType,
      operationType,
      status: "DISPONIBLE",
      currency,
      priceSale: priceSale ? parseFloat(priceSale) : undefined,
      priceRent: priceRent ? parseFloat(priceRent) : undefined,
      maintenanceFee: maintenanceFee ? parseFloat(maintenanceFee) : undefined,
      maintenanceCurrency: currency,
      bedrooms: parseInt(bedrooms, 10) || 0,
      bathrooms: parseInt(bathrooms, 10) || 1,
      halfBathrooms: parseInt(halfBathrooms, 10) || 0,
      parkingSpaces: parseInt(parkingSpaces, 10) || 0,
      levels: parseInt(levels, 10) || 1,
      floorNumber: parseInt(floorNumber, 10) || 1,
      builtAreaSqm: parseFloat(builtAreaSqm) || 0,
      landAreaSqm: numericLandSqm,
      landAreaTareas: calculatedTareas,
      province,
      municipality,
      sector,
      address: address.trim() || `${sector}, ${municipality}`,
      cadastralReference: {
        parcelDesignation: parcelDesignation || undefined,
        titleNumber: titleNumber || undefined,
        surveyParcelId: selectedParcelId || undefined,
      },
      amenities: selectedAmenities,
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      ],
      isExclusive,
      commissionPercent: parseFloat(commissionPercent) || 5.0,
      owner: {
        name: ownerName.trim() || "Propietario Registrado",
        phone: ownerPhone.trim() || "+1 (809) 555-0000",
        email: ownerEmail.trim() || "propietario@cliente.com",
        identificationType: ownerIdType,
        identificationNumber: ownerIdNumber.trim() || "001-0000000-0",
      },
      listingAgent: {
        id: "agent-1",
        name: agentName,
        email: "creynoso@emblemanexus.com",
        phone: "+1 (809) 555-8821",
      },
    });

    closePropertyCreateModal();
  };

  return (
    <Dialog open={isPropertyCreateOpen} onOpenChange={closePropertyCreateModal}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded bg-slate-900 text-white">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Captación de Nueva Propiedad
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Registro integral de inmueble en cartera con especificaciones, ubicación dominicana y vinculación catastral.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Pestañas del Formulario */}
        <div className="flex border-b border-slate-200 text-xs font-medium space-x-4 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "general"
                ? "border-slate-900 text-slate-900 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            1. Datos Generales & Precios
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dimensions")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "dimensions"
                ? "border-slate-900 text-slate-900 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            2. Dimensiones, Ubicación & Catastro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("amenities")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "amenities"
                ? "border-slate-900 text-slate-900 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            3. Amenidades ({selectedAmenities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("owner")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "owner"
                ? "border-slate-900 text-slate-900 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            4. Propietario & Comisión
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Código de Inmueble *</Label>
                  <Input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PROP-2026-001"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Inmueble *</Label>
                  <Select value={propertyType} onValueChange={(val: PropertyType) => setPropertyType(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APARTAMENTO">Apartamento</SelectItem>
                      <SelectItem value="CASA">Casa / Residencia</SelectItem>
                      <SelectItem value="VILLA">Villa de Lujo</SelectItem>
                      <SelectItem value="PENTHOUSE">Penthouse</SelectItem>
                      <SelectItem value="SOLAR">Solar / Terreno</SelectItem>
                      <SelectItem value="COMERCIAL">Local Comercial</SelectItem>
                      <SelectItem value="OFICINA">Oficina Corporativa</SelectItem>
                      <SelectItem value="NAVE_INDUSTRIAL">Nave Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Operación *</Label>
                  <Select value={operationType} onValueChange={(val: PropertyOperation) => setOperationType(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VENTA">Venta</SelectItem>
                      <SelectItem value="ALQUILER">Alquiler</SelectItem>
                      <SelectItem value="VENTA_Y_ALQUILER">Venta y Alquiler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Título de la Propiedad *</Label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Penthouse con Terraza Privada en Torre Piantini Luxury"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Descripción Comercial</Label>
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalla las virtudes, acabados de primera, vistas, amenidades y beneficios del inmueble..."
                  className="text-xs"
                />
              </div>

              {/* Precios y Moneda */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-slate-600" />
                    Valores Financieros y Moneda
                  </span>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500">Moneda:</Label>
                    <div className="flex border border-slate-300 rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCurrency("USD")}
                        className={`px-2 py-0.5 text-xs font-bold ${
                          currency === "USD" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                        }`}
                      >
                        USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrency("DOP")}
                        className={`px-2 py-0.5 text-xs font-bold ${
                          currency === "DOP" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                        }`}
                      >
                        DOP
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(operationType === "VENTA" || operationType === "VENTA_Y_ALQUILER") && (
                    <div>
                      <Label className="text-xs text-slate-700">Precio de Venta ({currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        value={priceSale}
                        onChange={(e) => setPriceSale(e.target.value)}
                        placeholder="Ej. 780000"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

                  {(operationType === "ALQUILER" || operationType === "VENTA_Y_ALQUILER") && (
                    <div>
                      <Label className="text-xs text-slate-700">Canon de Alquiler Mensual ({currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="50"
                        value={priceRent}
                        onChange={(e) => setPriceRent(e.target.value)}
                        placeholder="Ej. 2500"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-slate-700">Mantenimiento Mensual ({currency})</Label>
                    <Input
                      type="number"
                      min="0"
                      value={maintenanceFee}
                      onChange={(e) => setMaintenanceFee(e.target.value)}
                      placeholder="Ej. 25000"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIMENSIONES & UBICACIÓN */}
          {activeTab === "dimensions" && (
            <div className="space-y-4">
              {/* Bloque Dimensiones */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <span className="font-semibold text-slate-800 block">
                  Metros Cuadrados y Conversión a Tareas Dominicanas
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-700">Área de Construcción (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={builtAreaSqm}
                      onChange={(e) => setBuiltAreaSqm(e.target.value)}
                      placeholder="Ej. 480"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-700">Área de Solar / Terreno (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={landAreaSqm}
                      onChange={(e) => setLandAreaSqm(e.target.value)}
                      placeholder="Ej. 1257.72"
                      className="h-8 text-xs font-mono"
                    />
                    {numericLandSqm > 0 && (
                      <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                        Equivalente: <strong>{calculatedTareas} Tareas dominicanas</strong> (1 Tarea = {DOMINICAN_TAREA_SQM} m²)
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <Label className="text-[11px] text-slate-600">Habitaciones</Label>
                    <Input
                      type="number"
                      min="0"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-600">Baños Completos</Label>
                    <Input
                      type="number"
                      min="0"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-600">Medios Baños</Label>
                    <Input
                      type="number"
                      min="0"
                      value={halfBathrooms}
                      onChange={(e) => setHalfBathrooms(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-600">Parqueos</Label>
                    <Input
                      type="number"
                      min="0"
                      value={parkingSpaces}
                      onChange={(e) => setParkingSpaces(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-3">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-600" />
                  Ubicación Geográfica en República Dominicana
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-700">Sector Conocido</Label>
                    <Select value={sector} onValueChange={handleSectorChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOMINICAN_SECTORS.map((s) => (
                          <SelectItem key={s.sector} value={s.sector}>
                            {s.sector} ({s.municipality})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-700">Municipio</Label>
                    <Input
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-700">Provincia</Label>
                    <Input
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-700">Dirección Exacta / Edificio / Torre</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej. Calle Federico Geraldino esq. Victor Garrido Puello, Torre Horizon"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Vinculación Catastral (Fase 6 Agrimensura) */}
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-950 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-blue-700" />
                    Vinculación Catastral & Matrícula de Título
                  </span>
                  <Badge variant="outline" className="bg-white text-[10px] text-blue-800 border-blue-300">
                    Módulo Agrimensura / DNMC
                  </Badge>
                </div>

                {surveyParcels.length > 0 && (
                  <div>
                    <Label className="text-xs text-blue-900">Seleccionar Parcela Registrada en el Sistema</Label>
                    <Select value={selectedParcelId} onValueChange={handleParcelSelect}>
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Vincular con una parcela existente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {surveyParcels.map((parcel) => (
                          <SelectItem key={parcel.id} value={parcel.id}>
                            {parcel.designation} — DC {parcel.cadastralDistrict} ({parcel.areaSqm} m²)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-700">Designación Parcela / Solar</Label>
                    <Input
                      value={parcelDesignation}
                      onChange={(e) => setParcelDesignation(e.target.value)}
                      placeholder="Ej. Parcela 15-Ref (Porción B)"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-700">Matrícula / Certificado de Título</Label>
                    <Input
                      value={titleNumber}
                      onChange={(e) => setTitleNumber(e.target.value)}
                      placeholder="Ej. 0100234589"
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AMENIDADES */}
          {activeTab === "amenities" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-800">
                  Selecciona las amenidades y características incluidas:
                </Label>
                <p className="text-[11px] text-slate-500">
                  Haz clic sobre los chips para activar o desactivar cada característica del inmueble.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {AVAILABLE_AMENITIES.map((amenity) => {
                  const isSelected = selectedAmenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => handleToggleAmenity(amenity)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                        isSelected
                          ? "bg-slate-900 text-white font-medium shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      )}
                      {amenity}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PROPIETARIO & COMISIÓN */}
          {activeTab === "owner" && (
            <div className="space-y-4">
              {/* Datos del Propietario */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-slate-600" />
                  Datos del Propietario (Cliente Emblema Nexus)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-700">Nombre Completo / Razón Social *</Label>
                    <Input
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Ej. Dr. Alejandro Vicini Morales"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-700">Teléfono de Contacto</Label>
                    <Input
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="+1 (809) 555-0142"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-700">Tipo de Documento</Label>
                    <Select value={ownerIdType} onValueChange={(v: "CEDULA" | "RNC" | "PASAPORTE") => setOwnerIdType(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CEDULA">Cédula Dominicana</SelectItem>
                        <SelectItem value="RNC">RNC (Empresa)</SelectItem>
                        <SelectItem value="PASAPORTE">Pasaporte Extranjero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-700">Número de Identificación</Label>
                    <Input
                      value={ownerIdNumber}
                      onChange={(e) => setOwnerIdNumber(e.target.value)}
                      placeholder="001-0987654-3"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-700">Correo Electrónico</Label>
                    <Input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="propietario@correo.com"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Captador y Comisión */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <span className="font-semibold text-slate-800 block">
                  Condiciones de Captación & Corretaje
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-700">Agente Captador Responsable</Label>
                    <Select value={agentName} onValueChange={setAgentName}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lic. Claudia Reynoso">Lic. Claudia Reynoso</SelectItem>
                        <SelectItem value="Lic. Marcos Santana">Lic. Marcos Santana</SelectItem>
                        <SelectItem value="Lic. Rodríguez">Lic. Rodríguez</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700">% Comisión Pactada</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="20"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="5.0"
                      className="h-8 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Estándar: 5% venta, 1 mes de renta en alquileres residenciales.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                  <Checkbox
                    id="exclusive"
                    checked={isExclusive}
                    onCheckedChange={(checked) => setIsExclusive(checked === true)}
                  />
                  <label htmlFor="exclusive" className="text-xs font-medium text-slate-800 cursor-pointer">
                    Captación en Contrato de Exclusividad con Emblema Nexus
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closePropertyCreateModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              {activeTab !== "general" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "dimensions") setActiveTab("general");
                    if (activeTab === "amenities") setActiveTab("dimensions");
                    if (activeTab === "owner") setActiveTab("amenities");
                  }}
                  className="text-xs text-slate-600"
                >
                  Anterior
                </Button>
              )}
              {activeTab !== "owner" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "general") setActiveTab("dimensions");
                    if (activeTab === "dimensions") setActiveTab("amenities");
                    if (activeTab === "amenities") setActiveTab("owner");
                  }}
                  className="bg-slate-900 text-white text-xs hover:bg-slate-800"
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  className="bg-slate-900 text-white text-xs hover:bg-slate-800"
                >
                  Registrar e Incorporar a Cartera
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
