"use client";
import { useState } from "react";
import { CaseFormValues } from "../schemas/case-schema";

export function CaseWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<CaseFormValues>>({});

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 max-w-3xl mx-auto">
      <div className="flex mb-8 border-b pb-4">
        <div className={`flex-1 text-center font-medium ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>1. Información General</div>
        <div className={`flex-1 text-center font-medium ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>2. Participantes</div>
        <div className={`flex-1 text-center font-medium ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>3. Resumen</div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Título del Expediente</label>
            <input type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Área</label>
            <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border">
              <option>LEGAL</option>
              <option>AGRIMENSURA</option>
              <option>INMOBILIARIA</option>
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Seleccione el cliente principal y otros participantes del proceso.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Cliente Principal</label>
            <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border">
              <option value="">-- Seleccionar cliente registrado --</option>
              <option value="general">Cliente General / Por Definir</option>
            </select>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 text-sm text-slate-700">
          <h3 className="font-semibold text-lg">Resumen de Creación</h3>
          <p>Confirme los datos antes de generar el número de expediente e iniciar el proceso.</p>
        </div>
      )}

      <div className="mt-8 flex justify-between pt-4 border-t border-slate-200">
        <button onClick={prevStep} disabled={step === 1} className="px-4 py-2 border border-slate-300 rounded text-sm disabled:opacity-50">Atrás</button>
        {step < 3 ? (
          <button onClick={nextStep} className="px-4 py-2 bg-slate-900 text-white rounded text-sm hover:bg-slate-800">Siguiente</button>
        ) : (
          <button className="px-4 py-2 bg-slate-900 text-white rounded text-sm hover:bg-slate-800">Crear Expediente</button>
        )}
      </div>
    </div>
  );
}
