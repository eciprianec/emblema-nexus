"use client";

import { useState } from "react";
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

export function CaseDetail({ caseId }: { caseId: string }) {
  const [activeTab, setActiveTab] = useState("resumen");

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
    { id: "versiones", label: "Versiones (Snapshots)" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-6">
      <div className="border-b border-slate-200">
        <nav className="flex -mb-px px-6 space-x-8 overflow-x-auto">
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
        {activeTab === "resumen" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">Número</span>
                <span className="font-medium text-slate-900">LEG-2024-0001</span>
              </div>
              <div>
                <span className="text-slate-500 block">Estado Actual</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">En Proceso</span>
              </div>
              <div>
                <span className="text-slate-500 block">Responsable</span>
                <span className="font-medium text-slate-900">Lic. Rodríguez</span>
              </div>
              <div>
                <span className="text-slate-500 block">Prioridad</span>
                <span className="font-medium text-red-600">Alta</span>
              </div>
            </div>
            
            <div className="mt-8">
              <h4 className="text-sm font-medium text-slate-900 mb-4">Progreso General</h4>
              <WorkflowProgress currentStep={2} />
            </div>
          </div>
        )}
        
        {activeTab === "workflow" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-slate-900">Flujo de Trabajo del Expediente</h3>
              <button className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 hover:bg-slate-200">
                Avanzar Etapa
              </button>
            </div>
            <WorkflowProgress currentStep={2} detailed />
          </div>
        )}

        {activeTab === "tareas" && <TasksList caseId={caseId} />}
        {activeTab === "participantes" && <ParticipantsList caseId={caseId} />}
        
        {activeTab === "documentos" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-slate-900">Documentación del Expediente</h3>
              <TemplateGeneratorModal />
            </div>
            <ChecklistManager caseId={caseId} />
            <div className="mt-8">
              <h4 className="text-md font-medium text-slate-900 mb-4">Archivos Adjuntos</h4>
              <DocumentList />
            </div>
          </div>
        )}

        {activeTab === "agrimensura" && <CaseSurveyTab caseId={caseId} />}

        {activeTab === "inmobiliaria" && <CasePropertyTab caseId={caseId} />}

        {activeTab === "finanzas" && <CaseFinanceTab caseId={caseId} />}

        {activeTab === "bitacora" && (
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Línea de Tiempo y Bitácora</h3>
            <CaseTimeline caseId={caseId} />
          </div>
        )}

        {activeTab === "versiones" && (
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Snapshots / Versiones</h3>
            <p className="text-sm text-slate-500">No hay snapshots registrados en este momento.</p>
          </div>
        )}
      </div>
      <FinanceModals />
      <SurveyModals />
      <RealEstateModals />
    </div>
  );
}
