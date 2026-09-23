"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRealEstateStore } from "../store/useRealEstateStore";
import {
  Property,
  PropertyType,
  PropertyOperation,
  PropertyStatus,
  formatCurrency,
} from "../types";
import {
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Plus,
  Bed,
  Bath,
  Car,
  Maximize2,
  MapPin,
  Sparkles,
  Building,
  CheckCircle,
  Eye,
  Calendar,
  FileText,
  DollarSign,
  Layers,
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

export function PropertyList() {
  const {
    properties,
    openPropertyDetailModal,
    openPropertyCreateModal,
    openShowingCreateModal,
    openContractCreateModal,
  } = useRealEstateStore();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [operationFilter, setOperationFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [bedroomFilter, setBedroomFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      // Búsqueda por texto (código, título, sector, provincia, dirección)
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesQuery =
          prop.code.toLowerCase().includes(query) ||
          prop.title.toLowerCase().includes(query) ||
          prop.sector.toLowerCase().includes(query) ||
          prop.province.toLowerCase().includes(query) ||
          prop.address.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // Filtro por tipo
      if (typeFilter !== "ALL" && prop.propertyType !== typeFilter) {
        return false;
      }

      // Filtro por operación
      if (operationFilter !== "ALL") {
        if (operationFilter === "VENTA" && prop.operationType === "ALQUILER") return false;
        if (operationFilter === "ALQUILER" && prop.operationType === "VENTA") return false;
      }

      // Filtro por estado
      if (statusFilter !== "ALL" && prop.status !== statusFilter) {
        return false;
      }

      // Filtro por habitaciones
      if (bedroomFilter !== "ALL") {
        const minBeds = parseInt(bedroomFilter, 10);
        if (prop.bedrooms < minBeds) return false;
      }

      return true;
    });
  }, [properties, search, typeFilter, operationFilter, statusFilter, bedroomFilter]);

  const getStatusBadge = (status: PropertyStatus) => {
    switch (status) {
      case "DISPONIBLE":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px]">Disponible</Badge>;
      case "RESERVADA":
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700 text-[10px]">Reservada</Badge>;
      case "BAJO_CONTRATO":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-[10px]">Bajo Contrato</Badge>;
      case "ALQUILADA":
        return <Badge className="bg-purple-700 text-white hover:bg-purple-800 text-[10px]">Alquilada</Badge>;
      case "VENDIDA":
        return <Badge className="bg-slate-700 text-white hover:bg-slate-800 text-[10px]">Vendida</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const getOperationBadge = (op: PropertyOperation) => {
    switch (op) {
      case "VENTA":
        return <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">En Venta</span>;
      case "ALQUILER":
        return <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">En Alquiler</span>;
      case "VENTA_Y_ALQUILER":
        return <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Venta / Alquiler</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por código, título, sector (ej. Piantini, Punta Cana)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Selector de Vistas y Botón de Captación */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center border border-slate-200 rounded-md p-0.5 bg-slate-50">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn("h-7 px-2.5 text-xs", viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-600")}
                title="Vista en Cuadrícula"
              >
                <Grid className="h-3.5 w-3.5 mr-1" />
                Tarjetas
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={cn("h-7 px-2.5 text-xs", viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-600")}
                title="Vista en Tabla"
              >
                <ListIcon className="h-3.5 w-3.5 mr-1" />
                Tabla
              </Button>
            </div>

            <Button
              size="sm"
              onClick={openPropertyCreateModal}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-9 px-3"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Captar Propiedad
            </Button>
          </div>
        </div>

        {/* Filtros Selectores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Tipo de Inmueble */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Tipo de Inmueble
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tipos</SelectItem>
                <SelectItem value="APARTAMENTO">Apartamento</SelectItem>
                <SelectItem value="CASA">Casa / Residencia</SelectItem>
                <SelectItem value="VILLA">Villa de Lujo</SelectItem>
                <SelectItem value="PENTHOUSE">Penthouse</SelectItem>
                <SelectItem value="SOLAR">Solar / Terreno</SelectItem>
                <SelectItem value="COMERCIAL">Local Comercial</SelectItem>
                <SelectItem value="OFICINA">Oficina Corporativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Operación */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Operación
            </label>
            <Select value={operationFilter} onValueChange={setOperationFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las operaciones</SelectItem>
                <SelectItem value="VENTA">En Venta</SelectItem>
                <SelectItem value="ALQUILER">En Alquiler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Estado
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Cualquier estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                <SelectItem value="RESERVADA">Reservada</SelectItem>
                <SelectItem value="BAJO_CONTRATO">Bajo Contrato</SelectItem>
                <SelectItem value="ALQUILADA">Alquilada</SelectItem>
                <SelectItem value="VENDIDA">Vendida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Habitaciones */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Habitaciones mínimas
            </label>
            <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Cualquiera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Cualquiera</SelectItem>
                <SelectItem value="1">1+ Habitación</SelectItem>
                <SelectItem value="2">2+ Habitaciones</SelectItem>
                <SelectItem value="3">3+ Habitaciones</SelectItem>
                <SelectItem value="4">4+ Habitaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contador de Resultados */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Mostrando <strong>{filteredProperties.length}</strong> de{" "}
          <strong>{properties.length}</strong> inmuebles en cartera
        </span>
        {(search || typeFilter !== "ALL" || operationFilter !== "ALL" || statusFilter !== "ALL" || bedroomFilter !== "ALL") && (
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("ALL");
              setOperationFilter("ALL");
              setStatusFilter("ALL");
              setBedroomFilter("ALL");
            }}
            className="text-xs text-slate-600 hover:text-slate-900 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProperties.map((prop) => {
            const mainImage = prop.images[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";
            return (
              <div
                key={prop.id}
                onClick={() => openPropertyDetailModal(prop)}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col"
              >
                {/* Imagen Principal con Badges Superpuestos */}
                <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainImage}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                  {/* Badges superiores */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    {getStatusBadge(prop.status)}
                    {prop.isExclusive && (
                      <Badge className="bg-amber-500/90 text-slate-950 font-semibold text-[10px] backdrop-blur-xs flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Exclusiva
                      </Badge>
                    )}
                  </div>

                  {/* Código Superior Derecho */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-950/80 text-white backdrop-blur-xs">
                      {prop.code}
                    </span>
                  </div>

                  {/* Precio e Información en la parte inferior de la foto */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                    <div className="flex items-baseline justify-between">
                      <div>
                        {prop.operationType === "ALQUILER" && prop.priceRent && (
                          <div className="text-xl font-bold tracking-tight">
                            {formatCurrency(prop.priceRent, prop.currency)}
                            <span className="text-xs font-normal text-slate-200"> / mes</span>
                          </div>
                        )}
                        {prop.operationType === "VENTA" && prop.priceSale && (
                          <div className="text-xl font-bold tracking-tight">
                            {formatCurrency(prop.priceSale, prop.currency)}
                          </div>
                        )}
                        {prop.operationType === "VENTA_Y_ALQUILER" && (
                          <div className="text-lg font-bold tracking-tight">
                            {prop.priceSale ? formatCurrency(prop.priceSale, prop.currency) : ""}
                            {prop.priceRent ? ` • ${formatCurrency(prop.priceRent, prop.currency)}/m` : ""}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-200 capitalize">
                        {prop.propertyType.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contenido de la Card */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Ubicación */}
                    <div className="flex items-center text-xs text-slate-500 gap-1 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">
                        {prop.sector}, {prop.municipality}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-2">
                      {prop.title}
                    </h3>
                  </div>

                  {/* Ficha Rápida: Habitaciones, Baños, Parqueos, Metros */}
                  <div className="grid grid-cols-4 gap-2 py-2 border-y border-slate-100 text-slate-600 text-xs text-center">
                    {prop.bedrooms > 0 ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 font-semibold text-slate-900">
                          <Bed className="h-3.5 w-3.5 text-slate-400" />
                          {prop.bedrooms}
                        </div>
                        <span className="text-[10px] text-slate-400">Hab.</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 font-semibold text-slate-900">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {prop.levels || 1}
                        </div>
                        <span className="text-[10px] text-slate-400">Nivel</span>
                      </div>
                    )}

                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 font-semibold text-slate-900">
                        <Bath className="h-3.5 w-3.5 text-slate-400" />
                        {prop.bathrooms}
                      </div>
                      <span className="text-[10px] text-slate-400">Baños</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 font-semibold text-slate-900">
                        <Car className="h-3.5 w-3.5 text-slate-400" />
                        {prop.parkingSpaces}
                      </div>
                      <span className="text-[10px] text-slate-400">Pq.</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 font-semibold text-slate-900">
                        <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                        {prop.builtAreaSqm > 0 ? prop.builtAreaSqm : prop.landAreaSqm}
                      </div>
                      <span className="text-[10px] text-slate-400">m² const.</span>
                    </div>
                  </div>

                  {/* Superficie de solar / Tareas si aplica */}
                  {prop.landAreaSqm > 0 && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded flex items-center justify-between">
                      <span>Solar / Terreno:</span>
                      <span className="font-semibold text-slate-800">
                        {prop.landAreaSqm.toLocaleString()} m² ({prop.landAreaTareas.toFixed(2)} Tareas RD)
                      </span>
                    </div>
                  )}

                  {/* Acciones Rápidas en Footer Card */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 truncate">
                      Agente: {prop.listingAgent.name.split(" ")[1] || prop.listingAgent.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openShowingCreateModal(prop.id);
                        }}
                        className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                        title="Agendar Visita"
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Visita
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPropertyDetailModal(prop);
                        }}
                        className="h-7 px-2 text-xs text-slate-900 font-medium bg-slate-100 hover:bg-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ficha
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Inmueble / Código</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Tipo & Operación</th>
                  <th className="py-3 px-4">Distribución</th>
                  <th className="py-3 px-4">Área m² / Tareas</th>
                  <th className="py-3 px-4">Precio</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.map((prop) => (
                  <tr
                    key={prop.id}
                    onClick={() => openPropertyDetailModal(prop)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={prop.images[0] || ""}
                          alt=""
                          className="w-12 h-10 object-cover rounded shrink-0 border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 line-clamp-1">{prop.title}</div>
                          <div className="text-[11px] font-mono text-slate-500">{prop.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{prop.sector}</div>
                      <div className="text-[11px] text-slate-500">{prop.municipality}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 capitalize">{prop.propertyType.toLowerCase()}</div>
                      <div className="text-[11px] text-slate-500">{getOperationBadge(prop.operationType)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700">
                        {prop.bedrooms > 0 ? `${prop.bedrooms} Hab • ` : ""}
                        {prop.bathrooms} Baños • {prop.parkingSpaces} Pq.
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-medium">
                        {prop.builtAreaSqm > 0 ? `${prop.builtAreaSqm} m² const.` : `${prop.landAreaSqm} m² solar`}
                      </div>
                      {prop.landAreaSqm > 0 && (
                        <div className="text-[11px] text-slate-500">
                          {prop.landAreaTareas.toFixed(2)} Tareas RD
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {prop.operationType === "ALQUILER" && prop.priceRent
                          ? `${formatCurrency(prop.priceRent, prop.currency)}/m`
                          : prop.priceSale
                          ? formatCurrency(prop.priceSale, prop.currency)
                          : "-"}
                      </div>
                      {prop.maintenanceFee && (
                        <div className="text-[10px] text-slate-500">
                          Mant: {formatCurrency(prop.maintenanceFee, prop.maintenanceCurrency || "DOP")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(prop.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openShowingCreateModal(prop.id);
                          }}
                          className="h-7 px-2 text-xs"
                          title="Agendar Visita"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPropertyDetailModal(prop);
                          }}
                          className="h-7 px-2.5 text-xs text-slate-900 border-slate-300"
                        >
                          Ver
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProperties.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
          <Building className="h-10 w-10 mx-auto text-slate-400 mb-2 stroke-1" />
          <h3 className="text-sm font-semibold text-slate-800">No se encontraron propiedades</h3>
          <p className="text-xs text-slate-500 mt-1">
            Prueba a cambiar los filtros o el término de búsqueda para ver más inmuebles.
          </p>
          <Button
            size="sm"
            onClick={openPropertyCreateModal}
            className="mt-4 bg-slate-900 text-white hover:bg-slate-800 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Captar Nueva Propiedad
          </Button>
        </div>
      )}
    </div>
  );
}
