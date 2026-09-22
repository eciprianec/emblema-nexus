"use client";
import { useState } from "react";

export function RncLookup() {
  const [rnc, setRnc] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const consultar = async () => {
    setLoading(true);
    // Simular llamada a API DGII
    setTimeout(() => {
      setResult({
        razonSocial: "EMPRESA DE EJEMPLO SRL",
        estado: "ACTIVO",
        fecha: new Date().toLocaleDateString()
      });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="border border-slate-200 rounded p-4 bg-slate-50 mb-4">
      <h3 className="text-sm font-semibold mb-2">Consulta DGII</h3>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={rnc} 
          onChange={e => setRnc(e.target.value)} 
          placeholder="Ingrese RNC..." 
          className="border border-slate-300 rounded px-2 py-1 text-sm flex-1"
        />
        <button 
          type="button" 
          onClick={consultar} 
          disabled={loading || !rnc}
          className="bg-slate-700 text-white px-3 py-1 rounded text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Consultando..." : "Consultar RNC"}
        </button>
      </div>
      {result && (
        <div className="mt-3 text-sm text-slate-700">
          <p><strong>Razón Social:</strong> {result.razonSocial}</p>
          <p><strong>Estado:</strong> <span className="text-green-600 font-semibold">{result.estado}</span></p>
          <p><strong>Última verificación:</strong> {result.fecha}</p>
        </div>
      )}
    </div>
  );
}
