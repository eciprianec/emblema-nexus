"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarStore } from "../store/useCalendarStore";
import { CalendarEvent, EventType } from "../types";
import { Trash2, AlertCircle } from "lucide-react";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  audiencia: "Audiencia",
  cita_cliente: "Cita con Cliente",
  mensura_campo: "Mensura de Campo",
  vencimiento_plazo: "Vencimiento de Plazo",
  reunion_interna: "Reunión Interna",
  otro: "Otro",
};

const AVAILABLE_CASES: Array<{ id: string; number: string; title: string }> = [];

const REMINDER_OPTIONS = [
  { value: "0", label: "Sin recordatorio" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
  { value: "1440", label: "1 día antes" },
  { value: "2880", label: "2 días antes" },
];

interface EventFormProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onAdd: (data: Omit<CalendarEvent, "id">) => void;
  onUpdate: (id: string, data: Partial<CalendarEvent>) => void;
  onDelete: (id: string) => void;
}

function EventForm({ event, onClose, onAdd, onUpdate, onDelete }: EventFormProps) {
  const isEditing = Boolean(event && event.id);

  const [formData, setFormData] = React.useState<Partial<CalendarEvent>>({
    title: event?.title || "",
    eventType: event?.eventType || "audiencia",
    startTime: event?.startTime || "",
    endTime: event?.endTime || "",
    allDay: Boolean(event?.allDay),
    location: event?.location || "",
    virtualMeetingUrl: event?.virtualMeetingUrl || "",
    caseId: event?.caseId || "",
    caseNumber: event?.caseNumber || "",
    caseTitle: event?.caseTitle || "",
    description: event?.description || "",
    reminderMinutes: event?.reminderMinutes ?? 30,
  });

  const [error, setError] = React.useState<string | null>(null);

  const handleCaseChange = (caseId: string) => {
    if (caseId === "none") {
      setFormData((prev) => ({
        ...prev,
        caseId: undefined,
        caseNumber: undefined,
        caseTitle: undefined,
      }));
    } else {
      const selected = AVAILABLE_CASES.find((c) => c.id === caseId);
      setFormData((prev) => ({
        ...prev,
        caseId,
        caseNumber: selected?.number,
        caseTitle: selected?.title,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setError("El título del evento es obligatorio.");
      return;
    }
    if (!formData.startTime) {
      setError("La fecha y hora de inicio son requeridas.");
      return;
    }
    if (!formData.allDay && formData.endTime && formData.endTime < formData.startTime) {
      setError("La hora de finalización debe ser posterior a la de inicio.");
      return;
    }

    if (isEditing && event?.id) {
      onUpdate(event.id, formData);
    } else {
      onAdd({
        title: formData.title.trim(),
        eventType: formData.eventType || "audiencia",
        startTime: formData.startTime,
        endTime: formData.endTime || formData.startTime,
        allDay: formData.allDay,
        location: formData.location || "",
        virtualMeetingUrl: formData.virtualMeetingUrl || "",
        caseId: formData.caseId,
        caseNumber: formData.caseNumber,
        caseTitle: formData.caseTitle,
        description: formData.description || "",
        reminderMinutes: formData.reminderMinutes ?? 30,
        status: "programado",
      });
    }
  };

  const handleDelete = () => {
    if (event?.id) {
      if (window.confirm("¿Está seguro de que desea eliminar este evento?")) {
        onDelete(event.id);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="event-title" className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Título del Evento <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="event-title"
          placeholder="Ej. Audiencia Preliminar, Vencimiento Escrito de Réplica..."
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="h-9 text-sm"
          required
        />
      </div>

      {/* Tipo de evento y Expediente vinculado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Tipo de Evento <span className="text-rose-600">*</span>
          </Label>
          <Select
            value={formData.eventType}
            onValueChange={(val) => setFormData({ ...formData, eventType: val as EventType })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Seleccione tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-sm">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Expediente Vinculado (Opcional)
          </Label>
          <Select
            value={formData.caseId || "none"}
            onValueChange={handleCaseChange}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Sin expediente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-sm text-slate-500">
                Ninguno (Evento General)
              </SelectItem>
              {AVAILABLE_CASES.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-sm">
                  {c.number} — {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Todo el día checkbox */}
      <div className="flex items-center space-x-2 pt-1">
        <Checkbox
          id="all-day"
          checked={formData.allDay}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, allDay: Boolean(checked) })
          }
        />
        <Label
          htmlFor="all-day"
          className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
        >
          Evento de todo el día
        </Label>
      </div>

      {/* Fechas inicio y fin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Inicio <span className="text-rose-600">*</span>
          </Label>
          <Input
            type={formData.allDay ? "date" : "datetime-local"}
            value={
              formData.allDay
                ? formData.startTime?.split("T")[0] || ""
                : formData.startTime || ""
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                startTime: formData.allDay ? `${e.target.value}T00:00` : e.target.value,
              })
            }
            className="h-9 text-sm"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Fin
          </Label>
          <Input
            type={formData.allDay ? "date" : "datetime-local"}
            value={
              formData.allDay
                ? formData.endTime?.split("T")[0] || ""
                : formData.endTime || ""
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                endTime: formData.allDay ? `${e.target.value}T23:59` : e.target.value,
              })
            }
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Ubicación y Enlace Virtual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="event-location" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Ubicación / Sala / Tribunal
          </Label>
          <Input
            id="event-location"
            placeholder="Ej. 1ra Sala Cámara Civil, Salón B, Terreno..."
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-virtual" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Enlace a Reunión Virtual
          </Label>
          <Input
            id="event-virtual"
            placeholder="https://meet.google.com/... o Zoom"
            value={formData.virtualMeetingUrl}
            onChange={(e) => setFormData({ ...formData, virtualMeetingUrl: e.target.value })}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Recordatorio */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Recordatorio Automático
        </Label>
        <Select
          value={String(formData.reminderMinutes ?? 30)}
          onValueChange={(val) =>
            setFormData({ ...formData, reminderMinutes: Number(val) })
          }
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Seleccione recordatorio" />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="event-desc" className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Descripción y Notas Internas
        </Label>
        <Textarea
          id="event-desc"
          rows={3}
          placeholder="Instrucciones procesales, comparecientes, advertencias previas..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="text-sm resize-none"
        />
      </div>

      <DialogFooter className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
        {isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Eliminar
          </Button>
        ) : <div />}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-slate-700 dark:text-slate-300"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900"
          >
            {isEditing ? "Guardar Cambios" : "Crear Evento"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function EventModal() {
  const { isModalOpen, selectedEvent, closeModal, addEvent, updateEvent, deleteEvent } =
    useCalendarStore();

  const isEditing = Boolean(selectedEvent && selectedEvent.id);

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isEditing ? "Editar Evento o Plazo" : "Nuevo Evento o Audiencia"}
          </DialogTitle>
        </DialogHeader>

        {isModalOpen && (
          <EventForm
            key={selectedEvent?.id || "nuevo"}
            event={selectedEvent}
            onClose={closeModal}
            onAdd={addEvent}
            onUpdate={updateEvent}
            onDelete={deleteEvent}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
