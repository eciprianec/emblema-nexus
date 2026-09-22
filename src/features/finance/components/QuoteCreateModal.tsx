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
  Currency,
  ItemType,
  QuoteItem,
  ITEM_TYPE_LABELS,
} from "../types";
import { formatMoney } from "@/lib/utils";
import { Plus, Trash2, FileCheck } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_CLIENTS = [
  { id: "cl_1", name: "Juan Pérez", rncCedula: "001-0948271-3" },
  { id: "cl_2", name: "Empresa S.R.L.", rncCedula: "1-31-98765-4" },
  { id: "cl_3", name: "Constructora del Este S.A.S.", rncCedula: "1-01-88421-2" },
  { id: "cl_4", name: "Inmobiliaria Caribe Real S.R.L.", rncCedula: "1-30-55612-9" },
  { id: "cl_5", name: "Desarrollos Punta Cana S.R.L.", rncCedula: "1-32-11094-1" },
  { id: "cl_6", name: "María Santos", rncCedula: "402-2384751-8" },
  { id: "cl_7", name: "Grupo Hotelero Bahía S.A.", rncCedula: "1-30-99882-3" },
  { id: "cl_8", name: "Inversiones del Cibao S.R.L.", rncCedula: "1-31-00293-8" },
];

const AVAILABLE_CASES = [
  { id: "case_1", number: "LEG-2024-0001", title: "Divorcio Civil y Partición de Bienes" },
  { id: "case_2", number: "AGR-2024-0042", title: "Deslinde y Subdivisión Parcela 15" },
  { id: "case_3", number: "INM-2024-0018", title: "Regularización Título Turístico" },
];

export function QuoteCreateModal() {
  const {
    isQuoteCreateOpen,
    closeQuoteCreateModal,
    createQuote,
    defaultClientIdForModal,
    defaultCaseIdForModal,
  } = useFinanceStore();

  const [clientId, setClientId] = useState<string>("");
  const [caseId, setCaseId] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>("DOP");
  const [issueDate, setIssueDate] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [items, setItems] = useState<
    Array<{
      id: string;
      description: string;
      itemType: ItemType;
      quantity: number;
      unitPrice: number;
      appliesTax: boolean;
    }>
  >([
    {
      id: "qi-1",
      description: "Honorarios por representación legal y redacción de contratos",
      itemType: "honorarios",
      quantity: 1,
      unitPrice: 65000,
      appliesTax: true,
    },
  ]);

  useEffect(() => {
    if (isQuoteCreateOpen) {
      const today = new Date();
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const pad = (n: number) => String(n).padStart(2, "0");
      const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      setIssueDate(fmt(today));
      setValidUntil(fmt(in30Days));
      setClientId(defaultClientIdForModal || AVAILABLE_CLIENTS[0].id);
      setCaseId(defaultCaseIdForModal || "");
      setCurrency("DOP");
      setNotes(
        "Propuesta válida por 30 días. Pago del 50% al inicio y 50% a la entrega del resultado o sentencia definitiva."
      );
      setItems([
        {
          id: `qi-${Date.now()}`,
          description: "Honorarios por servicios profesionales",
          itemType: "honorarios",
          quantity: 1,
          unitPrice: 50000,
          appliesTax: true,
        },
      ]);
    }
  }, [isQuoteCreateOpen, defaultClientIdForModal, defaultCaseIdForModal]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `qi-${Date.now()}-${Math.random()}`,
        description: "",
        itemType: "honorarios",
        quantity: 1,
        unitPrice: 0,
        appliesTax: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("La cotización debe tener al menos un renglón.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (
    id: string,
    field: "description" | "itemType" | "quantity" | "unitPrice" | "appliesTax",
    value: any
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const subtotal = items.reduce(
    (acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0),
    0
  );
  const taxTotal = items.reduce(
    (acc, it) =>
      it.appliesTax
        ? acc + (it.quantity || 0) * (it.unitPrice || 0) * 0.18
        : acc,
    0
  );
  const total = subtotal + taxTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedClient = AVAILABLE_CLIENTS.find((c) => c.id === clientId);
    if (!selectedClient) {
      toast.error("Por favor seleccione un cliente.");
      return;
    }

    if (items.some((it) => !it.description.trim() || it.unitPrice <= 0)) {
      toast.error("Complete la descripción y precio de todos los ítems.");
      return;
    }

    const selectedCase = AVAILABLE_CASES.find((c) => c.id === caseId);

    const quoteItems: QuoteItem[] = items.map((it) => ({
      id: it.id,
      description: it.description,
      itemType: it.itemType,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      appliesTax: it.appliesTax,
      total: it.quantity * it.unitPrice,
    }));

    const newQuote = createQuote({
      number: "",
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientRncCedula: selectedClient.rncCedula,
      caseId: selectedCase ? selectedCase.id : undefined,
      caseNumber: selectedCase ? selectedCase.number : undefined,
      caseTitle: selectedCase ? selectedCase.title : undefined,
      issueDate,
      validUntil,
      currency,
      items: quoteItems,
      status: "enviada",
      notes,
    });

    toast.success(`Cotización ${newQuote.number} generada correctamente`);
  };

  return (
    <Dialog open={isQuoteCreateOpen} onOpenChange={closeQuoteCreateModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FileCheck className="h-5 w-5 text-slate-700" />
            Confección de Cotización / Presupuesto
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Estructure una propuesta de servicios profesionales, honorarios y tasas para el cliente.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Cabecera */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            {/* Cliente */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Cliente *</Label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900"
              >
                {AVAILABLE_CLIENTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.rncCedula})
                  </option>
                ))}
              </select>
            </div>

            {/* Expediente Opcional */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Expediente Asociado</Label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900"
              >
                <option value="">-- Sin expediente asignado --</option>
                {AVAILABLE_CASES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Moneda */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Moneda *</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900"
              >
                <option value="DOP">Pesos Dominicanos (RD$ DOP)</option>
                <option value="USD">Dólares Americanos (US$ USD)</option>
              </select>
            </div>

            {/* Fecha Emisión */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Fecha de Emisión *</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>

            {/* Validez */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Válida Hasta *</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>
          </div>

          {/* Renglones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Renglones Presupuestados
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="text-xs h-7 border-dashed border-slate-400 hover:bg-slate-100"
              >
                <Plus className="h-3 w-3 mr-1" />
                Añadir Renglón
              </Button>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-[40%]">Descripción del Servicio / Renglón</th>
                    <th className="py-2.5 px-3 w-[20%]">Tipo Concepto</th>
                    <th className="py-2.5 px-2 text-center w-[8%]">Cant.</th>
                    <th className="py-2.5 px-3 text-right w-[18%]">Precio Unitario</th>
                    <th className="py-2.5 px-2 text-center w-[8%]">ITBIS (18%)</th>
                    <th className="py-2.5 px-3 text-right w-[12%]">Total Renglón</th>
                    <th className="py-2.5 px-2 text-center w-[4%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.map((item) => {
                    const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <Input
                            type="text"
                            placeholder="Ej: Levantamiento topográfico..."
                            value={item.description}
                            onChange={(e) =>
                              updateItem(item.id, "description", e.target.value)
                            }
                            required
                            className="text-xs h-8"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.itemType}
                            onChange={(e) =>
                              updateItem(item.id, "itemType", e.target.value as ItemType)
                            }
                            className="w-full text-xs h-8 bg-white border border-slate-300 rounded-md px-2 focus:ring-1 focus:ring-slate-900"
                          >
                            {Object.entries(ITEM_TYPE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, "quantity", parseInt(e.target.value) || 1)
                            }
                            className="text-xs h-8 text-center"
                          />
                        </td>
                        <td className="p-2">
                          <MoneyInput
                            currency={currency}
                            value={item.unitPrice}
                            onChange={(val) => updateItem(item.id, "unitPrice", val || 0)}
                            className="text-xs h-8"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex justify-center items-center">
                            <Checkbox
                              checked={item.appliesTax}
                              onCheckedChange={(checked) =>
                                updateItem(item.id, "appliesTax", Boolean(checked))
                              }
                            />
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-900 text-xs">
                          {formatMoney(itemTotal, currency)}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales y Términos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Términos de la Propuesta</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 bg-white"
                placeholder="Condiciones de pago, exclusiones y vigencia del presupuesto..."
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal Presupuesto:</span>
                <span className="font-mono font-medium">{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>ITBIS Estimado (18%):</span>
                <span className="font-mono font-medium">{formatMoney(taxTotal, currency)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Cotizado:</span>
                <span className="font-mono text-base">{formatMoney(total, currency)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-4 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeQuoteCreateModal}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium"
            >
              Crear y Enviar Cotización
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
