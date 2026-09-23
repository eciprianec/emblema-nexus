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
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { useFinanceStore } from "../store/useFinanceStore";
import {
  ExpenseCategory,
  Currency,
  EXPENSE_CATEGORY_LABELS,
} from "../types";
import { ArrowUpRight, DollarSign } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_CASES: Array<{ id: string; number: string; title: string; clientId: string; clientName: string }> = [];

export function ExpenseCreateModal() {
  const {
    isExpenseCreateOpen,
    closeExpenseCreateModal,
    registerExpense,
    defaultCaseIdForModal,
  } = useFinanceStore();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("tasas_judiciales");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [currency, setCurrency] = useState<Currency>("DOP");
  const [date, setDate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierRnc, setSupplierRnc] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [ncf, setNcf] = useState("");
  const [caseId, setCaseId] = useState("");
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [status, setStatus] = useState<"pagado" | "pendiente">("pagado");

  useEffect(() => {
    if (isExpenseCreateOpen) {
      const today = new Date().toISOString().split("T")[0];
      setDate(today);
      setDescription("");
      setCategory("tasas_judiciales");
      setAmount(undefined);
      setCurrency("DOP");
      setSupplier("");
      setSupplierRnc("");
      setReceiptNumber("");
      setNcf("");
      setCaseId(defaultCaseIdForModal || "");
      setIsReimbursable(Boolean(defaultCaseIdForModal));
      setStatus("pagado");
    }
  }, [isExpenseCreateOpen, defaultCaseIdForModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Ingrese una descripción o concepto del gasto.");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Ingrese un monto válido para el gasto.");
      return;
    }

    const selectedCase = AVAILABLE_CASES.find((c) => c.id === caseId);

    const newExpense = registerExpense({
      description,
      category,
      amount,
      currency,
      date,
      supplier: supplier || undefined,
      supplierRnc: supplierRnc || undefined,
      receiptNumber: receiptNumber || undefined,
      ncf: ncf || undefined,
      caseId: selectedCase?.id,
      caseNumber: selectedCase?.number,
      caseTitle: selectedCase?.title,
      clientId: selectedCase?.clientId,
      clientName: selectedCase?.clientName,
      isReimbursable,
      status,
    });

    toast.success(`Gasto "${newExpense.description}" registrado con éxito`);
  };

  return (
    <Dialog open={isExpenseCreateOpen} onOpenChange={closeExpenseCreateModal}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <ArrowUpRight className="h-5 w-5 text-rose-600" />
            Registro de Gasto Operativo / Tasas
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Registre gastos notariales, judiciales, tasas de agrimensura o viáticos de la firma.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Concepto / Descripción */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Concepto del Gasto *</Label>
            <Input
              type="text"
              placeholder="Ej: Sellos de Ley 33-91 o Tasas Mensuras Catastrales..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="text-xs h-9 bg-white"
            />
          </div>

          {/* Categoría y Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Categoría *</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900"
              >
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Monto del Gasto *</Label>
              <MoneyInput
                currency={currency}
                value={amount}
                onChange={(val) => setAmount(val)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Proveedor y RNC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Beneficiario / Proveedor</Label>
              <Input
                type="text"
                placeholder="Ej: Dirección Regional de Mensuras"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">RNC o Cédula Proveedor</Label>
              <Input
                type="text"
                placeholder="Ej: 4-01-04982-3"
                value={supplierRnc}
                onChange={(e) => setSupplierRnc(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>
          </div>

          {/* Comprobante / NCF y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">No. Recibo / Factura</Label>
              <Input
                type="text"
                placeholder="Ej: REC-9921"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">NCF (Opcional)</Label>
              <Input
                type="text"
                placeholder="Ej: B0100000055"
                value={ncf}
                onChange={(e) => setNcf(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Fecha del Gasto *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>
          </div>

          {/* Expediente Asociado */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Expediente Asociado</Label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900"
            >
              <option value="">-- Gasto general de la firma (Sin expediente) --</option>
              {AVAILABLE_CASES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.number} - {c.title} ({c.clientName})
                </option>
              ))}
            </select>
          </div>

          {/* Reembolsable y Estado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-50 rounded-md border border-slate-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reimbursable"
                checked={isReimbursable}
                onCheckedChange={(checked) => setIsReimbursable(Boolean(checked))}
              />
              <label
                htmlFor="reimbursable"
                className="text-xs font-medium text-slate-800 leading-none cursor-pointer"
              >
                Gasto reembolsable (se cargará al cliente)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">Estado:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "pagado" | "pendiente")}
                className="text-xs bg-white border border-slate-300 rounded px-2 py-1"
              >
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente de Pago</option>
              </select>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-4 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeExpenseCreateModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium"
            >
              Registrar Gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
