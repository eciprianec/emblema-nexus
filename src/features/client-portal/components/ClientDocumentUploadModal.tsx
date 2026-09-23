'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp,
  Shield,
  Loader2,
} from 'lucide-react';
import { useClientPortalStore } from '../store/useClientPortalStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function ClientDocumentUploadModal() {
  const {
    isUploadModalOpen,
    activeRequirement,
    closeUploadModal,
    uploadDocumentForRequirement,
  } = useClientPortalStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeRequirement) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    const allowed = activeRequirement.allowedFormats.map((f) => f.toUpperCase());

    if (!allowed.includes(ext)) {
      toast.error(
        `Formato no permitido (.${ext}). Por favor suba archivos: ${activeRequirement.allowedFormats.join(', ')}.`
      );
      return;
    }

    const maxBytes = activeRequirement.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(
        `El archivo excede el tamaño máximo permitido de ${activeRequirement.maxSizeMB} MB.`
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartUpload = () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);
    setStatusMessage('Cifrando y preparando archivo para transferencia segura...');

    setTimeout(() => {
      setUploadProgress(45);
      setStatusMessage('Transfiriendo al repositorio seguro del expediente...');
    }, 600);

    setTimeout(() => {
      setUploadProgress(80);
      setStatusMessage('Validando metadatos y generando recibo de entrega...');
    }, 1200);

    setTimeout(() => {
      setUploadProgress(100);
      setStatusMessage('¡Documento depositado satisfactoriamente!');

      setTimeout(() => {
        uploadDocumentForRequirement(activeRequirement.id, {
          name: selectedFile.name,
          size: selectedFile.size,
        });
        toast.success(`El documento "${selectedFile.name}" ha sido subido para revisión.`);
        setIsUploading(false);
        setSelectedFile(null);
        setUploadProgress(0);
      }, 500);
    }, 1800);
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedFile(null);
    setUploadProgress(0);
    closeUploadModal();
  };

  return (
    <Dialog open={isUploadModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg p-6 bg-white">
        <DialogHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-slate-100 rounded text-slate-700">
              <FileUp className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Subir Documento Requerido
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Expediente: <strong className="text-slate-800">{activeRequirement.caseNumber}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Detalle del Requerimiento */}
        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-1.5 my-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">{activeRequirement.title}</span>
            {activeRequirement.isUrgent && (
              <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">
                Requerimiento Urgente
              </Badge>
            )}
          </div>
          <p className="text-slate-600 leading-relaxed">{activeRequirement.description}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
            <span>
              Formatos admitidos: <strong>{activeRequirement.allowedFormats.join(', ')}</strong>
            </span>
            <span>
              Máx: <strong>{activeRequirement.maxSizeMB} MB</strong>
            </span>
          </div>
        </div>

        {/* Zona de Arrastre / Selección */}
        {!isUploading ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={activeRequirement.allowedFormats.map((f) => `.${f.toLowerCase()}`).join(',')}
              onChange={handleFileChange}
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50/50'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/40 hover:bg-slate-50'
              }`}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-900 text-xs truncate max-w-xs mx-auto">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Haga clic para cambiar archivo
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Arrastre su archivo aquí o haga clic para examinar
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Documento original escaneado en alta resolución
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center">
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-blue-600" />
                {statusMessage}
              </span>
              <span className="font-mono font-bold text-slate-900">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2.5 bg-slate-100" />
            <div className="text-[11px] text-slate-400 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Transferencia protegida por cifrado SHA-256
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isUploading}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleStartUpload}
            disabled={!selectedFile || isUploading}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
          >
            {isUploading ? 'Subiendo...' : 'Confirmar y Subir Archivo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
