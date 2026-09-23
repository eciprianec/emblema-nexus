"use client";

import React, { useState } from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, Users2, Cpu, FileSignature } from "lucide-react";

export function FieldSessionCreateModal() {
  const {
    isFieldSessionCreateOpen,
    closeFieldSessionCreateModal,
    createFieldSession,
    parcels,
    equipmentList,
    brigadePersonnel,
  } = useSurveyStore();

  const [parcelId, setParcelId] = useState(parcels[0]?.id || "");
  const [sessionCode, setSessionCode] = useState(`JC-2026-00${Math.floor(50 + Math.random() * 40)}`);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [weather, setWeather] = useState("Despejado, vientos suaves");
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [actNumber, setActNumber] = useState(`AL-2026-01${Math.floor(20 + Math.random() * 70)}`);
  const [witnessName, setWitnessName] = useState("");
  const [witnessIdCard, setWitnessIdCard] = useState("");
  const [witnessRelation, setWitnessRelation] = useState("Colindante Norte");
  const [observations, setObservations] = useState("");

  const selectedParcel = parcels.find((p) => p.id === parcelId);

  const togglePersonnel = (id: string) => {
    setSelectedPersonnelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcelId || !sessionCode.trim()) return;

    const assignedBrigade = brigadePersonnel.filter((p) => selectedPersonnelIds.includes(p.id));
    const assignedEquipment = equipmentList.filter((eq) => selectedEquipmentIds.includes(eq.id));

    const witnesses = witnessName.trim()
      ? [
          {
            id: `wit-${Date.now()}`,
            name: witnessName.trim(),
            idCard: witnessIdCard.trim() || "001-0000000-0",
            boundaryRelation: witnessRelation.trim(),
            status: "PRESENTE_CONFORME" as const,
          },
        ]
      : [];

    createFieldSession({
      code: sessionCode.trim(),
      parcelId,
      parcelDesignation: selectedParcel ? selectedParcel.designation : "Parcela no especificada",
      sessionDate,
      weather,
      brigade: assignedBrigade,
      equipment: assignedEquipment,
      actaLinderos: {
        actNumber,
        isSigned: false,
        executionDate: sessionDate,
        witnesses,
        observations: observations.trim() || "Jornada de medición topográfica convocada.",
      },
      status: "PROGRAMADA",
      notes: observations.trim() || undefined,
    });
  };

  return (
    <Dialog
      open={isFieldSessionCreateOpen}
      onOpenChange={(open) => !open && closeFieldSessionCreateModal()}
    >
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-md bg-slate-100 text-slate-800">
                <CalendarPlus className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Programar Jornada de Campo
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Asignación de brigada, instrumental topográfico y preparación de acta de linderos.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Código, Parcela y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sessionCode" className="text-xs font-semibold text-slate-700">
                  Código de Jornada *
                </Label>
                <Input
                  id="sessionCode"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Parcela a Medir *
                </Label>
                <Select value={parcelId} onValueChange={setParcelId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Seleccione la parcela" />
                  </SelectTrigger>
                  <SelectContent>
                    {parcels.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.designation} ({p.municipality}, {p.province})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sessionDate" className="text-xs text-slate-700">
                  Fecha de la Jornada *
                </Label>
                <Input
                  id="sessionDate"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weather" className="text-xs text-slate-700">
                  Pronóstico / Clima Esperado
                </Label>
                <Input
                  id="weather"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Selección de Brigada */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Users2 className="h-3.5 w-3.5" />
                Asignación de Personal de Brigada
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {brigadePersonnel.map((person) => {
                  const isChecked = selectedPersonnelIds.includes(person.id);
                  return (
                    <label
                      key={person.id}
                      className="flex items-center space-x-2 text-xs p-2 rounded border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => togglePersonnel(person.id)}
                      />
                      <div className="truncate">
                        <div className="font-medium text-slate-900 truncate">{person.name}</div>
                        <div className="text-[10px] text-slate-500">{person.role}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Selección de Equipos Topográficos */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Cpu className="h-3.5 w-3.5" />
                Asignación de Instrumental y Receptores
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {equipmentList.map((eq) => {
                  const isChecked = selectedEquipmentIds.includes(eq.id);
                  return (
                    <label
                      key={eq.id}
                      className="flex items-center space-x-2 text-xs p-2 rounded border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleEquipment(eq.id)}
                      />
                      <div className="truncate">
                        <div className="font-medium text-slate-900 truncate">{eq.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          S/N: {eq.serialNumber}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Acta de Linderos Inicial */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileSignature className="h-3.5 w-3.5" />
                  Acta de Linderos Preliminar
                </h4>
                <span className="font-mono text-xs text-slate-600 font-semibold">{actNumber}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="witnessName" className="text-xs text-slate-700">
                    Testigo / Colindante Convocado
                  </Label>
                  <Input
                    id="witnessName"
                    placeholder="Nombre completo"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="witnessIdCard" className="text-xs text-slate-700">
                    Cédula Dominicana
                  </Label>
                  <Input
                    id="witnessIdCard"
                    placeholder="001-XXXXXXX-X"
                    value={witnessIdCard}
                    onChange={(e) => setWitnessIdCard(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="witnessRelation" className="text-xs text-slate-700">
                    Relación de Lindero
                  </Label>
                  <Input
                    id="witnessRelation"
                    placeholder="ej. Colindante Norte"
                    value={witnessRelation}
                    onChange={(e) => setWitnessRelation(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Instrucciones de campo */}
            <div className="space-y-1.5">
              <Label htmlFor="observations" className="text-xs text-slate-700">
                Observaciones e Instrucciones Técnicas
              </Label>
              <Textarea
                id="observations"
                rows={2}
                placeholder="Puntos de referencia CORS, precauciones de acceso, mojones a materializar..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeFieldSessionCreateModal}
              className="text-xs h-8 border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
            >
              Programar Jornada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
