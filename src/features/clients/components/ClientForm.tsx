"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { clientSchema, ClientFormValues } from "../schemas/client-schema";
import { useClientStore } from "../store/useClientStore";
import { Button } from "@/components/ui/button";

export function ClientForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addClient } = useClientStore();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { type: "FISICA", telefono: "", email: "", direccion: "" },
  });

  const type = form.watch("type");

  const handleTypeChange = (newType: "FISICA" | "JURIDICA") => {
    form.setValue("type", newType);
    form.clearErrors();
  };

  const onInvalid = (errors: any) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstError = errors[errorKeys[0]]?.message || "Por favor complete los campos obligatorios.";
      toast.error(`Error de validación: ${firstError}`);
    }
  };

  async function onSubmit(data: ClientFormValues) {
    setIsSubmitting(true);
    try {
      const isFisica = data.type === "FISICA";
      const created = addClient({
        type: data.type,
        nombres: isFisica ? data.nombres?.trim() : undefined,
        apellidos: isFisica ? data.apellidos?.trim() : undefined,
        cedula: isFisica ? data.cedula?.trim() : undefined,
        pasaporte: isFisica ? data.pasaporte?.trim() : undefined,
        razonSocial: !isFisica ? data.razonSocial?.trim() : undefined,
        nombreComercial: !isFisica ? data.nombreComercial?.trim() : undefined,
        rnc: !isFisica ? data.rnc?.trim() : undefined,
        representante: !isFisica ? data.representante?.trim() : undefined,
        telefono: data.telefono.trim(),
        email: data.email.trim(),
        direccion: data.direccion.trim(),
        status: "ACTIVO",
      });

      const displayName = isFisica
        ? `${created.nombres || ""} ${created.apellidos || ""}`.trim()
        : created.razonSocial || "Empresa";

      // Aprovisionar carpetas en Nextcloud WebDAV
      try {
        const provRes = await fetch("/api/integrations/nextcloud/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "client",
            clientId: created.id,
            clientName: displayName,
            docNumber: isFisica ? (data.cedula || data.pasaporte) : data.rnc,
          }),
        });
        const provData = await provRes.json();
        if (provData.success) {
          toast.success(`Cliente "${displayName}" guardado y carpetas aprovisionadas en Nextcloud.`);
        } else {
          toast.success(`Cliente "${displayName}" guardado exitosamente.`);
        }
      } catch {
        toast.success(`Cliente "${displayName}" guardado exitosamente.`);
      }

      form.reset();
      router.push("/clientes");
      router.refresh();
    } catch (err: any) {
      toast.error("Error al guardar cliente: " + (err?.message || "Ocurrió un error."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow-sm border border-slate-200"
    >
      <div className="flex space-x-6 border-b border-slate-200 pb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            value="FISICA"
            checked={type === "FISICA"}
            onChange={() => handleTypeChange("FISICA")}
            className="text-slate-900 focus:ring-slate-900"
          />
          <span className="text-sm font-medium text-slate-700">Persona Física</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            value="JURIDICA"
            checked={type === "JURIDICA"}
            onChange={() => handleTypeChange("JURIDICA")}
            className="text-slate-900 focus:ring-slate-900"
          />
          <span className="text-sm font-medium text-slate-700">Persona Jurídica (Empresa)</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {type === "FISICA" ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombres *</label>
              <input
                {...form.register("nombres")}
                placeholder="ej. Juan Carlos"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
              {form.formState.errors.nombres && (
                <p className="text-xs text-rose-500 mt-1">{form.formState.errors.nombres.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Apellidos *</label>
              <input
                {...form.register("apellidos")}
                placeholder="ej. Pérez Gómez"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
              {form.formState.errors.apellidos && (
                <p className="text-xs text-rose-500 mt-1">{form.formState.errors.apellidos.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Cédula de Identidad</label>
              <input
                {...form.register("cedula")}
                placeholder="001-0000000-0"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
              {form.formState.errors.cedula && (
                <p className="text-xs text-rose-500 mt-1">{form.formState.errors.cedula.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Pasaporte (Opcional)</label>
              <input
                {...form.register("pasaporte")}
                placeholder="Número de pasaporte"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Razón Social *</label>
              <input
                {...form.register("razonSocial")}
                placeholder="ej. Inversiones Caribe S.R.L."
                className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
              {form.formState.errors.razonSocial && (
                <p className="text-xs text-rose-500 mt-1">{form.formState.errors.razonSocial.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">RNC *</label>
              <input
                {...form.register("rnc")}
                placeholder="130000000"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
              {form.formState.errors.rnc && (
                <p className="text-xs text-rose-500 mt-1">{form.formState.errors.rnc.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Representante Legal</label>
              <input
                {...form.register("representante")}
                placeholder="Nombre del apoderado o gerente"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">Teléfono *</label>
          <input
            {...form.register("telefono")}
            placeholder="809-000-0000"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
          {form.formState.errors.telefono && (
            <p className="text-xs text-rose-500 mt-1">{form.formState.errors.telefono.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email *</label>
          <input
            type="email"
            {...form.register("email")}
            placeholder="cliente@correo.com"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
          {form.formState.errors.email && (
            <p className="text-xs text-rose-500 mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">Dirección Física *</label>
          <input
            {...form.register("direccion")}
            placeholder="Calle, Número, Sector, Ciudad"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-xs sm:text-sm p-2 border focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
          {form.formState.errors.direccion && (
            <p className="text-xs text-rose-500 mt-1">{form.formState.errors.direccion.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancelar
        </button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-slate-900 hover:bg-slate-800 text-white text-sm"
        >
          {isSubmitting ? "Guardando en DB..." : "Guardar Cliente"}
        </Button>
      </div>
    </form>
  );
}
