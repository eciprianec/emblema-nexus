"use client";

import { useState, useEffect } from "react";
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
import { MoneyInput } from "@/components/forms/MoneyInput";
import { useFinanceStore } from "../store/useFinanceStore";
import { PaymentMethod, PAYMENT_METHOD_LABELS, Invoice } from "../types";
import { formatMoney } from "@/lib/utils";
import { ArrowDownLeft, CreditCard, Building2, Check } from "lucide-react";
import { toast } from "sonner";

export function PaymentCreateModal() {
  const {
    isPaymentCreateOpen,
    closePaymentCreateModal,
    activePaymentInvoice,
    invoices,
    bankAccounts,
    registerPayment,
  } = useFinanceStore();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const pendingInvoices = invoices.filter(
    (inv) => inv.balance > 0 && inv.status !== "anulada"
  );

  const currentInvoice: Invoice | undefined =
    activePaymentInvoice || pendingInvoices.find((i) => i.id === selectedInvoiceId);

  useEffect(() => {
    if (isPaymentCreateOpen) {
      const today = new Date().toISOString().split("T")[0];
      setPaymentDate(today);

      if (activePaymentInvoice) {
        setSelectedInvoiceId(activePaymentInvoice.id);
        setAmount(activePaymentInvoice.balance);
      } else if (pendingInvoices.length > 0) {
        setSelectedInvoiceId(pendingInvoices[0].id);
        setAmount(pendingInvoices[0].balance);
      } else {
        setSelectedInvoiceId("");
        setAmount(0);
      }

      setPaymentMethod("transferencia");
      setReferenceNumber("");
      setBankAccountId(bankAccounts[0]?.id || "");
      setNotes("Cobro procesado y registrado en cuenta bancaria.");
    }
  }, [isPaymentCreateOpen, activePaymentInvoice]);

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setAmount(inv.balance);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentInvoice) {
      toast.error("Seleccione una factura con saldo pendiente.");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Ingrese un monto válido a cobrar.");
      return;
    }

    if (amount > currentInvoice.balance) {
      toast.error(
        `El monto (RD$ ${amount}) excede el saldo adeudado (RD$ ${currentInvoice.balance}).`
      );
      return;
    }

    try {
      const payment = registerPayment({
        invoiceId: currentInvoice.id,
        amount,
        paymentMethod,
        referenceNumber,
        bankAccountId: bankAccountId || undefined,
        paymentDate,
        notes,
      });

      toast.success(
        `Recibo ${payment.receiptNumber} registrado por ${formatMoney(amount, currentInvoice.currency)} a ${currentInvoice.number}`
      );
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el pago");
    }
  };

  return (
    <Dialog open={isPaymentCreateOpen} onOpenChange={closePaymentCreateModal}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
            Registrar Recibo de Cobro
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Imputación de pagos a facturas con actualización automática de balances y bancos.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Factura Imputada */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Factura Pendiente *</Label>
            {activePaymentInvoice ? (
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{activePaymentInvoice.number}</span>
                  <span className="font-mono text-emerald-700">
                    Saldo: {formatMoney(activePaymentInvoice.balance, activePaymentInvoice.currency)}
                  </span>
                </div>
                <div className="text-slate-600 mt-1">
                  Cliente: <span className="font-medium text-slate-800">{activePaymentInvoice.clientName}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  NCF: {activePaymentInvoice.ncf}
                </div>
              </div>
            ) : pendingInvoices.length > 0 ? (
              <select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                required
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900"
              >
                {pendingInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number} - {inv.clientName} (Saldo: {formatMoney(inv.balance, inv.currency)})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-md text-xs border border-amber-200">
                No hay facturas con saldo pendiente actualmente.
              </div>
            )}
          </div>

          {/* Monto a Cobrar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold text-slate-700">Monto del Recibo *</Label>
              {currentInvoice && (
                <button
                  type="button"
                  onClick={() => setAmount(currentInvoice.balance)}
                  className="text-[10px] text-slate-600 hover:text-slate-900 underline"
                >
                  Cobrar saldo total ({formatMoney(currentInvoice.balance, currentInvoice.currency)})
                </button>
              )}
            </div>
            <MoneyInput
              currency={currentInvoice?.currency || "DOP"}
              value={amount}
              onChange={(val) => setAmount(val)}
              className="text-sm font-semibold"
            />
          </div>

          {/* Método y Cuenta de Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Método de Pago *</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Cuenta de Depósito</Label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} ({b.accountNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Referencia y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Número de Referencia</Label>
              <Input
                type="text"
                placeholder="Ej: TRF-992384 o Chq #1029"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Fecha del Recibo *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Notas / Concepto</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 bg-white"
              placeholder="Detalles adicionales del recaudo..."
            />
          </div>

          <DialogFooter className="border-t border-slate-200 pt-4 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closePaymentCreateModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!currentInvoice}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
            >
              Registrar Cobro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
