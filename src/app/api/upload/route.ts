import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDocumentService } from '@/services/documents/DocumentService';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;
    const clientId = formData.get('clientId') as string | null;
    const caseId = formData.get('caseId') as string | null;
    const checklistItemId = formData.get('checklistItemId') as string | null;

    if (!file || !companyId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (file, companyId)' }, { status: 400 });
    }

    let clientName = 'SinCliente';
    let caseName = 'SinExpediente';
    let areaName = 'General';

    if (clientId) {
      const { data: client } = (await supabase.from('clients' as any).select('first_name, last_name, business_name').eq('id', clientId).single()) as any;
      if (client) clientName = client.business_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'SinCliente';
    }

    if (caseId) {
      const { data: caseData } = (await supabase.from('cases' as any).select('case_number').eq('id', caseId).single()) as any;
      if (caseData) {
        caseName = caseData.case_number || 'SinExpediente';
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const documentService = getDocumentService();
    const document = await documentService.uploadDocument({
      fileBuffer: buffer,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      companyId: companyId,
      clientId: clientId || undefined,
      caseId: caseId || undefined,
      checklistItemId: checklistItemId || undefined,
      clientName,
      caseName,
      areaName,
      createdBy: user.id
    });

    return NextResponse.json({ success: true, document }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
