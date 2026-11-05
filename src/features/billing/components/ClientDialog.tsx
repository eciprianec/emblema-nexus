"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FIELD_LIMITS } from "@/domain/billing";
import type { BillingClient } from "@/services/billing/types";
import { createClientAction } from "../actions/billing-actions";
import { fieldClass, labelClass } from "./format";

export function ClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: BillingClient) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"persona_juridica" | "persona_fisica">("persona_juridica");

  const submit = (form: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createClientAction({
        kind,
        name: form.get("name"),
        lastName: form.get("lastName"),
        taxId: form.get("taxId"),
        passport: form.get("passport"),
        email: form.get("email"),
        phone: form.get("phone"),
        address: form.get("address"),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onCreated(result.data);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>Queda disponible para futuras facturas de esta empresa.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div>
            <label htmlFor="cl-tipo" className={labelClass}>
              Tipo
            </label>
            <select id="cl-tipo" className={fieldClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="persona_juridica">Empresa</option>
              <option value="persona_fisica">Persona</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={kind === "persona_juridica" ? "sm:col-span-2" : ""}>
              <label htmlFor="cl-nombre" className={labelClass}>
                {kind === "persona_juridica" ? "Razón social" : "Nombres"}
              </label>
              <input id="cl-nombre" name="name" required maxLength={FIELD_LIMITS.buyerName} className={fieldClass} />
            </div>
            {kind === "persona_fisica" && (
              <div>
                <label htmlFor="cl-apellido" className={labelClass}>
                  Apellidos
                </label>
                <input id="cl-apellido" name="lastName" className={fieldClass} />
              </div>
            )}
            <div>
              <label htmlFor="cl-id" className={labelClass}>
                RNC o cédula
              </label>
              <input id="cl-id" name="taxId" inputMode="numeric" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="cl-pasaporte" className={labelClass}>
                Pasaporte o ID extranjero
              </label>
              <input id="cl-pasaporte" name="passport" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="cl-correo" className={labelClass}>
                Correo
              </label>
              <input id="cl-correo" name="email" type="email" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="cl-telefono" className={labelClass}>
                Teléfono
              </label>
              <input id="cl-telefono" name="phone" className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cl-direccion" className={labelClass}>
                Dirección
              </label>
              <input id="cl-direccion" name="address" maxLength={FIELD_LIMITS.address} className={fieldClass} />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Crear cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
