"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Clock,
  AlertTriangle,
  Briefcase,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskStore } from "../store/useTaskStore";
import { TaskPriority, TaskStatus } from "../types";
import { TaskDetailModal } from "./TaskDetailModal";
import { cn } from "@/lib/utils";

const COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: "pendiente", label: "Pendiente", dotColor: "bg-slate-400" },
  { id: "en_proceso", label: "En Proceso", dotColor: "bg-sky-500" },
  { id: "en_revision", label: "En Revisión", dotColor: "bg-amber-500" },
  { id: "completada", label: "Completada", dotColor: "bg-emerald-500" },
];

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badgeClass: string }
> = {
  urgente: {
    label: "Urgente",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
  },
  alta: {
    label: "Alta",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  },
  normal: {
    label: "Normal",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  baja: {
    label: "Baja",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700",
  },
};

export function TaskKanbanBoard() {
  const {
    tasks,
    searchQuery,
    filterPriority,
    setSearchQuery,
    setFilterPriority,
    openCreateModal,
    openEditModal,
    moveTaskStatus,
  } = useTaskStore();

  const todayStr = React.useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  // Filtrado de tareas
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.caseNumber && task.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority =
        filterPriority === "todas" || task.priority === filterPriority;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, filterPriority]);

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar tarea, expediente o palabra clave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Select
            value={filterPriority}
            onValueChange={(val) =>
              setFilterPriority(val as TaskPriority | "todas")
            }
          >
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">
                Todas las prioridades
              </SelectItem>
              <SelectItem value="urgente" className="text-xs">
                Urgente
              </SelectItem>
              <SelectItem value="alta" className="text-xs">
                Alta
              </SelectItem>
              <SelectItem value="normal" className="text-xs">
                Normal
              </SelectItem>
              <SelectItem value="baja" className="text-xs">
                Baja
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={() => openCreateModal("pendiente")}
          className="h-9 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 text-xs shrink-0"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Nueva Tarea
        </Button>
      </div>

      {/* Tablero Kanban de 4 Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);

          return (
            <div
              key={column.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) {
                  moveTaskStatus(taskId, column.id);
                }
              }}
              className="flex flex-col rounded-lg border border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900/60 p-3 min-h-[500px]"
            >
              {/* Encabezado de Columna */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2 w-2 rounded-full", column.dotColor)}
                  />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {column.label}
                  </h3>
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {colTasks.length}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openCreateModal(column.id)}
                  className="h-6 w-6 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  title={`Añadir tarea a ${column.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Lista de Tarjetas de la Columna */}
              <div className="space-y-3 pt-3 flex-1 overflow-y-auto max-h-[700px]">
                {colTasks.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300/80 text-center dark:border-slate-800">
                    <p className="text-xs text-slate-500">Sin tareas en esta etapa</p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const priority = PRIORITY_CONFIG[task.priority];
                    const isOverdue =
                      task.dueDate < todayStr && task.status !== "completada";
                    const isDueToday =
                      task.dueDate === todayStr && task.status !== "completada";

                    const checklistTotal = task.checklist.length;
                    const checklistCompleted = task.checklist.filter(
                      (i) => i.completed
                    ).length;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", task.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => openEditModal(task)}
                        className="group relative rounded-md border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm cursor-grab active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900"
                      >
                        {/* Cabecera Tarjeta: Prioridad y Menú Rápido */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-xs border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                              priority.badgeClass
                            )}
                          >
                            {priority.label}
                          </span>

                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="h-6 w-6 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuLabel>Mover a columna</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {COLUMNS.map((col) => (
                                  <DropdownMenuItem
                                    key={col.id}
                                    disabled={col.id === task.status}
                                    onClick={() => moveTaskStatus(task.id, col.id)}
                                    className="cursor-pointer"
                                  >
                                    <span
                                      className={cn(
                                        "h-2 w-2 rounded-full mr-2",
                                        col.dotColor
                                      )}
                                    />
                                    {col.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openEditModal(task)}
                                  className="cursor-pointer"
                                >
                                  Ver / Editar detalles
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Título de la Tarea */}
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Expediente Asociado y Responsable */}
                        <div className="mt-2 flex items-center justify-between gap-1 text-[11px] text-slate-500">
                          {task.caseNumber ? (
                            <div className="flex items-center gap-1 font-mono truncate max-w-[130px]" title={task.caseNumber}>
                              <Briefcase className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate">{task.caseNumber}</span>
                            </div>
                          ) : (
                            <div />
                          )}
                          {task.assignedTo && (
                            <span
                              className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded truncate max-w-[110px]"
                              title={`Asignado a: ${task.assignedTo}`}
                            >
                              {task.assignedTo}
                            </span>
                          )}
                        </div>

                        {/* Checklist Counter & Vencimiento */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs dark:border-slate-800/80">
                          {/* Checklist */}
                          {checklistTotal > 0 ? (
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <CheckSquare className="h-3 w-3 shrink-0" />
                              <span
                                className={cn(
                                  checklistCompleted === checklistTotal
                                    ? "text-emerald-700 font-medium dark:text-emerald-400"
                                    : ""
                                )}
                              >
                                {checklistCompleted}/{checklistTotal}
                              </span>
                            </div>
                          ) : (
                            <div />
                          )}

                          {/* Fecha de vencimiento con semáforo */}
                          <div
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-medium font-mono",
                              isOverdue
                                ? "text-rose-700 dark:text-rose-400"
                                : isDueToday
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-slate-500 dark:text-slate-400"
                            )}
                            title={
                              isOverdue
                                ? "¡Tarea vencida!"
                                : isDueToday
                                ? "Vence hoy"
                                : `Vence: ${task.dueDate}`
                            }
                          >
                            {isOverdue ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            <span>{task.dueDate}</span>
                          </div>
                        </div>

                        {/* Botones de Movimiento Rápido de Etapa */}
                        <div
                          className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 dark:border-slate-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.status !== "pendiente" ? (
                            <button
                              type="button"
                              onClick={() => {
                                const order: TaskStatus[] = [
                                  "pendiente",
                                  "en_proceso",
                                  "en_revision",
                                  "completada",
                                ];
                                const idx = order.indexOf(task.status);
                                if (idx > 0) moveTaskStatus(task.id, order[idx - 1]);
                              }}
                              className="inline-flex items-center gap-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              title="Regresar a etapa anterior"
                            >
                              <ArrowLeft className="h-3 w-3" />
                              <span>Atrás</span>
                            </button>
                          ) : (
                            <div />
                          )}

                          {task.status !== "completada" ? (
                            <button
                              type="button"
                              onClick={() => {
                                const order: TaskStatus[] = [
                                  "pendiente",
                                  "en_proceso",
                                  "en_revision",
                                  "completada",
                                ];
                                const idx = order.indexOf(task.status);
                                if (idx < order.length - 1)
                                  moveTaskStatus(task.id, order[idx + 1]);
                              }}
                              className="inline-flex items-center gap-0.5 text-slate-600 font-medium hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
                              title="Avanzar a siguiente etapa"
                            >
                              <span>Avanzar</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">
                              Finalizada
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalle / Edición / Creación de Tarea */}
      <TaskDetailModal />
    </div>
  );
}
