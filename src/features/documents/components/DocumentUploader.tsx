'use client';

import React, { useState } from 'react';
import { UploadCloud, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function DocumentUploader({ caseId, clientId, requirementId, onUploadSuccess }: { caseId?: string; clientId?: string; requirementId?: string; onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!documentName) {
        setDocumentName(droppedFile.name);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Debe seleccionar un archivo para subir.');
      return;
    }
    if (!category) {
      toast.error('Debe seleccionar una categoría para el documento.');
      return;
    }

    setUploading(true);
    setProgress(0);

    // Simulating upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
      setFile(null);
      setDocumentName('');
      setCategory('');
      toast.success('Documento subido exitosamente.');
      if (onUploadSuccess) onUploadSuccess();
    }, 2000);
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-slate-500" />
          Subir Documento
        </CardTitle>
        <CardDescription>
          Adjunte archivos al expediente o cliente. Puede arrastrar y soltar el archivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors bg-slate-50/50"
        >
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <File className="h-10 w-10 text-slate-700" />
              <p className="text-sm font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-red-500 hover:text-red-700 mt-2">
                <X className="h-4 w-4 mr-1" /> Remover
              </Button>
            </div>
          ) : (
            <>
              <UploadCloud className="h-10 w-10 mb-2 text-slate-400" />
              <p className="text-sm font-medium">Arrastre un archivo aquí o haga clic para seleccionar</p>
              <p className="text-xs text-slate-400 mt-1">Soporta PDF, DOCX, JPG, PNG (Max 50MB)</p>
              <Input type="file" className="hidden" id="file-upload" onChange={handleFileSelect} />
              <Label htmlFor="file-upload" className="mt-4 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                Seleccionar archivo
              </Label>
            </>
          )}
        </div>

        {file && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-2">
              <Label htmlFor="documentName">Nombre del Documento</Label>
              <Input
                id="documentName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Ej. Cédula de Identidad"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría / Tipo</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Seleccione el tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identificacion">Identificación</SelectItem>
                  <SelectItem value="legal">Documento Legal</SelectItem>
                  <SelectItem value="tecnico">Documento Técnico</SelectItem>
                  <SelectItem value="financiero">Comprobante Financiero</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subiendo...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-800 transition-all duration-200" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <Button 
              className="w-full bg-slate-800 hover:bg-slate-700 text-white" 
              onClick={handleUpload} 
              disabled={uploading || !documentName || !category}
            >
              {uploading ? 'Subiendo...' : 'Confirmar Subida'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
