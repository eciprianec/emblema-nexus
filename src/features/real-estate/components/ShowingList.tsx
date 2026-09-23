"use client";

import { useState, useMemo } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
import {
  RealEstateShowing,
  ShowingStatus,
  formatCurrency,
} from "../types";
import {
  CalendarCheck,
  Search,
  Plus,
  Clock,
  User,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  DollarSign,
  TrendingUp,
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

export function ShowingList() {
  const {
    showings,
    openShowingCreateModal,
    openShowingFeedbackModal,
    openPropertyDetailModal,
    properties,
    updateShowing,
  } = useRealEstateStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredShowings = useMemo(() => {
    return showings.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          s.prospectName.toLowerCase().includes(q) ||
          s.propertyTitle.toLowerCase().includes(q) ||
          s.propertyCode.toLowerCase().includes(q) ||
          s.assignedAgent.toLowerCase().includes(q) ||
          (s.feedback && s.feedback.observations.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;

      return true;
    });
  }, [showings, search, statusFilter]);

  const getStatusBadge = (status: ShowingStatus) => {
    switch (status) {
      case "PROGRAMADA":
        return <Badge className="bg-blue-600 text-white text-[10px]">Programada</Badge>;
      case "REALIZADA":
        return <Badge className="bg-emerald-600 text-white text-[10px]">Realizada</Badge>;
      case "CANCELADA":
        return <Badge className="bg-slate-600 text-white text-[10px]">Cancelada</Badge>;
      case "NO_ASISTIO":
        return <Badge className="bg-amber-600 text-white text-[10px]">No asistió</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por prospecto, inmueble o agente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue placeholder="Estado de visita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las visitas</SelectItem>
                <SelectItem value="PROGRAMADA">Programadas</SelectItem>
                <SelectItem value="REALIZADA">Realizadas</SelectItem>
                <SelectItem value="CANCELADA">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={() => openShowingCreateModal()}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-9 px-3"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Agendar Visita
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Visitas */}
      <div className="space-y-3">
        {filteredShowings.map((showing) => {
          const linkedProp = properties.find((p) => p.id === showing.propertyId);
          return (
            <div
              key={showing.id}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-semibold text-slate-500">
                      [{showing.propertyCode}]
                    </span>
                    {getStatusBadge(showing.status)}
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {showing.date} a las {showing.time}
                    </span>
                    <span className="text-xs text-slate-400">• Agente: {showing.assignedAgent}</span>
                  </div>

                  <h3
                    onClick={() => linkedProp && openPropertyDetailModal(linkedProp)}
                    className="text-sm font-bold text-slate-900 hover:text-blue-900 cursor-pointer flex items-center gap-1.5"
                  >
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {showing.propertyTitle}
                  </h3>

                  <div className="text-xs text-slate-600 flex items-center gap-3 pt-0.5">
                    <span className="font-medium text-slate-900 flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      {showing.prospectName}
                    </span>
                    {showing.prospectPhone && (
                      <span className="text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {showing.prospectPhone}
                      </span>
                    )}
                    {showing.prospectEmail && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {showing.prospectEmail}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openShowingFeedbackModal(showing)}
                    className="h-8 px-2.5 text-xs text-slate-800 border-slate-300 hover:bg-slate-100"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1 text-slate-500" />
                    {showing.feedback ? "Ver / Editar Feedback" : "Ingresar Feedback"}
                  </Button>

                  {showing.status === "PROGRAMADA" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openShowingFeedbackModal(showing)}
                        className="h-8 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                        title="Marcar como Realizada y Registrar Feedback"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateShowing(showing.id, { status: "CANCELADA" })}
                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50"
                        title="Cancelar Visita"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Feedback y Oferta si existe */}
              {showing.feedback && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Interés Manifestado:
                      </span>
                      <Badge
                        className={cn(
                          "text-[10px] py-0 px-2",
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

                    {showing.feedback.hasOffer && (
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>
                          Oferta Formal:{" "}
                          {formatCurrency(
                            showing.feedback.offeredAmount || 0,
                            showing.feedback.offeredCurrency || "USD"
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-slate-700 italic">
                    "{showing.feedback.observations}"
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {filteredShowings.length === 0 && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
            <CalendarCheck className="h-10 w-10 mx-auto text-slate-400 mb-2 stroke-1" />
            <h3 className="text-sm font-semibold text-slate-800">No hay visitas agendadas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Programa visitas y muestras guiadas con prospectos compradores o inquilinos.
            </p>
            <Button
              size="sm"
              onClick={() => openShowingCreateModal()}
              className="mt-4 bg-slate-900 text-white hover:bg-slate-800 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agendar Visita
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
