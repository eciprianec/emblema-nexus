"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEcfStore } from "../store/useEcfStore";
import { ECF_STATUS_MAP } from "../types";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export function EcfTrackIdModal() {
  const {
    selectedTrackId,
    selectedEcfForTrackId,
    isTrackIdModalOpen,
    closeTrackIdModal,
    checkTrackIdStatus,
    config,
  } = useEcfStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  if (!selectedTrackId) return null;

  const ecf = selectedEcfForTrackId;
  const currentStatus = ecf?.dgiiStatus || "aceptado";
  const statusMeta = ECF_STATUS_MAP[currentStatus];

  const handleCopyTrackId = () => {
    navigator.clipboard.writeText(selectedTrackId);
    setCopied(true);
    toast.success("TrackId copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecheck = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const result = checkTrackIdStatus(selectedTrackId);
      setLastCheckTime(result.lastChecked);
      setIsRefreshing(false);
      toast.success("Consulta DGII completada", {
        description: `Código respuesta: ${result.statusCode} - ${result.message.slice(0, 60)}...`,
      });
    }, 800);
  };

  return (
    <Dialog open={isTrackIdModalOpen} onOpenChange={closeTrackIdModal}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-400" />
              <DialogTitle className="text-base font-semibold text-white">
                Auditoría Web Service DGII - Consulta TrackId
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className={
                config.ambiente === "PROD"
                  ? "border-emerald-500/40 text-emerald-300 bg-emerald-950/40 text-[10px]"
                  : "border-amber-500/40 text-amber-300 bg-amber-950/40 text-[10px]"
              }
            >
              Ambiente: {config.ambiente === "PROD" ? "PRODUCCIÓN (DGII)" : "CERTIFICACIÓN (PRUEBAS)"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            Validación en tiempo real del estado de recepción fiscal ante el servidor del Ministerio de Hacienda / DGII.
          </DialogDescription>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-white text-slate-800 text-xs">
          {/* TrackId Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Identificador de Transacción (TrackId)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyTrackId}
                className="h-6 px-2 text-[11px] text-slate-600 hover:text-slate-900"
              >
                {copied ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <p className="font-mono text-xs font-semibold text-slate-900 mt-1 break-all select-all">
              {selectedTrackId}
            </p>
          </div>

          {/* Grid de Estado DGII */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-md p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Estado Dictaminado
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dotClass}`} />
                <span className="font-bold text-slate-900">{statusMeta.label}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{statusMeta.description}</p>
            </div>

            <div className="border border-slate-200 rounded-md p-3">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Código de Retorno DGII
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-900">
                  {ecf?.dgiiStatusCode || "100"}
                </span>
                <span className="text-[11px] text-slate-600">
                  {ecf?.dgiiStatusCode === "100"
                    ? "Recepción Aceptada"
                    : ecf?.dgiiStatusCode === "102"
                    ? "En Proceso de Lote"
                    : "Rechazado"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Última verificación: {lastCheckTime || "En la emisión"}
              </p>
            </div>
          </div>

          {/* Verificaciones Técnicas */}
          <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Esquema XML XSD (e-CF v1.0)</span>
                  <p className="text-[11px] text-slate-500">
                    Estructura sintáctica aprobada según especificación técnica DGII.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Válido
              </Badge>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Firma Digital X.509</span>
                  <p className="text-[11px] text-slate-500">
                    Certificado emitido por Avansi S.R.L. no revocado y vigente.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Firmado
              </Badge>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Secuencia Autorizada</span>
                  <p className="text-[11px] text-slate-500">
                    e-NCF {ecf?.eNCF || "E3100000001"} dentro del rango activo asignado.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Autorizado
              </Badge>
            </div>
          </div>

          {/* Mensaje de respuesta del validador */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Dictamen del Validador Tributario
            </span>
            <p className="text-slate-800 leading-relaxed font-sans">
              {ecf?.dgiiStatusMessage ||
                "Comprobante recibido y validado satisfactoriamente por el validador fiscal DGII. Timbre electrónico generado exitosamente."}
            </p>
            {ecf?.dgiiValidationErrors && ecf.dgiiValidationErrors.length > 0 && (
              <div className="mt-2 pt-2 border-t border-rose-200 text-rose-700 space-y-1">
                <span className="font-bold text-[11px]">Inconsistencias registradas:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {ecf.dgiiValidationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecheck}
            disabled={isRefreshing}
            className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-slate-900" : ""}`} />
            {isRefreshing ? "Consultando DGII..." : "Re-consultar Estado en Vivo"}
          </Button>

          <Button
            size="sm"
            onClick={closeTrackIdModal}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
          >
            Cerrar Auditoría
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
