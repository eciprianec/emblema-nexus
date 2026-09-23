"use client";

import { useState, useEffect } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarCheck, Building2, User, Clock } from "lucide-react";

export function ShowingCreateModal() {
  const {
    isShowingCreateOpen,
    closeShowingCreateModal,
    properties,
    selectedProperty,
    addShowing,
  } = useRealEstateStore();

  const [propertyId, setPropertyId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [prospectName, setProspectName] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [assignedAgent, setAssignedAgent] = useState("Lic. Claudia Reynoso");

  useEffect(() => {
    if (selectedProperty) {
      setPropertyId(selectedProperty.id);
      setAssignedAgent(selectedProperty.listingAgent.name);
    }
  }, [selectedProperty, isShowingCreateOpen]);

  useEffect(() => {
    if (isShowingCreateOpen && !date) {
      // Siguiente día hábil por defecto
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setDate(d.toISOString().split("T")[0]);
    }
  }, [isShowingCreateOpen, date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) {
      alert("Por favor selecciona una propiedad.");
      return;
    }

    addShowing({
      propertyId: prop.id,
      propertyCode: prop.code,
      propertyTitle: prop.title,
      date,
      time,
      status: "PROGRAMADA",
      prospectName: prospectName.trim(),
      prospectPhone: prospectPhone.trim(),
      prospectEmail: prospectEmail.trim(),
      assignedAgent,
    });

    closeShowingCreateModal();
    // Limpiar formulario
    setProspectName("");
    setProspectPhone("");
    setProspectEmail("");
  };

  return (
    <Dialog open={isShowingCreateOpen} onOpenChange={closeShowingCreateModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded bg-slate-900 text-white">
              <CalendarCheck className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Agendar Muestra / Visita Inmobiliaria
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Coordina una visita con el cliente interesado y asigna el agente inmobiliario.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <Label className="text-xs text-slate-700">Inmueble a Mostrar *</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar propiedad..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    [{p.code}] {p.title} ({p.sector})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-700">Fecha de Visita *</Label>
              <Input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Hora *</Label>
              <Input
                required
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Datos del Prospecto */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-600" />
              Datos del Prospecto / Cliente
            </span>

            <div>
              <Label className="text-xs text-slate-700">Nombre Completo *</Label>
              <Input
                required
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                placeholder="Ej. Ing. Roberto Tavárez"
                className="h-8 text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-slate-700">Teléfono / WhatsApp</Label>
                <Input
                  value={prospectPhone}
                  onChange={(e) => setProspectPhone(e.target.value)}
                  placeholder="+1 (809) 555-7123"
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-700">Correo Electrónico</Label>
                <Input
                  type="email"
                  value={prospectEmail}
                  onChange={(e) => setProspectEmail(e.target.value)}
                  placeholder="prospecto@email.com"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Agente Inmobiliario Asignado</Label>
            <Select value={assignedAgent} onValueChange={setAssignedAgent}>
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

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeShowingCreateModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-slate-900 text-white text-xs hover:bg-slate-800"
            >
              Confirmar y Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
