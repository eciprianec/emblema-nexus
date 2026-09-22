"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Briefcase,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarStore } from "../store/useCalendarStore";
import { EventType } from "../types";
import { EventModal } from "./EventModal";
import { cn } from "@/lib/utils";

type ViewMode = "mes" | "semana" | "dia" | "lista";

const EVENT_TYPE_STYLES: Record<
  EventType,
  { label: string; badgeClass: string; dotClass: string }
> = {
  audiencia: {
    label: "Audiencia",
    badgeClass: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
    dotClass: "bg-slate-900 dark:bg-slate-100",
  },
  cita_cliente: {
    label: "Cita con Cliente",
    badgeClass: "bg-sky-50 text-sky-950 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800",
    dotClass: "bg-sky-700",
  },
  mensura_campo: {
    label: "Mensura de Campo",
    badgeClass: "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
    dotClass: "bg-emerald-700",
  },
  vencimiento_plazo: {
    label: "Vencimiento de Plazo",
    badgeClass: "bg-rose-50 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800",
    dotClass: "bg-rose-700",
  },
  reunion_interna: {
    label: "Reunión Interna",
    badgeClass: "bg-indigo-50 text-indigo-950 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800",
    dotClass: "bg-indigo-700",
  },
  otro: {
    label: "Otro",
    badgeClass: "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700",
    dotClass: "bg-zinc-600",
  },
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => String(n).padStart(2, "0");
const formatYmd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function CalendarView() {
  const {
    events,
    openCreateModal,
    openEditModal,
    filterType,
    setFilterType,
  } = useCalendarStore();

  const [viewMode, setViewMode] = React.useState<ViewMode>("mes");
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());

  // Navegación
  const goToToday = () => setCurrentDate(new Date());

  const navigatePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "mes") next.setMonth(next.getMonth() - 1);
    else if (viewMode === "semana") next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const navigateNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "mes") next.setMonth(next.getMonth() + 1);
    else if (viewMode === "semana") next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  // Filtrado de eventos
  const filteredEvents = React.useMemo(() => {
    if (filterType === "todos") return events;
    return events.filter((e) => e.eventType === filterType);
  }, [events, filterType]);

  // Helpers de fechas
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Título dinámico según vista
  const viewTitle = React.useMemo(() => {
    if (viewMode === "mes") {
      return `${MONTH_NAMES[month]} ${year}`;
    }
    if (viewMode === "semana") {
      const dayOfWeek = (currentDate.getDay() + 6) % 7; // Lun=0
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()].substring(0, 3)} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()].substring(0, 3)} ${end.getFullYear()}`;
    }
    if (viewMode === "dia") {
      const dayName = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ][currentDate.getDay()];
      return `${dayName}, ${currentDate.getDate()} de ${MONTH_NAMES[month]} ${year}`;
    }
    return `Agenda de Eventos y Plazos (${year})`;
  }, [viewMode, currentDate, month, year]);

  // Días para la cuadrícula del mes
  const monthDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Lun = 0, Dom = 6
    const startDay = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Días del mes anterior
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, dateStr: formatYmd(d), isCurrentMonth: false });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, dateStr: formatYmd(d), isCurrentMonth: true });
    }

    // Días del mes siguiente para completar cuadrícula de 35 o 42
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: d, dateStr: formatYmd(d), isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month]);

  const todayStr = formatYmd(new Date());

  return (
    <div className="space-y-4">
      {/* Barra de Controles Superior */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
        {/* Navegación y Título */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-slate-700 dark:text-slate-300"
              onClick={navigatePrev}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-300"
              onClick={goToToday}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-slate-700 dark:text-slate-300"
              onClick={navigateNext}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {viewTitle}
          </h2>
        </div>

        {/* Filtros, Selector de Vista y Botón Nuevo Evento */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por tipo */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-500 hidden md:block" />
            <Select
              value={filterType}
              onValueChange={(val) => setFilterType(val as EventType | "todos")}
            >
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos los tipos
                </SelectItem>
                {Object.entries(EVENT_TYPE_STYLES).map(([key, style]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Vistas */}
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
            {(["mes", "semana", "dia", "lista"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-xs capitalize transition-colors",
                  viewMode === mode
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {mode === "dia" ? "Día" : mode}
              </button>
            ))}
          </div>

          {/* Botón Nuevo Evento */}
          <Button
            size="sm"
            onClick={() => openCreateModal()}
            className="h-8 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nuevo Evento
          </Button>
        </div>
      </div>

      {/* VISTA 1: MES */}
      {viewMode === "mes" && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {/* Cabecera Días de Semana */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="py-2.5">
                {day}
              </div>
            ))}
          </div>

          {/* Cuadrícula de Días */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800">
            {monthDays.map(({ date, dateStr, isCurrentMonth }, idx) => {
              const dayEvents = filteredEvents.filter((e) =>
                e.startTime.startsWith(dateStr)
              );
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => openCreateModal(dateStr)}
                  className={cn(
                    "min-h-[105px] p-1.5 transition-colors cursor-pointer group flex flex-col justify-between",
                    !isCurrentMonth
                      ? "bg-slate-50/50 text-slate-400 dark:bg-slate-950/30 dark:text-slate-600"
                      : "bg-white hover:bg-slate-50/70 dark:bg-slate-900 dark:hover:bg-slate-800/40",
                    isToday && "ring-1 ring-inset ring-slate-900 dark:ring-slate-400"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday
                          ? "bg-slate-900 text-white font-bold dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {date.getDate()}
                    </span>
                    <button
                      type="button"
                      aria-label="Agregar evento"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-900 text-xs p-0.5 rounded-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal(dateStr);
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Badges de eventos del día */}
                  <div className="space-y-1 mt-1 flex-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const style = EVENT_TYPE_STYLES[event.eventType] || EVENT_TYPE_STYLES.otro;
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(event);
                          }}
                          title={`${event.title} - ${event.startTime.split("T")[1]?.substring(0, 5) || ""}`}
                          className={cn(
                            "truncate rounded-xs border px-1.5 py-0.5 text-[10px] font-medium transition-transform hover:scale-[1.02]",
                            style.badgeClass
                          )}
                        >
                          {!event.allDay && (
                            <span className="opacity-75 mr-1 font-mono">
                              {event.startTime.split("T")[1]?.substring(0, 5)}
                            </span>
                          )}
                          <span>{event.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-medium pl-1">
                        +{dayEvents.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: SEMANA */}
      {viewMode === "semana" && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            {Array.from({ length: 7 }).map((_, i) => {
              const dayOfWeek = (currentDate.getDay() + 6) % 7;
              const d = new Date(currentDate);
              d.setDate(currentDate.getDate() - dayOfWeek + i);
              const dStr = formatYmd(d);
              const isToday = dStr === todayStr;

              return (
                <div
                  key={i}
                  className={cn(
                    "py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0",
                    isToday && "bg-slate-100/60 dark:bg-slate-800/60"
                  )}
                >
                  <p className="text-xs text-slate-500 font-medium uppercase">
                    {WEEK_DAYS[i]}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full",
                      isToday
                        ? "bg-slate-900 text-white font-bold dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-800 dark:text-slate-200"
                    )}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[420px] dark:divide-slate-800">
            {Array.from({ length: 7 }).map((_, i) => {
              const dayOfWeek = (currentDate.getDay() + 6) % 7;
              const d = new Date(currentDate);
              d.setDate(currentDate.getDate() - dayOfWeek + i);
              const dStr = formatYmd(d);
              const dayEvents = filteredEvents.filter((e) =>
                e.startTime.startsWith(dStr)
              );

              return (
                <div
                  key={i}
                  onClick={() => openCreateModal(dStr)}
                  className="p-2 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer"
                >
                  {dayEvents.map((event) => {
                    const style = EVENT_TYPE_STYLES[event.eventType] || EVENT_TYPE_STYLES.otro;
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(event);
                        }}
                        className={cn(
                          "rounded-md border p-2 text-xs transition-shadow hover:shadow-xs",
                          style.badgeClass
                        )}
                      >
                        <div className="font-semibold line-clamp-1">{event.title}</div>
                        <div className="flex items-center gap-1 text-[11px] opacity-80 mt-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {event.allDay
                              ? "Todo el día"
                              : `${event.startTime.split("T")[1]?.substring(0, 5)} - ${event.endTime.split("T")[1]?.substring(0, 5)}`}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-[10px] opacity-75 mt-0.5 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.caseNumber && (
                          <div className="mt-1 text-[10px] font-mono bg-white/60 dark:bg-black/20 rounded px-1 py-0.5 inline-block">
                            {event.caseNumber}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 3: DÍA */}
      {viewMode === "dia" && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Eventos para el día ({formatYmd(currentDate)})
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openCreateModal(formatYmd(currentDate))}
              className="text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Añadir en este día
            </Button>
          </div>

          {filteredEvents.filter((e) =>
            e.startTime.startsWith(formatYmd(currentDate))
          ).length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CalendarIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">No hay eventos programados para este día</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => openCreateModal(formatYmd(currentDate))}
                className="mt-2 text-slate-900 dark:text-slate-100"
              >
                + Programar una audiencia o evento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents
                .filter((e) => e.startTime.startsWith(formatYmd(currentDate)))
                .map((event) => {
                  const style = EVENT_TYPE_STYLES[event.eventType] || EVENT_TYPE_STYLES.otro;
                  return (
                    <div
                      key={event.id}
                      onClick={() => openEditModal(event)}
                      className={cn(
                        "rounded-lg border p-4 transition-all hover:shadow-sm cursor-pointer",
                        style.badgeClass
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                            {style.label}
                          </span>
                          <h4 className="text-base font-semibold text-slate-950 dark:text-slate-50 mt-0.5">
                            {event.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {event.allDay
                              ? "Todo el día"
                              : `${event.startTime.split("T")[1]?.substring(0, 5)} - ${event.endTime.split("T")[1]?.substring(0, 5)}`}
                          </span>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                        {event.location && (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.virtualMeetingUrl && (
                          <a
                            href={event.virtualMeetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-sky-700 hover:underline dark:text-sky-400"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Unirse a videollamada</span>
                          </a>
                        )}
                        {event.caseNumber && (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>
                              {event.caseNumber} {event.caseTitle ? `— ${event.caseTitle}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 4: LISTA / AGENDA */}
      {viewMode === "lista" && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Listado Cronológico de Eventos ({filteredEvents.length} registrados)
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm">No se encontraron eventos con los filtros seleccionados</p>
              </div>
            ) : (
              [...filteredEvents]
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((event) => {
                  const style = EVENT_TYPE_STYLES[event.eventType] || EVENT_TYPE_STYLES.otro;
                  const dateObj = new Date(event.startTime);

                  return (
                    <div
                      key={event.id}
                      onClick={() => openEditModal(event)}
                      className="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 dark:hover:bg-slate-800/40"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-center w-20 shrink-0 dark:border-slate-800 dark:bg-slate-800">
                          <span className="block text-[10px] uppercase font-bold text-slate-500">
                            {MONTH_NAMES[dateObj.getMonth()].substring(0, 3)}
                          </span>
                          <span className="block text-lg font-bold text-slate-900 dark:text-slate-100">
                            {dateObj.getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-xs border px-1.5 py-0.5 text-[10px] font-medium",
                                style.badgeClass
                              )}
                            >
                              {style.label}
                            </span>
                            {event.caseNumber && (
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                {event.caseNumber}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          <span>
                            {event.allDay
                              ? "Todo el día"
                              : `${event.startTime.split("T")[1]?.substring(0, 5)} - ${event.endTime.split("T")[1]?.substring(0, 5)}`}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-slate-500 truncate max-w-xs">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <EventModal />
    </div>
  );
}
