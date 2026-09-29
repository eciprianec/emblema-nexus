"use client";

import { useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  User as UserIcon,
  Building,
  Mail,
  Phone,
  MapPin,
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useClientStore } from "../store/useClientStore";
import { useCaseStore } from "@/features/cases/store/useCaseStore";
import { DocumentList } from "@/features/documents/components/DocumentList";
import { DocumentUploader } from "@/features/documents/components/DocumentUploader";
import { NextcloudVaultCard } from "@/features/documents/components/NextcloudVaultCard";
import { ClientFinanceTab } from "@/features/finance/components/ClientFinanceTab";
import { FinanceModals } from "@/features/finance/components/FinanceModals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientPortalStore } from "@/features/client-portal/store/useClientPortalStore";
import { ClientPortalAccessModal } from "@/features/client-portal/components/ClientPortalAccessModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ClientDetail({ clientId }: { clientId: string }) {
  const [activeTab, setActiveTab] = useState("info");
  const { openAccessModal } = useClientPortalStore();
  const { getClientById, updateClient } = useClientStore();
  const { getCasesByClientId } = useCaseStore();

  const client = getClientById(clientId);
  const clientCases = getCasesByClientId(clientId);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nombres: "",
    apellidos: "",
    razonSocial: "",
    cedula: "",
    rnc: "",
    telefono: "",
    email: "",
    direccion: "",
  });

  const handleOpenEdit = () => {
    if (!client) return;
    setEditFormData({
      nombres: client.nombres || "",
      apellidos: client.apellidos || "",
      razonSocial: client.razonSocial || "",
      cedula: client.cedula || "",
      rnc: client.rnc || "",
      telefono: client.telefono || "",
      email: client.email || "",
      direccion: client.direccion || "",
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    updateClient(client.id, editFormData);
    toast.success("Información del cliente actualizada.");
    setIsEditOpen(false);
  };

  if (!client) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center mt-6">
        <UserIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900">Cliente no encontrado</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No se encontró el registro de cliente con identificador <code>{clientId}</code>.
        </p>
        <Link href="/clientes" className="mt-4 inline-block">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
            ← Volver a Directorio de Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const isFisica = client.type === "FISICA";
  const displayName = isFisica
    ? `${client.nombres || ""} ${client.apellidos || ""}`.trim()
    : client.razonSocial || "Empresa";
  const docLabel = isFisica ? "Cédula de Identidad" : "RNC (Registro Tributario)";
  const docValue = isFisica ? client.cedula || client.pasaporte || "N/A" : client.rnc || "N/A";

  const tabs = [
    { id: "info", label: "Información" },
    { id: "expedientes", label: `Expedientes (${clientCases.length})` },
    { id: "documentos", label: "Documentos" },
    { id: "finanzas", label: "Facturación y CxC" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Barra superior de identificación */}
      <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Expediente del Cliente</span>
          <span className="font-mono text-xs font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
            {client.id}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isFisica ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-purple-100 text-purple-800 border border-purple-200"
            }`}
          >
            {isFisica ? "Persona Física" : "Persona Jurídica"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenEdit}
            className="text-xs h-7 border-slate-300"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            Editar Datos
          </Button>

          <Button
            size="sm"
            onClick={() => openAccessModal({ id: client.id, name: displayName })}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7 font-medium shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
            Acceso al Portal
          </Button>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="border-b border-slate-200">
        <nav className="flex -mb-px px-6 space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-slate-900 text-slate-900 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* PESTAÑA: INFORMACIÓN */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{displayName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registrado el {new Date(client.createdAt).toLocaleDateString("es-DO", { dateStyle: "long" })}
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {client.status || "Activo"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Datos Fiscales
                </span>
                <div>
                  <span className="text-slate-500 block text-[11px]">{docLabel}:</span>
                  <span className="font-mono font-bold text-slate-900">{docValue}</span>
                </div>
                {client.representante && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Representante Legal:</span>
                    <span className="font-medium text-slate-900">{client.representante}</span>
                  </div>
                )}
                {client.nombreComercial && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Nombre Comercial:</span>
                    <span className="font-medium text-slate-900">{client.nombreComercial}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Datos de Contacto
                </span>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Correo Electrónico:</span>
                    <span className="font-medium text-slate-900">{client.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Teléfono:</span>
                    <span className="font-medium text-slate-900">{client.telefono}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Dirección Física:</span>
                    <span className="font-medium text-slate-900">{client.direccion || "No especificada"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: EXPEDIENTES VINCULADOS */}
        {activeTab === "expedientes" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Expedientes Asociados a este Cliente</h3>
                <p className="text-xs text-slate-500">Trámites legales, de agrimensura o inmobiliarios aperturados.</p>
              </div>
              <Link href={`/expedientes/nuevo?clientId=${client.id}`}>
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  + Nuevo Expediente para este Cliente
                </Button>
              </Link>
            </div>

            {clientCases.length === 0 ? (
              <div className="p-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
                <FolderKanban className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No hay expedientes activos para este cliente</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Aperture un expediente legal, de agrimensura o inmobiliaria para gestionar sus trámites.
                </p>
                <Link href={`/expedientes/nuevo?clientId=${client.id}`} className="mt-3 inline-block">
                  <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
                    + Crear Expediente
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Número / Título</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Área</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Responsable</th>
                      <th className="px-6 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {clientCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-mono font-bold text-slate-900">{c.numero}</div>
                          <div className="text-slate-600 font-medium">{c.titulo}</div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className="font-medium text-slate-700">{c.area}</span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                            {c.estado}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">{c.responsable}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right">
                          <Link
                            href={`/expedientes/${c.id}`}
                            className="inline-flex items-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium"
                          >
                            Ver Expediente →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: DOCUMENTOS */}
        {activeTab === "documentos" && (
          <div className="space-y-6">
            <NextcloudVaultCard
              type="client"
              id={client.id}
              name={displayName}
              titleOrDoc={docValue}
            />
            <div>
              <DocumentUploader clientId={clientId} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Directorio de Documentos</h3>
              <DocumentList />
            </div>
          </div>
        )}

        {/* PESTAÑA: FINANZAS */}
        {activeTab === "finanzas" && <ClientFinanceTab clientId={clientId} />}
      </div>

      {/* Modal Editar Cliente */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Editar Datos del Cliente</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifique la información de contacto y fiscal del cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            {isFisica ? (
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
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)} className="text-xs h-8">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <FinanceModals />
      <ClientPortalAccessModal />
    </div>
  );
}
