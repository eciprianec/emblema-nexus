"use client";

import React, { useState } from "react";
import { useSurveyStore } from "../store/useSurveyStore";
import { DNMCOperationType, DNMCRegional, DNMCStage } from "../types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, Building, User, Calendar, Plus } from "lucide-react";

export function CadastralFileCreateModal() {
  const { isCadastralCreateOpen, closeCadastralCreateModal, createCadastralFile, parcels } =
    useSurveyStore();

  const [operationType, setOperationType] = useState<DNMCOperationType>("DESLINDE");
  const [fileNumber, setFileNumber] = useState(`DNMC-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [parcelId, setParcelId] = useState(parcels[0]?.id || "");
  const [regional, setRegional] = useState<DNMCRegional>("REGIONAL_CENTRAL");
  const [surveyorName, setSurveyorName] = useState("Lic. Rafael Mejía");
  const [surveyorCodia, setSurveyorCodia] = useState("CODIA #14592");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newspaperName, setNewspaperName] = useState("Listín Diario");
  const [newspaperNoticeDate, setNewspaperNoticeDate] = useState("");
  const [notes, setNotes] = useState("");

  const selectedParcel = parcels.find((p) => p.id === parcelId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileNumber.trim() || !parcelId) return;

    createCadastralFile({
      fileNumber: fileNumber.trim(),
      operationType,
      stage: "SOLICITUD",
      regional,
      surveyorName,
      surveyorCodia,
      parcelId,
      parcelDesignation: selectedParcel ? selectedParcel.designation : "Parcela no especificada",
      clientName: clientName || selectedParcel?.clientName || "Cliente Propietario",
      caseId: selectedParcel?.caseId,
      startDate,
      newspaperNoticeDate: newspaperNoticeDate || undefined,
      newspaperName: newspaperNoticeDate ? newspaperName : undefined,
      objectionPeriodDays: 30,
      objectionDeadline: newspaperNoticeDate
        ? new Date(new Date(newspaperNoticeDate).getTime() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={isCadastralCreateOpen} onOpenChange={(open) => !open && closeCadastralCreateModal()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-md bg-slate-100 text-slate-800">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Radicar Expediente ante la DNMC
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Apertura de trámite oficial ante la Dirección Nacional de Mensuras Catastrales.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Tipo de Operación y No. de Expediente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Tipo de Operación Catastral *
                </Label>
                <Select
                  value={operationType}
                  onValueChange={(v) => setOperationType(v as DNMCOperationType)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESLINDE" className="text-xs">Deslinde</SelectItem>
                    <SelectItem value="SUBDIVISION" className="text-xs">Subdivisión Parcelaria</SelectItem>
                    <SelectItem value="REFUNDICION" className="text-xs">Refundición de Parcelas</SelectItem>
                    <SelectItem value="SANEAMIENTO" className="text-xs">Saneamiento Inmobiliario</SelectItem>
                    <SelectItem value="MENSURA_POR_POSESION" className="text-xs">Mensura por Posesión</SelectItem>
                    <SelectItem value="ACTUALIZACION_PARCELARIA" className="text-xs">Actualización Parcelaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fileNumber" className="text-xs font-semibold text-slate-700">
                  Número de Expediente DNMC *
                </Label>
                <Input
                  id="fileNumber"
                  value={fileNumber}
                  onChange={(e) => setFileNumber(e.target.value)}
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Parcela Vinculada y Dirección Regional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Parcela Asociada *
                </Label>
                <Select value={parcelId} onValueChange={setParcelId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Seleccione la parcela" />
                  </SelectTrigger>
                  <SelectContent>
                    {parcels.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.designation} (D.C. {p.cadastralDistrict} - {p.province})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Dirección Regional DNMC *
                </Label>
                <Select
                  value={regional}
                  onValueChange={(v) => setRegional(v as DNMCRegional)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGIONAL_CENTRAL" className="text-xs">
                      Dir. Regional Central (Distrito Nacional / Sto Dgo)
                    </SelectItem>
                    <SelectItem value="REGIONAL_NORTE" className="text-xs">
                      Dir. Regional Norte (Santiago / Cibao)
                    </SelectItem>
                    <SelectItem value="REGIONAL_ESTE" className="text-xs">
                      Dir. Regional Este (El Seibo / Altagracia)
                    </SelectItem>
                    <SelectItem value="REGIONAL_NORESTE" className="text-xs">
                      Dir. Regional Noreste (San Fco. Macorís)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Profesional y Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="surveyorName" className="text-xs text-slate-700">
                  Agrimensor Responsable
                </Label>
                <Input
                  id="surveyorName"
                  value={surveyorName}
                  onChange={(e) => setSurveyorName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="surveyorCodia" className="text-xs text-slate-700">
                  No. Colegiatura CODIA
                </Label>
                <Input
                  id="surveyorCodia"
                  value={surveyorCodia}
                  onChange={(e) => setSurveyorCodia(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className="text-xs text-slate-700">
                  Cliente / Solicitante
                </Label>
                <Input
                  id="clientName"
                  placeholder={selectedParcel?.clientName || "Nombre del cliente"}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Publicación en Diario y Plazos */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Aviso Periódico y Plazo de Objeciones (Ley 108-05)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">30 Días Reglamentarios</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs text-slate-700">
                    Fecha de Apertura
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newspaperName" className="text-xs text-slate-700">
                    Periódico de Publicación
                  </Label>
                  <Input
                    id="newspaperName"
                    value={newspaperName}
                    onChange={(e) => setNewspaperName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newspaperNoticeDate" className="text-xs text-slate-700">
                    Fecha Publicación Aviso
                  </Label>
                  <Input
                    id="newspaperNoticeDate"
                    type="date"
                    value={newspaperNoticeDate}
                    onChange={(e) => setNewspaperNoticeDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Observaciones técnicas */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs text-slate-700">
                Notas Técnicas / Referencia del Expediente
              </Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Detalles sobre antecedentes, títulos base, juzgado apoderado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeCadastralCreateModal}
              className="text-xs h-8 border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
            >
              Radicar Trámite DNMC
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
