"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  CheckSquare,
  Calendar as CalendarIcon,
  ArrowRight,
  MapPin,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendarStore } from "@/features/calendar/store/useCalendarStore";
import { useTaskStore } from "@/features/tasks/store/useTaskStore";
import { EventType } from "@/features/calendar/types";
import { cn } from "@/lib/utils";

const EVENT_TYPE_BADGES: Record<
  EventType,
  { label: string; className: string }
> = {
  audiencia: {
    label: "Audiencia",
    className: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
  },
  cita_cliente: {
    label: "Cita Cliente",
    className: "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300",
  },
  mensura_campo: {
    label: "Mensura",
    className: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  vencimiento_plazo: {
    label: "Plazo",
    className: "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300",
  },
  reunion_interna: {
    label: "Reunión",
    className: "bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  otro: {
    label: "Otro",
    className: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200",
  },
};

export default function DashboardPage() {
  const { events } = useCalendarStore();
  const { tasks, moveTaskStatus } = useTaskStore();

  const todayStr = React.useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  // Próximas audiencias y plazos (ordenadas por fecha más cercana)
  const upcomingEvents = React.useMemo(() => {
    return [...events]
      .filter((e) => e.startTime >= todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
  }, [events, todayStr]);

  // Mis tareas pendientes (no completadas, ordenadas por vencimiento)
  const pendingTasks = React.useMemo(() => {
    return tasks
      .filter((t) => t.status !== "completada")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks]);

  const totalPendingCount = tasks.filter((t) => t.status !== "completada").length;
  const tasksDueTodayCount = tasks.filter(
    (t) => t.status !== "completada" && t.dueDate === todayStr
  ).length;

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Clientes activos
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">12</div>
            <p className="text-xs text-slate-500 mt-1">+2 este mes</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Expedientes abiertos
            </CardTitle>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">8</div>
            <p className="text-xs text-slate-500 mt-1">4 legales, 3 agrimensura, 1 inm.</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Tareas pendientes
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalPendingCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {tasksDueTodayCount} para hoy
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Audiencias y Plazos
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {upcomingEvents.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Próximos 7 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Widgets Reales Integrados con Agenda y Tareas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Widget 1: Próximas Audiencias y Plazos */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Próximas Audiencias y Plazos
                </CardTitle>
              </div>
              <Link
                href="/agenda"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Ver agenda
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-3">
              {upcomingEvents.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-500">
                    No hay audiencias ni plazos programados
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {upcomingEvents.map((evt) => {
                    const typeBadge =
                      EVENT_TYPE_BADGES[evt.eventType] || EVENT_TYPE_BADGES.otro;
                    const dateObj = new Date(evt.startTime);
                    const formattedTime = evt.allDay
                      ? "Todo el día"
                      : evt.startTime.split("T")[1]?.substring(0, 5) || "";

                    return (
                      <div
                        key={evt.id}
                        className="py-3 flex items-start justify-between gap-3 group first:pt-1"
                      >
                        <div className="flex items-start gap-3">
                          {/* Mini caja de fecha */}
                          <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-center shrink-0 w-14 dark:border-slate-800 dark:bg-slate-800">
                            <span className="block text-[9px] uppercase font-bold text-slate-500">
                              {dateObj.toLocaleDateString("es-DO", { month: "short" })}
                            </span>
                            <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                              {dateObj.getDate()}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-xs border px-1.5 py-0.5 text-[10px] font-medium",
                                  typeBadge.className
                                )}
                              >
                                {typeBadge.label}
                              </span>
                              {evt.caseNumber && (
                                <span className="text-[11px] font-mono text-slate-500">
                                  {evt.caseNumber}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1">
                              {evt.title}
                            </h4>
                            {evt.location && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[220px]">
                                  {evt.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-[11px] font-mono text-slate-500 whitespace-nowrap pt-1">
                          {formattedTime}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-3 bg-slate-50/60 border-t border-slate-100 rounded-b-lg dark:bg-slate-900/60 dark:border-slate-800 text-center">
            <Link
              href="/agenda?tab=calendario"
              className="text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              + Abrir vista de calendario completa
            </Link>
          </div>
        </Card>

        {/* Widget 2: Mis Tareas Pendientes */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Mis Tareas Pendientes
                </CardTitle>
              </div>
              <Link
                href="/agenda?tab=tareas"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Ver tablero
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-3">
              {pendingTasks.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-500">
                    No tienes tareas pendientes activas
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingTasks.map((t) => {
                    const isOverdue = t.dueDate < todayStr;
                    const isDueToday = t.dueDate === todayStr;

                    return (
                      <div
                        key={t.id}
                        className="py-3 flex items-start justify-between gap-3 group first:pt-1"
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {/* Selector rápido de completar */}
                          <button
                            type="button"
                            onClick={() => moveTaskStatus(t.id, "completada")}
                            aria-label={`Completar tarea: ${t.title}`}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-slate-300 hover:border-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors dark:border-slate-700 dark:hover:border-slate-300"
                            title="Marcar como completada"
                          >
                            <Check className="h-3 w-3 text-transparent group-hover:text-slate-400" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">
                              {t.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              {t.caseNumber && (
                                <span className="font-mono">{t.caseNumber}</span>
                              )}
                              <span
                                className={cn(
                                  "capitalize",
                                  t.priority === "urgente"
                                    ? "text-rose-700 font-semibold"
                                    : t.priority === "alta"
                                    ? "text-amber-700 font-medium"
                                    : ""
                                )}
                              >
                                {t.priority}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Fecha de Vencimiento */}
                        <div
                          className={cn(
                            "flex items-center gap-1 text-[11px] font-mono shrink-0 pt-0.5",
                            isOverdue
                              ? "text-rose-700 font-semibold"
                              : isDueToday
                              ? "text-amber-700 font-semibold"
                              : "text-slate-500"
                          )}
                        >
                          {isOverdue && <AlertTriangle className="h-3 w-3" />}
                          <span>{t.dueDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-3 bg-slate-50/60 border-t border-slate-100 rounded-b-lg dark:bg-slate-900/60 dark:border-slate-800 text-center">
            <Link
              href="/agenda?tab=tareas"
              className="text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              + Gestionar todas las tareas en el tablero Kanban
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
