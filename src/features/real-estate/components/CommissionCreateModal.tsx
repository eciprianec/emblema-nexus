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
import { BadgeDollarSign, ShieldCheck, DollarSign } from "lucide-react";

export function CommissionCreateModal() {
  const {
    isCommissionCreateOpen,
    closeCommissionCreateModal,
    properties,
    contracts,
    selectedProperty,
    addCommission,
  } = useRealEstateStore();

  const [commissionNumber, setCommissionNumber] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [contractId, setContractId] = useState("");
  const [operationType, setOperationType] = useState<"VENTA" | "ALQUILER">("VENTA");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [transactionAmount, setTransactionAmount] = useState<string>("");
  const [commissionPercent, setCommissionPercent] = useState<string>("5.0");
  const [agentName, setAgentName] = useState("");
  const [agentRncOrCedula, setAgentRncOrCedula] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (selectedProperty) {
      setPropertyId(selectedProperty.id);
      setCurrency(selectedProperty.currency);
      setCommissionPercent(selectedProperty.commissionPercent.toString());
      setAgentName(selectedProperty.listingAgent.name);
      if (selectedProperty.operationType === "ALQUILER") {
        setOperationType("ALQUILER");
        if (selectedProperty.priceRent) {
          // Base anual
          setTransactionAmount((selectedProperty.priceRent * 12).toString());
        }
      } else {
        setOperationType("VENTA");
        if (selectedProperty.priceSale) {
          setTransactionAmount(selectedProperty.priceSale.toString());
        }
      }
    }
  }, [selectedProperty, isCommissionCreateOpen]);

  useEffect(() => {
    if (isCommissionCreateOpen && !commissionNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(100 + Math.random() * 900);
      setCommissionNumber(`COM-${year}-${random}`);
    }
  }, [isCommissionCreateOpen, commissionNumber]);

  const handlePropertyChange = (pId: string) => {
    setPropertyId(pId);
    const prop = properties.find((p) => p.id === pId);
    if (prop) {
      setCurrency(prop.currency);
      setCommissionPercent(prop.commissionPercent.toString());
      setAgentName(prop.listingAgent.name);
      if (prop.operationType === "ALQUILER") {
        setOperationType("ALQUILER");
        if (prop.priceRent) setTransactionAmount((prop.priceRent * 12).toString());
      } else {
        setOperationType("VENTA");
        if (prop.priceSale) setTransactionAmount(prop.priceSale.toString());
      }
    }
  };

  const numericBase = parseFloat(transactionAmount) || 0;
  const numericPercent = parseFloat(commissionPercent) || 0;
  const grossCommission = (numericBase * numericPercent) / 100;
  const isrWithholding = grossCommission * 0.10; // 10% ISR DGII
  const netCommission = grossCommission - isrWithholding;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) {
      alert("Por favor selecciona un inmueble.");
      return;
    }

    const linkedContract = contracts.find((c) => c.id === contractId);

    addCommission({
      commissionNumber: commissionNumber.trim(),
      propertyId: prop.id,
      propertyCode: prop.code,
      propertyTitle: prop.title,
      contractId: linkedContract ? linkedContract.id : undefined,
      contractNumber: linkedContract ? linkedContract.contractNumber : undefined,
      operationType,
      currency,
      transactionAmount: numericBase,
      commissionPercent: numericPercent,
      grossCommission,
      isrWithholdingRate: 0.10,
      isrWithholdingAmount: isrWithholding,
      netCommission,
      agentName: agentName.trim(),
      agentRncOrCedula: agentRncOrCedula.trim(),
      status: "PENDIENTE",
      notes: notes.trim() || undefined,
    });

    closeCommissionCreateModal();
  };

  return (
    <Dialog open={isCommissionCreateOpen} onOpenChange={closeCommissionCreateModal}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded bg-slate-900 text-white">
              <BadgeDollarSign className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Registrar Comisión de Corretaje Inmobiliario
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Cálculo automatizado con retención legal del 10% de ISR para personas físicas ante la DGII.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-700">Número de Comisión</Label>
              <Input
                required
                value={commissionNumber}
                onChange={(e) => setCommissionNumber(e.target.value)}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Tipo de Operación</Label>
              <Select value={operationType} onValueChange={(val: "VENTA" | "ALQUILER") => setOperationType(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENTA">Venta de Inmueble</SelectItem>
                  <SelectItem value="ALQUILER">Arrendamiento / Alquiler</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Inmueble Vinculado *</Label>
            <Select value={propertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar propiedad..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    [{p.code}] {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Contrato Asociado (Opcional)</Label>
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar contrato existente si aplica..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sin contrato formal vinculado</SelectItem>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    [{c.contractNumber}] {c.propertyTitle} ({c.client.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cálculo Financiero y Retención DGII */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <span className="font-semibold text-slate-800 block">
              Monto Base y Liquidación de Retención de ISR
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-700">Moneda</Label>
                <Select value={currency} onValueChange={(val: Currency) => setCurrency(val)}>
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
                <Label className="text-xs text-slate-700">Monto Base Transacción *</Label>
                <Input
                  required
                  type="number"
                  min="0"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="340000"
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-700">% Comisión Acordado</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.5"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  placeholder="5.0"
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>
            </div>

            {/* Desglose Reactivo */}
            <div className="p-3 rounded bg-white border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span>Comisión Bruta Pactada ({numericPercent}%):</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(grossCommission, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-amber-700">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Retención 10% ISR DGII (Ley 11-92 Personas Físicas):
                </span>
                <span className="font-bold font-mono">
                  - {formatCurrency(isrWithholding, currency)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold">
                <span className="text-slate-900">Monto Neto a Liquidar al Agente:</span>
                <span className="text-emerald-700 font-mono">
                  {formatCurrency(netCommission, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Datos del Agente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-700">Agente Inmobiliario Beneficiario *</Label>
              <Input
                required
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Lic. Claudia Reynoso"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Cédula o RNC del Agente *</Label>
              <Input
                required
                value={agentRncOrCedula}
                onChange={(e) => setAgentRncOrCedula(e.target.value)}
                placeholder="001-1928374-5"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Notas / Términos de Pago</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Liquidar contra desembolso inicial del cliente en cuenta fiduciaria..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeCommissionCreateModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-slate-900 text-white text-xs hover:bg-slate-800"
            >
              Registrar Comisión
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
