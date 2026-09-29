"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCaseStore } from "../store/useCaseStore";
import { useClientStore } from "@/features/clients/store/useClientStore";
import { useUserStore } from "@/features/users/store/useUserStore";
import { CaseArea, CasePriority } from "../types";

const DOSSIER_TYPES_BY_AREA: Record<CaseArea, string[]> = {
  LEGAL: [
    "Contrato Civil / Comercial",
    "Constitución de Empresa",
    "Litigio Judicial / Demanda",
    "Asesoría Corporativa",
    "Derecho Laboral",
  ],
  AGRIMENSURA: [
    "Deslinde y Mensura Catastral",
    "Refundición de Parcelas",
    "Subdivisión de Parcela",
    "Actualización de Mensura",
    "Levantamiento Topográfico",
  ],
  INMOBILIARIA: [
    "Gestión de Venta de Inmueble",
    "Contrato de Promesa de Venta",
    "Alquiler Residencial / Comercial",
    "Desarrollo de Proyecto Inmobiliario",
    "Fideicomiso Inmobiliario",
  ],
};

export function CaseWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  const { addCase } = useCaseStore();
  const { clients, addClient } = useClientStore();
  const { users } = useUserStore();

  const [step, setStep] = React.useState(1);

  // Form states
  const [titulo, setTitulo] = React.useState("");
  const [area, setArea] = React.useState<CaseArea>("LEGAL");
  const [tipo, setTipo] = React.useState(DOSSIER_TYPES_BY_AREA["LEGAL"][0]);
  const [prioridad, setPrioridad] = React.useState<CasePriority>("MEDIA");
  const [responsableId, setResponsableId] = React.useState(users[0]?.id || "");
  const [descripcion, setDescripcion] = React.useState("");

  const [clienteId, setClienteId] = React.useState(preselectedClientId || (clients[0]?.id || ""));
  const [showQuickClientModal, setShowQuickClientModal] = React.useState(false);
  const [quickClientName, setQuickClientName] = React.useState("");
  const [quickClientDoc, setQuickClientDoc] = React.useState("");
  const [quickClientPhone, setQuickClientPhone] = React.useState("");
  const [quickClientEmail, setQuickClientEmail] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Set default responsible if not set
  React.useEffect(() => {
    if (!responsableId && users.length > 0) {
      setResponsableId(users[0].id);
    }
  }, [users, responsableId]);

  // Set default client if not set
  React.useEffect(() => {
    if (preselectedClientId) {
      setClienteId(preselectedClientId);
    } else if (!clienteId && clients.length > 0) {
      setClienteId(clients[0].id);
    }
  }, [clients, preselectedClientId, clienteId]);

  // Update default trámite type when area changes
  const handleAreaChange = (newArea: CaseArea) => {
    setArea(newArea);
    setTipo(DOSSIER_TYPES_BY_AREA[newArea][0]);
  };

  const selectedClient = clients.find((c) => c.id === clienteId);
  const selectedUser = users.find((u) => u.id === responsableId);

  const handleQuickClientCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !quickClientEmail.trim()) {
      toast.error("Por favor complete al menos el nombre y correo del cliente.");
      return;
    }

    const created = addClient({
      type: "FISICA",
      nombres: quickClientName.trim(),
      apellidos: "",
      cedula: quickClientDoc.trim(),
      telefono: quickClientPhone.trim() || "809-000-0000",
      email: quickClientEmail.trim(),
      direccion: "Santo Domingo, R.D.",
      status: "ACTIVO",
    });

    toast.success(`Cliente "${created.nombres}" registrado exitosamente.`);
    setClienteId(created.id);
    setShowQuickClientModal(false);
    setQuickClientName("");
    setQuickClientDoc("");
    setQuickClientPhone("");
    setQuickClientEmail("");
  };

  const handleNextFromStep1 = () => {
    if (!titulo.trim()) {
      toast.error("Por favor ingrese el título del expediente.");
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!clienteId) {
      toast.error("Debe seleccionar o registrar un cliente titular para el expediente.");
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!titulo.trim()) {
      toast.error("El título es obligatorio.");
      setStep(1);
      return;
    }
    if (!clienteId) {
      toast.error("Debe seleccionar un cliente.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const clientName = selectedClient
        ? selectedClient.type === "FISICA"
          ? `${selectedClient.nombres || ""} ${selectedClient.apellidos || ""}`.trim()
          : selectedClient.razonSocial || "Empresa"
        : "Cliente Registrado";

      const responsableName = selectedUser
        ? `${selectedUser.nombres} ${selectedUser.apellidos}`
        : "Administrador";

      const createdCase = addCase({
        titulo: titulo.trim(),
        area,
        tipo,
        clienteId,
        clientName,
        responsableId: responsableId || "admin",
        responsable: responsableName,
        prioridad,
        estado: "EN_PROCESO",
        descripcion: descripcion.trim(),
      });

      toast.success(`¡Expediente creado con éxito! Número asignado: ${createdCase.numero}`);
      router.push(`/expedientes/${createdCase.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error("Error al crear expediente: " + (err?.message || "Ocurrió un error."));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 max-w-3xl mx-auto">
      {/* Indicador de Pasos */}
      <div className="flex mb-8 border-b border-slate-200 pb-4">
        <div
          className={`flex-1 text-center font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
            step >= 1 ? "text-slate-900 font-bold" : "text-slate-400"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
              step >= 1 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            1
          </span>
          Información General
        </div>
        <div
          className={`flex-1 text-center font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
            step >= 2 ? "text-slate-900 font-bold" : "text-slate-400"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
              step >= 2 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            2
          </span>
          Cliente & Asignación
        </div>
        <div
          className={`flex-1 text-center font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
            step >= 3 ? "text-slate-900 font-bold" : "text-slate-400"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
              step >= 3 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            3
          </span>
          Resumen & Apertura
        </div>
      </div>

      {/* PASO 1: INFORMACIÓN GENERAL */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Título del Expediente *
            </label>
            <Input
              type="text"
              placeholder="ej. Deslinde Parcela 104-B o Constitución de Compañía Ramos SRL"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="text-xs h-9"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Nombre descriptivo que identifique el asunto para el cliente y el equipo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Área Operativa *</label>
              <select
                value={area}
                onChange={(e) => handleAreaChange(e.target.value as CaseArea)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="LEGAL">Legal (Jurídico)</option>
                <option value="AGRIMENSURA">Agrimensura (Catastral)</option>
                <option value="INMOBILIARIA">Inmobiliaria (Bienes Raíces)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Trámite *</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {DOSSIER_TYPES_BY_AREA[area].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Prioridad *</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as CasePriority)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Responsable del Caso *</label>
              <select
                value={responsableId}
                onChange={(e) => setResponsableId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombres} {u.apellidos} ({u.rol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Descripción o Antecedentes (Opcional)
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles del caso, instrucciones especiales, requerimientos del cliente..."
              className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      )}

      {/* PASO 2: CLIENTE Y PARTICIPANTES */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Selección del Cliente Titular</h3>
              <p className="text-xs text-slate-500">
                El cliente al cual se le facturará y quien podrá consultar el tracking del expediente.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowQuickClientModal(true)}
              className="text-xs h-8 border-slate-300"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              + Crear Cliente Rápido
            </Button>
          </div>

          {clients.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 text-center">
              <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-amber-900">
                No hay clientes registrados en la base de datos
              </p>
              <p className="text-[11px] text-amber-700 mt-1 max-w-md mx-auto">
                Para aperturar un expediente debe existir al menos un cliente. Puede registrar uno ahora mismo.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowQuickClientModal(true)}
                className="mt-3 bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
              >
                + Registrar Cliente Ahora
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cliente Registrado *
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- Seleccione un cliente registrado --</option>
                  {clients.map((c) => {
                    const name =
                      c.type === "FISICA"
                        ? `${c.nombres || ""} ${c.apellidos || ""}`.trim()
                        : c.razonSocial || "Empresa";
                    const doc = c.type === "FISICA" ? c.cedula : c.rnc;
                    return (
                      <option key={c.id} value={c.id}>
                        {name} {doc ? `(${doc})` : ""} - {c.email}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedClient && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
                  <div className="font-semibold text-slate-900">
                    {selectedClient.type === "FISICA"
                      ? `${selectedClient.nombres} ${selectedClient.apellidos}`
                      : selectedClient.razonSocial}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] text-slate-500">
                    <div>
                      {selectedClient.type === "FISICA" ? "Cédula: " : "RNC: "}
                      <span className="font-mono text-slate-700">
                        {selectedClient.cedula || selectedClient.rnc || "N/A"}
                      </span>
                    </div>
                    <div>
                      Email: <span className="text-slate-700">{selectedClient.email}</span>
                    </div>
                    <div>
                      Teléfono: <span className="text-slate-700">{selectedClient.telefono}</span>
                    </div>
                    <div>
                      Tipo:{" "}
                      <span className="font-medium text-slate-700">
                        {selectedClient.type === "FISICA" ? "Persona Física" : "Persona Jurídica"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formulario rápido de cliente */}
          {showQuickClientModal && (
            <Card className="border-slate-300 bg-slate-50 shadow-xs mt-3">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Registro Rápido de Cliente</h4>
                  <button
                    type="button"
                    onClick={() => setShowQuickClientModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Nombre / Razón Social *</label>
                    <Input
                      placeholder="Nombre del cliente"
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Cédula / RNC</label>
                    <Input
                      placeholder="001-0000000-0"
                      value={quickClientDoc}
                      onChange={(e) => setQuickClientDoc(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Correo Electrónico *</label>
                    <Input
                      type="email"
                      placeholder="correo@cliente.com"
                      value={quickClientEmail}
                      onChange={(e) => setQuickClientEmail(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Teléfono</label>
                    <Input
                      placeholder="809-000-0000"
                      value={quickClientPhone}
                      onChange={(e) => setQuickClientPhone(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuickClientModal(false)}
                    className="text-xs h-7"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickClientCreate}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7"
                  >
                    Guardar y Seleccionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PASO 3: RESUMEN Y CONFIRMACIÓN */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Resumen de Apertura del Expediente
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Título del Caso:</span>
                <span className="font-semibold text-slate-900">{titulo}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Área / Tipo:</span>
                <span className="font-medium text-slate-900">
                  {area} · {tipo}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Cliente Titular:</span>
                <span className="font-semibold text-slate-900">
                  {selectedClient
                    ? selectedClient.type === "FISICA"
                      ? `${selectedClient.nombres} ${selectedClient.apellidos}`
                      : selectedClient.razonSocial
                    : "No especificado"}
                </span>
                <span className="block text-[10px] text-slate-500">
                  {selectedClient?.email} · {selectedClient?.telefono}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Responsable Asignado:</span>
                <span className="font-semibold text-slate-900">
                  {selectedUser ? `${selectedUser.nombres} ${selectedUser.apellidos}` : "Administrador"}
                </span>
                <span className="block text-[10px] text-slate-500">{selectedUser?.rol}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Prioridad:</span>
                <span className="font-bold text-slate-900">{prioridad}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Estado Inicial:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                  En Proceso (Etapa 1)
                </span>
              </div>
            </div>

            {descripcion && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-slate-500 block text-[11px]">Observaciones:</span>
                <p className="text-xs text-slate-700 mt-0.5">{descripcion}</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900">
            Al hacer clic en <strong>"Crear Expediente"</strong>, se generará el código secuencial oficial
            y se creará el enlace público de seguimiento para el cliente.
          </div>
        </div>
      )}

      {/* Botones de Navegación del Wizard */}
      <div className="mt-8 flex justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            if (step === 1) router.back();
            else setStep((s) => s - 1);
          }}
          className="px-4 py-2 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {step === 1 ? "Cancelar" : "← Atrás"}
        </button>

        {step === 1 && (
          <Button
            type="button"
            onClick={handleNextFromStep1}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4"
          >
            Siguiente: Cliente →
          </Button>
        )}

        {step === 2 && (
          <Button
            type="button"
            onClick={handleNextFromStep2}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4"
          >
            Siguiente: Resumen →
          </Button>
        )}

        {step === 3 && (
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleFinalSubmit}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-5 font-semibold"
          >
            {isSubmitting ? "Creando en DB..." : "✓ Crear Expediente"}
          </Button>
        )}
      </div>
    </div>
  );
}
