"use client";

import { useState, useEffect } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
import { formatCurrency } from "../types";
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
import { BadgeDollarSign, ShieldCheck, CheckCircle2 } from "lucide-react";

export function CommissionPayModal() {
  const {
    isCommissionPayOpen,
    closeCommissionPayModal,
    selectedCommission,
    settleCommission,
  } = useRealEstateStore();

  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFERENCIA" | "CHEQUE" | "EFECTIVO">("TRANSFERENCIA");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isCommissionPayOpen) {
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("TRANSFERENCIA");
      setPaymentReference("");
      setNotes("");
    }
  }, [isCommissionPayOpen]);

  if (!selectedCommission) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    settleCommission(selectedCommission.id, {
      paymentDate,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={isCommissionPayOpen} onOpenChange={closeCommissionPayModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded bg-slate-900 text-white">
              <BadgeDollarSign className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Liquidar y Registrar Pago de Comisión
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Liquidación neta con retención formal del 10% de ISR dominicano.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Resumen del Desglose Fiscal DGII */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Comisión Ref.:</span>
            <span className="font-mono font-bold text-slate-900">{selectedCommission.commissionNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Agente Beneficiario:</span>
            <span className="font-semibold text-slate-800">{selectedCommission.agentName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Cédula / RNC:</span>
            <span className="font-mono text-slate-700">{selectedCommission.agentRncOrCedula}</span>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Comisión Bruta ({selectedCommission.commissionPercent}%):</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(selectedCommission.grossCommission, selectedCommission.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-amber-700">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Retención 10% ISR (DGII Ley 11-92):
              </span>
              <span className="font-semibold">
                - {formatCurrency(selectedCommission.isrWithholdingAmount, selectedCommission.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Monto Neto a Pagar:</span>
              <span className="text-emerald-700">
                {formatCurrency(selectedCommission.netCommission, selectedCommission.currency)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-700">Fecha de Pago *</Label>
              <Input
                required
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={(val: "TRANSFERENCIA" | "CHEQUE" | "EFECTIVO") => setPaymentMethod(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFERENCIA">Transferencia Bancaria</SelectItem>
                  <SelectItem value="CHEQUE">Cheque Administrativo</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Referencia de Pago / No. Comprobante</Label>
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Ej. BPD-TRF-9923841 o Cheque No. 4410"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-700">Observaciones</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Comprobante de Retención B16 generado ante la DGII..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeCommissionPayModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-700 text-white text-xs hover:bg-emerald-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Marcar como Pagada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
