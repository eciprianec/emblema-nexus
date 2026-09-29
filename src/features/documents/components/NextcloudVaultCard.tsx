'use client';

import React, { useState } from 'react';
import { 
  Cloud, 
  FolderCheck, 
  ExternalLink, 
  RefreshCw, 
  Copy, 
  Check, 
  Folder, 
  HardDrive,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface NextcloudVaultCardProps {
  type: 'client' | 'case';
  id: string;
  name: string;
  titleOrDoc?: string;
  area?: string;
  clientId?: string;
  clientName?: string;
}

const CLIENT_SUBFOLDERS = [
  { name: 'Datos_Recurrentes', desc: 'Cédula de identidad, pasaporte, RNC, poderes generales y documentos recurrentes' },
  { name: 'Legal', desc: 'Expedientes, litigios y actos notariales de este cliente' },
  { name: 'Agrimensura', desc: 'Expedientes catastrales, deslindes, mensuras y coordenadas de este cliente' },
  { name: 'Inmobiliaria', desc: 'Operaciones inmobiliarias, compras, ventas y contratos de este cliente' },
];

const CASE_SUBFOLDERS = [
  { name: '01_Actos_Notariales', desc: 'Actos de notoriedad, contratos de venta, promesas y declaraciones' },
  { name: '02_Planos_y_Coordenadas', desc: 'Planos catastrales, poligonales UTM 19N y coordenadas RTK/GPS' },
  { name: '03_Notificaciones_Alguacil', desc: 'Actos de intimación, emplazamientos y notificaciones de audiencia' },
  { name: '04_Sentencias_y_Oficios', desc: 'Sentencias de tierras, oficios DNMC, resoluciones y autos' },
];

export function NextcloudVaultCard({
  type,
  id,
  name,
  titleOrDoc,
  area,
  clientId,
  clientName,
}: NextcloudVaultCardProps) {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Compute canonical folder path
  const sanitizedName = (name || (type === 'client' ? 'Cliente' : 'EXP'))
    .trim()
    .replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_')
    .replace(/\s+/g, '_');

  const cleanId = (id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');

  const sanitizedTitle = (titleOrDoc || 'General')
    .trim()
    .replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_')
    .replace(/\s+/g, '_');

  // Para expedientes, determinar área y cliente
  const normArea = (area || 'LEGAL').toUpperCase();
  const areaFolder =
    normArea === 'AGRIMENSURA'
      ? 'Agrimensura'
      : normArea === 'INMOBILIARIA'
      ? 'Inmobiliaria'
      : 'Legal';

  const rawClient = (clientName || 'Cliente_General').trim();
  const sanitizedClient = rawClient.replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_').replace(/\s+/g, '_');
  const cleanClientId = (clientId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const clientFolderName = cleanClientId ? `${sanitizedClient}_${cleanClientId}` : sanitizedClient;

  const folderPath =
    type === 'client'
      ? `/nexus_storage/Clientes/${cleanId ? `${sanitizedName}_${cleanId}` : sanitizedName}`
      : `/nexus_storage/Clientes/${clientFolderName}/${areaFolder}/${sanitizedName}_${sanitizedTitle}`;

  const nextcloudWebUrl = `https://nextcloud.ciberemblema.com/index.php/apps/files/?dir=${encodeURIComponent(
    folderPath
  )}`;

  const subfolders = type === 'client' ? CLIENT_SUBFOLDERS : CASE_SUBFOLDERS;

  const handleCopyPath = () => {
    navigator.clipboard.writeText(folderPath);
    setHasCopied(true);
    toast.success('Ruta WebDAV copiada al portapapeles.');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleProvision = async () => {
    setIsProvisioning(true);
    const toastId = toast.loading('Sincronizando carpetas en Nextcloud WebDAV...');

    try {
      const payload =
        type === 'client'
          ? {
              type: 'client',
              clientId: id,
              clientName: name,
              docNumber: titleOrDoc,
            }
          : {
              type: 'case',
              caseId: id,
              caseNumber: name,
              title: titleOrDoc || 'Expediente',
              area,
              clientId,
              clientName,
            };

      const res = await fetch('/api/integrations/nextcloud/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          `Carpetas aprovisionadas correctamente en Nextcloud: ${data.folderPath}`,
          { id: toastId }
        );
      } else {
        toast.error(`Error en Nextcloud: ${data.error || 'No se pudo aprovisionar'}`, {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error('Error de red al conectar con el servidor Nextcloud.', { id: toastId });
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 py-3.5 px-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100/80 text-sky-800 rounded-md">
              <Cloud className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Bóveda Documental Nextcloud (WebDAV)
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0"
                >
                  <FileCheck2 className="w-3 h-3 mr-1" />
                  Almacenamiento Activo
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Repositorio físico oficial con sincronización automática de archivos y subdirectorios notariales.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleProvision}
              disabled={isProvisioning}
              className="h-8 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${
                  isProvisioning ? 'animate-spin' : ''
                }`}
              />
              {isProvisioning ? 'Aprovisionando...' : 'Re-aprovisionar'}
            </Button>

            <a
              href={nextcloudWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-800 h-8 px-3"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Abrir en Nextcloud
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Ruta del Directorio */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-md border border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-600 font-medium">Ruta del Directorio:</span>
            <span className="text-xs font-mono font-bold text-slate-900 truncate">
              {folderPath}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyPath}
            className="h-7 text-xs text-slate-600 hover:text-slate-900 shrink-0"
          >
            {hasCopied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copiar Ruta
              </>
            )}
          </Button>
        </div>

        {/* Estructura de Subcarpetas Aprovisionadas */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <FolderCheck className="w-4 h-4 text-sky-700" />
            Estructura Jerárquica de Subdirectorios
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {subfolders.map((sub, idx) => (
              <div
                key={sub.name}
                className="p-3 bg-white rounded-md border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-mono text-xs font-bold text-slate-900 truncate">
                    {sub.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {sub.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
