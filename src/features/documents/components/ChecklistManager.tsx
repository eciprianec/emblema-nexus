'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, Upload, AlertCircle, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
  status: 'pending' | 'uploaded' | 'approved' | 'rejected';
  documentId?: string;
}

export function ChecklistManager({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: '1', name: 'Cédula de Identidad o Pasaporte', required: true, status: 'approved' },
    { id: '2', name: 'Título de Propiedad Original', required: true, status: 'uploaded' },
    { id: '3', name: 'Plano de Mensura Catastral', required: true, status: 'pending' },
    { id: '4', name: 'Certificación de Estado Jurídico', required: true, status: 'pending' },
    { id: '5', name: 'Poder de Representación (si aplica)', required: false, status: 'pending' },
  ]);

  const totalRequired = items.filter(i => i.required).length;
  const completedRequired = items.filter(i => i.required && (i.status === 'uploaded' || i.status === 'approved')).length;
  const progressPercent = Math.round((completedRequired / totalRequired) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'uploaded': return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'rejected': return <X className="h-5 w-5 text-rose-500" />;
      default: return <Circle className="h-5 w-5 text-slate-300" />;
    }
  };

  const updateStatus = (id: string, newStatus: ChecklistItem['status']) => {
    setItems(items.map(item => item.id === id ? { ...item, status: newStatus } : item));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg text-slate-800">Checklist Documental</CardTitle>
            <CardDescription>
              Requisitos documentales para este expediente
            </CardDescription>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-700 mb-1">
              Progreso: {progressPercent}%
            </span>
            <Progress value={progressPercent} className="w-32 h-2" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start sm:items-center gap-3">
                <div className="mt-0.5 sm:mt-0">
                  {getStatusIcon(item.status)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${item.status === 'approved' ? 'text-slate-900' : 'text-slate-700'}`}>
                      {item.name}
                    </span>
                    {item.required ? (
                      <Badge variant="outline" className="text-[10px] uppercase bg-slate-100 text-slate-600 h-5 px-1.5 py-0 border-slate-200">Requerido</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] uppercase text-slate-400 h-5 px-1.5 py-0 border-transparent">Opcional</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.status === 'pending' && 'Falta subir documento'}
                    {item.status === 'uploaded' && 'Documento subido, pendiente de revisión'}
                    {item.status === 'approved' && 'Documento verificado y aprobado'}
                    {item.status === 'rejected' && 'Documento rechazado, requiere nueva subida'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {item.status === 'pending' || item.status === 'rejected' ? (
                  <Button size="sm" variant="outline" className="bg-white h-8 text-xs">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Subir
                  </Button>
                ) : item.status === 'uploaded' ? (
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-white h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                      onClick={() => updateStatus(item.id, 'approved')}
                      title="Aprobar"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-white h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      onClick={() => updateStatus(item.id, 'rejected')}
                      title="Rechazar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
