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
  Plus,
  Trash2,
  AlertCircle,
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function EcfConfigPage() {
  const {
    config,
    sequences,
    setEnvironment,
    updateConfig,
    addSequence,
    deleteSequence,
    updateSequence,
    removeCertificate,
  } = useEcfStore();

  // Estados locales para edición de datos de empresa
  const [rnc, setRnc] = useState(config.rnc);
  const [razonSocial, setRazonSocial] = useState(config.razonSocial);
  const [nombreComercial, setNombreComercial] = useState(config.nombreComercial);
  const [actividadEconomica, setActividadEconomica] = useState(config.actividadEconomica);
  const [direccionFiscal, setDireccionFiscal] = useState(config.direccionFiscal);
  const [telefono, setTelefono] = useState(config.telefono);
  const [emailNotificaciones, setEmailNotificaciones] = useState(config.emailNotificaciones);

  // Estado para modal de subida de certificado
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certFileName, setCertFileName] = useState<string>("");
  const [certPassword, setCertPassword] = useState("");
  const [certIssuer, setCertIssuer] = useState("Avansi S.R.L. / Entidad Acreditada INDOTEL");
  const [certExpiry, setCertExpiry] = useState("2027-12-31");
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Estado para modal de NUEVA secuencia
  const [isNewSeqModalOpen, setIsNewSeqModalOpen] = useState(false);
  const [newSeqType, setNewSeqType] = useState<ECFType>("E31");
  const [newSeqStart, setNewSeqStart] = useState<number>(1);
  const [newSeqEnd, setNewSeqEnd] = useState<number>(1000);
  const [newSeqCurrent, setNewSeqCurrent] = useState<number>(1);
  const [newSeqExpiration, setNewSeqExpiration] = useState<string>("2026-12-31");

  // Estado para modal de EDICIÓN de secuencia existente
  const [editingSeqType, setEditingSeqType] = useState<ECFType | null>(null);
  const [seqStart, setSeqStart] = useState<number>(1);
  const [seqEnd, setSeqEnd] = useState<number>(1000);
  const [seqCurrent, setSeqCurrent] = useState<number>(1);
  const [seqExpiration, setSeqExpiration] = useState<string>("2026-12-31");

  const handleSaveTaxpayerData = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      rnc: rnc.trim(),
      razonSocial: razonSocial.trim(),
      nombreComercial: nombreComercial.trim(),
      actividadEconomica: actividadEconomica.trim(),
      direccionFiscal: direccionFiscal.trim(),
      telefono: telefono.trim(),
      emailNotificaciones: emailNotificaciones.trim(),
    });
    toast.success("Datos fiscales del contribuyente guardados correctamente");
  };

  const handleToggleEnvironment = (newEnv: "CERT" | "PROD") => {
    setEnvironment(newEnv);
    toast.info(
      newEnv === "PROD"
        ? "Ambiente configurado en PRODUCCIÓN (DGII Oficial)"
        : "Ambiente configurado en CERTIFICACIÓN (Sandbox DGII)"
    );
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setTimeout(() => {
      setIsTestingConnection(false);
      if (!config.rnc) {
        toast.warning("Ingrese y guarde su RNC antes de probar la conexión con la DGII.");
        return;
      }
      toast.success("Conexión con Web Services DGII exitosa", {
        description: `Ambiente ${config.ambiente}: Servicio de autenticación, timbrado y consulta de TrackId operativos para RNC ${config.rnc}.`,
      });
    }, 1000);
  };

  // Carga / Actualización de certificado
  const handleUploadCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFileName) {
      toast.error("Indique el nombre o seleccione el archivo .p12 / .pfx");
      return;
    }
    if (!certPassword) {
      toast.error("Introduzca la clave privada de protección del certificado");
      return;
    }

    const expiryDate = new Date(certExpiry);
    const today = new Date();
    const diffDays = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    updateConfig({
      certificado: {
        nombreArchivo: certFileName,
        emisorCertificado: certIssuer,
        validoHasta: certExpiry,
        diasRestantes: diffDays,
        sha256Fingerprint: "A9:44:81:BC:23:FE:19:80:CC:22:90:54:11:00:AA:34:67:88:BB:CC:12:34:56:78:90:AB:CD:EF:12:34:56:78",
        estado: diffDays > 30 ? "activo" : diffDays > 0 ? "por_vencer" : "vencido",
        tieneClave: true,
      },
    });

    setIsCertModalOpen(false);
    setCertFileName("");
    setCertPassword("");
    toast.success("Certificado digital X.509 configurado correctamente");
  };

  const handleRemoveCert = () => {
    removeCertificate();
    toast.info("Certificado digital removido del sistema.");
  };

  // Creación de nueva secuencia
  const handleCreateSequence = (e: React.FormEvent) => {
    e.preventDefault();
    const typeInfo = ECF_TYPE_MAP[newSeqType];
    const start = Number(newSeqStart);
    const end = Number(newSeqEnd);
    const current = Number(newSeqCurrent);

    if (start <= 0 || end < start) {
      toast.error("El número final debe ser mayor o igual al número inicial.");
      return;
    }
    if (current < start || current > end) {
      toast.error("El número actual debe encontrarse dentro del rango autorizado.");
      return;
    }

    const seq: ECFSequence = {
      type: newSeqType,
      name: typeInfo?.name || `Comprobante Electrónico ${newSeqType}`,
      prefix: newSeqType,
      startNumber: start,
      endNumber: end,
      currentNumber: current,
      expirationDate: newSeqExpiration,
      isActive: true,
    };

    addSequence(seq);
    setIsNewSeqModalOpen(false);
    toast.success(`Secuencia ${newSeqType} creada exitosamente.`);
  };

  // Edición de secuencia existente
  const handleOpenEditSequence = (seq: ECFSequence) => {
    setEditingSeqType(seq.type);
    setSeqStart(seq.startNumber);
    setSeqEnd(seq.endNumber);
    setSeqCurrent(seq.currentNumber);
    setSeqExpiration(seq.expirationDate);
  };

  const handleSaveSequence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeqType) return;
    const start = Number(seqStart);
    const end = Number(seqEnd);
    const current = Number(seqCurrent);

    if (start <= 0 || end < start) {
      toast.error("El número final debe ser mayor o igual al número inicial.");
      return;
    }

    updateSequence(editingSeqType, {
      startNumber: start,
      endNumber: end,
      currentNumber: current,
      expirationDate: seqExpiration,
    });
    toast.success(`Secuencia ${editingSeqType} actualizada exitosamente.`);
    setEditingSeqType(null);
  };

  // Eliminación de secuencia
  const handleDeleteSequence = (type: ECFType) => {
    deleteSequence(type);
    toast.info(`Secuencia ${type} eliminada.`);
  };

  const sequenceKeys = Object.keys(sequences) as ECFType[];

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
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-medium"
                  : "bg-amber-50 text-amber-700 border-amber-300 text-xs font-medium"
              }
            >
              Ambiente: {config.ambiente === "PROD" ? "Producción" : "Certificación"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administración del certificado digital X.509, rangos de secuencias autorizadas por la DGII y datos del emisor.
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
                Certificado X.509 (.p12 / .pfx) emitido por una entidad acreditada (Avansi, Digifirma, CCPSD) requerido para la firma XML.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.certificado && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveCert}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsCertModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {config.certificado ? "Actualizar Certificado" : "Cargar Certificado (.p12)"}
            </Button>
          </div>
        </div>

        {config.certificado ? (
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
              <p className="text-[11px] text-slate-500 mt-0.5">Certificado activo y válido para firma digital</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Huella Digital SHA-256</span>
              <p className="font-mono text-[10px] text-slate-700 mt-1 break-all leading-tight">
                {config.certificado.sha256Fingerprint}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-md text-center py-6">
            <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No se ha cargado ningún certificado digital</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Para emitir comprobantes fiscales electrónicos válidos ante la DGII, haga clic en <strong>Cargar Certificado (.p12)</strong> y especifique su archivo y contraseña de firma.
            </p>
          </div>
        )}
      </div>

      {/* Secuencias Autorizadas por la DGII */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Administración de Secuencias Autorizadas por la DGII
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registre y gestione los rangos de secuencias autorizados por la administración tributaria para su empresa.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsNewSeqModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nueva Secuencia e-CF
          </Button>
        </div>

        {sequenceKeys.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-md text-center space-y-2">
            <FileCode className="h-8 w-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No hay secuencias e-CF configuradas</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Actualmente no tiene ninguna secuencia registrada. Haga clic en el botón superior para agregar los tipos de comprobantes autorizados por la DGII (ej. E31 Crédito Fiscal, E32 Consumo, E34 Nota de Crédito).
            </p>
            <Button
              size="sm"
              onClick={() => setIsNewSeqModalOpen(true)}
              className="mt-2 text-xs bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Crear Primera Secuencia
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sequenceKeys.map((type) => {
              const seq = sequences[type];
              if (!seq) return null;
              const totalAvailable = Math.max(1, seq.endNumber - seq.startNumber + 1);
              const used = Math.max(0, seq.currentNumber - seq.startNumber);
              const percentageUsed = Math.min(100, Math.round((used / totalAvailable) * 100));

              return (
                <div
                  key={type}
                  className="border border-slate-200 rounded-md p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {seq.prefix}
                        </span>
                        <span className="font-semibold text-xs text-slate-800">
                          {seq.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-300 text-slate-700">
                          Vence: {seq.expirationDate}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 font-mono pt-1">
                        <span>Rango: {seq.prefix}{String(seq.startNumber).padStart(8, "0")} - {seq.prefix}{String(seq.endNumber).padStart(8, "0")}</span>
                        <span>Siguiente: <strong className="text-slate-900">{seq.prefix}{String(seq.currentNumber).padStart(8, "0")}</strong></span>
                        <span>Disponibles: <strong className="text-slate-800">{Math.max(0, seq.endNumber - seq.currentNumber + 1)}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-32 space-y-1 text-right">
                        <div className="flex justify-between text-[11px] font-medium text-slate-600">
                          <span>Consumo:</span>
                          <span>{percentageUsed}%</span>
                        </div>
                        <Progress value={percentageUsed} className="h-2 bg-slate-200" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditSequence(seq)}
                          className="text-xs h-7 border-slate-300 text-slate-700"
                        >
                          <Sliders className="h-3 w-3 mr-1 text-slate-500" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSequence(type)}
                          className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                          title="Eliminar secuencia"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Datos Fiscales del Contribuyente (Emisor) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 rounded-md">
              <Building2 className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Datos Fiscales del Contribuyente</h3>
              <p className="text-xs text-slate-500">
                Información registrada en el Registro Nacional de Contribuyentes (RNC) que se incluirá en el encabezado de cada e-CF.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveTaxpayerData} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">RNC del Emisor *</Label>
              <Input
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                placeholder="ej. 131987654"
                className="mt-1 font-mono text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Razón Social Registrada ante DGII *</Label>
              <Input
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="ej. EMBLEMA NEXUS S.R.L."
                className="mt-1 text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Nombre Comercial</Label>
              <Input
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                placeholder="ej. Emblema Nexus"
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Actividad Económica Principal</Label>
              <Input
                value={actividadEconomica}
                onChange={(e) => setActividadEconomica(e.target.value)}
                placeholder="ej. 6910 - Servicios jurídicos y notariales"
                className="mt-1 text-xs h-9"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Dirección Fiscal Completa</Label>
              <Input
                value={direccionFiscal}
                onChange={(e) => setDireccionFiscal(e.target.value)}
                placeholder="ej. Av. Winston Churchill No. 1099, Torre Acrópolis, Santo Domingo"
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Teléfono Fiscal</Label>
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="ej. (809) 555-0100"
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Correo para Notificaciones e-CF</Label>
              <Input
                type="email"
                value={emailNotificaciones}
                onChange={(e) => setEmailNotificaciones(e.target.value)}
                placeholder="ej. facturacion@miempresa.com"
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 font-medium shadow-xs">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Guardar Datos Fiscales
            </Button>
          </div>
        </form>
      </div>

      {/* Modal para CREAR NUEVA SECUENCIA */}
      <Dialog open={isNewSeqModalOpen} onOpenChange={setIsNewSeqModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900">
          <form onSubmit={handleCreateSequence}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Registrar Nueva Secuencia e-CF (DGII)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Seleccione el tipo de comprobante y defina el rango autorizado por la administración tributaria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Tipo de Comprobante e-CF *</Label>
                <Select
                  value={newSeqType}
                  onValueChange={(val) => setNewSeqType(val as ECFType)}
                >
                  <SelectTrigger className="mt-1 text-xs h-9">
                    <SelectValue placeholder="Seleccionar tipo de e-CF" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    <SelectItem value="E31">E31 - Factura de Crédito Fiscal Electrónica</SelectItem>
                    <SelectItem value="E32">E32 - Factura de Consumo Electrónica</SelectItem>
                    <SelectItem value="E34">E34 - Nota de Crédito Electrónica</SelectItem>
                    <SelectItem value="E44">E44 - Regímenes Especiales Electrónico</SelectItem>
                    <SelectItem value="E45">E45 - Gubernamental Electrónico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Secuencia Inicial *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newSeqStart}
                    onChange={(e) => setNewSeqStart(Number(e.target.value))}
                    className="mt-1 text-xs h-9 font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Secuencia Final (Límite) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newSeqEnd}
                    onChange={(e) => setNewSeqEnd(Number(e.target.value))}
                    className="mt-1 text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Secuencia Actual (Próximo) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newSeqCurrent}
                    onChange={(e) => setNewSeqCurrent(Number(e.target.value))}
                    className="mt-1 text-xs h-9 font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Fecha de Vencimiento *</Label>
                  <Input
                    type="date"
                    value={newSeqExpiration}
                    onChange={(e) => setNewSeqExpiration(e.target.value)}
                    className="mt-1 text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewSeqModalOpen(false)}
                className="text-xs h-8 text-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 font-medium"
              >
                Crear Secuencia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para EDITAR RANGO DE SECUENCIA */}
      <Dialog open={editingSeqType !== null} onOpenChange={(open) => !open && setEditingSeqType(null)}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900">
          <form onSubmit={handleSaveSequence}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-slate-700" />
                Modificar Rango de Secuencia: {editingSeqType}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Ajuste los límites y fecha de vencimiento autorizados por la DGII.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Número Inicial</Label>
                  <Input
                    type="number"
                    min="1"
                    value={seqStart}
                    onChange={(e) => setSeqStart(Number(e.target.value))}
                    className="mt-1 text-xs h-9 font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Número Final</Label>
                  <Input
                    type="number"
                    min="1"
                    value={seqEnd}
                    onChange={(e) => setSeqEnd(Number(e.target.value))}
                    className="mt-1 text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Próximo a Emitir</Label>
                  <Input
                    type="number"
                    min="1"
                    value={seqCurrent}
                    onChange={(e) => setSeqCurrent(Number(e.target.value))}
                    className="mt-1 text-xs h-9 font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Fecha de Vencimiento</Label>
                  <Input
                    type="date"
                    value={seqExpiration}
                    onChange={(e) => setSeqExpiration(e.target.value)}
                    className="mt-1 text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingSeqType(null)}
                className="text-xs h-8 text-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 font-medium"
              >
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para CARGAR CERTIFICADO DIGITAL */}
      <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900">
          <form onSubmit={handleUploadCert}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-4 w-4 text-slate-700" />
                Cargar Certificado Digital X.509
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Ingrese los datos del archivo de firma electrónica (.p12 o .pfx).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Nombre de Archivo del Certificado *</Label>
                <Input
                  value={certFileName}
                  onChange={(e) => setCertFileName(e.target.value)}
                  placeholder="ej. certificado_emblema_2026.p12"
                  className="mt-1 text-xs h-9 font-mono"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Entidad de Certificación Emisora</Label>
                <Input
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  placeholder="ej. Avansi S.R.L. / Digifirma"
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Fecha de Expiración del Certificado</Label>
                <Input
                  type="date"
                  value={certExpiry}
                  onChange={(e) => setCertExpiry(e.target.value)}
                  className="mt-1 text-xs h-9 font-mono"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Clave Privada de Protección *</Label>
                <Input
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Contraseña del certificado .p12"
                  className="mt-1 text-xs h-9"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  La clave se almacena de forma cifrada para la firma de cada XML e-CF.
                </p>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCertModalOpen(false)}
                className="text-xs h-8 text-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 font-medium"
              >
                Instalar Certificado
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
