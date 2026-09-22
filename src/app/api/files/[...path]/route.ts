import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextcloudService } from '@/services/nextcloud/NextcloudService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const p = await params;
    const pathArray = p.path || [];
    const filePath = `/${pathArray.join('/')}`;

    const nextcloud = await getNextcloudService();
    
    // Get file buffer from nextcloud
    const fileBuffer = await nextcloud.downloadFile(filePath);
    
    // Check if we want it as attachment
    const download = req.nextUrl.searchParams.get('download') === 'true';

    // Best-effort MIME type
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const filename = filePath.split('/').pop() || 'file';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
    }

    return new NextResponse(new Uint8Array(fileBuffer), { headers, status: 200 });

  } catch (error: any) {
    console.error('Error downloading file:', error);
    return new NextResponse(error.message || 'Error interno del servidor', { status: 500 });
  }
}
