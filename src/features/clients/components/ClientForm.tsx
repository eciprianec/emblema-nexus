"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, ClientFormValues } from "../schemas/client-schema";
import { createClientAction } from "../actions/client-actions";
import { toast } from "sonner";
import { useState } from "react";

export function ClientForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { type: "FISICA", telefono: "", email: "", direccion: "" }
  });

  const type = form.watch("type");

  async function onSubmit(data: ClientFormValues) {
    setIsSubmitting(true);
    const res = await createClientAction(data);
    setIsSubmitting(false);
    if (res.success) {
      toast.success("Cliente guardado exitosamente");
      form.reset();
    } else {
      toast.error("Error al guardar cliente");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div className="flex space-x-4 border-b border-slate-200 pb-4">
        <label className="flex items-center space-x-2">
          <input type="radio" value="FISICA" {...form.register("type")} className="text-slate-900 focus:ring-slate-900" />
          <span className="text-sm font-medium text-slate-700">Persona Física</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" value="JURIDICA" {...form.register("type")} className="text-slate-900 focus:ring-slate-900" />
          <span className="text-sm font-medium text-slate-700">Persona Jurídica</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {type === "FISICA" ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombres</label>
              <input {...form.register("nombres")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Apellidos</label>
              <input {...form.register("apellidos")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Cédula</label>
              <input {...form.register("cedula")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Pasaporte (Opcional)</label>
              <input {...form.register("pasaporte")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Razón Social</label>
              <input {...form.register("razonSocial")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">RNC</label>
              <input {...form.register("rnc")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Representante Legal</label>
              <input {...form.register("representante")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">Teléfono</label>
          <input {...form.register("telefono")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input type="email" {...form.register("email")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">Dirección</label>
          <input {...form.register("direccion")} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm p-2 border" />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting} className="inline-flex justify-center rounded-md border border-transparent bg-slate-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50">
          {isSubmitting ? "Guardando..." : "Guardar Cliente"}
        </button>
      </div>
    </form>
  );
}
