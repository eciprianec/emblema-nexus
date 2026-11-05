"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { voidPaymentAction } from "../actions/billing-actions";
import { fieldClass, labelClass } from "./format";

export function VoidPaymentButton({ paymentId, receipt }: { paymentId: string; receipt: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (form: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await voidPaymentAction(paymentId, String(form.get("reason") ?? ""));
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Cobro anulado");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className="billing-no-print text-xs font-medium text-rose-700 hover:underline" onClick={() => setOpen(true)}>
        Anular
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular cobro {receipt}</DialogTitle>
            <DialogDescription>El saldo vuelve a la factura y el recibo queda registrado como anulado.</DialogDescription>
          </DialogHeader>
          <form action={submit} className="space-y-3">
            <div>
              <label htmlFor={`motivo-${paymentId}`} className={labelClass}>
                Motivo
              </label>
              <input id={`motivo-${paymentId}`} name="reason" required className={fieldClass} />
            </div>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Anular cobro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
