import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'webdav';
import https from 'https';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,
  maxFreeSockets: 10,
  timeout: 60000,
});

// Cache en memoria para navegación ultra-rápida (TTL 30s)
interface CacheEntry {
  data: any;
  timestamp: number;
}
const directoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000;

function invalidateDirectoryCache(pathPrefix?: string) {
  if (!pathPrefix) {
    directoryCache.clear();
    return;
  }
  const clean = pathPrefix.replace(/\/+$/, '');
  for (const key of Array.from(directoryCache.keys())) {
    if (key === clean || key.startsWith(`${clean}/`) || clean.startsWith(key)) {
      directoryCache.delete(key);
    }
  }
}

function getWebdavClient(override?: { serverUrl?: string; username?: string; password?: string }) {
  let baseUrl = (override?.serverUrl || process.env.NEXTCLOUD_URL || 'https://nextcloud.ciberemblema.com').trim();
  const username = (override?.username || process.env.NEXTCLOUD_USER || 'admin').trim();
  const password = (override?.password || process.env.NEXTCLOUD_APP_PASSWORD || 'K1mK9nZmYeb9j9oMbZmv').trim();

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');

  const davUrl = `${baseUrl}/remote.php/dav/files/${username}/`;
  return {
    client: createClient(davUrl, {
      username,
      password,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      httpsAgent,
    }),
    baseUrl,
    username,
  };
}

async function ensureDirectory(client: any, path: string): Promise<void> {
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  if (!cleanPath) return;

  const segments = cleanPath.split('/');
  let current = '';

  for (const segment of segments) {
    current += `/${segment}`;
    try {
      const exists = await client.exists(current);
      if (!exists) {
        await client.createDirectory(current);
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      if (status !== 405 && status !== 409) {
        console.warn(`[ensureDirectory] ${current}:`, err?.message);
      }
    }
  }
}

// GET: Descargar archivo o previsualizar
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    const isDownload = searchParams.get('download') === 'true';

    if (!filePath) {
      return NextResponse.json({ error: 'Ruta de archivo no especificada' }, { status: 400 });
    }

    const { client } = getWebdavClient();
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

    const exists = await client.exists(cleanPath);
    if (!exists) {
      return NextResponse.json({ error: 'Archivo no encontrado en Nextcloud' }, { status: 404 });
    }

    const buffer = (await client.getFileContents(cleanPath, { format: 'binary' })) as Buffer;
    const filename = cleanPath.split('/').pop() || 'archivo';
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      txt: 'text/plain',
      csv: 'text/csv',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(filename)}"`
    );

    return new NextResponse(new Uint8Array(buffer), { headers, status: 200 });
  } catch (err: any) {
    console.error('[Nextcloud File Download Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Error al descargar archivo desde Nextcloud' },
      { status: 500 }
    );
  }
}

// POST: Listar, Subir, Crear Carpeta, Eliminar y Sincronizar
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Manejo de subida de archivos multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const targetPath = (formData.get('path') as string) || '/nexus_storage';

      if (!file) {
        return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
      }

      const { client } = getWebdavClient();
      await ensureDirectory(client, targetPath);

      const buffer = Buffer.from(await file.arrayBuffer());
      const cleanTarget = targetPath.replace(/\/$/, '');
      const filePath = `${cleanTarget}/${file.name}`;

      await client.putFileContents(filePath, buffer);
      invalidateDirectoryCache(cleanTarget);

      return NextResponse.json({
        success: true,
        message: `Archivo "${file.name}" subido exitosamente a Nextcloud.`,
        path: filePath,
        filename: file.name,
        size: file.size,
      });
    }

    const body = await req.json();
    const { action } = body;
    const { client, baseUrl } = getWebdavClient();

    // 1. Listar contenido de un directorio con caché y sin llamadas redundantes
    if (action === 'list') {
      const targetPath = (body.path || '/nexus_storage').trim();
      const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      const forceRefresh = Boolean(body.refresh);

      // Responder desde caché si es válido y no se forzó refresco
      if (!forceRefresh) {
        const cached = directoryCache.get(cleanPath);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return NextResponse.json({
            ...cached.data,
            cached: true,
          });
        }
      }

      try {
        let rawItems: any[];
        try {
          rawItems = (await client.getDirectoryContents(cleanPath)) as any[];
        } catch (initialErr: any) {
          const status = initialErr?.status || initialErr?.response?.status;
          // Si el directorio no existe aún (404), asegurar la ruta y reintentar
          if (status === 404 || initialErr?.message?.includes('404')) {
            await ensureDirectory(client, cleanPath);
            try {
              rawItems = (await client.getDirectoryContents(cleanPath)) as any[];
            } catch {
              rawItems = [];
            }
          } else {
            throw initialErr;
          }
        }

        const items = rawItems.map((item) => {
          const isDir = item.type === 'directory';
          const name = item.basename || item.filename.split('/').filter(Boolean).pop() || '';
          const ext = !isDir && name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;

          return {
            name,
            path: item.filename,
            type: isDir ? 'directory' : 'file',
            size: item.size || 0,
            lastmod: item.lastmod || new Date().toISOString(),
            etag: item.etag,
            extension: ext,
            webUrl: `${baseUrl}/index.php/apps/files/?dir=${encodeURIComponent(item.filename)}`,
          };
        });

        // Ordenar: carpetas primero, luego archivos alfabéticamente
        items.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'directory' ? -1 : 1;
        });

        const responsePayload = {
          success: true,
          currentPath: cleanPath,
          webUrl: `${baseUrl}/index.php/apps/files/?dir=${encodeURIComponent(cleanPath)}`,
          items,
          cached: false,
        };

        directoryCache.set(cleanPath, {
          data: responsePayload,
          timestamp: Date.now(),
        });

        return NextResponse.json(responsePayload);
      } catch (listErr: any) {
        return NextResponse.json({
          success: false,
          error: listErr?.message || 'Error al listar directorio en Nextcloud.',
          items: [],
        });
      }
    }

    // 2. Crear nueva carpeta
    if (action === 'create_folder') {
      const { path, folderName } = body;
      if (!folderName) {
        return NextResponse.json({ error: 'Nombre de carpeta requerido' }, { status: 400 });
      }

      const cleanBase = (path || '/nexus_storage').replace(/\/$/, '');
      const sanitizedName = folderName.trim().replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_').replace(/\s+/g, '_');
      const newFolderPath = `${cleanBase}/${sanitizedName}`;

      await ensureDirectory(client, newFolderPath);
      invalidateDirectoryCache(cleanBase);

      return NextResponse.json({
        success: true,
        message: `Carpeta "${sanitizedName}" creada exitosamente.`,
        folderPath: newFolderPath,
      });
    }

    // 3. Eliminar archivo o carpeta
    if (action === 'delete') {
      const { path } = body;
      if (!path) {
        return NextResponse.json({ error: 'Ruta no especificada' }, { status: 400 });
      }

      await client.deleteFile(path);
      invalidateDirectoryCache();

      return NextResponse.json({
        success: true,
        message: 'Elemento eliminado de Nextcloud exitosamente.',
      });
    }

    // 4. Sincronizar masivamente clientes y casos
    if (action === 'sync_all') {
      const { clients = [], cases = [] } = body;

      await ensureDirectory(client, '/nexus_storage');
      await ensureDirectory(client, '/nexus_storage/Clientes');
      await ensureDirectory(client, '/nexus_storage/Expedientes');
      await ensureDirectory(client, '/nexus_storage/Plantillas');

      let clientCount = 0;
      for (const cl of clients) {
        const rawName = (cl.nombres ? `${cl.nombres} ${cl.apellidos || ''}` : cl.razonSocial) || 'Cliente';
        const sanitized = rawName.trim().replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_').replace(/\s+/g, '_');
        const cleanId = (cl.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
        const folderName = cleanId ? `${sanitized}_${cleanId}` : sanitized;
        const p = `/nexus_storage/Clientes/${folderName}`;

        await ensureDirectory(client, p);
        await ensureDirectory(client, `${p}/01_Documentos_Identidad`);
        await ensureDirectory(client, `${p}/02_Poderes_y_Contratos`);
        await ensureDirectory(client, `${p}/03_Comprobantes_Fiscales`);
        clientCount++;
      }

      let caseCount = 0;
      for (const cs of cases) {
        const num = (cs.numero || 'EXP').trim().replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_').replace(/\s+/g, '_');
        const tit = (cs.titulo || 'General').trim().replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_').replace(/\s+/g, '_');
        const folderName = `${num}_${tit}`;
        const p = `/nexus_storage/Expedientes/${folderName}`;

        await ensureDirectory(client, p);
        await ensureDirectory(client, `${p}/01_Actos_Notariales`);
        await ensureDirectory(client, `${p}/02_Planos_y_Coordenadas`);
        await ensureDirectory(client, `${p}/03_Notificaciones_Alguacil`);
        await ensureDirectory(client, `${p}/04_Sentencias_y_Oficios`);
        caseCount++;
      }

      invalidateDirectoryCache();

      return NextResponse.json({
        success: true,
        message: `Sincronizados ${clientCount} clientes y ${caseCount} expedientes en Nextcloud.`,
        clientCount,
        caseCount,
      });
    }

    return NextResponse.json({ error: `Acción no soportada: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[Nextcloud Files API Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Error en servicio de archivos Nextcloud' },
      { status: 500 }
    );
  }
}
