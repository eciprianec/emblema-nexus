"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UserPlus, Trash2, Edit2, Phone, Mail, Building, User as UserIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useClientStore } from "../store/useClientStore";
import { Client, ClientType } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ClientList() {
  const { clients, deleteClient, updateClient } = useClientStore();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("TODOS");
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = React.useState<Client | null>(null);

  const [editFormData, setEditFormData] = React.useState({
    nombres: "",
    apellidos: "",
    razonSocial: "",
    cedula: "",
    rnc: "",
    telefono: "",
    email: "",
    direccion: "",
  });

  React.useEffect(() => {
    if (clientToEdit) {
      setEditFormData({
        nombres: clientToEdit.nombres || "",
        apellidos: clientToEdit.apellidos || "",
        razonSocial: clientToEdit.razonSocial || "",
        cedula: clientToEdit.cedula || "",
        rnc: clientToEdit.rnc || "",
        telefono: clientToEdit.telefono || "",
        email: clientToEdit.email || "",
        direccion: clientToEdit.direccion || "",
      });
    }
  }, [clientToEdit]);

  const filteredClients = React.useMemo(() => {
    return clients.filter((c) => {
      const displayName =
        c.type === "FISICA" ? `${c.nombres || ""} ${c.apellidos || ""}` : c.razonSocial || "";
      const doc = c.type === "FISICA" ? c.cedula || c.pasaporte || "" : c.rnc || "";

      const matchSearch =
        search === "" ||
        displayName.toLowerCase().includes(search.toLowerCase()) ||
        doc.includes(search) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.telefono.includes(search);

      const matchType = typeFilter === "TODOS" || c.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [clients, search, typeFilter]);

  const handleDeleteConfirm = () => {
    if (!clientToDelete) return;
    deleteClient(clientToDelete.id);
    toast.success("Cliente eliminado exitosamente.");
    setClientToDelete(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToEdit) return;

    updateClient(clientToEdit.id, editFormData);
    toast.success("Datos del cliente actualizados.");
    setClientToEdit(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre, RNC, cédula, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8 border-slate-300 bg-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs h-8 rounded-md border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="TODOS">Todos los tipos ({clients.length})</option>
            <option value="FISICA">Persona Física ({clients.filter((c) => c.type === "FISICA").length})</option>
            <option value="JURIDICA">Persona Jurídica ({clients.filter((c) => c.type === "JURIDICA").length})</option>
          </select>
        </div>

        <Link href="/clientes/nuevo">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            + Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Tabla de Clientes */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Nombre / Razón Social
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200 text-xs">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <UserIcon className="h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No hay clientes registrados</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {search || typeFilter !== "TODOS"
                        ? "No se encontraron clientes que coincidan con la búsqueda."
                        : "Haga clic en '+ Nuevo Cliente' para registrar el primer cliente en la base de datos."}
                    </p>
                    <Link href="/clientes/nuevo" className="mt-3">
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
                        + Registrar Primer Cliente
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const isFisica = client.type === "FISICA";
                const displayName = isFisica
                  ? `${client.nombres || ""} ${client.apellidos || ""}`
                  : client.razonSocial || "Sin Razón Social";
                const docText = isFisica
                  ? client.cedula ? `Céd: ${client.cedula}` : client.pasaporte ? `Pas: ${client.pasaporte}` : "-"
                  : client.rnc ? `RNC: ${client.rnc}` : "-";

                return (
                  <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0">
                          {isFisica ? <UserIcon className="h-3.5 w-3.5" /> : <Building className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{displayName}</div>
                          {client.direccion && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{client.direccion}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap font-mono text-slate-600">
                      {docText}
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${
                          isFisica
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-purple-100 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {isFisica ? "Física" : "Jurídica"}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {client.email}
                        </span>
                        {client.telefono && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {client.telefono}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <Link
                        href={`/clientes/${client.id}`}
                        className="inline-flex items-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        Ver Ficha
                      </Link>
                      <button
                        type="button"
                        onClick={() => setClientToEdit(client)}
                        className="inline-flex items-center px-2 py-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="Editar cliente"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientToDelete(client)}
                        className="inline-flex items-center px-2 py-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Editar Cliente */}
      <Dialog open={!!clientToEdit} onOpenChange={() => setClientToEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Editar Datos del Cliente</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifique la información de contacto y fiscal del cliente.
            </DialogDescription>
          </DialogHeader>

          {clientToEdit && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              {clientToEdit.type === "FISICA" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nombres *</label>
                    <Input
                      required
                      value={editFormData.nombres}
                      onChange={(e) => setEditFormData({ ...editFormData, nombres: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos *</label>
                    <Input
                      required
                      value={editFormData.apellidos}
                      onChange={(e) => setEditFormData({ ...editFormData, apellidos: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Cédula</label>
                    <Input
                      value={editFormData.cedula}
                      onChange={(e) => setEditFormData({ ...editFormData, cedula: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Razón Social *</label>
                    <Input
                      required
                      value={editFormData.razonSocial}
                      onChange={(e) => setEditFormData({ ...editFormData, razonSocial: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">RNC *</label>
                    <Input
                      value={editFormData.rnc}
                      onChange={(e) => setEditFormData({ ...editFormData, rnc: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono *</label>
                  <Input
                    required
                    value={editFormData.telefono}
                    onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                  <Input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dirección</label>
                <Input
                  value={editFormData.direccion}
                  onChange={(e) => setEditFormData({ ...editFormData, direccion: e.target.value })}
                  className="text-xs h-8"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setClientToEdit(null)} className="text-xs h-8">
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo Confirmar Eliminación */}
      <Dialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">Eliminar Cliente</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 pt-2">
              ¿Está seguro que desea eliminar al cliente{" "}
              <strong className="text-slate-900">
                {clientToDelete?.type === "FISICA"
                  ? `${clientToDelete.nombres} ${clientToDelete.apellidos}`
                  : clientToDelete?.razonSocial}
              </strong>
              ? Se desvinculará de la base de datos de clientes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setClientToDelete(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
            >
              Eliminar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
