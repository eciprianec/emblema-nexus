"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateClientAction } from "../actions/client-actions";
import type { Client } from "../types";

function Field({
  label,
  name,
  defaultValue,
  required,
  type,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={`edit-${name}`} className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </label>
      <Input id={`edit-${name}`} name={name} type={type} required={required} defaultValue={defaultValue ?? ""} className="h-8 text-xs" />
    </div>
  );
}

/** Envía todos los campos del cliente: los que falten se guardarían vacíos. */
export function ClientEditDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const isFisica = client.type === "FISICA";

  const submit = (form: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await updateClientAction(client.id, {
        type: client.type,
        ...Object.fromEntries(form.entries()),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Datos del cliente actualizados.");
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Editar datos del cliente</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Los comprobantes ya emitidos conservan los datos con que se emitieron.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-4 pt-2">
          {isFisica ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombres" name="nombres" defaultValue={client.nombres} required />
              <Field label="Apellidos" name="apellidos" defaultValue={client.apellidos} />
              <Field label="Cédula" name="cedula" defaultValue={client.cedula} />
              <Field label="Pasaporte" name="pasaporte" defaultValue={client.pasaporte} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Razón social" name="razonSocial" defaultValue={client.razonSocial} required className="col-span-2" />
              <Field label="RNC" name="rnc" defaultValue={client.rnc} />
              <Field label="Nombre comercial" name="nombreComercial" defaultValue={client.nombreComercial} />
              <Field label="Representante legal" name="representante" defaultValue={client.representante} className="col-span-2" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono" name="telefono" defaultValue={client.telefono} />
            <Field label="Correo" name="email" type="email" defaultValue={client.email} />
            <Field label="Dirección" name="direccion" defaultValue={client.direccion} className="col-span-2" />
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-700">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending} className="h-8 bg-slate-900 text-xs text-white hover:bg-slate-800">
              {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
