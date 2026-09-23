"use client";

import { useState, useEffect } from "react";
import { useRealEstateStore } from "../store/useRealEstateStore";
import {
  ContractType,
  Currency,
  formatCurrency,
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
import { FileText, Building2, UserCheck, ShieldCheck } from "lucide-react";

export function ContractCreateModal() {
  const {
    isContractCreateOpen,
    closeContractCreateModal,
    properties,
    selectedProperty,
    addContract,
  } = useRealEstateStore();

  const [contractNumber, setContractNumber] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [contractType, setContractType] = useState<ContractType>("ALQUILER_RESIDENCIAL");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState<string>("");
  const [depositMonths, setDepositMonths] = useState<string>("2");
  const [advanceMonths, setAdvanceMonths] = useState<string>("1");
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState<string>("5");
  const [graceDays, setGraceDays] = useState<string>("5");
  const [lateFeePercent, setLateFeePercent] = useState<string>("5.0");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Cliente
  const [clientRole, setClientRole] = useState<"INQUILINO" | "COMPRADOR">("INQUILINO");
  const [clientName, setClientName] = useState("");
  const [clientIdNumber, setClientIdNumber] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [notaryName, setNotaryName] = useState("");
  const [notes, setNotes] = useState("");

  // Autoseleccionar propiedad si se abrió desde una propiedad
  useEffect(() => {
    if (selectedProperty) {
      setPropertyId(selectedProperty.id);
      setCurrency(selectedProperty.currency);
      setOwnerName(selectedProperty.owner.name);
      setAgentName(selectedProperty.listingAgent.name);

      if (selectedProperty.operationType === "ALQUILER") {
        setContractType("ALQUILER_RESIDENCIAL");
        setClientRole("INQUILINO");
        if (selectedProperty.priceRent) setAmount(selectedProperty.priceRent.toString());
      } else {
        setContractType("PROMESA_VENTA");
        setClientRole("COMPRADOR");
        if (selectedProperty.priceSale) setAmount(selectedProperty.priceSale.toString());
      }
    }
  }, [selectedProperty, isContractCreateOpen]);

  // Generar número de contrato correlativo
  useEffect(() => {
    if (isContractCreateOpen && !contractNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(100 + Math.random() * 900);
      setContractNumber(`CTR-INM-${year}-${random}`);

      // Fechas por defecto: hoy y dentro de 1 año
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setEndDate(nextYear.toISOString().split("T")[0]);
    }
  }, [isContractCreateOpen, contractNumber]);

  // Si cambia la propiedad elegida en el selector
  const handlePropertyChange = (pId: string) => {
    setPropertyId(pId);
    const prop = properties.find((p) => p.id === pId);
    if (prop) {
      setCurrency(prop.currency);
      setOwnerName(prop.owner.name);
      setAgentName(prop.listingAgent.name);
      if (prop.operationType === "ALQUILER" && prop.priceRent) {
        setAmount(prop.priceRent.toString());
        setContractType("ALQUILER_RESIDENCIAL");
        setClientRole("INQUILINO");
      } else if (prop.priceSale) {
        setAmount(prop.priceSale.toString());
        setContractType("PROMESA_VENTA");
        setClientRole("COMPRADOR");
      }
    }
  };

  const handleContractTypeChange = (val: ContractType) => {
    setContractType(val);
    if (val === "ALQUILER_RESIDENCIAL" || val === "ALQUILER_COMERCIAL") {
      setClientRole("INQUILINO");
    } else {
      setClientRole("COMPRADOR");
    }
  };

  const numericAmount = parseFloat(amount) || 0;
  const numericDepositMonths = parseInt(depositMonths, 10) || 0;
  const numericAdvanceMonths = parseInt(advanceMonths, 10) || 0;
  const calculatedTotalDeposits =
    clientRole === "INQUILINO"
      ? numericAmount * (numericDepositMonths + numericAdvanceMonths)
      : numericAmount * 0.10; // 10% arras en promesa

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProp = properties.find((p) => p.id === propertyId);
    if (!selectedProp) {
      alert("Selecciona una propiedad válida.");
      return;
    }

    addContract({
      contractNumber: contractNumber.trim(),
      propertyId: selectedProp.id,
      propertyCode: selectedProp.code,
      propertyTitle: selectedProp.title,
      contractType,
      status: "VIGENTE",
      currency,
      amount: numericAmount,
      depositMonths: clientRole === "INQUILINO" ? numericDepositMonths : undefined,
      advanceMonths: clientRole === "INQUILINO" ? numericAdvanceMonths : undefined,
      depositAmountTotal: calculatedTotalDeposits,
      paymentDayOfMonth: parseInt(paymentDayOfMonth, 10) || 5,
      graceDays: parseInt(graceDays, 10) || 5,
      lateFeePercent: parseFloat(lateFeePercent) || 5.0,
      startDate,
      endDate,
      clientRole,
      client: {
        name: clientName.trim(),
        identificationNumber: clientIdNumber.trim(),
        phone: clientPhone.trim(),
        email: clientEmail.trim(),
      },
      ownerName: ownerName || selectedProp.owner.name,
      agentName,
      notaryName,
      notes: notes.trim(),
    });

    closeContractCreateModal();
  };

  return (
    <Dialog open={isContractCreateOpen} onOpenChange={closeContractCreateModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded bg-slate-900 text-white">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Formalización de Contrato Inmobiliario
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Arrendamiento residencial/comercial o promesa de venta bajo el marco jurídico dominicano.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Identificación y Propiedad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-700">Número de Contrato</Label>
              <Input
                required
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-700">Tipo de Contrato</Label>
              <Select value={contractType} onValueChange={handleContractTypeChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALQUILER_RESIDENCIAL">Alquiler Residencial</SelectItem>
                  <SelectItem value="ALQUILER_COMERCIAL">Alquiler Comercial</SelectItem>
                  <SelectItem value="PROMESA_VENTA">Promesa de Venta (Arras)</SelectItem>
                  <SelectItem value="VENTA_DEFINITIVA">Compraventa Definitiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Inmueble Objeto del Contrato *</Label>
            <Select value={propertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar propiedad en cartera..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    [{p.code}] {p.title} ({p.sector}, {p.municipality})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valores y Esquema de Pagos Dominicano */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <span className="font-semibold text-slate-800 block">
              Condiciones Económicas & Esquema de Depósitos RD
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
                <Label className="text-xs text-slate-700">
                  {clientRole === "INQUILINO" ? "Canon Mensual" : "Precio Total"} ({currency}) *
                </Label>
                <Input
                  required
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2500"
                  className="h-8 text-xs bg-white font-mono font-bold"
                />
              </div>

              {clientRole === "INQUILINO" ? (
                <div>
                  <Label className="text-xs text-slate-700">Depósitos de Garantía</Label>
                  <Select value={depositMonths} onValueChange={setDepositMonths}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Depósito</SelectItem>
                      <SelectItem value="2">2 Depósitos (Estándar RD)</SelectItem>
                      <SelectItem value="3">3 Depósitos (Comercial)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-slate-700">Separación / Arras (10%)</Label>
                  <div className="h-8 bg-white border border-slate-200 rounded px-3 flex items-center font-mono font-bold text-slate-800">
                    {formatCurrency(calculatedTotalDeposits, currency)}
                  </div>
                </div>
              )}
            </div>

            {clientRole === "INQUILINO" && (
              <div className="text-xs bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">
                    Total a Recibir Inicialmente:{" "}
                    {formatCurrency(calculatedTotalDeposits, currency)}
                  </span>
                  <p className="text-[10px] text-slate-500">
                    {depositMonths} depósitos de garantía + {advanceMonths} mes por adelantado.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Día de Cobro:</span>
                  <span className="font-semibold text-slate-700">Día {paymentDayOfMonth} c/mes</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div>
                <Label className="text-[11px] text-slate-600">Día Límite de Pago Mensual</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={paymentDayOfMonth}
                  onChange={(e) => setPaymentDayOfMonth(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Días de Gracia sin Mora</Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={graceDays}
                  onChange={(e) => setGraceDays(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">% Recargo por Mora</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={lateFeePercent}
                  onChange={(e) => setLateFeePercent(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Plazo del Contrato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-700">Fecha de Inicio *</Label>
              <Input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Fecha de Vencimiento *</Label>
              <Input
                required
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Datos del Cliente Inquilino o Comprador */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-slate-600" />
              Datos del {clientRole === "INQUILINO" ? "Inquilino / Arrendatario" : "Comprador"}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-700">Nombre Completo o Empresa *</Label>
                <Input
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Ing. Carlos Mendoza Pimentel"
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-700">Cédula / RNC / Pasaporte *</Label>
                <Input
                  required
                  value={clientIdNumber}
                  onChange={(e) => setClientIdNumber(e.target.value)}
                  placeholder="001-1892341-2"
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-700">Teléfono</Label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+1 (809) 555-9988"
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-700">Correo Electrónico</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="cliente@correo.com"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Notario y Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-700">Notario Público Legalizante</Label>
              <Input
                value={notaryName}
                onChange={(e) => setNotaryName(e.target.value)}
                placeholder="Dr. Fausto Pichardo (Matrícula Notarial 4821)"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Agente de Cierre</Label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700">Notas y Cláusulas Especiales</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Contrato con cláusula de ajuste anual de inflación según IPC Banco Central..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeContractCreateModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-slate-900 text-white text-xs hover:bg-slate-800"
            >
              Emitir y Registrar Contrato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
