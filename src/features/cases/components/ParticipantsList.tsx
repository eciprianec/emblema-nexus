"use client";

import * as React from "react";
import { Plus, Trash2, User, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { useCaseStore } from "../store/useCaseStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ParticipantsList({ caseId }: { caseId: string }) {
  const { getCaseById, addParticipant, removeParticipant } = useCaseStore();
  const caseItem = getCaseById(caseId);

  const [isAdding, setIsAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("Abogado Asistente");
  const [contact, setContact] = React.useState("");

  const participants = caseItem?.participants || [];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre del participante es obligatorio.");
      return;
    }

    addParticipant(caseId, {
      name: name.trim(),
      role: role.trim(),
      contact: contact.trim() || "N/A",
    });

    toast.success(`Participante ${name} agregado al expediente.`);
    setName("");
    setContact("");
    setIsAdding(false);
  };

  const handleRemove = (pId: string, pName: string) => {
    removeParticipant(caseId, pId);
    toast.success(`Participante ${pName} removido.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Participantes e Intervinientes del Proceso</h3>
          <p className="text-xs text-slate-500">Clientes, abogados apoderados, peritos, agrimensores y contrapartes.</p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {isAdding ? "Cancelar" : "+ Agregar Participante"}
        </Button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre Completo *</label>
              <Input
                placeholder="ej. Lic. Roberto Almonte"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs h-8 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rol en el Expediente *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs h-8 rounded-md border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Abogado Asistente">Abogado Asistente</option>
                <option value="Agrimensor de Campo">Agrimensor de Campo</option>
                <option value="Perito Judicial">Perito Judicial</option>
                <option value="Contraparte">Contraparte</option>
                <option value="Abogado de Contraparte">Abogado de Contraparte</option>
                <option value="Notario Público">Notario Público</option>
                <option value="Testigo">Testigo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contacto (Tel / Email)</label>
              <Input
                placeholder="809-555-0000 o correo@perito.com"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="text-xs h-8 bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
              className="text-xs h-7"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7"
            >
              Vincular al Expediente
            </Button>
          </div>
        </form>
      )}

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Contacto / Identificación</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {participants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No hay participantes registrados en este expediente.
                </td>
              </tr>
            ) : (
              participants.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">
                    <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium">
                      {p.role}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 font-mono">
                    {p.contact}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(p.id, p.name)}
                      className="text-rose-600 hover:text-rose-800 text-xs inline-flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
