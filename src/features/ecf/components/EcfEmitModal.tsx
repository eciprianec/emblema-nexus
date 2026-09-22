"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEcfStore } from "../store/useEcfStore";
import { ECFType, ECF_TYPE_MAP } from "../types";
import { formatMoney } from "@/lib/utils";
import {
  FileCheck2,
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface FormItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  appliesTax: boolean;
}

export function EcfEmitModal() {
  const {
    isEmitModalOpen,
    closeEmitModal,
    emitPrefillData,
    sequences,
    config,
    emitEcf,
    openPrintModal,
  } = useEcfStore();

  const [ecfType, setEcfType] = useState<ECFType>("E31");
  const [rncComprador, setRncComprador] = useState("");
  const [razonSocialComprador, setRazonSocialComprador] = useState("");
  const [currency, setCurrency] = useState<"DOP" | "USD">("DOP");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<FormItem[]>([
    {
      id: "1",
      description: "Servicios Profesionales de Asesoría Legal y Técnica",
      quantity: 1,
      unitPrice: 50000,
      appliesTax: true,
    },
  ]);

  // Sincronizar datos si vienen prellenados (por ejemplo, desde una Factura comercial existente)
  useEffect(() => {
    if (emitPrefillData) {
      if (emitPrefillData.ecfType) setEcfType(emitPrefillData.ecfType);
      if (emitPrefillData.rncComprador) setRncComprador(emitPrefillData.rncComprador);
      if (emitPrefillData.razonSocialComprador)
        setRazonSocialComprador(emitPrefillData.razonSocialComprador);
      if (emitPrefillData.currency) setCurrency(emitPrefillData.currency);
      if (emitPrefillData.items && emitPrefillData.items.length > 0) {
        setItems(
          emitPrefillData.items.map((it, idx) => ({
            id: String(idx + 1),
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            appliesTax: it.appliesTax,
          }))
        );
      }
    } else {
      // Valores por defecto
      setEcfType("E31");
      setRncComprador("");
      setRazonSocialComprador("");
      setCurrency("DOP");
      setItems([
        {
          id: "1",
          description: "Servicios Profesionales de Asesoría Legal y Técnica",
          quantity: 1,
          unitPrice: 50000,
          appliesTax: true,
        },
      ]);
    }
    setErrorMsg(null);
  }, [emitPrefillData, isEmitModalOpen]);

  // Cálculos en tiempo real
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice || 0), 0);
  const itbis = items.reduce(
    (acc, it) => acc + (it.appliesTax ? (it.quantity * it.unitPrice || 0) * 0.18 : 0),
    0
  );
  const total = subtotal + itbis;

  const currentSeq = sequences[ecfType];
  const nextNumberPreview = currentSeq
    ? `${currentSeq.prefix}${String(currentSeq.currentNumber).padStart(8, "0")}`
    : "";

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: "",
        quantity: 1,
        unitPrice: 0,
        appliesTax: true,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof FormItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const validateRncCedula = (val: string): boolean => {
    const clean = val.replace(/\D/g, "");
    return clean.length === 9 || clean.length === 11;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const typeConfig = ECF_TYPE_MAP[ecfType];
    const cleanRnc = rncComprador.replace(/\D/g, "");

    if (typeConfig.requiresRnc && !cleanRnc) {
      setErrorMsg(`El e-CF tipo ${ecfType} (${typeConfig.name}) exige RNC o Cédula obligatorio del comprador.`);
      return;
    }

    if (cleanRnc && !validateRncCedula(cleanRnc)) {
      setErrorMsg("El RNC debe contener 9 dígitos o la Cédula 11 dígitos numéricos.");
      return;
    }

    if (!razonSocialComprador.trim()) {
      setErrorMsg("Indique el Nombre o Razón Social del receptor.");
      return;
    }

    if (items.some((it) => !it.description.trim() || it.quantity <= 0 || it.unitPrice < 0)) {
      setErrorMsg("Todos los renglones deben tener descripción válida, cantidad mayor a 0 y precio.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      try {
        const newEcf = emitEcf({
          ecfType,
          rncComprador: cleanRnc || "N/A",
          razonSocialComprador: razonSocialComprador.trim(),
          currency,
          items: items.map((it) => ({
            description: it.description,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            appliesTax: Boolean(it.appliesTax),
          })),
          invoiceId: emitPrefillData?.invoiceId,
          invoiceNumber: emitPrefillData?.invoiceNumber,
        });

        setIsSubmitting(false);
        closeEmitModal();
        toast.success(`Comprobante e-CF ${newEcf.eNCF} emitido exitosamente`, {
          description: `Timbrado ante la DGII con TrackId: ${newEcf.trackId.slice(0, 18)}...`,
        });

        // Abrir inmediatamente la Representación Impresa oficial
        openPrintModal(newEcf);
      } catch (err: any) {
        setIsSubmitting(false);
        setErrorMsg(err.message || "Error al emitir e-CF");
      }
    }, 900);
  };

  return (
    <Dialog open={isEmitModalOpen} onOpenChange={closeEmitModal}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border border-slate-300">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <DialogTitle className="text-base font-semibold text-white">
                Emisión de Comprobante Fiscal Electrónico (e-CF)
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-slate-700 text-slate-300 text-[10px] bg-slate-800"
              >
                Próximo e-NCF: <span className="font-mono font-bold text-white ml-1">{nextNumberPreview}</span>
              </Badge>
              <Badge
                className={
                  config.ambiente === "PROD"
                    ? "bg-emerald-600 text-white text-[10px]"
                    : "bg-amber-600 text-white text-[10px]"
                }
              >
                Ambiente: {config.ambiente}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            Generación del XML tributario, firma digital X.509 y timbrado en tiempo real ante la DGII (Ley 32-23).
          </DialogDescription>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs bg-white text-slate-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="text-xs">{errorMsg}</span>
            </div>
          )}

          {/* Sección 1: Tipo e-CF y Datos Fiscales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Tipo de Comprobante Electrónico (e-CF)
              </Label>
              <select
                value={ecfType}
                onChange={(e) => setEcfType(e.target.value as ECFType)}
                className="w-full mt-1.5 py-1.5 px-3 border border-slate-300 rounded-md bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="E31">E31 - Factura de Crédito Fiscal Electrónica</option>
                <option value="E32">E32 - Factura de Consumo Electrónica</option>
                <option value="E34">E34 - Nota de Crédito Electrónica</option>
                <option value="E44">E44 - Régimen Especial Electrónico</option>
                <option value="E45">E45 - Gubernamental Electrónico</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {ECF_TYPE_MAP[ecfType].description}
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Moneda de Operación
              </Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "DOP" | "USD")}
                className="w-full mt-1.5 py-1.5 px-3 border border-slate-300 rounded-md bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="DOP">Pesos Dominicanos (DOP)</option>
                <option value="USD">Dólares Estadounidenses (USD)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Reporte ante DGII convertido al tipo de cambio oficial de la fecha.
              </p>
            </div>
          </div>

          {/* Sección 2: Receptor / Cliente */}
          <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Datos del Receptor (Comprador)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-700">
                  RNC o Cédula del Receptor
                  {ECF_TYPE_MAP[ecfType].requiresRnc && (
                    <span className="text-rose-600 ml-0.5">*</span>
                  )}
                </Label>
                <Input
                  placeholder="ej. 101012345 o 40200000000"
                  value={rncComprador}
                  onChange={(e) => setRncComprador(e.target.value)}
                  className="mt-1 text-xs font-mono h-8 bg-white"
                />
                <span className="text-[10px] text-slate-400">9 dígitos para RNC jurídico, 11 para persona física</span>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Nombre o Razón Social <span className="text-rose-600">*</span>
                </Label>
                <Input
                  placeholder="ej. Inversiones del Caribe S.R.L."
                  value={razonSocialComprador}
                  onChange={(e) => setRazonSocialComprador(e.target.value)}
                  className="mt-1 text-xs h-8 bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Detalle de Ítems / Renglones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Renglones del Comprobante
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="text-xs h-7 border-slate-300 text-slate-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar Renglón
              </Button>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-semibold">
                    <th className="py-2 px-3">Descripción de Servicios / Bienes</th>
                    <th className="py-2 px-2 w-20 text-center">Cant.</th>
                    <th className="py-2 px-2 w-28 text-right">Precio Unit.</th>
                    <th className="py-2 px-2 w-20 text-center">ITBIS 18%</th>
                    <th className="py-2 px-3 w-28 text-right">Total</th>
                    <th className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => {
                    const rowTotal = item.quantity * item.unitPrice || 0;
                    return (
                      <tr key={item.id}>
                        <td className="py-2 px-3">
                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                            placeholder="Descripción del concepto"
                            className="text-xs h-7"
                            required
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, "quantity", Number(e.target.value))}
                            className="text-xs h-7 text-center font-mono"
                            required
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, "unitPrice", Number(e.target.value))}
                            className="text-xs h-7 text-right font-mono"
                            required
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.appliesTax}
                            onChange={(e) => handleItemChange(item.id, "appliesTax", e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                          {formatMoney(rowTotal, currency)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length <= 1}
                            className="h-6 w-6 text-slate-400 hover:text-rose-600 disabled:opacity-30"
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

          {/* Sección 4: Liquidación y Totales */}
          <div className="flex justify-end pt-2">
            <div className="w-72 border border-slate-200 rounded-md p-3.5 bg-slate-50 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Neto:</span>
                <span className="font-mono font-medium">{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ITBIS Liquidado (18%):</span>
                <span className="font-mono font-medium">{formatMoney(itbis, currency)}</span>
              </div>
              <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Comprobante:</span>
                <span className="font-mono text-base">{formatMoney(total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Footer del Modal */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Certificado digital X.509 activo y verificado.</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeEmitModal}
                disabled={isSubmitting}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Firmando y Timbrando en DGII...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Emitir y Timbrar ante DGII
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
