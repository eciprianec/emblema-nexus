"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Copy, Loader2, Pencil, Printer, Receipt, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EmissionMode, ValidationIssue } from "@/domain/billing";
import {
  deleteDraftAction,
  issueInvoiceAction,
  voidInvoiceAction,
} from "../actions/billing-actions";
import { fieldClass, labelClass } from "./format";
import { PaymentDialog } from "./PaymentDialog";
import { ProviderMessages, type ProviderMessage } from "./ProviderMessages";

interface Props {
  invoiceId: string;
  status: string;
  fiscalType: string;
  ecfPrefix: string;
  emissionMode: EmissionMode | null;
  settingsMode: EmissionMode | null;
  balanceDue: number;
  /** Lo que las notas de crédito en proceso ya comprometen. */
  pendingCredit?: number;
  /** Lo que aún admite notas de crédito. */
  creditable?: number;
  /** e-NCF vigente del comprobante, si tiene. */
  encf?: string | null;
  /** e-NCF de los intentos rechazados de este borrador. */
  rejectedAttempts?: string[];
  currency: string;
  isInvoice: boolean;
  isVoidable: boolean;
  canCreate: boolean;
  canVoid: boolean;
  canCollect: boolean;
  blockingIssues: number;
  /** Modo proveedor: faltan credenciales, rango o tipo admitido. */
  providerBlocked?: boolean;
  externalSummary: { label: string; value: string }[];
}

export function InvoiceActions(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"issue" | "pay" | "void" | "delete" | null>(null);
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([]);
  const [providerMessages, setProviderMessages] = useState<ProviderMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setDialog(null);
    setError(null);
    setServerIssues([]);
    setProviderMessages([]);
  };

  const issue = (form?: FormData) => {
    setError(null);
    setServerIssues([]);
    setProviderMessages([]);
    startTransition(async () => {
      const signedAt = form?.get("signedAt") as string | null;
      const result = await issueInvoiceAction({
        id: props.invoiceId,
        encf: (form?.get("encf") as string) || undefined,
        securityCode: (form?.get("securityCode") as string) || undefined,
        // El campo no lleva zona: lo escrito es hora de República Dominicana.
        signedAt: signedAt ? `${signedAt.length === 16 ? `${signedAt}:00` : signedAt}-04:00` : undefined,
        trackId: (form?.get("trackId") as string) || null,
      });
      if (!result.success) {
        setError(result.error);
        setServerIssues(result.issues ?? []);
        return;
      }
      const outcome = result.data;
      if (outcome?.state === "devuelto") {
        // No llegó al proveedor: el comprobante sigue siendo un borrador corregible.
        setError(outcome.message ?? "El proveedor no recibió el documento.");
        setProviderMessages(outcome.messages ?? []);
        router.refresh();
        return;
      }
      if (outcome?.state === "ambiguo") toast.warning(outcome.message ?? "No se sabe si el documento llegó al proveedor.");
      else if (outcome?.state === "sin_enviar") toast.warning(outcome.message ?? "El proveedor no aceptó el reenvío.");
      else if (outcome) toast.success("Enviado. La DGII responderá en unos segundos.");
      else toast.success("Comprobante emitido");
      close();
      router.refresh();
    });
  };

  const voidIt = (form: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await voidInvoiceAction(props.invoiceId, String(form.get("reason") ?? ""));
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Comprobante anulado");
      close();
      router.refresh();
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteDraftAction(props.invoiceId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Borrador eliminado");
      router.push("/finanzas/facturas");
    });
  };

  const isDraft = props.status === "borrador";
  const open = ["emitida", "parcialmente_pagada", "vencida"].includes(props.status);
  const collectible = open && props.fiscalType !== "34" && props.balanceDue - (props.pendingCredit ?? 0) > 0;
  const noteable = !isDraft && props.status !== "anulada" && props.status !== "en_proceso" && props.isInvoice;
  const blocked =
    props.blockingIssues > 0 || !props.settingsMode || props.settingsMode === "ecf_directo" || Boolean(props.providerBlocked);

  const copySummary = async () => {
    const text = props.externalSummary.map((row) => `${row.label}: ${row.value}`).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Datos copiados");
  };

  const errorBlock = (error || serverIssues.length > 0 || providerMessages.length > 0) && (
    <div role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">
      {error && <p>{error}</p>}
      {serverIssues.length > 0 && (
        <ul className="ml-4 mt-1 list-disc">
          {serverIssues.filter((i) => i.severity === "error").map((i) => (
            <li key={`${i.field}-${i.message}`}>{i.message}</li>
          ))}
        </ul>
      )}
      <ProviderMessages messages={providerMessages} />
    </div>
  );

  return (
    <div className="billing-no-print flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-1.5 h-3.5 w-3.5" />
        Imprimir
      </Button>

      {isDraft && props.canCreate && (
        <>
          <Button variant="outline" size="sm" className="text-rose-700" onClick={() => setDialog("delete")}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Eliminar
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/finanzas/facturas/${props.invoiceId}/editar`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Link>
          </Button>
          <Button
            size="sm"
            className="bg-slate-900 text-white hover:bg-slate-800"
            disabled={blocked}
            onClick={() => setDialog("issue")}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Emitir
          </Button>
        </>
      )}

      {noteable && props.canCreate && (
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={`/finanzas/facturas/nueva?nota=33&de=${props.invoiceId}`}>Nota de débito</Link>
          </Button>
          {(props.creditable ?? 1) > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/finanzas/facturas/nueva?nota=34&de=${props.invoiceId}`}>
                <Receipt className="mr-1.5 h-3.5 w-3.5" />
                Nota de crédito
              </Link>
            </Button>
          )}
        </>
      )}

      {props.isVoidable && props.canVoid && (
        <Button variant="outline" size="sm" className="text-rose-700" onClick={() => setDialog("void")}>
          <Ban className="mr-1.5 h-3.5 w-3.5" />
          Anular
        </Button>
      )}

      {collectible && props.canCollect && (
        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setDialog("pay")}>
          <Wallet className="mr-1.5 h-3.5 w-3.5" />
          Registrar cobro
        </Button>
      )}

      <Dialog open={dialog === "issue"} onOpenChange={(value) => !value && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir comprobante</DialogTitle>
            <DialogDescription>
              {props.settingsMode === "ecf_externo"
                ? "Emite primero el e-CF en el Facturador Gratuito de la DGII o con tu proveedor, y luego registra aquí lo que te devuelva. Un e-CF emitido no se puede editar."
                : props.settingsMode === "ecf_proveedor"
                  ? "Se asignará el siguiente e-NCF de tu rango y se enviará al proveedor para firmarlo y presentarlo a la DGII. Mientras la DGII responde queda en proceso, sin saldo; si lo rechaza, vuelve a borrador para corregirlo."
                  : "Se asignará el siguiente NCF de tu rango autorizado. Después de emitir, el comprobante no se puede editar."}
            </DialogDescription>
          </DialogHeader>

          {props.settingsMode === "ecf_externo" ? (
            <form action={issue} className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Datos para el facturador</span>
                  <button type="button" onClick={copySummary} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copiar
                  </button>
                </div>
                <dl className="space-y-0.5 text-xs text-slate-600">
                  {props.externalSummary.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4">
                      <dt>{row.label}</dt>
                      <dd className="text-right font-mono">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <label htmlFor="encf" className={labelClass}>
                  e-NCF
                </label>
                <input
                  id="encf"
                  name="encf"
                  required
                  maxLength={13}
                  pattern={`${props.ecfPrefix}[0-9]{10}`}
                  title={`13 posiciones, inicia con ${props.ecfPrefix}`}
                  placeholder={`${props.ecfPrefix}0000000001`}
                  className={`${fieldClass} font-mono uppercase`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="securityCode" className={labelClass}>
                    Código de seguridad
                  </label>
                  <input id="securityCode" name="securityCode" required maxLength={6} pattern="[0-9A-Za-z]{6}" title="6 caracteres" className={`${fieldClass} font-mono uppercase`} />
                </div>
                <div>
                  <label htmlFor="signedAt" className={labelClass}>
                    Fecha y hora de firma
                  </label>
                  <input id="signedAt" name="signedAt" type="datetime-local" step={1} required className={fieldClass} />
                </div>
              </div>
              <div>
                <label htmlFor="trackId" className={labelClass}>
                  TrackId (opcional)
                </label>
                <input id="trackId" name="trackId" className={fieldClass} />
              </div>
              {errorBlock}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800" disabled={pending}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  Registrar e-CF
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              {errorBlock}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  Cancelar
                </Button>
                <Button className="bg-slate-900 text-white hover:bg-slate-800" disabled={pending} onClick={() => issue()}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  {props.settingsMode === "ecf_proveedor" ? "Enviar a la DGII" : "Emitir con NCF"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={dialog === "pay"}
        onOpenChange={(value) => !value && close()}
        invoiceId={props.invoiceId}
        balanceDue={props.balanceDue}
        pendingCredit={props.pendingCredit}
        currency={props.currency}
      />

      <Dialog open={dialog === "void"} onOpenChange={(value) => !value && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular comprobante</DialogTitle>
            <DialogDescription>
              El NCF queda consumido y deberá reportarse en el formato 608. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <form action={voidIt} className="space-y-3">
            <div>
              <label htmlFor="reason" className={labelClass}>
                Motivo
              </label>
              <input id="reason" name="reason" required className={fieldClass} />
            </div>
            {errorBlock}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Anular comprobante
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={(value) => !value && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar borrador</DialogTitle>
            <DialogDescription>
              Se borrará el borrador y sus líneas. Esta acción no se puede deshacer.
              {!!props.rejectedAttempts?.length && (
                <>
                  {" "}
                  El historial de sus envíos rechazados ({props.rejectedAttempts.join(", ")}) se conserva, y los números que la
                  DGII dio por usados no se vuelven a emitir: se ven en la configuración, junto a los rangos.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {errorBlock}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Eliminar borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
