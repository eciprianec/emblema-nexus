"use client";

import { useState, useEffect } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
import { Currency, formatCurrency } from "../types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, DollarSign, CheckCircle2 } from "lucide-react";

export function ShowingFeedbackModal() {
  const {
    isShowingFeedbackOpen,
    closeShowingFeedbackModal,
    selectedShowing,
    recordShowingFeedback,
  } = useRealEstateStore();

  const [interestLevel, setInterestLevel] = useState<"ALTO" | "MEDIO" | "BAJO" | "DESCARTADO">("ALTO");
  const [observations, setObservations] = useState("");
  const [hasOffer, setHasOffer] = useState(false);
  const [offeredAmount, setOfferedAmount] = useState("");
  const [offeredCurrency, setOfferedCurrency] = useState<Currency>("USD");

  useEffect(() => {
    if (selectedShowing?.feedback) {
      setInterestLevel(selectedShowing.feedback.interestLevel);
      setObservations(selectedShowing.feedback.observations);
      setHasOffer(selectedShowing.feedback.hasOffer);
      setOfferedAmount(selectedShowing.feedback.offeredAmount ? selectedShowing.feedback.offeredAmount.toString() : "");
      if (selectedShowing.feedback.offeredCurrency) {
        setOfferedCurrency(selectedShowing.feedback.offeredCurrency);
      }
    } else {
      setInterestLevel("ALTO");
      setObservations("");
      setHasOffer(false);
      setOfferedAmount("");
      setOfferedCurrency("USD");
    }
  }, [selectedShowing, isShowingFeedbackOpen]);

  if (!selectedShowing) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    recordShowingFeedback(selectedShowing.id, {
      interestLevel,
      observations: observations.trim() || "Visita realizada sin comentarios adicionales.",
      hasOffer,
      offeredAmount: hasOffer && offeredAmount ? parseFloat(offeredAmount) : undefined,
      offeredCurrency: hasOffer ? offeredCurrency : undefined,
      feedbackDate: new Date().toISOString(),
    });

    closeShowingFeedbackModal();
  };

  return (
    <Dialog open={isShowingFeedbackOpen} onOpenChange={closeShowingFeedbackModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded bg-slate-900 text-white">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Feedback de Visita Inmobiliaria
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Registra la retroalimentación y ofertas del prospecto <strong>{selectedShowing.prospectName}</strong>.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Propiedad Mostrada</span>
            <span className="text-xs font-bold text-slate-800">
              [{selectedShowing.propertyCode}] {selectedShowing.propertyTitle}
            </span>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Nivel de Interés del Prospecto *</Label>
            <Select
              value={interestLevel}
              onValueChange={(val: "ALTO" | "MEDIO" | "BAJO" | "DESCARTADO") => setInterestLevel(val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALTO">Alto — Prospecto muy interesado / caliente</SelectItem>
                <SelectItem value="MEDIO">Medio — Evaluando otras opciones de la zona</SelectItem>
                <SelectItem value="BAJO">Bajo — Pocas probabilidades de avance</SelectItem>
                <SelectItem value="DESCARTADO">Descartado — No cumple con sus criterios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Observaciones y Comentarios del Prospecto *</Label>
            <Textarea
              required
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Detalla qué le gustó, qué objeciones tuvo (distribución, precio, iluminación, parqueos)..."
              className="text-xs"
            />
          </div>

          {/* Oferta formal */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasOffer"
                checked={hasOffer}
                onCheckedChange={(checked) => setHasOffer(checked === true)}
              />
              <label htmlFor="hasOffer" className="text-xs font-semibold text-slate-800 cursor-pointer">
                ¿El prospecto presentó o verbalizó una oferta económica?
              </label>
            </div>

            {hasOffer && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <Label className="text-[11px] text-slate-600">Moneda de la Oferta</Label>
                  <Select value={offeredCurrency} onValueChange={(val: Currency) => setOfferedCurrency(val)}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="DOP">DOP (RD$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600">Monto Ofertado</Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    value={offeredAmount}
                    onChange={(e) => setOfferedAmount(e.target.value)}
                    placeholder="Ej. 740000"
                    className="h-8 text-xs bg-white font-mono font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeShowingFeedbackModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-slate-900 text-white text-xs hover:bg-slate-800"
            >
              Guardar Retroalimentación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
