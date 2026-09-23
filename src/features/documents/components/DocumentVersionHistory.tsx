'use client';

import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, FileText, History } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocumentVersionHistoryProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentVersionHistory({ documentId, open, onOpenChange }: DocumentVersionHistoryProps) {
  const history: Array<{ id: string; version: string; summary: string; size: number; date: Date; user: string }> = [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <History className="h-5 w-5 text-slate-500" />
            Historial de Versiones
          </DialogTitle>
          <DialogDescription>
            Registro de cambios y versiones anteriores del documento.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4 mt-4">
          <div className="space-y-6">
            {history.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No hay versiones previas registradas para este documento.
              </div>
            ) : (
              history.map((item, index) => (
              <div key={item.id} className="relative pl-6 pb-6 border-l border-slate-200 last:border-0 last:pb-0">
                <div className="absolute -left-[5px] top-1 h-[9px] w-[9px] rounded-full bg-slate-300 ring-4 ring-white" />
                
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">Versión {item.version}</span>
                      {index === 0 && (
                        <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {format(item.date, "dd 'de' MMMM, yyyy - HH:mm", { locale: es })} • por {item.user}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0">
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                  </Button>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 border border-slate-100">
                  <span className="font-medium text-slate-900 block mb-1">Resumen de cambios:</span>
                  {item.summary}
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {(item.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>
            )))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
