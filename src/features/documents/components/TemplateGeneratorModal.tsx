'use client';

import React, { useState } from 'react';
import { FileCode, Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function TemplateGeneratorModal() {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    if (!template) {
      toast.error('Debe seleccionar una plantilla.');
      return;
    }

    setGenerating(true);
    
    // Simulate generation process
    setTimeout(() => {
      setGenerating(false);
      setOpen(false);
      toast.success('Documento generado exitosamente y adjuntado al expediente.');
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-800 hover:bg-slate-700 text-white">
          <FileCode className="w-4 h-4 mr-2" />
          Generar de Plantilla
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Sparkles className="h-5 w-5 text-slate-500" />
            Generador de Documentos
          </DialogTitle>
          <DialogDescription>
            Seleccione una plantilla legal o técnica para autocompletar con los datos del expediente actual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="template">Plantilla Base</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Seleccione la plantilla a utilizar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contrato_venta">Contrato de Compra-Venta</SelectItem>
                <SelectItem value="poder_representacion">Poder de Representación</SelectItem>
                <SelectItem value="solicitud_deslinde">Instancia de Solicitud de Deslinde</SelectItem>
                <SelectItem value="declaracion_jurada">Declaración Jurada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {template && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
                <h4 className="text-sm font-medium text-slate-800 mb-2">Variables a inyectar:</h4>
                <ul className="text-xs text-slate-600 space-y-1 grid grid-cols-2 gap-x-4 gap-y-2">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500"/> Nombre del Cliente</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500"/> Cédula/RNC</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500"/> Designación Catastral</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500"/> Dirección del Inmueble</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="docName">Nombre del archivo generado</Label>
                <Input 
                  id="docName" 
                  defaultValue={template === 'contrato_venta' ? 'Contrato de Venta - Juan Perez.docx' : 'Documento_Generado.docx'} 
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button 
            className="bg-slate-800 hover:bg-slate-700 text-white" 
            onClick={handleGenerate}
            disabled={!template || generating}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar Documento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Temporary Check icon since we didn't import it in the file block above
function Check(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
