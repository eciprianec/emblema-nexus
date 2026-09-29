"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
  Download,
  Trash2,
  ArrowUp,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Users,
  FileCode2,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useClientStore } from "@/features/clients/store/useClientStore";
import { useCaseStore } from "@/features/cases/store/useCaseStore";

interface ExplorerItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  lastmod: string;
  extension?: string;
  webUrl?: string;
}

interface CacheRecord {
  items: ExplorerItem[];
  currentPath: string;
  timestamp: number;
}

export function NextcloudFileExplorer() {
  const { clients } = useClientStore();
  const { cases } = useCaseStore();

  const [currentPath, setCurrentPath] = useState<string>("/nexus_storage");
  const [items, setItems] = useState<ExplorerItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modal nueva carpeta
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const clientCacheRef = useRef<Record<string, CacheRecord | undefined>>({});
  const inFlightRef = useRef<Record<string, Promise<any> | undefined>>({});

  // Cargar lista de archivos de Nextcloud con soporte de renderizado instantáneo (0ms) y SWR
  const fetchDirectory = async (
    targetPath: string,
    options?: { forceRefresh?: boolean; isBackground?: boolean }
  ) => {
    const forceRefresh = options?.forceRefresh ?? false;
    const isBackground = options?.isBackground ?? false;
    const cached = clientCacheRef.current[targetPath];
    const now = Date.now();

    // 1. Si está en caché local y no es refresh forzado:
    if (cached && !forceRefresh) {
      if (!isBackground) {
        setItems(cached.items);
        setCurrentPath(cached.currentPath);
        setIsLoading(false);
      }

      // Si la caché tiene menos de 20 segundos, no se requiere llamada a red
      if (now - cached.timestamp < 20 * 1000) {
        return;
      }
      // Si la caché tiene más de 20s, revalidamos silenciosamente en segundo plano
    } else if (!isBackground) {
      setIsLoading(true);
    }

    if (cached && !isBackground) {
      setIsRevalidating(true);
    }

    // 2. Evitar solicitudes duplicadas simultáneas
    if (inFlightRef.current[targetPath] && !forceRefresh) {
      try {
        const data = await inFlightRef.current[targetPath];
        if (data?.success && !isBackground) {
          setItems(data.items || []);
          setCurrentPath(data.currentPath || targetPath);
        }
      } finally {
        if (!isBackground) {
          setIsLoading(false);
          setIsRevalidating(false);
        }
      }
      return;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch("/api/integrations/nextcloud/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list", path: targetPath, refresh: forceRefresh }),
        });
        const data = await res.json();
        if (data.success) {
          clientCacheRef.current[targetPath] = {
            items: data.items || [],
            currentPath: data.currentPath || targetPath,
            timestamp: Date.now(),
          };
          if (!isBackground) {
            setItems(data.items || []);
            setCurrentPath(data.currentPath || targetPath);
          }
        } else if (!isBackground) {
          toast.error(`Error al explorar: ${data.error}`);
        }
        return data;
      } catch {
        if (!isBackground) {
          toast.error("Error al conectar con el servidor Nextcloud.");
        }
      } finally {
        delete inFlightRef.current[targetPath];
        if (!isBackground) {
          setIsLoading(false);
          setIsRevalidating(false);
        }
      }
    })();

    inFlightRef.current[targetPath] = fetchPromise;
    await fetchPromise;
  };

  // Pre-cargar anticipadamente en segundo plano al pasar el ratón (hover)
  const prefetchFolder = (folderPath: string) => {
    if (!folderPath) return;
    const cached = clientCacheRef.current[folderPath];
    if (cached && Date.now() - cached.timestamp < 30 * 1000) return;
    if (inFlightRef.current[folderPath]) return;

    fetchDirectory(folderPath, { isBackground: true });
  };

  useEffect(() => {
    fetchDirectory(currentPath);
  }, []);

  // Navegar a carpeta
  const handleOpenFolder = (folderPath: string) => {
    setSearchQuery("");
    fetchDirectory(folderPath);
  };

  // Subir un nivel
  const handleGoUp = () => {
    if (currentPath === "/nexus_storage" || currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const parentPath = "/" + parts.join("/");
    fetchDirectory(parentPath || "/nexus_storage");
  };

  // Crear nueva carpeta
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error("Ingrese el nombre de la carpeta.");
      return;
    }

    try {
      const res = await fetch("/api/integrations/nextcloud/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          path: currentPath,
          folderName: newFolderName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Carpeta "${newFolderName}" creada.`);
        setIsNewFolderOpen(false);
        setNewFolderName("");
        delete clientCacheRef.current[currentPath];
        fetchDirectory(currentPath, { forceRefresh: true });
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch {
      toast.error("Error al crear carpeta.");
    }
  };

  // Subida de archivo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(`Subiendo "${file.name}" a Nextcloud...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);

      const res = await fetch("/api/integrations/nextcloud/files", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Archivo "${file.name}" subido a Nextcloud.`, { id: toastId });
        delete clientCacheRef.current[currentPath];
        fetchDirectory(currentPath, { forceRefresh: true });
      } else {
        toast.error(`Error al subir: ${data.error}`, { id: toastId });
      }
    } catch {
      toast.error("Error de conexión al subir archivo.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Eliminar elemento con actualización optimista
  const handleDeleteItem = async (itemPath: string, itemName: string) => {
    if (!window.confirm(`¿Desea eliminar "${itemName}" de Nextcloud?`)) return;

    const previousItems = [...items];
    setItems((prev) => prev.filter((i) => i.path !== itemPath));
    delete clientCacheRef.current[currentPath];

    try {
      const res = await fetch("/api/integrations/nextcloud/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", path: itemPath }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${itemName}" eliminado de Nextcloud.`);
        fetchDirectory(currentPath, { forceRefresh: true });
      } else {
        setItems(previousItems);
        toast.error(`Error al eliminar: ${data.error}`);
      }
    } catch {
      setItems(previousItems);
      toast.error("Error de red al intentar eliminar.");
    }
  };

  // Sincronizar todos los clientes y casos
  const handleSyncAll = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Sincronizando todas las carpetas en Nextcloud...");

    try {
      const res = await fetch("/api/integrations/nextcloud/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_all",
          clients,
          cases,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
        clientCacheRef.current = {};
        fetchDirectory(currentPath, { forceRefresh: true });
      } else {
        toast.error(`Error en sincronización: ${data.error}`, { id: toastId });
      }
    } catch {
      toast.error("Error al sincronizar con Nextcloud.", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Formato de tamaño
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Ícono de archivo
  const getFileIcon = (item: ExplorerItem) => {
    if (item.type === "directory") {
      return <Folder className="w-5 h-5 text-amber-500 shrink-0 fill-amber-500/20" />;
    }
    const ext = item.extension?.toLowerCase();
    if (ext === "pdf") {
      return <FileText className="w-5 h-5 text-rose-600 shrink-0" />;
    }
    if (ext === "docx" || ext === "doc") {
      return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      return <FileImage className="w-5 h-5 text-purple-600 shrink-0" />;
    }
    return <File className="w-5 h-5 text-slate-500 shrink-0" />;
  };

  // Filtrado de búsqueda
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  // Breadcrumbs
  const breadcrumbSegments = useMemo(() => {
    const clean = currentPath.replace(/^\/+|\/+$/g, "");
    if (!clean) return [];
    const parts = clean.split("/");
    return parts.map((part, index) => ({
      name: part,
      path: "/" + parts.slice(0, index + 1).join("/"),
    }));
  }, [currentPath]);

  const nextcloudWebUrl = `https://nextcloud.ciberemblema.com/index.php/apps/files/?dir=${encodeURIComponent(
    currentPath
  )}`;

  return (
    <div className="space-y-4">
      {/* Accesos Rápidos Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onMouseEnter={() => prefetchFolder("/nexus_storage/Expedientes")}
          onClick={() => handleOpenFolder("/nexus_storage/Expedientes")}
          className={`p-3.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
            currentPath.startsWith("/nexus_storage/Expedientes")
              ? "bg-sky-50/70 border-sky-300 text-sky-900 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-md text-sky-700">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Expedientes</h4>
              <p className="text-[11px] text-slate-500">Planos, actos, oficios</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onMouseEnter={() => prefetchFolder("/nexus_storage/Clientes")}
          onClick={() => handleOpenFolder("/nexus_storage/Clientes")}
          className={`p-3.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
            currentPath.startsWith("/nexus_storage/Clientes")
              ? "bg-purple-50/70 border-purple-300 text-purple-900 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-md text-purple-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Clientes</h4>
              <p className="text-[11px] text-slate-500">Identidad, contratos, e-CF</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onMouseEnter={() => prefetchFolder("/nexus_storage/Plantillas")}
          onClick={() => handleOpenFolder("/nexus_storage/Plantillas")}
          className={`p-3.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
            currentPath.startsWith("/nexus_storage/Plantillas")
              ? "bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-md text-emerald-700">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Plantillas DOCX</h4>
              <p className="text-[11px] text-slate-500">Modelos legales notariales</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Contenedor Principal del Explorador */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* Barra Superior de Herramientas y Ruta */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Breadcrumbs de Navegación */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
            {(() => {
              const parts = currentPath.split("/").filter(Boolean);
              parts.pop();
              const parentPath = "/" + parts.join("/");
              return (
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPath === "/nexus_storage" || currentPath === "/"}
                  onMouseEnter={() => parentPath && prefetchFolder(parentPath)}
                  onClick={handleGoUp}
                  className="h-8 w-8 shrink-0 bg-white"
                  title="Subir un nivel"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              );
            })()}

            <button
              onMouseEnter={() => prefetchFolder("/nexus_storage")}
              onClick={() => handleOpenFolder("/nexus_storage")}
              className={`font-semibold px-2 py-1 rounded hover:bg-slate-200 transition-colors shrink-0 ${
                currentPath === "/nexus_storage"
                  ? "text-slate-900 bg-white shadow-2xs font-bold"
                  : "text-slate-600"
              }`}
            >
              nexus_storage
            </button>

            {breadcrumbSegments.slice(1).map((seg, idx) => (
              <React.Fragment key={seg.path}>
                <span className="text-slate-400 shrink-0">/</span>
                <button
                  onMouseEnter={() => prefetchFolder(seg.path)}
                  onClick={() => handleOpenFolder(seg.path)}
                  className={`font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors shrink-0 truncate max-w-[160px] ${
                    idx === breadcrumbSegments.length - 2
                      ? "text-slate-900 bg-white shadow-2xs font-bold"
                      : "text-slate-600"
                  }`}
                  title={seg.name}
                >
                  {seg.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Acciones del Explorador */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {isUploading ? "Subiendo..." : "Subir Archivo"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewFolderOpen(true)}
              className="h-8 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-100"
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Nueva Carpeta
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="h-8 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-100"
              title="Aprovisiona automáticamente las carpetas de todos los clientes y expedientes registrados"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin text-sky-600" : ""}`} />
              Sincronizar Todo
            </Button>

            <a
              href={nextcloudWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 h-8 px-2.5"
              title="Abrir este directorio en Nextcloud Web"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Abrir en Nextcloud
            </a>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchDirectory(currentPath, { forceRefresh: true })}
              disabled={isLoading || isRevalidating}
              className="h-8 w-8 text-slate-600"
              title="Recargar archivos desde Nextcloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isRevalidating ? "animate-spin text-sky-600" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Buscador dentro del directorio */}
        <div className="p-3 border-b border-slate-100 bg-white flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <Input
            placeholder="Filtrar archivos o carpetas en este directorio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs border-0 shadow-none focus-visible:ring-0 px-0"
          />
          {searchQuery && (
            <Badge variant="outline" className="text-[10px] text-slate-500 shrink-0">
              {filteredItems.length} resultado(s)
            </Badge>
          )}
        </div>

        {/* Lista de Carpetas y Archivos */}
        <div className="divide-y divide-slate-100 min-h-[350px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-xs">Cargando directorio de Nextcloud WebDAV...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3 text-center px-4">
              <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  {searchQuery ? "Sin coincidencias" : "Este directorio está vacío"}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
                  {searchQuery
                    ? `No se encontró ningún elemento con "${searchQuery}".`
                    : "No hay archivos ni subcarpetas aquí. Puedes subir un archivo con el botón superior o pulsar 'Sincronizar Todo'."}
                </p>
              </div>
              {!searchQuery && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Subir Primer Archivo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncAll}
                    className="h-8 text-xs border-slate-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Sincronizar Carpetas del ERP
                  </Button>
                </div>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isDir = item.type === "directory";

              return (
                <div
                  key={item.path}
                  onMouseEnter={() => isDir && prefetchFolder(item.path)}
                  onClick={() => isDir && handleOpenFolder(item.path)}
                  className={`p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group ${
                    isDir ? "cursor-pointer" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getFileIcon(item)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate group-hover:text-sky-700 transition-colors">
                          {item.name}
                        </span>
                        {isDir && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 bg-slate-50 text-slate-600 border-slate-200"
                          >
                            Carpeta
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatSize(item.size)}</span>
                        {item.lastmod && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-300" />
                            {new Date(item.lastmod).toLocaleString("es-DO", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones por elemento */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isDir ? (
                      <a
                        href={`/api/integrations/nextcloud/files?path=${encodeURIComponent(
                          item.path
                        )}&download=true`}
                        className="inline-flex items-center justify-center h-7 px-2.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 bg-white"
                        title="Descargar archivo"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Descargar
                      </a>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFolder(item.path)}
                        className="h-7 text-xs text-sky-700 hover:bg-sky-50"
                      >
                        Abrir
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.path, item.name)}
                      className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Eliminar elemento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Barra de Estado Inferior */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-[11px] truncate max-w-md">
              {currentPath}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isRevalidating && (
              <span className="text-[10px] text-sky-600 flex items-center gap-1 font-medium animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando...
              </span>
            )}
            <span>
              {filteredItems.filter((i) => i.type === "directory").length} carpetas,{" "}
              {filteredItems.filter((i) => i.type === "file").length} archivos
            </span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
              Nextcloud Conectado
            </Badge>
          </div>
        </div>
      </div>

      {/* Modal Crear Carpeta */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Crear Nueva Carpeta en Nextcloud
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Se creará dentro de <span className="font-mono text-slate-700">{currentPath}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFolder} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Nombre de la Carpeta *
              </label>
              <Input
                placeholder="Ej. Anexos_Tribunal_Tierras, Contratos_Adicionales..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewFolderOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Crear Carpeta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
