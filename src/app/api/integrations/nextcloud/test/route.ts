import { NextResponse } from 'next/server';
import { createClient } from 'webdav';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, username, password, remotePath } = body;

    if (!url || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'La URL del servidor, el usuario y la contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    // Asegurar que la URL sea válida
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }

    // Si la URL no termina con la ruta WebDAV típica y no se especificó remotePath
    const client = createClient(fullUrl, {
      username: username.trim(),
      password: password.trim(),
    });

    // Intentar verificar conectividad y directorio
    try {
      const exists = await client.exists(remotePath || '/');
      return NextResponse.json({
        success: true,
        message: 'Conexión con el servidor Nextcloud establecida exitosamente.',
        rootExists: exists,
      });
    } catch (davError: any) {
      // Si el servidor responde pero falla la autenticación o ruta
      return NextResponse.json({
        success: false,
        error: davError?.message || 'Error de autenticación o ruta WebDAV no encontrada.',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno al verificar conexión.' },
      { status: 500 }
    );
  }
}
