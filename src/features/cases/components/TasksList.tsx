"use client";

import { useState } from "react";
import { useTaskStore } from "@/features/tasks/store/useTaskStore";
import { TaskDetailModal } from "@/features/tasks/components/TaskDetailModal";
import { Plus, CheckSquare, Clock, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TasksListProps {
  caseId: string;
}

const priorityColors: Record<string, string> = {
  baja: "bg-slate-100 text-slate-700 border-slate-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  alta: "bg-amber-50 text-amber-800 border-amber-200",
  urgente: "bg-red-50 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  en_revision: "En Revisión",
  completada: "Completada",
};

export function TasksList({ caseId }: TasksListProps) {
  const { tasks, moveTaskStatus, openCreateModal, openEditModal } = useTaskStore();
  const [filterStatus, setFilterStatus] = useState<string>("todas");

  // Filtrar tareas que correspondan a este expediente (o genéricas para demostración)
  const caseTasks = tasks.filter(
    (t) => t.caseId === caseId || t.caseId === "case_1" || !t.caseId
  );

  const filteredTasks = filterStatus === "todas" 
    ? caseTasks 
    : caseTasks.filter(t => t.status === filterStatus);

  const pendingCount = caseTasks.filter(t => t.status !== "completada").length;
  const completedCount = caseTasks.filter(t => t.status === "completada").length;

  return (
    <div className="space-y-4">
      {/* Barra superior de métricas y acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Tareas del Expediente</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {pendingCount} pendientes · {completedCount} completadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setFilterStatus("todas")}
              className={`px-2.5 py-1 rounded font-medium ${
                filterStatus === "todas" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus("pendiente")}
              className={`px-2.5 py-1 rounded font-medium ${
                filterStatus === "pendiente" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilterStatus("completada")}
              className={`px-2.5 py-1 rounded font-medium ${
                filterStatus === "completada" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completadas
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => openCreateModal("pendiente")}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Lista de Tareas */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
          <CheckSquare className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-700">No hay tareas en esta categoría</p>
          <p className="text-xs text-slate-500 mt-0.5">Crea una nueva tarea para dar seguimiento a este expediente.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden bg-white shadow-sm">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "completada";
            const completedChecklist = task.checklist.filter(c => c.completed).length;
            const totalChecklist = task.checklist.length;

            return (
              <div
                key={task.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors group cursor-pointer"
                onClick={() => openEditModal(task)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveTaskStatus(task.id, isCompleted ? "pendiente" : "completada");
                    }}
                    className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                      isCompleted
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "border-slate-300 hover:border-slate-400 bg-white"
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium truncate ${
                          isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 uppercase tracking-wider font-semibold border ${
                          priorityColors[task.priority] || priorityColors.normal
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          Vence: {task.dueDate}
                        </span>
                      )}
                      {totalChecklist > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3 text-slate-400" />
                          Checklist: {completedChecklist}/{totalChecklist}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {task.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-normal bg-slate-100 text-slate-700">
                    {statusLabels[task.status] || task.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal interactivo de detalle de tarea */}
      <TaskDetailModal />
    </div>
  );
}
