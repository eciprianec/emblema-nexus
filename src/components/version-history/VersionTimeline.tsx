import * as React from "react";
import { User, Clock, FilePlus, FileEdit, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VersionItem {
  id: string;
  version: number;
  createdAt: string;
  user: string;
  operation: "CREATE" | "UPDATE" | "RESTORE";
  reason?: string;
}

interface VersionTimelineProps {
  versions: VersionItem[];
  className?: string;
}

const getOperationIcon = (operation: VersionItem["operation"]) => {
  switch (operation) {
    case "CREATE": return <FilePlus className="h-4 w-4 text-emerald-500" />;
    case "UPDATE": return <FileEdit className="h-4 w-4 text-blue-500" />;
    case "RESTORE": return <ArchiveRestore className="h-4 w-4 text-amber-500" />;
  }
};

export function VersionTimeline({ versions, className }: VersionTimelineProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Historial de Versiones</h3>
      <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-6">
        {versions.map((v, i) => (
          <div key={v.id} className="relative pl-6">
            <span className="absolute -left-[1.1rem] flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
              {getOperationIcon(v.operation)}
            </span>
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  v{v.version}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  • {v.operation === "CREATE" ? "Creación inicial" : v.operation === "UPDATE" ? "Actualización" : "Restauración"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{v.user}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(v.createdAt).toLocaleString("es-DO")}</span>
                </div>
              </div>
              {v.reason && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic border-l-2 border-slate-200 dark:border-slate-800 pl-2">
                  &quot;{v.reason}&quot;
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
