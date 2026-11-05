"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { todayInDr } from "@/domain/billing";
import { registerPaymentAction } from "../actions/billing-actions";
import { PAYMENT_METHODS, fieldClass, labelClass, money } from "./format";

interface PaymentTarget {
  invoiceId: string;
  balanceDue: number;
  /** Lo que las notas de crédito en proceso ya comprometen: no se puede cobrar todavía. */
  pendingCredit?: number;
  currency: string;
  /** Número del comprobante, cuando la pantalla muestra varios. */
  invoiceLabel?: string;
}

export function PaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  balanceDue,
  pendingCredit = 0,
  currency,
  invoiceLabel,
}: PaymentTarget & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const collectible = Math.max(0, balanceDue - pendingCredit);

  const change = (value: boolean) => {
    if (!value) setError(null);
    onOpenChange(value);
  };

  const pay = (form: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await registerPaymentAction({
        invoiceId,
        amount: form.get("amount"),
        paymentDate: form.get("paymentDate"),
        method: form.get("method"),
        reference: form.get("reference"),
        bankName: form.get("bankName"),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Cobro registrado");
      change(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cobro{invoiceLabel ? ` de ${invoiceLabel}` : ""}</DialogTitle>
          <DialogDescription>
            Saldo pendiente: {money(balanceDue, currency)}
            {pendingCredit > 0 && (
              <>
                . Notas de crédito en proceso en la DGII: {money(pendingCredit, currency)}. Se puede cobrar: {money(collectible, currency)}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form action={pay} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className={labelClass}>
                Monto ({currency})
              </label>
              <input id="amount" name="amount" required inputMode="decimal" defaultValue={collectible.toFixed(2)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="paymentDate" className={labelClass}>
                Fecha
              </label>
              <input id="paymentDate" name="paymentDate" type="date" required defaultValue={todayInDr()} max={todayInDr()} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="method" className={labelClass}>
                Forma de pago
              </label>
              <select id="method" name="method" className={fieldClass} defaultValue="transferencia">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reference" className={labelClass}>
                Referencia
              </label>
              <input id="reference" name="reference" className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bankName" className={labelClass}>
                Banco
              </label>
              <input id="bankName" name="bankName" className={fieldClass} />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => change(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Registrar cobro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CollectButton(props: PaymentTarget) {
  const [open, setOpen] = useState(false);
  // Toda la deuda está comprometida por notas en proceso: nada se puede cobrar por ahora.
  if (props.balanceDue - (props.pendingCredit ?? 0) <= 0) {
    return <span className="text-xs text-slate-500">Nota de crédito en proceso</span>;
  }
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="h-7 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700">
        <CreditCard className="mr-1 h-3.5 w-3.5" aria-hidden />
        Cobrar
      </Button>
      {open && <PaymentDialog open={open} onOpenChange={setOpen} {...props} />}
    </>
  );
}
