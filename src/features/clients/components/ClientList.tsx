"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Building, Edit2, Mail, Phone, Search, User as UserIcon, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { archiveClientAction, restoreClientAction } from "../actions/client-actions";
import { clientName } from "../mapping";
import type { Client } from "../types";
import { ClientEditDialog } from "./ClientEditDialog";

interface ClientListProps {
  clients: Client[];
  counts: { all: number; fisica: number; juridica: number };
  filters: { q?: string; tipo?: string; archivados: boolean };
  can: { create: boolean; edit: boolean; archive: boolean };
}

export default function ClientList({ clients, counts, filters, can }: ClientListProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [clientToArchive, setClientToArchive] = React.useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = React.useState<Client | null>(null);
  const filtered = Boolean(filters.q || filters.tipo);

  const handleArchiveConfirm = () => {
    if (!clientToArchive) return;
    startTransition(async () => {
      const result = await archiveClientAction(clientToArchive.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Cliente archivado.");
      setClientToArchive(null);
      router.refresh();
    });
  };

  const handleRestore = (client: Client) => {
    startTransition(async () => {
      const result = await restoreClientAction(client.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Cliente restaurado.");
      router.refresh();
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Filtros por la URL: la búsqueda corre en la base y cubre a todos los clientes */}
      <form
        action="/clientes"
        className="flex flex-col items-stretch justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-48 max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
            <Input
              type="text"
              name="q"
              aria-label="Buscar clientes"
              placeholder="Buscar por nombre, RNC, cédula, correo..."
              defaultValue={filters.q}
              className="h-8 border-slate-300 bg-white pl-8 text-xs"
            />
          </div>

          <select
            name="tipo"
            aria-label="Filtrar por tipo"
            defaultValue={filters.tipo ?? ""}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">Todos los tipos ({counts.all})</option>
            <option value="FISICA">Persona física ({counts.fisica})</option>
            <option value="JURIDICA">Persona jurídica ({counts.juridica})</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" name="archivados" value="1" defaultChecked={filters.archivados} />
            Archivados
          </label>

          <Button type="submit" variant="outline" size="sm" className="h-8 text-xs">
            Filtrar
          </Button>
        </div>

        {can.create && (
          <Button asChild size="sm" className="h-8 bg-slate-900 text-xs text-white hover:bg-slate-800">
            <Link href="/clientes/nuevo">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Nuevo cliente
            </Link>
          </Button>
        )}
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Nombre / Razón social</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Documento</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Contacto</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-xs">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <UserIcon className="mb-2 h-10 w-10 text-slate-300" aria-hidden />
                    <p className="text-sm font-semibold text-slate-700">
                      {filters.archivados ? "No hay clientes archivados" : "No hay clientes registrados"}
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                      {filtered ? "Ningún cliente coincide con la búsqueda." : "Los clientes que registres aquí aparecen al facturar."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const isFisica = client.type === "FISICA";
                const docText = isFisica
                  ? client.cedula
                    ? `Céd: ${client.cedula}`
                    : client.pasaporte
                      ? `Pas: ${client.pasaporte}`
                      : "-"
                  : client.rnc
                    ? `RNC: ${client.rnc}`
                    : "-";

                return (
                  <tr key={client.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                          {isFisica ? <UserIcon className="h-3.5 w-3.5" aria-hidden /> : <Building className="h-3.5 w-3.5" aria-hidden />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{clientName(client)}</div>
                          {client.direccion && <div className="max-w-xs truncate text-[11px] text-slate-500">{client.direccion}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-3.5 font-mono text-slate-600">{docText}</td>

                    <td className="whitespace-nowrap px-6 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 ${
                          isFisica ? "border border-blue-200 bg-blue-100 text-blue-800" : "border border-purple-200 bg-purple-100 text-purple-800"
                        }`}
                      >
                        {isFisica ? "Física" : "Jurídica"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        {client.email && (
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Mail className="h-3 w-3 text-slate-400" aria-hidden />
                            {client.email}
                          </span>
                        )}
                        {client.telefono && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Phone className="h-3 w-3 text-slate-400" aria-hidden />
                            {client.telefono}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="space-x-2 whitespace-nowrap px-6 py-3.5 text-right text-xs font-medium">
                      <Link
                        href={`/clientes/${client.id}`}
                        className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        Ver ficha
                      </Link>
                      {can.edit && !filters.archivados && (
                        <button
                          type="button"
                          onClick={() => setClientToEdit(client)}
                          className="inline-flex items-center rounded px-2 py-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          title="Editar cliente"
                          aria-label={`Editar ${clientName(client)}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                      {can.archive &&
                        (filters.archivados ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => handleRestore(client)}
                            className="inline-flex items-center rounded px-2 py-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            title="Restaurar cliente"
                            aria-label={`Restaurar ${clientName(client)}`}
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setClientToArchive(client)}
                            className="inline-flex items-center rounded px-2 py-1 text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
                            title="Archivar cliente"
                            aria-label={`Archivar ${clientName(client)}`}
                          >
                            <Archive className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        ))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {clientToEdit && <ClientEditDialog client={clientToEdit} onClose={() => setClientToEdit(null)} />}

      <Dialog open={!!clientToArchive} onOpenChange={() => setClientToArchive(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Archivar cliente</DialogTitle>
            <DialogDescription className="pt-2 text-xs text-slate-600">
              <strong className="text-slate-900">{clientToArchive && clientName(clientToArchive)}</strong> dejará de aparecer en la lista y al
              facturar. Sus comprobantes y cobros se conservan, y puedes restaurarlo desde el filtro de archivados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setClientToArchive(null)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={handleArchiveConfirm}
              className="h-8 bg-rose-600 text-xs text-white hover:bg-rose-700"
            >
              Archivar cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
