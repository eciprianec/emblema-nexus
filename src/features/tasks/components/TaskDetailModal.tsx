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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTaskStore } from "../store/useTaskStore";
import { Task, TaskPriority, TaskStatus, ChecklistItem } from "../types";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  en_revision: "En Revisión",
  completada: "Completada",
};

const AVAILABLE_CASES: Array<{ id: string; number: string; title: string }> = [];

interface TaskFormProps {
  task: Task | null;
  onClose: () => void;
  onAdd: (data: Omit<Task, "id" | "createdAt">) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

function TaskForm({ task, onClose, onAdd, onUpdate, onDelete }: TaskFormProps) {
  const isEditing = Boolean(task && task.id);

  const [formData, setFormData] = React.useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string;
    caseId?: string;
    caseNumber?: string;
    caseTitle?: string;
    checklist: ChecklistItem[];
  }>({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "normal",
    status: task?.status || "pendiente",
    dueDate: task?.dueDate || "",
    caseId: task?.caseId || "",
    caseNumber: task?.caseNumber || "",
    caseTitle: task?.caseTitle || "",
    checklist: task?.checklist ? [...task.checklist] : [],
  });

  const [newItemText, setNewItemText] = React.useState("");
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

  // Checklist handlers
  const handleAddChecklistItem = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
    };
    setFormData((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newItem],
    }));
    setNewItemText("");
  };

  const handleToggleChecklist = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const handleDeleteChecklistItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((item) => item.id !== id),
    }));
  };

  // Checklist progress calculations
  const totalItems = formData.checklist.length;
  const completedItems = formData.checklist.filter((i) => i.completed).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("El título de la tarea es obligatorio.");
      return;
    }
    if (!formData.dueDate) {
      setError("La fecha de vencimiento es obligatoria.");
      return;
    }

    if (isEditing && task?.id) {
      onUpdate(task.id, formData);
    } else {
      onAdd({
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate,
        caseId: formData.caseId,
        caseNumber: formData.caseNumber,
        caseTitle: formData.caseTitle,
        checklist: formData.checklist,
      });
    }
  };

  const handleDelete = () => {
    if (task?.id) {
      if (window.confirm("¿Está seguro de que desea eliminar esta tarea?")) {
        onDelete(task.id);
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
        <Label htmlFor="task-title" className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Título de la Tarea <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="task-title"
          placeholder="Ej. Redactar escrito de réplica, Solicitar certificación..."
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="h-9 text-sm"
          required
        />
      </div>

      {/* Prioridad y Estado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Prioridad
          </Label>
          <Select
            value={formData.priority}
            onValueChange={(val) =>
              setFormData({ ...formData, priority: val as TaskPriority })
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Seleccione prioridad" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val} className="text-sm">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Estado
          </Label>
          <Select
            value={formData.status}
            onValueChange={(val) =>
              setFormData({ ...formData, status: val as TaskStatus })
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Seleccione estado" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val} className="text-sm">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fecha de vencimiento y Expediente asociado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="task-due" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Fecha de Vencimiento <span className="text-rose-600">*</span>
          </Label>
          <Input
            id="task-due"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="h-9 text-sm"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Expediente Asociado (Opcional)
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
                Ninguno (Tarea General)
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

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="task-desc" className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Descripción y Alcance
        </Label>
        <Textarea
          id="task-desc"
          rows={3}
          placeholder="Instrucciones detalladas, dependencias o anotaciones..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="text-sm resize-none"
        />
      </div>

      {/* SECCIÓN CHECKLIST DINÁMICO */}
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Lista de Subtareas / Checklist
          </Label>
          {totalItems > 0 && (
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {completedItems} de {totalItems} completadas ({progressPercent}%)
            </span>
          )}
        </div>

        {totalItems > 0 && (
          <Progress value={progressPercent} className="h-1.5 bg-slate-200 dark:bg-slate-800" />
        )}

        {/* Input para agregar ítem */}
        <div className="flex items-center gap-2 pt-1">
          <Input
            placeholder="Añadir nuevo ítem al checklist..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddChecklistItem();
              }
            }}
            className="h-8 text-xs bg-white dark:bg-slate-900"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddChecklistItem}
            className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Añadir
          </Button>
        </div>

        {/* Lista de ítems */}
        <div className="space-y-1.5 pt-2 max-h-48 overflow-y-auto">
          {formData.checklist.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-1 text-center">
              No hay ítems en el checklist. Escribe arriba para agregar uno.
            </p>
          ) : (
            formData.checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 group"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={() => handleToggleChecklist(item.id)}
                  />
                  <label
                    htmlFor={item.id}
                    className={cn(
                      "text-xs cursor-pointer select-none transition-colors",
                      item.completed
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : "text-slate-800 dark:text-slate-200"
                    )}
                  >
                    {item.text}
                  </label>
                </div>

                <button
                  type="button"
                  aria-label="Eliminar ítem"
                  onClick={() => handleDeleteChecklistItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
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
            Eliminar Tarea
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
            {isEditing ? "Guardar Cambios" : "Crear Tarea"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function TaskDetailModal() {
  const { isModalOpen, selectedTask, closeModal, addTask, updateTask, deleteTask } =
    useTaskStore();

  const isEditing = Boolean(selectedTask && selectedTask.id);

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isEditing ? "Detalle de Tarea" : "Nueva Tarea"}
          </DialogTitle>
        </DialogHeader>

        {isModalOpen && (
          <TaskForm
            key={selectedTask?.id || "nueva"}
            task={selectedTask}
            onClose={closeModal}
            onAdd={addTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
