import "server-only";

import { createClient } from '@/lib/supabase/server';
import { getNextcloudService } from '@/services/nextcloud/NextcloudService';

export interface UploadDocumentParams {
  companyId: string;
  clientId?: string;
  caseId?: string;
  checklistItemId?: string;
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  clientName: string;
  areaName: string;
  caseName: string;
  createdBy: string;
}

export class DocumentService {
  async uploadDocument(params: UploadDocumentParams) {
    const supabase = await createClient();
    const nextcloud = await getNextcloudService();

    // Construct path: /{Cliente}/{Área}/{Expediente}/nombre
    const sanitizedClient = params.clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedArea = params.areaName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedCase = params.caseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `/${sanitizedClient}/${sanitizedArea}/${sanitizedCase}/${params.filename}`;

    await nextcloud.uploadFile(path, params.fileBuffer);

    // Register in DB
    const { data: document, error: docError } = (await supabase
      .from('documents' as any)
      .insert({
        company_id: params.companyId,
        client_id: params.clientId || null,
        case_id: params.caseId || null,
        checklist_item_id: params.checklistItemId || null,
        name: params.filename,
        original_filename: params.filename,
        mime_type: params.mimeType,
        file_size: params.sizeBytes,
        remote_path: path,
        status: 'borrador',
        current_version: 1,
        created_by: params.createdBy
      } as any)
      .select()
      .single()) as any;

    if (docError) throw docError;

    const { error: versionError } = await supabase
      .from('document_versions' as any)
      .insert({
        document_id: document.id,
        version_number: 1,
        remote_path: path,
        file_size: params.sizeBytes,
        created_by: params.createdBy,
        change_summary: 'Versión inicial'
      } as any);

    if (versionError) throw versionError;

    return document;
  }

  async uploadNewVersion(documentId: string, fileBuffer: Buffer, filename: string, changeSummary: string, userId: string) {
    const supabase = await createClient();
    const nextcloud = await getNextcloudService();

    // Get current doc
    const { data: doc, error: docError } = (await supabase
      .from('documents' as any)
      .select('*')
      .eq('id', documentId)
      .single()) as any;
    
    if (docError) throw docError;

    const newVersion = (doc.current_version || 0) + 1;
    // Extract base path, append vX
    const pathParts = (doc.remote_path || '').split('/');
    pathParts.pop();
    const basePath = pathParts.join('/');
    const newPath = `${basePath}/v${newVersion}_${filename}`;

    await nextcloud.uploadFile(newPath, fileBuffer);

    // Update document
    const { data: updatedDoc, error: updateError } = (await (supabase
      .from('documents' as any) as any)
      .update({
        current_version: newVersion,
        remote_path: newPath,
        file_size: fileBuffer.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()) as any;

    if (updateError) throw updateError;

    // Insert version
    const { error: versionError } = await supabase
      .from('document_versions' as any)
      .insert({
        document_id: documentId,
        version_number: newVersion,
        remote_path: newPath,
        file_size: fileBuffer.length,
        created_by: userId,
        change_summary: changeSummary
      } as any);

    if (versionError) throw versionError;

    return updatedDoc;
  }

  async getDocuments(filters: { company_id?: string; client_id?: string; case_id?: string; checklist_item_id?: string; status?: string }) {
    const supabase = await createClient();
    let query = (supabase.from('documents' as any) as any).select('*').is('archived_at', null);

    if (filters.company_id) query = query.eq('company_id', filters.company_id);
    if (filters.client_id) query = query.eq('client_id', filters.client_id);
    if (filters.case_id) query = query.eq('case_id', filters.case_id);
    if (filters.checklist_item_id) query = query.eq('checklist_item_id', filters.checklist_item_id);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getDocument(documentId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('documents' as any)
      .select('*, document_versions(*)')
      .eq('id', documentId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getDocumentVersions(documentId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('document_versions' as any)
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async updateDocumentStatus(documentId: string, status: 'borrador' | 'en_revision' | 'aprobado' | 'firmado' | 'obsoleto', _userId: string) {
    const supabase = await createClient();
    const { data, error } = await (supabase
      .from('documents' as any) as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async archiveDocument(documentId: string, _userId: string) {
    const supabase = await createClient();
    const { error } = await (supabase
      .from('documents' as any) as any)
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', documentId);
    
    if (error) throw error;
  }
}

export function getDocumentService() {
  return new DocumentService();
}
