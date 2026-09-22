"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (reason: string) => Promise<void>;
  versionToRestore: number | null;
}

export function RestoreDialog({
  open,
  onOpenChange,
  onRestore,
  versionToRestore,
}: RestoreDialogProps) {
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onRestore(reason);
      setReason("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Restaurar versión v{versionToRestore}
            </DialogTitle>
            <DialogDescription>
              Esta acción creará una nueva versión usando los datos de la v{versionToRestore}. 
              Por políticas de auditoría, debe indicar el motivo de la restauración.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason" className="text-slate-700 dark:text-slate-300">
                Motivo de restauración (Obligatorio)
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                placeholder="Ej: Se revirtieron los cambios por error de captura..."
                className="col-span-3 min-h-[100px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!reason.trim() || isSubmitting}
              className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {isSubmitting ? "Restaurando..." : "Confirmar Restauración"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
