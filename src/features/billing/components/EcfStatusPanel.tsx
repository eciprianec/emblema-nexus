"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EcfRecordRow } from "@/services/billing/types";
import { discardEcfAction, refreshEcfStatusAction, resendEcfAction } from "../actions/billing-actions";
import { ProviderMessages } from "./ProviderMessages";

/** Ritmo recomendado por el proveedor mientras la página está abierta; luego queda la revisión manual. */
const POLL_DELAYS_MS = [4_000, 30_000, 120_000];

const FINAL_STATUSES = ["aceptado", "condicional", "rechazado"];

const PROVIDER_STATUS_NOTES: Record<string, string> = {
  Error: "El proveedor no pudo enviarlo a la DGII después de reintentar. No se ha dado por rechazado: revísalo con el proveedor antes de hacer otro comprobante.",
  "No encontrado": "La DGII dice no encontrar el envío. El proveedor sí lo tiene: no lo reenvíes; vuelve a consultar más tarde.",
};

export function EcfStatusPanel({ invoiceId, ecf, canAct }: { invoiceId: string; ecf: EcfRecordRow; canAct: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"resend" | "discard" | null>(null);
  const stopped = useRef(false);

  const phase = ecf.provider_phase;
  const uncertain = phase === "ambiguo" || phase === "enviando";
  const isFinal = FINAL_STATUSES.includes(ecf.dgii_status);
  const waiting = phase === "enviado" && !isFinal;

  const refresh = useCallback(async () => {
    const result = await refreshEcfStatusAction(invoiceId);
    if (!result.success) {
      setNote(result.error);
      return false;
    }
    setNote(result.data.message ?? null);
    if (result.data.changed || result.data.final) router.refresh();
    return result.data.final;
  }, [invoiceId, router]);

  useEffect(() => {
    if (!waiting || !canAct) return;
    stopped.current = false;
    const timers = POLL_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        if (stopped.current) return;
        void refresh().then((final) => {
          if (final) stopped.current = true;
        });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [waiting, canAct, refresh]);

  const check = () => startTransition(async () => void (await refresh()));

  const resend = () =>
    startTransition(async () => {
      setConfirming(null);
      const result = await resendEcfAction(invoiceId);
      if (!result.success) {
        setNote(result.error);
        return;
      }
      setNote(result.data.message ?? null);
      if (result.data.state === "en_proceso") toast.success("Documento enviado al proveedor");
      router.refresh();
    });

  const discard = () =>
    startTransition(async () => {
      setConfirming(null);
      const result = await discardEcfAction(invoiceId);
      if (!result.success) {
        setNote(result.error);
        return;
      }
      toast.success("El comprobante volvió a borrador");
      router.refresh();
    });

  const providerNote = ecf.provider_status ? PROVIDER_STATUS_NOTES[ecf.provider_status] : null;

  let title = "En proceso en la DGII";
  let body = "El proveedor recibió el documento. Si la DGII lo rechaza, el comprobante vuelve a borrador para corregirlo.";
  if (isFinal) {
    title = "Faltan datos del proveedor en este comprobante";
    body = "La DGII ya respondió, pero el proveedor no devolvió el código de seguridad o el QR en esa consulta.";
  } else if (uncertain) {
    title = "No se sabe si el documento llegó al proveedor";
    body = ecf.provider_error ?? "El envío no terminó con una respuesta clara.";
  } else if (phase === "reservado") {
    title = ecf.send_attempts > 0 ? "El proveedor no tiene el documento" : "Falta enviar el documento al proveedor";
    body =
      ecf.send_attempts > 0
        ? "Antes de reenviarlo o de volver a borrador se le consultará de nuevo. Se reenviará exactamente lo mismo que se guardó."
        : "El número está reservado, pero el envío no llegó a salir.";
  }

  return (
    <div role="status" className="billing-no-print rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="mt-0.5">{body}</p>
          {ecf.provider_status && (
            <p className="mt-1">
              Estado en el proveedor: <span className="font-medium">{ecf.provider_status}</span>
            </p>
          )}
          {providerNote && <p className="mt-1">{providerNote}</p>}
          {phase === "reservado" && ecf.provider_error && <p className="mt-1">Último intento: {ecf.provider_error}</p>}
          {!isFinal && <ProviderMessages messages={ecf.dgii_messages} />}
          {note && <p className="mt-1 font-medium">{note}</p>}
        </div>
        {canAct && (
          <div className="flex flex-wrap gap-2">
            {phase === "reservado" && !isFinal ? (
              <>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirming("discard")}>
                  Volver a borrador
                </Button>
                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" disabled={pending} onClick={() => setConfirming("resend")}>
                  {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
                  {ecf.send_attempts > 0 ? "Reenviar" : "Enviar"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" disabled={pending} onClick={check}>
                {pending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                )}
                {uncertain ? "Verificar" : isFinal ? "Actualizar" : "Actualizar estado"}
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={confirming !== null} onOpenChange={(value) => !value && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirming === "discard" ? "Volver a borrador" : "Enviar a la DGII"}</DialogTitle>
            <DialogDescription>
              {confirming === "discard"
                ? `El comprobante deja de usar el e-NCF ${ecf.encf} y vuelve a borrador para corregirlo. Antes se le consulta al proveedor si lo tiene.`
                : ecf.send_attempts > 0
                  ? `Se enviará de nuevo el e-NCF ${ecf.encf}, exactamente con los datos ya guardados. Antes se le consulta al proveedor si lo tiene.`
                  : `Se enviará el e-NCF ${ecf.encf} al proveedor para firmarlo y presentarlo a la DGII.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
            <Button className="bg-slate-900 text-white hover:bg-slate-800" disabled={pending} onClick={confirming === "discard" ? discard : resend}>
              {confirming === "discard" ? "Volver a borrador" : ecf.send_attempts > 0 ? "Reenviar" : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
