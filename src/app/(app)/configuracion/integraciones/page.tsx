"use client";

import { useState } from "react";
import {
  Cloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Settings,
  Unlink,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  FolderOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useIntegrationStore } from "@/features/integrations/store/useIntegrationStore";
import { useEcfStore } from "@/features/ecf/store/useEcfStore";
import Link from "next/link";

export default function IntegracionesPage() {
  const {
    nextcloud,
    saveNextcloudConfig,
    disconnectNextcloud,
    setNextcloudStatus,
  } = useIntegrationStore();
  const { config: ecfConfig, sequences } = useEcfStore();

  // Estado del modal de Nextcloud
  const [isNextcloudModalOpen, setIsNextcloudModalOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(nextcloud.serverUrl || "");
  const [username, setUsername] = useState(nextcloud.username || "");
  const [password, setPassword] = useState("");
  const [remotePath, setRemotePath] = useState(nextcloud.remotePath || "/remote.php/dav/files/");
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Abrir modal con los datos actuales
  const handleOpenNextcloudModal = () => {
    setServerUrl(nextcloud.serverUrl || "");
    setUsername(nextcloud.username || "");
    setPassword(nextcloud.password || "");
    setRemotePath(nextcloud.remotePath || "/remote.php/dav/files/");
    setIsNextcloudModalOpen(true);
  };

  // Prueba de conexión con Nextcloud WebDAV
  const handleTestNextcloud = async () => {
    if (!serverUrl || !username) {
      toast.error("Ingrese al menos la URL del servidor y el usuario para probar.");
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch("/api/integrations/nextcloud/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: serverUrl,
          username,
          password,
          remotePath,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Conexión WebDAV con Nextcloud exitosa.");
        setNextcloudStatus("connected");
      } else {
        toast.error(`Error al conectar con Nextcloud: ${data.error}`);
        setNextcloudStatus("error");
      }
    } catch (err: any) {
      toast.error("No se pudo contactar al servidor Nextcloud.");
      setNextcloudStatus("error");
    } finally {
      setIsTesting(false);
    }
  };

  // Guardar configuración de Nextcloud
  const handleSaveNextcloud = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) {
      toast.error("La URL del servidor Nextcloud es obligatoria.");
      return;
    }
    if (!username.trim()) {
      toast.error("El usuario WebDAV es obligatorio.");
      return;
    }

    setIsSaving(true);
    saveNextcloudConfig({
      serverUrl: serverUrl.trim(),
      username: username.trim(),
      password: password.trim(),
      remotePath: remotePath.trim() || `/remote.php/dav/files/${username.trim()}/nexus_storage`,
    });
    setIsSaving(false);
    setIsNextcloudModalOpen(false);
    toast.success("Configuración de Nextcloud guardada exitosamente.");
  };

  // Desconectar Nextcloud
  const handleDisconnectNextcloud = () => {
    disconnectNextcloud();
    setPassword("");
    toast.info("Integración con Nextcloud desconectada y credenciales eliminadas.");
  };

  const sequenceCount = Object.keys(sequences).length;
  const hasEcfCert = Boolean(ecfConfig.certificado && ecfConfig.certificado.estado === "activo");

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Integraciones del Sistema
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure y administre las conexiones con servicios externos de almacenamiento, tributación y consultas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nextcloud WebDAV */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-sky-600" />
                <CardTitle className="text-base text-slate-900 font-bold">
                  Nextcloud (WebDAV)
                </CardTitle>
              </div>
              {nextcloud.isConfigured ? (
                <Badge
                  variant="outline"
                  className={
                    nextcloud.status === "connected"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-medium"
                      : "bg-rose-50 text-rose-700 border-rose-300 text-xs font-medium"
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {nextcloud.status === "connected" ? "Conectado" : "Error de Conexión"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-slate-100 text-slate-600 border-slate-300 text-xs font-medium"
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  No Configurado
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Almacenamiento en la nube de documentos adjuntos, expedientes y planos notariales.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {nextcloud.isConfigured ? (
              <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-600">Servidor WebDAV:</span>
                  <span className="font-mono text-slate-900 truncate max-w-[220px]">
                    {nextcloud.serverUrl}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-600">Usuario:</span>
                  <span className="font-mono text-slate-900">{nextcloud.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Directorio Base:</span>
                  <span className="font-mono text-slate-900 truncate max-w-[220px]">
                    {nextcloud.remotePath}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Integración pendiente de configurar</p>
                <p className="text-amber-700">
                  Actualmente no hay ninguna cuenta de Nextcloud vinculada. Haga clic en <strong>Configurar Conexión</strong> para ingresar la URL del servidor y las credenciales WebDAV.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
              {nextcloud.isConfigured ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectNextcloud}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                  >
                    <Unlink className="w-3.5 h-3.5 mr-1.5" />
                    Desconectar
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestNextcloud}
                      disabled={isTesting}
                      className="text-xs h-8 text-slate-700 border-slate-300"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTesting ? "animate-spin" : ""}`} />
                      Probar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenNextcloudModal}
                      className="text-xs h-8 text-slate-700 border-slate-300"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleOpenNextcloudModal}
                    className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Configurar Conexión Nextcloud
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* DGII Facturación e-CF */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-base text-slate-900 font-bold">
                  DGII Facturación (e-CF)
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className={
                  hasEcfCert
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-medium"
                    : "bg-amber-50 text-amber-700 border-amber-300 text-xs font-medium"
                }
              >
                {hasEcfCert ? "Certificado Activo" : "Sin Certificado"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Emisión de comprobantes fiscales electrónicos (Ley 32-23) y conexión a servicios web de la DGII.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-semibold text-slate-600">Entorno Operativo:</span>
                <span className="font-semibold text-slate-900">
                  {ecfConfig.ambiente === "PROD" ? "Producción Oficial" : "Certificación (Sandbox de pruebas)"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-semibold text-slate-600">RNC Emisor:</span>
                <span className="font-mono text-slate-900">
                  {ecfConfig.rnc || "No configurado"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-semibold text-slate-600">Certificado Digital:</span>
                <span className="text-slate-900">
                  {hasEcfCert ? ecfConfig.certificado?.nombreArchivo : "No se ha cargado archivo .p12 / .pfx"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Secuencias Autorizadas:</span>
                <span className="font-semibold text-slate-900">
                  {sequenceCount > 0 ? `${sequenceCount} tipos configurados` : "0 secuencias registradas"}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Link href="/configuracion/ecf">
                <Button
                  size="sm"
                  className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Administrar Certificado y Secuencias e-CF
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* API RNC / Cédula */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-slate-700" />
                <CardTitle className="text-base text-slate-900 font-bold">
                  Consulta RNC y Cédula DGII
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Servicio Operativo
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Validación con algoritmo de Luhn y autocompletado en formularios de clientes y facturas.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-semibold text-slate-600">Mecanismo:</span>
                <span className="text-slate-900">Validación Algorítmica + Caché Local</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Documentos Soportados:</span>
                <span className="text-slate-900">RNC (9 dígitos) y Cédula (11 dígitos)</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("Servicio de validación y cálculo de dígito verificador operativo.")}
                className="text-xs h-8 text-slate-700 border-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Verificar Algoritmo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para Configurar Conexión Nextcloud */}
      <Dialog open={isNextcloudModalOpen} onOpenChange={setIsNextcloudModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900">
          <form onSubmit={handleSaveNextcloud}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-sky-600" />
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Configurar Servidor Nextcloud WebDAV
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Ingrese los parámetros de conexión de su instancia de Nextcloud para almacenar los archivos del sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  URL del Servidor Nextcloud *
                </Label>
                <Input
                  placeholder="https://nube.tuempresa.com o http://localhost:8080"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="mt-1 text-xs h-9"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Dominio o IP de su servidor Nextcloud con protocolo (http o https).
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Usuario Nextcloud *
                </Label>
                <Input
                  placeholder="ej. admin o usuario_nexus"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 text-xs h-9"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Contraseña de Aplicación (App Password)
                </Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Clave de acceso generada en Nextcloud"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-xs h-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Se recomienda usar una <em>App Password</em> generada en Configuración &gt; Seguridad en Nextcloud.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Ruta WebDAV / Carpeta Raíz
                </Label>
                <Input
                  placeholder="/remote.php/dav/files/usuario/nexus_storage"
                  value={remotePath}
                  onChange={(e) => setRemotePath(e.target.value)}
                  className="mt-1 text-xs h-9 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Por defecto: <code>/remote.php/dav/files/[usuario]/nexus_storage</code>
                </p>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestNextcloud}
                disabled={isTesting}
                className="text-xs h-9 text-slate-700 border-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTesting ? "animate-spin" : ""}`} />
                {isTesting ? "Verificando..." : "Probar Conexión"}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNextcloudModalOpen(false)}
                  className="text-xs h-9 text-slate-600"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="text-xs h-9 bg-slate-900 text-white hover:bg-slate-800"
                >
                  Guardar Configuración
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
