import { NextResponse } from 'next/server';
import { createClient } from 'webdav';

interface ProvisionRequestBody {
  type: 'client' | 'case' | 'init_base';
  clientId?: string;
  clientName?: string;
  docNumber?: string;
  caseId?: string;
  caseNumber?: string;
  title?: string;
  area?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
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
      // 405 Method Not Allowed (already exists) or 409 Conflict are normal in WebDAV
      if (status !== 405 && status !== 409) {
        console.warn(`[ensureDirectory] notice for ${current}:`, err?.message);
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const body: ProvisionRequestBody = await request.json();
    const { type } = body;

    // Resolve credentials (request body override or environment variables)
    let baseUrl = (body.serverUrl || process.env.NEXTCLOUD_URL || 'https://nextcloud.ciberemblema.com').trim();
    const username = (body.username || process.env.NEXTCLOUD_USER || 'admin').trim();
    const password = (body.password || process.env.NEXTCLOUD_APP_PASSWORD || 'K1mK9nZmYeb9j9oMbZmv').trim();

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    baseUrl = baseUrl.replace(/\/$/, '');

    const davUrl = `${baseUrl}/remote.php/dav/files/${username}/`;
    const client = createClient(davUrl, {
      username,
      password,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // Ensure root storage base folders
    await ensureDirectory(client, '/nexus_storage');
    await ensureDirectory(client, '/nexus_storage/Clientes');
    await ensureDirectory(client, '/nexus_storage/Expedientes');
    await ensureDirectory(client, '/nexus_storage/Plantillas');

    if (type === 'init_base') {
      return NextResponse.json({
        success: true,
        message: 'Estructura base de Nextcloud (/nexus_storage, Clientes, Expedientes, Plantillas) verificada y lista.',
      });
    }

    if (type === 'client') {
      const { clientId, clientName } = body;
      if (!clientName && !clientId) {
        return NextResponse.json(
          { success: false, error: 'Se requiere el nombre o ID del cliente.' },
          { status: 400 }
        );
      }

      const rawName = (clientName || 'Cliente').trim();
      const sanitizedName = rawName.replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_').replace(/\s+/g, '_');
      const cleanId = (clientId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const folderName = cleanId ? `${sanitizedName}_${cleanId}` : sanitizedName;
      const folderPath = `/nexus_storage/Clientes/${folderName}`;

      const subfolders = [
        '01_Documentos_Identidad',
        '02_Poderes_y_Contratos',
        '03_Comprobantes_Fiscales',
      ];

      // Provision folder and subfolders
      await ensureDirectory(client, folderPath);
      for (const sub of subfolders) {
        await ensureDirectory(client, `${folderPath}/${sub}`);
      }

      const webUrl = `${baseUrl}/index.php/apps/files/?dir=${encodeURIComponent(folderPath)}`;

      return NextResponse.json({
        success: true,
        message: `Carpetas del cliente "${rawName}" aprovisionadas en Nextcloud.`,
        folderPath,
        folderName,
        webUrl,
        subfolders,
      });
    }

    if (type === 'case') {
      const { caseNumber, title } = body;
      if (!caseNumber && !title) {
        return NextResponse.json(
          { success: false, error: 'Se requiere el número o título del expediente.' },
          { status: 400 }
        );
      }

      const rawNumber = (caseNumber || 'EXP').trim();
      const rawTitle = (title || 'General').trim();
      const sanitizedNumber = rawNumber.replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_').replace(/\s+/g, '_');
      const sanitizedTitle = rawTitle.replace(/[\/\\:*?"<>|#%&{}$!'@+`=]/g, '_').replace(/\s+/g, '_');
      const folderName = `${sanitizedNumber}_${sanitizedTitle}`;
      const folderPath = `/nexus_storage/Expedientes/${folderName}`;

      const subfolders = [
        '01_Actos_Notariales',
        '02_Planos_y_Coordenadas',
        '03_Notificaciones_Alguacil',
        '04_Sentencias_y_Oficios',
      ];

      // Provision folder and subfolders
      await ensureDirectory(client, folderPath);
      for (const sub of subfolders) {
        await ensureDirectory(client, `${folderPath}/${sub}`);
      }

      const webUrl = `${baseUrl}/index.php/apps/files/?dir=${encodeURIComponent(folderPath)}`;

      return NextResponse.json({
        success: true,
        message: `Carpetas del expediente "${rawNumber}" aprovisionadas en Nextcloud.`,
        folderPath,
        folderName,
        webUrl,
        subfolders,
      });
    }

    return NextResponse.json(
      { success: false, error: `Tipo de aprovisionamiento no válido: ${type}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Nextcloud Provision Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al aprovisionar carpetas en Nextcloud.' },
      { status: 500 }
    );
  }
}
