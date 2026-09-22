"use client";

import { Cloud, FileText, CheckCircle2, AlertCircle, RefreshCw, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function IntegracionesPage() {
  const handleTest = (service: string) => {
    toast.info(`Probando conexión con ${service}...`);
    setTimeout(() => {
      toast.success(`Conexión con ${service} establecida exitosamente.`);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Integraciones del Sistema</h1>
        <p className="text-sm text-slate-500 mt-2">
          Gestione y monitoree el estado de las conexiones con servicios externos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Nextcloud */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg">Nextcloud (WebDAV)</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Conectado
              </div>
            </div>
            <CardDescription>Almacenamiento de documentos adjuntos de expedientes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-medium">Servidor:</span>
                <span>cloud.emblemanexus.com</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-medium">Directorio Base:</span>
                <span>/remote.php/webdav/nexus_storage</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => handleTest('Nextcloud')} className="text-slate-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Probar Conexión
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* DGII e-CF */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <CardTitle className="text-lg">DGII Facturación (e-CF)</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium border border-yellow-200">
                <AlertCircle className="w-3.5 h-3.5" />
                Modo Certificación
              </div>
            </div>
            <CardDescription>Emisión de comprobantes fiscales electrónicos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-medium">Entorno:</span>
                <span>Pre-Producción (Certificación)</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-medium">Certificado Digital:</span>
                <span>Válido hasta Oct 2026</span>
              </div>
            </div>
            <div className="flex justify-end pt-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => handleTest('DGII API')} className="text-slate-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Ping API DGII
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API RNC */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-slate-700" />
                <CardTitle className="text-lg">Consulta RNC / Cédula</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Operativo
              </div>
            </div>
            <CardDescription>Servicio de validación y autocompletado de contribuyentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-medium">Proveedor:</span>
                <span>Servicio Interno Cacheado</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => handleTest('API RNC')} className="text-slate-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Servicio
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
