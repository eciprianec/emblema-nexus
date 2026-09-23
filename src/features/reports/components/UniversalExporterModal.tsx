"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UniversalExporterView } from "./UniversalExporterView";
import { Download } from "lucide-react";

interface UniversalExporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UniversalExporterModal({ open, onOpenChange }: UniversalExporterModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Download className="h-5 w-5 text-slate-700" />
            Exportador Universal de Datos Maestros
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure parámetros de extracción, módulos del sistema y descargue en CSV (Excel compatible), TXT delimitado o JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <UniversalExporterView />
        </div>
      </DialogContent>
    </Dialog>
  );
}
