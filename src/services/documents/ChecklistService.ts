import 'server-only';
import { createClient } from '@/lib/supabase/server';

export class ChecklistService {
  async getCaseChecklist(caseId: string) {
    const supabase = await createClient();
    const { data, error } = await (supabase
      .from('case_checklist_items' as any) as any)
      .select('*')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  async attachDocumentToChecklist(checklistItemId: string, documentId: string, _userId: string) {
    const supabase = await createClient();
    
    // Update checklist item to received
    const { error: checklistError } = await (supabase
      .from('case_checklist_items' as any) as any)
      .update({ status: 'recibido', updated_at: new Date().toISOString() })
      .eq('id', checklistItemId);
    
    if (checklistError) throw checklistError;

    // Link document
    const { error: docError } = await (supabase
      .from('documents' as any) as any)
      .update({ checklist_item_id: checklistItemId, updated_at: new Date().toISOString() })
      .eq('id', documentId);
    
    if (docError) throw docError;
  }

  async updateChecklistStatus(
    checklistItemId: string,
    status: 'pendiente' | 'solicitado' | 'recibido' | 'rechazado' | 'aprobado' | 'no_aplica',
    notes?: string,
    _userId?: string
  ) {
    const supabase = await createClient();
    
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await (supabase
      .from('case_checklist_items' as any) as any)
      .update(updates)
      .eq('id', checklistItemId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export function getChecklistService() {
  return new ChecklistService();
}
