"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  FolderKanban,
  User,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { useCaseStore } from "../store/useCaseStore";
import { CaseStatus } from "../types";
import { WorkflowProgress } from "./WorkflowProgress";
import { CaseTimeline } from "./CaseTimeline";
import { ParticipantsList } from "./ParticipantsList";
import { TasksList } from "./TasksList";
import { ChecklistManager } from "@/features/documents/components/ChecklistManager";
import { DocumentList } from "@/features/documents/components/DocumentList";
import { TemplateGeneratorModal } from "@/features/documents/components/TemplateGeneratorModal";
import { CaseFinanceTab } from "@/features/finance/components/CaseFinanceTab";
import { FinanceModals } from "@/features/finance/components/FinanceModals";
import { CaseSurveyTab } from "@/features/survey/components/CaseSurveyTab";
import { SurveyModals } from "@/features/survey/components/SurveyModals";
import { CasePropertyTab } from "@/features/real-estate/components/CasePropertyTab";
import { RealEstateModals } from "@/features/real-estate/components/RealEstateModals";
import { Button } from "@/components/ui/button";

export function CaseDetail({ caseId }: { caseId: string }) {
  const { getCaseById, advanceStage, updateCaseStatus } = useCaseStore();
  const caseData = getCaseById(caseId);

  const [activeTab, setActiveTab] = useState("resumen");
  const [copiedLink, setCopiedLink] = useState(false);

  const trackingCode = caseData
    ? `TRK-2026-${(caseData.numero || caseData.id).replace(/[^a-zA-Z0-9]/g, "").slice(-5).toUpperCase()}`
    : `TRK-2026-${(caseId || "00000").slice(-5).toUpperCase()}`;

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/portal/tracking/${trackingCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success(`Enlace de seguimiento ${trackingCode} copiado al portapapeles.`);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!caseData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center mt-6">
        <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900">Expediente no encontrado</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No se encontró el registro con identificador <code>{caseId}</code> en la base de datos local.
        </p>
        <Link href="/expedientes" className="mt-4 inline-block">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
            ← Volver a Directorio de Expedientes
          </Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "resumen", label: "Resumen" },
    { id: "workflow", label: "Proceso / Workflow" },
    { id: "tareas", label: "Tareas" },
    { id: "documentos", label: "Documentos" },
    { id: "agrimensura", label: "Agrimensura / Parcela" },
    { id: "inmobiliaria", label: "Inmobiliaria" },
    { id: "finanzas", label: "Finanzas" },
    { id: "participantes", label: "Participantes" },
    { id: "bitacora", label: "Bitácora" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-6 overflow-hidden">
      {/* Tarjeta de Código de Seguimiento Público para Clientes */}
      <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-slate-800 rounded text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Tracking Público para el Cliente:</span>
              <span className="font-mono font-bold text-white text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {trackingCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Permite al cliente supervisar hitos en tiempo real sin requerir credenciales completas.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 sm:flex-none inline-flex items-center justify-center text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Enlace Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar Enlace
              </>
            )}
          </button>
          <Link
            href={`/portal/tracking/${trackingCode}`}
            target="_blank"
            className="inline-flex items-center text-xs font-medium bg-white text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Abrir Vista
          </Link>
        </div>
      </div>

      {/* Navegación de Pestañas */}
      <div className="border-b border-slate-200">
        <nav className="flex -mb-px px-6 space-x-8 overflow-x-auto">
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
        {/* PESTAÑA: RESUMEN */}
        {activeTab === "resumen" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Número Oficial</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{caseData.numero}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Estado Actual</span>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={caseData.estado}
                    onChange={(e) => {
                      updateCaseStatus(caseData.id, e.target.value as CaseStatus);
                      toast.success(`Estado actualizado a ${e.target.value}`);
                    }}
                    className="text-xs font-semibold rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-800"
                  >
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="COMPLETADO">Completado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Cliente Titular</span>
                <Link
                  href={`/clientes/${caseData.clienteId}`}
                  className="font-semibold text-slate-900 hover:text-blue-600 truncate block mt-0.5"
                >
                  {caseData.clientName} →
                </Link>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Responsable Asignado</span>
                <div className="flex items-center gap-1 font-semibold text-slate-900 mt-0.5">
                  <User className="h-3 w-3 text-slate-400" />
                  <span>{caseData.responsable}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {caseData.area} · {caseData.tipo}
                </h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    caseData.prioridad === "URGENTE"
                      ? "bg-rose-100 text-rose-800 border-rose-200"
                      : caseData.prioridad === "ALTA"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                >
                  Prioridad: {caseData.prioridad}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{caseData.titulo}</h3>
              {caseData.descripcion && (
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{caseData.descripcion}</p>
              )}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-900">Progreso del Flujo de Trabajo</h4>
                <Button
                  size="sm"
                  onClick={() => {
                    advanceStage(caseData.id);
                    toast.success("Flujo avanzado a la siguiente etapa.");
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7"
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Avanzar Etapa ({caseData.stage}/5)
                </Button>
              </div>
              <WorkflowProgress currentStep={caseData.stage} />
            </div>
          </div>
        )}

        {/* PESTAÑA: WORKFLOW */}
        {activeTab === "workflow" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Fases del Flujo Operativo</h3>
                <p className="text-xs text-slate-500">Hitos normativos requeridos para la conclusión del caso.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  advanceStage(caseData.id);
                  toast.success("Flujo avanzado a la siguiente etapa.");
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                Avanzar a Siguiente Etapa
              </Button>
            </div>
            <WorkflowProgress currentStep={caseData.stage} detailed />
          </div>
        )}

        {/* PESTAÑA: TAREAS */}
        {activeTab === "tareas" && <TasksList caseId={caseData.id} />}

        {/* PESTAÑA: PARTICIPANTES */}
        {activeTab === "participantes" && <ParticipantsList caseId={caseData.id} />}

        {/* PESTAÑA: DOCUMENTOS */}
        {activeTab === "documentos" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-900">Documentación del Expediente</h3>
              <TemplateGeneratorModal />
            </div>
            <ChecklistManager caseId={caseData.id} />
            <div className="mt-8">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Archivos Adjuntos
              </h4>
              <DocumentList />
            </div>
          </div>
        )}

        {/* PESTAÑA: AGRIMENSURA */}
        {activeTab === "agrimensura" && <CaseSurveyTab caseId={caseData.id} />}

        {/* PESTAÑA: INMOBILIARIA */}
        {activeTab === "inmobiliaria" && <CasePropertyTab caseId={caseData.id} />}

        {/* PESTAÑA: FINANZAS */}
        {activeTab === "finanzas" && <CaseFinanceTab caseId={caseData.id} />}

        {/* PESTAÑA: BITÁCORA */}
        {activeTab === "bitacora" && (
          <div>
            <CaseTimeline caseId={caseData.id} />
          </div>
        )}
      </div>

      <FinanceModals />
      <SurveyModals />
      <RealEstateModals />
    </div>
  );
}
