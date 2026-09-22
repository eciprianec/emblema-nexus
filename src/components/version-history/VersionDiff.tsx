import * as React from "react";
import { cn } from "@/lib/utils";

interface DiffField {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

interface VersionDiffProps {
  fields: DiffField[];
  className?: string;
}

export function VersionDiff({ fields, className }: VersionDiffProps) {
  if (fields.length === 0) {
    return <div className="text-sm text-slate-500">No hay cambios registrados en esta versión.</div>;
  }

  return (
    <div className={cn("rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100 w-1/3">Campo</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100 w-1/3">Valor Anterior</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100 w-1/3">Valor Nuevo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
          {fields.map((field, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                {field.fieldName}
              </td>
              <td className="px-4 py-3 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20">
                <del className="opacity-80">{field.oldValue || <span className="text-slate-400 italic">Vacio</span>}</del>
              </td>
              <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                <ins className="no-underline font-medium">{field.newValue || <span className="text-slate-400 italic">Vacio</span>}</ins>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
