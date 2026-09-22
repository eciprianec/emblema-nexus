"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/features/calendar/components/CalendarView";
import { TaskKanbanBoard } from "@/features/tasks/components/TaskKanbanBoard";
import { useCalendarStore } from "@/features/calendar/store/useCalendarStore";
import { useTaskStore } from "@/features/tasks/store/useTaskStore";

function AgendaContent() {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get("tab");
  const [localTab, setLocalTab] = React.useState<string | null>(null);

  const activeTab =
    localTab ??
    (tabFromQuery === "calendario" || tabFromQuery === "tareas" || tabFromQuery === "plazos"
      ? tabFromQuery
      : "calendario");

  const { events, openCreateModal: openCreateEventModal, openEditModal: openEditEventModal } = useCalendarStore();
  const { tasks, openCreateModal: openCreateTaskModal } = useTaskStore();

  // Cálculo de plazos procesales ordenados por vencimiento más cercano
  const deadlines = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtrar eventos relevantes (plazos y audiencias)
    const deadlineEvents = events
      .filter((e) => e.eventType === "vencimiento_plazo" || e.eventType === "audiencia")
      .map((e) => {
        const eventDate = new Date(e.startTime.split("T")[0] + "T00:00:00");
        const diffMs = eventDate.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let urgency: "vencido" | "hoy" | "semana" | "futuro";
        if (diffDays < 0) urgency = "vencido";
        else if (diffDays === 0) urgency = "hoy";
        else if (diffDays <= 7) urgency = "semana";
        else urgency = "futuro";

        return {
          id: e.id,
          title: e.title,
          type: e.eventType === "vencimiento_plazo" ? "Plazo Procesal" : "Audiencia Judicial",
          caseNumber: e.caseNumber || "Sin expediente",
          caseTitle: e.caseTitle || "",
          location: e.location || "Secretaría / Despacho",
          targetDate: e.startTime.split("T")[0],
          time: e.allDay ? "Todo el día" : e.startTime.split("T")[1]?.substring(0, 5),
          diffDays,
          urgency,
          rawEvent: e,
        };
      });

    return deadlineEvents.sort((a, b) => a.diffDays - b.diffDays);
  }, [events]);

  const overdueCount = deadlines.filter((d) => d.urgency === "vencido").length;
  const todayCount = deadlines.filter((d) => d.urgency === "hoy").length;
  const upcomingWeekCount = deadlines.filter((d) => d.urgency === "semana").length;

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Agenda y Plazos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión corporativa de audiencias judiciales, mensuras, plazos perentorios y tareas operativas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openCreateTaskModal()}
            className="text-xs text-slate-700 dark:text-slate-300"
          >
            <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
            + Tarea
          </Button>
          <Button
            size="sm"
            onClick={() => openCreateEventModal()}
            className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 text-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            + Evento / Audiencia
          </Button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <Tabs value={activeTab} onValueChange={(val) => setLocalTab(val)} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
          <TabsTrigger
            value="calendario"
            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            Calendario y Audiencias
          </TabsTrigger>
          <TabsTrigger
            value="tareas"
            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
          >
            <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
            Tablero de Tareas ({tasks.length})
          </TabsTrigger>
          <TabsTrigger
            value="plazos"
            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Plazos Procesales
            {(overdueCount > 0 || todayCount > 0) && (
              <span className="ml-1.5 rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {overdueCount + todayCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CALENDARIO */}
        <TabsContent value="calendario" className="space-y-4 pt-1">
          <CalendarView />
        </TabsContent>

        {/* TAB 2: TAREAS KANBAN */}
        <TabsContent value="tareas" className="space-y-4 pt-1">
          <TaskKanbanBoard />
        </TabsContent>

        {/* TAB 3: PLAZOS PROCESALES */}
        <TabsContent value="plazos" className="space-y-4 pt-1">
          {/* Métricas rápidas de semáforo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-800 dark:text-rose-300">
                  Vencidos
                </span>
                <AlertTriangle className="h-4 w-4 text-rose-700" />
              </div>
              <div className="text-2xl font-bold text-rose-950 dark:text-rose-100 mt-2">
                {overdueCount}
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                Requiere regularización inmediata
              </p>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-900 dark:text-amber-300">
                  Vencen Hoy
                </span>
                <Clock className="h-4 w-4 text-amber-700" />
              </div>
              <div className="text-2xl font-bold text-amber-950 dark:text-amber-100 mt-2">
                {todayCount}
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">
                Depósito o trámite en secretaría hoy
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Próximos 7 días
                </span>
                <CalendarIcon className="h-4 w-4 text-slate-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {upcomingWeekCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                En preparación y redactado
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Total Registrados
                </span>
                <ShieldAlert className="h-4 w-4 text-slate-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {deadlines.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supervisión procesal activa
              </p>
            </div>
          </div>

          {/* Tabla de Plazos */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between dark:border-slate-800 dark:bg-slate-800/50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Semáforo de Plazos y Actos Procesales
                </h3>
                <p className="text-xs text-slate-500">
                  Monitoreo de términos perentorios y fechas fijadas ante tribunales y Registro de Títulos.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => openCreateEventModal()}
                className="text-xs text-slate-700 dark:text-slate-300"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Registrar Plazo
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-800/40 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Estado / Semáforo</th>
                    <th className="px-4 py-3">Acto Procesal / Plazo</th>
                    <th className="px-4 py-3">Expediente</th>
                    <th className="px-4 py-3">Tribunal / Instancia</th>
                    <th className="px-4 py-3">Vencimiento</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {deadlines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No hay plazos procesales registrados
                      </td>
                    </tr>
                  ) : (
                    deadlines.map((item) => {
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer dark:hover:bg-slate-800/40"
                          onClick={() => openEditEventModal(item.rawEvent)}
                        >
                          {/* Semáforo */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {item.urgency === "vencido" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                Vencido ({Math.abs(item.diffDays)}d)
                              </span>
                            )}
                            {item.urgency === "hoy" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" />
                                Vence Hoy
                              </span>
                            )}
                            {item.urgency === "semana" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Próximos 7 días ({item.diffDays}d)
                              </span>
                            )}
                            {item.urgency === "futuro" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                Más de 7 días ({item.diffDays}d)
                              </span>
                            )}
                          </td>

                          {/* Acto procesal */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {item.type}
                            </div>
                          </td>

                          {/* Expediente */}
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                              {item.caseNumber}
                            </div>
                            {item.caseTitle && (
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                {item.caseTitle}
                              </div>
                            )}
                          </td>

                          {/* Tribunal / Ubicación */}
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate max-w-xs">{item.location}</span>
                            </div>
                          </td>

                          {/* Vencimiento */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                              {item.targetDate}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.time}
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEventModal(item.rawEvent);
                              }}
                              className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                              Ver detalles
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Cargando agenda...</div>}>
      <AgendaContent />
    </React.Suspense>
  );
}
