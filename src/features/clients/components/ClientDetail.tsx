"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { DocumentList } from "@/features/documents/components/DocumentList";
import { DocumentUploader } from "@/features/documents/components/DocumentUploader";
import { ClientFinanceTab } from "@/features/finance/components/ClientFinanceTab";
import { FinanceModals } from "@/features/finance/components/FinanceModals";
import { Button } from "@/components/ui/button";
import { useClientPortalStore } from "@/features/client-portal/store/useClientPortalStore";
import { ClientPortalAccessModal } from "@/features/client-portal/components/ClientPortalAccessModal";

export function ClientDetail({ clientId }: { clientId: string }) {
  const [activeTab, setActiveTab] = useState("info");
  const { openAccessModal } = useClientPortalStore();

  const tabs = [
    { id: "info", label: "Información" },
    { id: "expedientes", label: "Expedientes" },
    { id: "documentos", label: "Documentos" },
    { id: "finanzas", label: "Facturación y CxC" },
    { id: "historial", label: "Versiones e Historial" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Expediente del Cliente</span>
          <span className="font-mono text-xs font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
            {clientId}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => openAccessModal({ id: clientId, name: `Cliente #${clientId}` })}
          className="bg-slate-900 hover:bg-slate-850 text-white text-xs font-medium shadow-xs"
        >
          <KeyRound className="w-3.5 h-3.5 mr-1.5" />
          Acceso al Portal
        </Button>
      </div>
      <div className="border-b border-slate-200">
        <nav className="flex -mb-px px-6 space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6">
        {activeTab === "info" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium leading-6 text-slate-900">Datos del Cliente</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">ID Cliente</span>
                <span className="font-medium text-slate-900">{clientId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Estado</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Activo
                </span>
              </div>
              <div className="col-span-2 mt-4 p-4 bg-slate-50 rounded border border-slate-100">
                <p className="text-slate-600 italic">Información detallada se cargará desde el servidor...</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === "expedientes" && (
          <div>
            <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Expedientes Asociados</h3>
            <p className="text-sm text-slate-500">No hay expedientes activos para este cliente.</p>
          </div>
        )}
        {activeTab === "documentos" && (
          <div className="space-y-8">
            <div>
              <DocumentUploader clientId={clientId} />
            </div>
            <div>
              <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Directorio de Documentos</h3>
              <DocumentList />
            </div>
          </div>
        )}
        {activeTab === "finanzas" && (
          <ClientFinanceTab clientId={clientId} />
        )}
        {activeTab === "historial" && (
          <div>
            <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Historial de Revisiones</h3>
            <p className="text-sm text-slate-500">Registro de auditoría y versiones del cliente.</p>
          </div>
        )}
      </div>
      <FinanceModals />
      <ClientPortalAccessModal />
    </div>
  );
}
