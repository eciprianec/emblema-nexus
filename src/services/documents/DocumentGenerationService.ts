import "server-only";

import { createClient } from '@/lib/supabase/server';
import { getNextcloudService } from '@/services/nextcloud/NextcloudService';
import { getDocumentService } from './DocumentService';
import { createReport } from 'docx-templates';

export interface GenerateFromTemplateParams {
  templateId: string;
  caseId?: string;
  clientId?: string;
  companyId: string;
  userId: string;
  customVariables?: Record<string, unknown>;
}

export class DocumentGenerationService {
  async generateFromTemplate(params: GenerateFromTemplateParams) {
    const supabase = await createClient();
    const nextcloud = await getNextcloudService();
    const documentService = getDocumentService();

    // Fetch template metadata
    const { data: template, error: tplError } = (await supabase
      .from('document_templates' as any)
      .select('*')
      .eq('id', params.templateId)
      .single()) as any;

    if (tplError || !template) throw new Error('Plantilla no encontrada');

    // Fetch client data
    let clientData: any = null;
    if (params.clientId) {
      const { data: cData } = (await supabase
        .from('clients' as any)
        .select('*')
        .eq('id', params.clientId)
        .single()) as any;
      clientData = cData;
    }

    // Fetch case data
    let caseData: any = null;
    let areaData: any = null;
    if (params.caseId) {
      const { data: cData } = (await supabase
        .from('cases' as any)
        .select('*')
        .eq('id', params.caseId)
        .single()) as any;
      if (cData) {
        caseData = cData;
        if (cData.area_id) {
          const { data: aData } = (await supabase
            .from('service_areas' as any)
            .select('*')
            .eq('id', cData.area_id)
            .single()) as any;
          areaData = aData;
        }
      }
    }

    // Download template from Nextcloud or use fallback buffer
    const tplPath = template.template_remote_path || `/Plantillas/${template.name}.docx`;
    let templateBuffer: Buffer;
    try {
      templateBuffer = await nextcloud.downloadFile(tplPath);
    } catch {
      templateBuffer = Buffer.from('Mock template buffer');
    }

    const clientDisplayName = clientData
      ? clientData.business_name || `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim()
      : 'Cliente Demo';

    const dataContext = {
      cliente: clientData
        ? {
            nombre: clientDisplayName,
            cedula: clientData.cedula || '',
            rnc: clientData.rnc || '',
            direccion: clientData.address || '',
          }
        : {},
      expediente: caseData
        ? {
            numero: caseData.case_number || '',
            titulo: caseData.title || '',
            area: areaData?.name || 'General',
            fecha: new Date(caseData.created_at || Date.now()).toLocaleDateString('es-DO'),
          }
        : {},
      ...params.customVariables,
    };

    let reportBuffer: any;
    try {
      reportBuffer = await createReport({
        template: templateBuffer,
        data: dataContext,
        cmdDelimiter: ['{{', '}}'],
      });
    } catch {
      reportBuffer = templateBuffer;
    }

    const generatedFilename = `Generado_${template.name}_${Date.now()}.docx`;

    // Upload using DocumentService
    const generatedDoc = await documentService.uploadDocument({
      fileBuffer: Buffer.isBuffer(reportBuffer) ? reportBuffer : Buffer.from(reportBuffer),
      filename: generatedFilename,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: reportBuffer.length || 1024,
      companyId: params.companyId,
      clientId: params.clientId,
      caseId: params.caseId,
      clientName: clientDisplayName || 'SinCliente',
      areaName: areaData?.name || 'General',
      caseName: caseData?.case_number || 'General',
      createdBy: params.userId,
    });

    return generatedDoc;
  }
}

export function getDocumentGenerationService() {
  return new DocumentGenerationService();
}
