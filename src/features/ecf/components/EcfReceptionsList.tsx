"use client";

import { useState, useMemo } from "react";
import { useEcfStore } from "../store/useEcfStore";
import { ReceivedECF, ECF_RECEPTION_STATUS_MAP } from "../types";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Search,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
  FileCheck2,
  AlertTriangle,
  Building2,
  Copy,
  Clock,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function EcfReceptionsList() {
  const {
    receivedEcfs,
    approveReceivedEcf,
    rejectReceivedEcf,
    acknowledgeReceivedEcf,
  } = useEcfStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [rejectingItem, setRejectingItem] = useState<ReceivedECF | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingItem, setViewingItem] = useState<ReceivedECF | null>(null);

  const filteredReceptions = useMemo(() => {
    return receivedEcfs.filter((rec) => {
      if (statusFilter !== "todos" && rec.statusComercial !== statusFilter) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        rec.eNCF.toLowerCase().includes(term) ||
        rec.razonSocialEmisor.toLowerCase().includes(term) ||
        rec.rncEmisor.toLowerCase().includes(term) ||
        rec.trackId.toLowerCase().includes(term)
      );
    });
  }, [receivedEcfs, statusFilter, search]);

  const handleApprove = (rec: ReceivedECF) => {
    approveReceivedEcf(rec.id);
    toast.success(`Aprobación Comercial B2B registrada`, {
      description: `Comprobante ${rec.eNCF} de ${rec.razonSocialEmisor} aprobado para pago.`,
    });
  };

  const handleOpenReject = (rec: ReceivedECF) => {
    setRejectingItem(rec);
    setRejectReason(rec.motivoRechazo || "");
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    if (!rejectReason.trim()) {
      toast.error("Debe indicar un motivo justificado para el rechazo comercial");
      return;
    }

    rejectReceivedEcf(rejectingItem.id, rejectReason.trim());
    toast.warning(`Rechazo Comercial B2B transmitido`, {
      description: `Comprobante ${rejectingItem.eNCF} marcado como rechazado.`,
    });
    setRejectingItem(null);
    setRejectReason("");
  };

  const handleSendAcuse = (rec: ReceivedECF) => {
    acknowledgeReceivedEcf(rec.id);
    toast.success(`Acuse de Recibo DGII transmitido`, {
      description: `Se notificó a la DGII y al emisor la recepción formal de ${rec.eNCF}.`,
    });
  };

  const handleCopyTrackId = (trackId: string) => {
    navigator.clipboard.writeText(trackId);
    toast.success("TrackId copiado al portapapeles");
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Filtros */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar e-CF recibido por e-NCF, suplidor, RNC o TrackId..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          >
            <option value="todos">Todos los Estados Comerciales</option>
            <option value="pendiente_aprobacion">Pendiente Aprobación</option>
            <option value="aprobado_comercial">Aprobado Comercial</option>
            <option value="rechazado_comercial">Rechazado Comercial</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Inbox className="h-4 w-4 text-slate-400" />
          <span>Buzón e-CF conectado a la DGII</span>
        </div>
      </div>

      {/* Tabla de Comprobantes Recibidos */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-4">e-NCF Proveedor</th>
              <th className="py-2.5 px-4">Suplidor Emisor</th>
              <th className="py-2.5 px-4">Fecha Emisión</th>
              <th className="py-2.5 px-4 text-right">Monto Facturado</th>
              <th className="py-2.5 px-4 text-center">Acuse de Recibo DGII</th>
              <th className="py-2.5 px-4 text-center">Aprobación Comercial B2B</th>
              <th className="py-2.5 px-4 text-right">Acciones de Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReceptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Inbox className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium">Buzón de comprobantes recibidos vacío</p>
                    <p className="text-xs text-slate-400">
                      No hay comprobantes de suplidores pendientes con los filtros seleccionados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReceptions.map((rec) => {
                const statusMeta = ECF_RECEPTION_STATUS_MAP[rec.statusComercial];
                const mainItem = rec.items[0]?.description || "Servicios o suministros";

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* e-NCF */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {rec.eNCF}
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Cód. Seg: {rec.codigoSeguridad}
                      </span>
                    </td>

                    {/* Suplidor */}
                    <td className="py-3 px-4 max-w-[220px]">
                      <span className="font-semibold text-slate-800 block truncate" title={rec.razonSocialEmisor}>
                        {rec.razonSocialEmisor}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 block">
                        RNC: {rec.rncEmisor}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate block mt-0.5" title={mainItem}>
                        {mainItem}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {formatDate(rec.fechaEmision)}
                    </td>

                    {/* Monto */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                      {formatMoney(rec.montoTotal, rec.currency)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ITBIS: {formatMoney(rec.montoItbis, rec.currency)}
                      </span>
                    </td>

                    {/* Acuse de Recibo */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {rec.acuseReciboEnviado ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Acuse Enviado
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendAcuse(rec)}
                          className="h-6 px-2 text-[10px] border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Dar Acuse DGII
                        </Button>
                      )}
                    </td>

                    {/* Estado Comercial */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                      {rec.motivoRechazo && (
                        <span className="block text-[10px] text-rose-600 truncate max-w-[150px] mx-auto mt-0.5" title={rec.motivoRechazo}>
                          {rec.motivoRechazo}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingItem(rec)}
                          className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900"
                          title="Ver detalle del comprobante"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver
                        </Button>

                        {rec.statusComercial !== "aprobado_comercial" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(rec)}
                            className="h-7 px-2 text-[11px] border-slate-300 text-emerald-700 hover:bg-emerald-50 font-medium"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Aprobar
                          </Button>
                        )}

                        {rec.statusComercial !== "rechazado_comercial" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReject(rec)}
                            className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Rechazar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Rechazo Comercial */}
      <Dialog open={Boolean(rejectingItem)} onOpenChange={() => setRejectingItem(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Rechazo Comercial B2B de e-CF
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Indique el motivo técnico o comercial del rechazo para notificar al emisor ({rejectingItem?.razonSocialEmisor}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">Comprobante e-NCF:</span>
                <span className="font-mono font-bold text-slate-900">{rejectingItem?.eNCF}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-semibold text-slate-700">Monto Facturado:</span>
                <span className="font-mono text-slate-900">
                  {rejectingItem ? formatMoney(rejectingItem.montoTotal, rejectingItem.currency) : ""}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Motivo de Rechazo Comercial <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                placeholder="Describa la inconsistencia en precios, cantidades, orden de compra o condiciones..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1 text-xs"
                rows={4}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingItem(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
            >
              Confirmar Rechazo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Visualizar Detalle de Comprobante Recibido */}
      <Dialog open={Boolean(viewingItem)} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-slate-700" />
              Detalle de e-CF Recibido ({viewingItem?.eNCF})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Datos fiscales recibidos vía el servicio de intercambio electrónico DGII.
            </DialogDescription>
          </DialogHeader>

          {viewingItem && (
            <div className="space-y-4 my-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Suplidor Emisor</span>
                  <p className="font-semibold text-slate-900">{viewingItem.razonSocialEmisor}</p>
                  <p className="font-mono text-slate-600">RNC: {viewingItem.rncEmisor}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Receptor</span>
                  <p className="font-semibold text-slate-900">EMBLEMA NEXUS S.R.L.</p>
                  <p className="font-mono text-slate-600">RNC: {viewingItem.rncComprador}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase font-semibold">
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-2 text-center w-16">Cant.</th>
                      <th className="py-2 px-3 text-right w-24">Precio</th>
                      <th className="py-2 px-3 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingItem.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 text-slate-900">{it.description}</td>
                        <td className="py-2 px-2 text-center font-mono">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatMoney(it.unitPrice, viewingItem.currency)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">{formatMoney(it.total, viewingItem.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md border border-slate-200 font-mono">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-sans block">TrackId DGII</span>
                  <span className="text-[11px] text-slate-700">{viewingItem.trackId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-500 font-sans block">Total Facturado</span>
                  <span className="text-base font-bold text-slate-900">{formatMoney(viewingItem.montoTotal, viewingItem.currency)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingItem(null)}
              className="text-xs h-8"
            >
              Cerrar Detalle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
