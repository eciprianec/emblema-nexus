'use client';

import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle, Download } from 'lucide-react';
import { useClientPortalStore } from '../store/useClientPortalStore';
import { QrCodeSvg } from '@/features/ecf/components/QrCodeSvg';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ECFPrintViewModal() {
  const { isEcfPrintModalOpen, activeInvoice, closeEcfPrintModal } = useClientPortalStore();

  if (!activeInvoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const qrUrl = `https://dgii.gov.do/consultaEcf?rncEmisor=${activeInvoice.rncEmisor}&rncComprador=${activeInvoice.rncComprador}&eNCF=${activeInvoice.eNcf}&montoTotal=${activeInvoice.total}&codigoSeguridad=${activeInvoice.securityCode}`;

  return (
    <Dialog open={isEcfPrintModalOpen} onOpenChange={(open) => !open && closeEcfPrintModal()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white max-h-[90vh] flex flex-col">
        {/* Barra de herramientas superior */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <DialogTitle className="text-sm font-bold text-white tracking-tight">
                Representación Impresa e-CF (DGII)
              </DialogTitle>
              <p className="text-xs text-slate-400">
                e-NCF: <span className="font-mono text-emerald-300 font-semibold">{activeInvoice.eNcf}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-white text-slate-900 hover:bg-slate-100 font-medium text-xs shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* Contenido Imprimible de la Factura Electrónica */}
        <div className="p-8 overflow-y-auto flex-1 text-slate-800 text-xs font-sans print:p-0">
          <div className="border border-slate-300 p-6 rounded-lg bg-white shadow-xs">
            {/* Cabecera del Emisor */}
            <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-4">
              <div className="space-y-1 max-w-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                    EN
                  </div>
                  <span className="font-bold text-base text-slate-950 tracking-tight">
                    {activeInvoice.razonSocialEmisor}
                  </span>
                </div>
                <p className="text-slate-600">RNC: <span className="font-mono font-bold text-slate-900">{activeInvoice.rncEmisor}</span></p>
                <p className="text-slate-600">Av. Winston Churchill esq. 27 de Febrero, Torre Piantini, Piso 11, Santo Domingo, D.N.</p>
                <p className="text-slate-600">Tel: (809) 566-0099 • Email: facturacion@emblemanexus.com</p>
              </div>

              {/* Recuadro e-NCF */}
              <div className="border-2 border-slate-900 p-3.5 rounded bg-slate-50 min-w-[240px] text-right space-y-1">
                <div className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Factura de Crédito Fiscal Electrónica
                </div>
                <div className="text-lg font-mono font-bold text-slate-950">
                  {activeInvoice.eNcf}
                </div>
                <div className="text-[11px] text-slate-600">
                  Vencimiento Secuencia: <span className="font-semibold">31/12/2026</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  No. Factura Interna: <span className="font-mono font-medium">{activeInvoice.invoiceNumber}</span>
                </div>
              </div>
            </div>

            {/* Datos del Receptor / Comprador */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Cliente / Razón Social
                </span>
                <p className="font-bold text-slate-900 text-sm">{activeInvoice.razonSocialComprador}</p>
                <p className="text-slate-600">RNC/Cédula: <span className="font-mono font-semibold">{activeInvoice.rncComprador}</span></p>
                {activeInvoice.caseNumber && (
                  <p className="text-slate-600">Expediente Asociado: <span className="font-semibold">{activeInvoice.caseNumber}</span></p>
                )}
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Detalles de Emisión
                </span>
                <p className="text-slate-700">Fecha de Emisión: <span className="font-semibold">{activeInvoice.issueDate}</span></p>
                <p className="text-slate-700">Fecha de Vencimiento: <span className="font-semibold">{activeInvoice.dueDate}</span></p>
                <p className="text-slate-700">Moneda: <span className="font-bold text-slate-900">{activeInvoice.currency}</span></p>
              </div>
            </div>

            {/* Tabla de Conceptos */}
            <div className="py-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 text-[11px] font-semibold uppercase bg-slate-50">
                    <th className="py-2 px-2">Descripción del Servicio</th>
                    <th className="py-2 px-2 text-center w-16">Cant.</th>
                    <th className="py-2 px-2 text-right w-28">Precio Unitario</th>
                    <th className="py-2 px-2 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {activeInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-2 font-medium">{item.description}</td>
                      <td className="py-3 px-2 text-center font-mono">{item.quantity}</td>
                      <td className="py-3 px-2 text-right font-mono">
                        {activeInvoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                        {item.unitPrice.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-semibold">
                        {activeInvoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                        {item.total.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales y Liquidación */}
            <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-200 gap-6">
              {/* Sección QR y validación DGII */}
              <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200 max-w-sm">
                <div className="shrink-0 bg-white p-1 rounded border border-slate-300">
                  <QrCodeSvg value={qrUrl} size={84} />
                </div>
                <div className="space-y-1 text-[10px] text-slate-600">
                  <div className="flex items-center text-emerald-700 font-bold">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    e-CF Válido en DGII
                  </div>
                  <p>TrackID DGII: <span className="font-mono font-semibold text-slate-900">{activeInvoice.trackIdDgii}</span></p>
                  <p>Cód. Seguridad: <span className="font-mono font-semibold text-slate-900">{activeInvoice.securityCode}</span></p>
                  <p className="text-slate-400 text-[9px] leading-tight mt-1">
                    Escanee el código QR con su dispositivo para validar la autenticidad fiscal en el portal de la DGII.
                  </p>
                </div>
              </div>

              {/* Recuadro de Totales */}
              <div className="w-full sm:w-64 space-y-2 text-right text-xs">
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Subtotal Neto:</span>
                  <span className="font-mono font-medium">
                    {activeInvoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                    {activeInvoice.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>ITBIS (18%):</span>
                  <span className="font-mono font-medium">
                    {activeInvoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                    {activeInvoice.itbis.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-bold text-slate-950">
                  <span>Total Facturado:</span>
                  <span className="font-mono">
                    {activeInvoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                    {activeInvoice.total.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-xs border-t border-slate-200">
                  <span className="text-slate-600">Saldo Pendiente:</span>
                  <span className={`font-mono font-bold ${activeInvoice.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {activeInvoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                    {activeInvoice.balance.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Recibos de pago asociados */}
            {activeInvoice.paymentReceipts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                  Historial de Pagos y Recibos Registrados
                </span>
                <div className="space-y-1.5">
                  {activeInvoice.paymentReceipts.map((rec) => (
                    <div key={rec.id} className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded text-xs border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-900">{rec.date}</span>
                        <span className="text-slate-500 ml-2">({rec.paymentMethod} - Ref: {rec.reference})</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">
                        + {activeInvoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                        {rec.amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pie de Página Legal DGII */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Esta es una representación impresa de un Comprobante Fiscal Electrónico (e-CF), emitido en conformidad con la Ley Núm. 32-23 de Facturación Electrónica de la República Dominicana.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
