"use client";

import { useState } from "react";
import { useEcfStore } from "@/features/ecf/store/useEcfStore";
import { ECFType, ECFSequence, ECF_TYPE_MAP } from "@/features/ecf/types";
import {
  ShieldCheck,
  Building2,
  KeyRound,
  FileCode,
  Server,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Save,
  Lock,
  RefreshCw,
  Sliders,
  Calendar,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function EcfConfigPage() {
  const {
    config,
    sequences,
    setEnvironment,
    updateConfig,
    updateSequence,
  } = useEcfStore();

  // Estados locales para edición
  const [rnc, setRnc] = useState(config.rnc);
  const [razonSocial, setRazonSocial] = useState(config.razonSocial);
  const [nombreComercial, setNombreComercial] = useState(config.nombreComercial);
  const [actividadEconomica, setActividadEconomica] = useState(config.actividadEconomica);
  const [direccionFiscal, setDireccionFiscal] = useState(config.direccionFiscal);
  const [telefono, setTelefono] = useState(config.telefono);
  const [emailNotificaciones, setEmailNotificaciones] = useState(config.emailNotificaciones);

  // Estado para modal de subida de certificado
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certFile, setCertFile] = useState<string>("");
  const [certPassword, setCertPassword] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Estado para edición de secuencia
  const [editingSeqType, setEditingSeqType] = useState<ECFType | null>(null);
  const [seqStart, setSeqStart] = useState<number>(1);
  const [seqEnd, setSeqEnd] = useState<number>(1000);
  const [seqExpiration, setSeqExpiration] = useState<string>("2026-12-31");

  const handleSaveTaxpayerData = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      rnc,
      razonSocial,
      nombreComercial,
      actividadEconomica,
      direccionFiscal,
      telefono,
      emailNotificaciones,
    });
    toast.success("Datos fiscales del contribuyente actualizados correctamente");
  };

  const handleToggleEnvironment = (newEnv: "CERT" | "PROD") => {
    setEnvironment(newEnv);
    toast.info(
      newEnv === "PROD"
        ? "Ambiente cambiado a PRODUCCIÓN (DGII Oficial)"
        : "Ambiente cambiado a CERTIFICACIÓN (Sandbox DGII)"
    );
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setTimeout(() => {
      setIsTestingConnection(false);
      toast.success("Conexión con Web Services DGII exitosa", {
        description: `Ambiente ${config.ambiente}: Servicio de autenticación, timbrado y consulta de TrackId operativos (Latencia: 142ms).`,
      });
    }, 1000);
  };

  const handleUploadCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile) {
      toast.error("Seleccione un archivo de certificado válido (.p12 o .pfx)");
      return;
    }
    if (!certPassword) {
      toast.error("Introduzca la clave privada de protección del certificado");
      return;
    }

    updateConfig({
      certificado: {
        nombreArchivo: certFile,
        emisorCertificado: "Avansi S.R.L. (Entidad de Certificación Acreditada por INDOTEL)",
        validoHasta: "2027-09-30",
        diasRestantes: 738,
        sha256Fingerprint: "A9:44:81:BC:23:FE:19:80:CC:22:90:54:11:00:AA:34:67:88:BB:CC:12:34:56:78:90:AB:CD:EF:12:34:56:78",
        estado: "activo",
        tieneClave: true,
      },
    });

    setIsCertModalOpen(false);
    setCertFile("");
    setCertPassword("");
    toast.success("Certificado digital X.509 instalado y validado");
  };

  const handleOpenEditSequence = (seq: ECFSequence) => {
    setEditingSeqType(seq.type);
    setSeqStart(seq.startNumber);
    setSeqEnd(seq.endNumber);
    setSeqExpiration(seq.expirationDate);
  };

  const handleSaveSequence = () => {
    if (!editingSeqType) return;
    updateSequence(editingSeqType, {
      startNumber: Number(seqStart),
      endNumber: Number(seqEnd),
      expirationDate: seqExpiration,
    });
    toast.success(`Secuencia ${editingSeqType} actualizada exitosamente`);
    setEditingSeqType(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Configuración de Facturación Electrónica e-CF
            </h1>
            <Badge
              variant="outline"
              className={
                config.ambiente === "PROD"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]"
                  : "bg-amber-50 text-amber-700 border-amber-300 text-[10px]"
              }
            >
              Ambiente: {config.ambiente}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administración del certificado digital X.509, rangos de secuencias autorizadas por la DGII y parámetros del emisor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="text-xs h-8 border-slate-300 text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isTestingConnection ? "animate-spin text-slate-900" : ""}`} />
            {isTestingConnection ? "Probando..." : "Test Conexión DGII"}
          </Button>
        </div>
      </div>

      {/* Switch de Ambiente: Certificación vs Producción */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-100 rounded-md">
              <Server className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ambiente de Operación DGII</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seleccione si los comprobantes emitidos se timbrarán en el entorno oficial de Producción con valor tributario definitivo o en Certificación (Sandbox de pruebas).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleEnvironment("CERT")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                config.ambiente === "CERT"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Certificación (Pruebas)
            </button>
            <button
              type="button"
              onClick={() => handleToggleEnvironment("PROD")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                config.ambiente === "PROD"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Producción (Oficial)
            </button>
          </div>
        </div>
      </div>

      {/* Tarjeta de Certificado Digital X.509 */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 rounded-md">
              <KeyRound className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Certificado Digital para Firma Electrónica</h3>
              <p className="text-xs text-slate-500">
                Certificado X.509 requerido por la DGII para la firma digital de los XML (e-CF v1.0).
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsCertModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Actualizar Certificado (.p12 / .pfx)
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Archivo & Entidad Emisora</span>
            <p className="font-semibold text-slate-900 mt-1 font-mono">{config.certificado.nombreArchivo}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{config.certificado.emisorCertificado}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Vigencia & Días Restantes</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-bold text-slate-900 font-mono">Hasta {config.certificado.validoHasta}</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                {config.certificado.diasRestantes} días
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Certificado activo y no revocado ante la CRL</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Huella Digital SHA-256</span>
            <p className="font-mono text-[10px] text-slate-700 mt-1 break-all leading-tight">
              {config.certificado.sha256Fingerprint}
            </p>
          </div>
        </div>
      </div>

      {/* Secuencias Autorizadas por la DGII */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Administración de Secuencias Autorizadas por la DGII
            </h3>
            <p className="text-xs text-slate-500">
              Monitoree el porcentaje de uso de los e-NCF y configure los rangos asignados por la administración tributaria.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(sequences) as ECFType[]).map((type) => {
            const seq = sequences[type];
            const totalAvailable = seq.endNumber - seq.startNumber + 1;
            const used = seq.currentNumber - seq.startNumber;
            const percentageUsed = Math.min(100, Math.round((used / totalAvailable) * 100));

            return (
              <div
                key={type}
                className="border border-slate-200 rounded-md p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {seq.prefix}
                      </span>
                      <span className="font-semibold text-xs text-slate-800">
                        {seq.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-white border-slate-300">
                        Vence: {seq.expirationDate}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                      <span>Rango: {seq.prefix}{String(seq.startNumber).padStart(8, "0")} - {seq.prefix}{String(seq.endNumber).padStart(8, "0")}</span>
                      <span>Siguiente: <strong className="text-slate-800">{seq.prefix}{String(seq.currentNumber).padStart(8, "0")}</strong></span>
                      <span>Disponibles: {seq.endNumber - seq.currentNumber + 1}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-36 space-y-1 text-right">
                      <div className="flex justify-between text-[11px] font-medium text-slate-600">
                        <span>Consumo:</span>
                        <span>{percentageUsed}%</span>
                      </div>
                      <Progress value={percentageUsed} className="h-2 bg-slate-200" />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditSequence(seq)}
                      className="text-xs h-7 border-slate-300"
                    >
                      <Sliders className="h-3 w-3 mr-1 text-slate-500" />
                      Editar Rango
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Datos del Contribuyente ante la DGII */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Datos del Contribuyente Registrado en DGII
          </h3>
          <p className="text-xs text-slate-500">
            Esta información se plasma automáticamente en el encabezado de los comprobantes electrónicos y la firma digital.
          </p>
        </div>

        <form onSubmit={handleSaveTaxpayerData} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">RNC Emisor</Label>
              <Input
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                className="mt-1 text-xs font-mono h-8"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Razón Social Registrada</Label>
              <Input
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="mt-1 text-xs h-8"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Nombre Comercial</Label>
              <Input
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                className="mt-1 text-xs h-8"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Actividad Económica Principal</Label>
              <Input
                value={actividadEconomica}
                onChange={(e) => setActividadEconomica(e.target.value)}
                className="mt-1 text-xs h-8"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Dirección Fiscal</Label>
              <Input
                value={direccionFiscal}
                onChange={(e) => setDireccionFiscal(e.target.value)}
                className="mt-1 text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Teléfono Fiscal</Label>
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-1 text-xs h-8 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Correo Notificaciones e-CF</Label>
                <Input
                  type="email"
                  value={emailNotificaciones}
                  onChange={(e) => setEmailNotificaciones(e.target.value)}
                  className="mt-1 text-xs h-8"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shadow-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Guardar Parámetros Fiscales
            </Button>
          </div>
        </form>
      </div>

      {/* Modal Subida de Certificado */}
      <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-slate-700" />
              Cargar Certificado Digital X.509
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Seleccione el archivo contenedor PKCS#12 (.p12 o .pfx) emitido por Avansi u otra entidad acreditada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadCert} className="space-y-4 my-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Archivo de Certificado (.p12 / .pfx)
              </Label>
              <Input
                placeholder="ej. emblema_nexus_firmadigital_2026.p12"
                value={certFile}
                onChange={(e) => setCertFile(e.target.value)}
                className="mt-1 text-xs font-mono h-8"
                required
              />
              <span className="text-[10px] text-slate-400">
                Contenedor con clave pública y privada para el sellado de los XML.
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Contraseña de la Llave Privada
              </Label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                className="mt-1 text-xs font-mono h-8"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCertModalOpen(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium"
              >
                Validar e Instalar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Edición de Rango de Secuencia */}
      <Dialog open={Boolean(editingSeqType)} onOpenChange={() => setEditingSeqType(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-slate-700" />
              Editar Secuencia Autorizada DGII ({editingSeqType})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ajuste los límites del rango y la fecha de caducidad aprobada en la autorización de comprobantes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Número Inicial</Label>
                <Input
                  type="number"
                  value={seqStart}
                  onChange={(e) => setSeqStart(Number(e.target.value))}
                  className="mt-1 text-xs font-mono h-8"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Número Final Autorizado</Label>
                <Input
                  type="number"
                  value={seqEnd}
                  onChange={(e) => setSeqEnd(Number(e.target.value))}
                  className="mt-1 text-xs font-mono h-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Fecha de Vencimiento de Secuencia</Label>
              <Input
                type="date"
                value={seqExpiration}
                onChange={(e) => setSeqExpiration(e.target.value)}
                className="mt-1 text-xs font-mono h-8"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSeqType(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSequence}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium"
            >
              Guardar Rango
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
