"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "../store/useFinanceStore";
import { INVOICE_STATUS_LABELS, NCF_LABELS, PAYMENT_METHOD_LABELS } from "../types";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Printer,
  CreditCard,
  Building2,
  Calendar,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
} from "lucide-react";
import { useEcfStore } from "@/features/ecf/store/useEcfStore";

export function InvoiceDetailModal() {
  const {
    selectedInvoice,
    isInvoiceDetailOpen,
    closeInvoiceDetail,
    openPaymentCreateModal,
    payments,
  } = useFinanceStore();

  const { openEmitModal } = useEcfStore();

  if (!selectedInvoice) return null;

  const invoicePayments = payments.filter(
    (p) => p.invoiceId === selectedInvoice.id
  );

  const statusMeta = INVOICE_STATUS_LABELS[selectedInvoice.status];
  const ncfInfo = NCF_LABELS[selectedInvoice.ncfType];

  const handlePrint = () => {
    window.print();
  };

  const handleEmitAsEcf = () => {
    const ecfTypeMap: Record<string, "E31" | "E32" | "E34" | "E44" | "E45"> = {
      B01: "E31",
      B02: "E32",
      B14: "E44",
      B15: "E45",
    };
    const targetType = ecfTypeMap[selectedInvoice.ncfType] || "E31";
    closeInvoiceDetail();
    openEmitModal({
      ecfType: targetType,
      rncComprador: selectedInvoice.clientRncCedula || "",
      razonSocialComprador: selectedInvoice.clientName,
      currency: selectedInvoice.currency,
      exchangeRate: selectedInvoice.exchangeRate,
      invoiceId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.number,
      items: selectedInvoice.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        appliesTax: it.appliesTax,
      })),
    });
  };

  return (
    <Dialog open={isInvoiceDetailOpen} onOpenChange={closeInvoiceDetail}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-slate-300">
        {/* Barra superior de acciones para pantalla */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              Factura Comercial {selectedInvoice.number}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmitAsEcf}
              className="text-white border-slate-700 hover:bg-slate-800 text-xs h-7"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              Emitir como e-CF
            </Button>
            {selectedInvoice.balance > 0 && selectedInvoice.status !== "anulada" && (
              <Button
                size="sm"
                onClick={() => {
                  closeInvoiceDetail();
                  openPaymentCreateModal(selectedInvoice);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Registrar Cobro
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-white border-slate-700 hover:bg-slate-800 text-xs h-7"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Imprimir / PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeInvoiceDetail}
              className="h-7 w-7 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Documento Imprimible (Formato Fiscal Dominicano) */}
        <div className="p-8 bg-white text-slate-900 font-sans print:p-0">
          {/* Encabezado Principal */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                EMBLEMA NEXUS S.R.L.
              </h1>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mt-0.5">
                Servicios Legales, Agrimensura e Inmobiliaria
              </p>
              <div className="mt-2 text-xs text-slate-600 space-y-0.5 font-sans">
                <p>
                  <span className="font-semibold text-slate-800">RNC:</span> 1-31-98765-4
                </p>
                <p>Av. Winston Churchill No. 1099, Torre Acrópolis, Piso 14</p>
                <p>Santo Domingo, Distrito Nacional, República Dominicana</p>
                <p>Tel: (809) 555-0100 | info@emblemanexus.com.do</p>
              </div>
            </div>

            {/* Recuadro Fiscal NCF */}
            <div className="border-2 border-slate-900 rounded-md p-4 min-w-[280px] bg-slate-50/50 text-right">
              <div className="text-xs uppercase font-bold text-slate-500">
                Factura Comercial
              </div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {selectedInvoice.number}
              </div>
              <div className="mt-2 border-t border-slate-300 pt-2">
                <div className="text-[10px] uppercase font-bold text-slate-600">
                  Número de Comprobante Fiscal (NCF)
                </div>
                <div className="text-base font-extrabold font-mono text-slate-900 tracking-wide">
                  {selectedInvoice.ncf}
                </div>
                <div className="text-[11px] font-medium text-slate-700 mt-0.5">
                  {ncfInfo ? ncfInfo.name : selectedInvoice.ncfType}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Vence Secuencia DGII: 31/12/2026
                </div>
              </div>
            </div>
          </div>

          {/* Datos del Cliente y Expediente */}
          <div className="grid grid-cols-2 gap-6 my-6 p-4 bg-slate-50 rounded-md border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Datos del Cliente (Receptor)
              </span>
              <p className="text-sm font-bold text-slate-900">
                {selectedInvoice.clientName}
              </p>
              {selectedInvoice.clientRncCedula && (
                <p className="text-slate-700 mt-0.5">
                  <span className="font-semibold">RNC / Cédula:</span>{" "}
                  <span className="font-mono">{selectedInvoice.clientRncCedula}</span>
                </p>
              )}
              {selectedInvoice.caseNumber && (
                <p className="text-slate-700 mt-1">
                  <span className="font-semibold">Expediente:</span>{" "}
                  <span className="font-mono">{selectedInvoice.caseNumber}</span>
                  {selectedInvoice.caseTitle && ` - ${selectedInvoice.caseTitle}`}
                </p>
              )}
            </div>

            <div className="space-y-1 text-right">
              <p>
                <span className="font-semibold text-slate-600">Fecha de Emisión:</span>{" "}
                <span className="font-medium text-slate-900">{formatDate(selectedInvoice.issueDate)}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-600">Fecha de Vencimiento:</span>{" "}
                <span className="font-medium text-slate-900">{formatDate(selectedInvoice.dueDate)}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-600">Moneda:</span>{" "}
                <span className="font-medium text-slate-900">
                  {selectedInvoice.currency === "DOP" ? "Pesos Dominicanos (DOP)" : "Dólares Americanos (USD)"}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-600">Estado de Cuenta:</span>{" "}
                <span className="font-bold text-slate-900 uppercase">{statusMeta.label}</span>
              </p>
            </div>
          </div>

          {/* Tabla de Conceptos */}
          <table className="w-full text-left border-collapse text-xs my-6">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3 text-center w-12">Cant.</th>
                <th className="py-2.5 px-3">Descripción de Servicios / Tasas</th>
                <th className="py-2.5 px-3 text-right">Precio Unitario</th>
                <th className="py-2.5 px-3 text-center">ITBIS</th>
                <th className="py-2.5 px-3 text-right">Total Renglón</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedInvoice.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                  <td className="py-3 px-3">
                    <p className="font-medium text-slate-900">{item.description}</p>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {item.itemType}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatMoney(item.unitPrice, selectedInvoice.currency)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.appliesTax ? (
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        18%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Exento</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                    {formatMoney(item.total, selectedInvoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen de Totales y Liquidación */}
          <div className="flex justify-end my-6">
            <div className="w-80 space-y-2 text-xs border border-slate-200 rounded-md p-4 bg-slate-50">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">
                  {formatMoney(selectedInvoice.subtotal, selectedInvoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ITBIS (18%):</span>
                <span className="font-mono font-medium">
                  {formatMoney(selectedInvoice.taxTotal, selectedInvoice.currency)}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Facturado:</span>
                <span className="font-mono text-base">
                  {formatMoney(selectedInvoice.total, selectedInvoice.currency)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between text-emerald-700 font-semibold">
                <span>Monto Pagado:</span>
                <span className="font-mono">
                  {formatMoney(selectedInvoice.paidAmount, selectedInvoice.currency)}
                </span>
              </div>

              <div className="border-t border-slate-300 pt-2 flex justify-between font-extrabold text-base">
                <span className={selectedInvoice.balance > 0 ? "text-rose-600" : "text-slate-900"}>
                  Saldo Pendiente:
                </span>
                <span
                  className={`font-mono ${
                    selectedInvoice.balance > 0 ? "text-rose-600" : "text-slate-900"
                  }`}
                >
                  {formatMoney(selectedInvoice.balance, selectedInvoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Historial de Pagos de la Factura */}
          {invoicePayments.length > 0 && (
            <div className="my-6 border border-slate-200 rounded-md p-4 bg-white">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Historial de Recaudos / Pagos Recibidos
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium text-[10px]">
                    <th className="py-1.5">Recibo No.</th>
                    <th className="py-1.5">Fecha</th>
                    <th className="py-1.5">Método de Pago</th>
                    <th className="py-1.5">Referencia</th>
                    <th className="py-1.5 text-right">Monto Aplicado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {invoicePayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-semibold text-slate-800">{p.receiptNumber}</td>
                      <td className="py-2 text-slate-600">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 text-slate-700">
                        {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                      </td>
                      <td className="py-2 text-slate-500">{p.referenceNumber || "-"}</td>
                      <td className="py-2 text-right font-bold text-emerald-700">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notas y Pie de Factura */}
          <div className="mt-8 border-t border-slate-200 pt-4 text-slate-500 text-[11px] space-y-1">
            {selectedInvoice.notes && (
              <p>
                <span className="font-semibold text-slate-700">Condiciones / Notas:</span>{" "}
                {selectedInvoice.notes}
              </p>
            )}
            <p className="text-[10px] text-slate-400 italic">
              Conforme a la Ley 11-92 (Código Tributario) y resoluciones vigentes de la Dirección General de Impuestos Internos (DGII). Este documento constituye comprobante válido para los fines tributarios correspondientes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
