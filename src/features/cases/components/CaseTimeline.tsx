"use client";

import * as React from "react";
import { Plus, MessageSquare, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useCaseStore } from "../store/useCaseStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CaseTimeline({ caseId }: { caseId: string }) {
  const { getCaseById, addTimelineEvent } = useCaseStore();
  const caseItem = getCaseById(caseId);

  const [isAddingNote, setIsAddingNote] = React.useState(false);
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteDesc, setNoteDesc] = React.useState("");

  const events = caseItem?.timeline || [];

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      toast.error("El título de la anotación es obligatorio.");
      return;
    }

    addTimelineEvent(caseId, {
      type: "NOTE",
      title: noteTitle.trim(),
      desc: noteDesc.trim(),
    });

    toast.success("Anotación registrada en la bitácora.");
    setNoteTitle("");
    setNoteDesc("");
    setIsAddingNote(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Bitácora Procesal e Historial</h4>
          <p className="text-xs text-slate-500">Registro cronológico de hitos, actuaciones y notas del expediente.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAddingNote(!isAddingNote)}
          className="text-xs h-8 border-slate-300"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {isAddingNote ? "Cancelar" : "+ Agregar Nota / Actuación"}
        </Button>
      </div>

      {isAddingNote && (
        <form onSubmit={handleAddNote} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Título de la Actuación *</label>
            <Input
              placeholder="ej. Depósito de memorial en secretaría o Notificación a colindantes"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="text-xs h-8 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Detalles / Observaciones</label>
            <textarea
              rows={2}
              placeholder="Descripción de la diligencia efectuada..."
              value={noteDesc}
              onChange={(e) => setNoteDesc(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 p-2 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNote(false)}
              className="text-xs h-7"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7"
            >
              Guardar en Bitácora
            </Button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No hay registros en la bitácora de este expediente aún.
        </div>
      ) : (
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {events.map((event, eventIdx) => (
              <li key={event.id}>
                <div className="relative pb-8">
                  {eventIdx !== events.length - 1 ? (
                    <span
                      className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span
                        className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          event.type === "CREATION"
                            ? "bg-slate-900 text-white"
                            : event.type === "STAGE_CHANGE"
                            ? "bg-blue-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {event.type === "CREATION" ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : event.type === "STAGE_CHANGE" ? (
                          <ArrowRight className="w-3.5 h-3.5" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{event.title}</p>
                        {event.desc && <p className="text-xs text-slate-500 mt-0.5">{event.desc}</p>}
                      </div>
                      <div className="whitespace-nowrap text-right text-[11px] text-slate-400 font-mono">
                        {event.date}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
