export type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/**
 * Tipos completos de la base de datos de Emblema Nexus.
 * Correspondientes a las migraciones PostgreSQL en supabase/migrations/.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          trade_name: string | null;
          rnc: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          logo_url: string | null;
          timezone: string;
          default_currency: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          trade_name?: string | null;
          rnc?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          logo_url?: string | null;
          timezone?: string;
          default_currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          phone: string | null;
          user_type: "internal" | "portal_client";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          user_type?: "internal" | "portal_client";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          is_active?: boolean;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      roles: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          description: string | null;
          is_system: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          name: string;
          description?: string | null;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      permissions: {
        Row: {
          id: string;
          key: string;
          module: string;
          action: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          module: string;
          action: string;
          description?: string | null;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        
        Relationships: GenericRelationship[];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          company_id: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          company_id: string;
        };
        
        Relationships: GenericRelationship[];
      };
      user_permissions: {
        Row: {
          id: string;
          user_id: string;
          permission_id: string;
          company_id: string;
          granted: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          permission_id: string;
          company_id: string;
          granted?: boolean;
        };
        
        Relationships: GenericRelationship[];
      };
      clients: {
        Row: {
          id: string;
          company_id: string;
          client_type: "persona_fisica" | "persona_juridica";
          first_name: string | null;
          last_name: string | null;
          cedula: string | null;
          passport: string | null;
          nationality: string | null;
          business_name: string | null;
          trade_name: string | null;
          rnc: string | null;
          legal_representative: string | null;
          email: string | null;
          phone: string | null;
          phone_secondary: string | null;
          address: string | null;
          city: string | null;
          province: string | null;
          notes: string | null;
          tax_data: Json | null;
          is_active: boolean;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_type: "persona_fisica" | "persona_juridica";
          first_name?: string | null;
          last_name?: string | null;
          cedula?: string | null;
          passport?: string | null;
          nationality?: string | null;
          business_name?: string | null;
          trade_name?: string | null;
          rnc?: string | null;
          legal_representative?: string | null;
          email?: string | null;
          phone?: string | null;
          phone_secondary?: string | null;
          address?: string | null;
          city?: string | null;
          province?: string | null;
          notes?: string | null;
          tax_data?: Json | null;
          is_active?: boolean;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      client_contacts: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          role: string | null;
          phone: string | null;
          email: string | null;
          notes: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          role?: string | null;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      rnc_records: {
        Row: {
          id: string;
          rnc: string;
          business_name: string | null;
          trade_name: string | null;
          status: string | null;
          economic_activity: string | null;
          tax_regime: string | null;
          source: string | null;
          verified_at: string | null;
          raw_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rnc: string;
          business_name?: string | null;
          trade_name?: string | null;
          status?: string | null;
          economic_activity?: string | null;
          tax_regime?: string | null;
          source?: string | null;
          verified_at?: string | null;
          raw_data?: Json | null;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      rnc_verifications: {
        Row: {
          id: string;
          client_id: string | null;
          rnc: string;
          result: Json | null;
          source: string | null;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          rnc: string;
          result?: Json | null;
          source?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      service_areas: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          code: string;
          description: string | null;
          color: string | null;
          icon: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          name: string;
          code: string;
          description?: string | null;
          color?: string | null;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      case_types: {
        Row: {
          id: string;
          company_id: string | null;
          area_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          current_version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          area_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          current_version?: number;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      case_type_versions: {
        Row: {
          id: string;
          case_type_id: string;
          version_number: number;
          workflow_definition: Json | null;
          checklist_definition: Json | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_type_id: string;
          version_number: number;
          workflow_definition?: Json | null;
          checklist_definition?: Json | null;
          created_by?: string | null;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      numbering_sequences: {
        Row: {
          id: string;
          company_id: string;
          area_id: string | null;
          prefix: string | null;
          include_year: boolean;
          include_area: boolean;
          pad_length: number;
          current_value: number;
        };
        Insert: {
          id?: string;
          company_id: string;
          area_id?: string | null;
          prefix?: string | null;
          include_year?: boolean;
          include_area?: boolean;
          pad_length?: number;
          current_value?: number;
        };
        
        Relationships: GenericRelationship[];
      };
      participant_types: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          code: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          name: string;
          code: string;
          is_active?: boolean;
        };
        
        Relationships: GenericRelationship[];
      };
      cases: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          area_id: string;
          case_type_id: string;
          case_type_version_id: string | null;
          case_number: string;
          title: string;
          description: string | null;
          status:
            | "borrador"
            | "abierto"
            | "en_proceso"
            | "pendiente_cliente"
            | "pendiente_tercero"
            | "pendiente_institucion"
            | "en_revision"
            | "completado"
            | "suspendido"
            | "cancelado"
            | "cerrado";
          current_stage_id: string | null;
          responsible_id: string | null;
          supervisor_id: string | null;
          priority: "baja" | "normal" | "alta" | "urgente";
          opened_at: string | null;
          expected_close_at: string | null;
          closed_at: string | null;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id: string;
          area_id: string;
          case_type_id: string;
          case_type_version_id?: string | null;
          case_number: string;
          title: string;
          description?: string | null;
          status?:
            | "borrador"
            | "abierto"
            | "en_proceso"
            | "pendiente_cliente"
            | "pendiente_tercero"
            | "pendiente_institucion"
            | "en_revision"
            | "completado"
            | "suspendido"
            | "cancelado"
            | "cerrado";
          current_stage_id?: string | null;
          responsible_id?: string | null;
          supervisor_id?: string | null;
          priority?: "baja" | "normal" | "alta" | "urgente";
          opened_at?: string | null;
          expected_close_at?: string | null;
          closed_at?: string | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      case_participants: {
        Row: {
          id: string;
          case_id: string;
          client_id: string;
          participant_type_id: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          client_id: string;
          participant_type_id: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      case_stage_instances: {
        Row: {
          id: string;
          case_id: string;
          company_id: string;
          stage_definition: Json | null;
          stage_name: string;
          sort_order: number;
          status: "pendiente" | "en_progreso" | "completado" | "cancelado";
          responsible_id: string | null;
          started_at: string | null;
          completed_at: string | null;
          expected_duration_days: number | null;
          sla_deadline: string | null;
          is_extraordinary: boolean;
          extraordinary_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          company_id: string;
          stage_definition?: Json | null;
          stage_name: string;
          sort_order?: number;
          status?: "pendiente" | "en_progreso" | "completado" | "cancelado";
          responsible_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          expected_duration_days?: number | null;
          sla_deadline?: string | null;
          is_extraordinary?: boolean;
          extraordinary_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      case_tasks: {
        Row: {
          id: string;
          case_id: string;
          stage_instance_id: string | null;
          company_id: string;
          title: string;
          description: string | null;
          responsible_id: string | null;
          priority: "baja" | "normal" | "alta" | "urgente";
          status: "pendiente" | "en_progreso" | "completado" | "cancelado";
          due_date: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          stage_instance_id?: string | null;
          company_id: string;
          title: string;
          description?: string | null;
          responsible_id?: string | null;
          priority?: "baja" | "normal" | "alta" | "urgente";
          status?: "pendiente" | "en_progreso" | "completado" | "cancelado";
          due_date?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      case_checklist_items: {
        Row: {
          id: string;
          case_id: string;
          company_id: string;
          name: string;
          description: string | null;
          is_required: boolean;
          status:
            | "pendiente"
            | "solicitado"
            | "recibido"
            | "rechazado"
            | "aprobado"
            | "no_aplica";
          document_id: string | null;
          due_date: string | null;
          notes: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          company_id: string;
          name: string;
          description?: string | null;
          is_required?: boolean;
          status?:
            | "pendiente"
            | "solicitado"
            | "recibido"
            | "rechazado"
            | "aprobado"
            | "no_aplica";
          document_id?: string | null;
          due_date?: string | null;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      documents: {
        Row: {
          id: string;
          company_id: string;
          client_id: string | null;
          case_id: string | null;
          name: string;
          original_filename: string;
          remote_path: string;
          mime_type: string | null;
          file_size: number;
          current_version: number;
          status: "borrador" | "en_revision" | "aprobado" | "firmado" | "obsoleto";
          checklist_item_id: string | null;
          metadata: Json | null;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id?: string | null;
          case_id?: string | null;
          name: string;
          original_filename: string;
          remote_path: string;
          mime_type?: string | null;
          file_size?: number;
          current_version?: number;
          status?: "borrador" | "en_revision" | "aprobado" | "firmado" | "obsoleto";
          checklist_item_id?: string | null;
          metadata?: Json | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          client_id?: string | null;
          case_id?: string | null;
          name?: string;
          original_filename?: string;
          remote_path?: string;
          mime_type?: string | null;
          file_size?: number;
          current_version?: number;
          status?: "borrador" | "en_revision" | "aprobado" | "firmado" | "obsoleto";
          checklist_item_id?: string | null;
          metadata?: Json | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_number: number;
          remote_path: string;
          file_size: number;
          mime_type: string | null;
          change_summary: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_number: number;
          remote_path: string;
          file_size?: number;
          mime_type?: string | null;
          change_summary?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          version_number?: number;
          remote_path?: string;
          file_size?: number;
          mime_type?: string | null;
          change_summary?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      document_templates: {
        Row: {
          id: string;
          company_id: string | null;
          area_id: string | null;
          name: string;
          code: string;
          description: string | null;
          template_remote_path: string | null;
          current_version: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          area_id?: string | null;
          name: string;
          code: string;
          description?: string | null;
          template_remote_path?: string | null;
          current_version?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          area_id?: string | null;
          name?: string;
          code?: string;
          description?: string | null;
          template_remote_path?: string | null;
          current_version?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      document_template_versions: {
        Row: {
          id: string;
          template_id: string;
          version_number: number;
          remote_path: string;
          variables: Json | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          version_number: number;
          remote_path: string;
          variables?: Json | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          version_number?: number;
          remote_path?: string;
          variables?: Json | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      document_links: {
        Row: {
          id: string;
          document_id: string;
          entity_type: string;
          entity_id: string;
          link_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          entity_type: string;
          entity_id: string;
          link_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          entity_type?: string;
          entity_id?: string;
          link_type?: string;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      calendar_events: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string | null;
          event_type:
            | "audiencia"
            | "cita_cliente"
            | "mensura_campo"
            | "vencimiento_plazo"
            | "reunion_interna"
            | "otro";
          start_time: string;
          end_time: string;
          all_day: boolean | null;
          location: string | null;
          virtual_meeting_url: string | null;
          status:
            | "programado"
            | "en_proceso"
            | "completado"
            | "suspendido"
            | "cancelado"
            | "reprogramado";
          case_id: string | null;
          client_id: string | null;
          reminder_minutes: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description?: string | null;
          event_type:
            | "audiencia"
            | "cita_cliente"
            | "mensura_campo"
            | "vencimiento_plazo"
            | "reunion_interna"
            | "otro";
          start_time: string;
          end_time: string;
          all_day?: boolean | null;
          location?: string | null;
          virtual_meeting_url?: string | null;
          status?:
            | "programado"
            | "en_proceso"
            | "completado"
            | "suspendido"
            | "cancelado"
            | "reprogramado";
          case_id?: string | null;
          client_id?: string | null;
          reminder_minutes?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          description?: string | null;
          event_type?:
            | "audiencia"
            | "cita_cliente"
            | "mensura_campo"
            | "vencimiento_plazo"
            | "reunion_interna"
            | "otro";
          start_time?: string;
          end_time?: string;
          all_day?: boolean | null;
          location?: string | null;
          virtual_meeting_url?: string | null;
          status?:
            | "programado"
            | "en_proceso"
            | "completado"
            | "suspendido"
            | "cancelado"
            | "reprogramado";
          case_id?: string | null;
          client_id?: string | null;
          reminder_minutes?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      calendar_event_attendees: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: "pendiente" | "confirmado" | "rechazado";
          is_organizer: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: "pendiente" | "confirmado" | "rechazado";
          is_organizer?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          status?: "pendiente" | "confirmado" | "rechazado";
          is_organizer?: boolean | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      tasks: {
        Row: {
          id: string;
          company_id: string;
          case_id: string | null;
          stage_instance_id: string | null;
          title: string;
          description: string | null;
          responsible_id: string | null;
          supervisor_id: string | null;
          priority: "baja" | "normal" | "alta" | "urgente";
          status: "pendiente" | "en_proceso" | "en_revision" | "completado" | "cancelado";
          due_date: string | null;
          completed_at: string | null;
          checklist: Json | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          case_id?: string | null;
          stage_instance_id?: string | null;
          title: string;
          description?: string | null;
          responsible_id?: string | null;
          supervisor_id?: string | null;
          priority?: "baja" | "normal" | "alta" | "urgente";
          status?: "pendiente" | "en_proceso" | "en_revision" | "completado" | "cancelado";
          due_date?: string | null;
          completed_at?: string | null;
          checklist?: Json | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          case_id?: string | null;
          stage_instance_id?: string | null;
          title?: string;
          description?: string | null;
          responsible_id?: string | null;
          supervisor_id?: string | null;
          priority?: "baja" | "normal" | "alta" | "urgente";
          status?: "pendiente" | "en_proceso" | "en_revision" | "completado" | "cancelado";
          due_date?: string | null;
          completed_at?: string | null;
          checklist?: Json | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      notifications: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          title: string;
          message: string;
          notification_type:
            | "tarea"
            | "plazo"
            | "audiencia"
            | "expediente"
            | "documento"
            | "sistema";
          entity_type: string | null;
          entity_id: string | null;
          read: boolean | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          title: string;
          message: string;
          notification_type?:
            | "tarea"
            | "plazo"
            | "audiencia"
            | "expediente"
            | "documento"
            | "sistema";
          entity_type?: string | null;
          entity_id?: string | null;
          read?: boolean | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          notification_type?:
            | "tarea"
            | "plazo"
            | "audiencia"
            | "expediente"
            | "documento"
            | "sistema";
          entity_type?: string | null;
          entity_id?: string | null;
          read?: boolean | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      quotes: {
        Row: {
          id: string;
          company_id: string;
          quote_number: string;
          client_id: string;
          case_id: string | null;
          currency: "DOP" | "USD";
          exchange_rate: number | null;
          subtotal: number;
          itbis: number;
          discount: number;
          total: number;
          status: "borrador" | "enviada" | "aprobada" | "rechazada" | "facturada" | "vencida";
          valid_until: string | null;
          terms_and_conditions: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          quote_number: string;
          client_id: string;
          case_id?: string | null;
          currency?: "DOP" | "USD";
          exchange_rate?: number | null;
          subtotal?: number;
          itbis?: number;
          discount?: number;
          total?: number;
          status?: "borrador" | "enviada" | "aprobada" | "rechazada" | "facturada" | "vencida";
          valid_until?: string | null;
          terms_and_conditions?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          quote_number?: string;
          client_id?: string;
          case_id?: string | null;
          currency?: "DOP" | "USD";
          exchange_rate?: number | null;
          subtotal?: number;
          itbis?: number;
          discount?: number;
          total?: number;
          status?: "borrador" | "enviada" | "aprobada" | "rechazada" | "facturada" | "vencida";
          valid_until?: string | null;
          terms_and_conditions?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      quote_items: {
        Row: {
          id: string;
          quote_id: string;
          description: string;
          item_type: "servicio" | "honorarios" | "tasa_judicial" | "tasa_catastral" | "gasto_notarial" | "otro";
          quantity: number;
          unit_price: number;
          applies_itbis: boolean | null;
          itbis_amount: number;
          total: number;
          order_index: number | null;
        };
        Insert: {
          id?: string;
          quote_id: string;
          description: string;
          item_type?: "servicio" | "honorarios" | "tasa_judicial" | "tasa_catastral" | "gasto_notarial" | "otro";
          quantity?: number;
          unit_price?: number;
          applies_itbis?: boolean | null;
          itbis_amount?: number;
          total?: number;
          order_index?: number | null;
        };
        Update: {
          id?: string;
          quote_id?: string;
          description?: string;
          item_type?: "servicio" | "honorarios" | "tasa_judicial" | "tasa_catastral" | "gasto_notarial" | "otro";
          quantity?: number;
          unit_price?: number;
          applies_itbis?: boolean | null;
          itbis_amount?: number;
          total?: number;
          order_index?: number | null;
        };
        Relationships: GenericRelationship[];
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          invoice_number: string;
          ncf_type: "B01" | "B02" | "B14" | "B15" | "ninguno" | null;
          ncf: string | null;
          client_id: string;
          case_id: string | null;
          quote_id: string | null;
          issue_date: string;
          due_date: string;
          currency: "DOP" | "USD";
          exchange_rate: number | null;
          subtotal: number;
          itbis: number;
          discount: number;
          total: number;
          paid_amount: number;
          balance_due: number;
          status: "borrador" | "emitida" | "parcialmente_pagada" | "pagada" | "vencida" | "anulada";
          payment_terms: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          invoice_number: string;
          ncf_type?: "B01" | "B02" | "B14" | "B15" | "ninguno" | null;
          ncf?: string | null;
          client_id: string;
          case_id?: string | null;
          quote_id?: string | null;
          issue_date?: string;
          due_date: string;
          currency?: "DOP" | "USD";
          exchange_rate?: number | null;
          subtotal?: number;
          itbis?: number;
          discount?: number;
          total?: number;
          paid_amount?: number;
          balance_due?: number;
          status?: "borrador" | "emitida" | "parcialmente_pagada" | "pagada" | "vencida" | "anulada";
          payment_terms?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          invoice_number?: string;
          ncf_type?: "B01" | "B02" | "B14" | "B15" | "ninguno" | null;
          ncf?: string | null;
          client_id?: string;
          case_id?: string | null;
          quote_id?: string | null;
          issue_date?: string;
          due_date?: string;
          currency?: "DOP" | "USD";
          exchange_rate?: number | null;
          subtotal?: number;
          itbis?: number;
          discount?: number;
          total?: number;
          paid_amount?: number;
          balance_due?: number;
          status?: "borrador" | "emitida" | "parcialmente_pagada" | "pagada" | "vencida" | "anulada";
          payment_terms?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          item_type: "servicio" | "honorarios" | "tasa_judicial" | "tasa_catastral" | "gasto_notarial" | "otro";
          quantity: number;
          unit_price: number;
          applies_itbis: boolean | null;
          itbis_amount: number;
          total: number;
          order_index: number | null;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          description: string;
          item_type?: "servicio" | "honorarios" | "tasa_judicial" | "tasa_catastral" | "gasto_notarial" | "otro";
          quantity?: number;
          unit_price?: number;
          applies_itbis?: boolean | null;
          itbis_amount?: number;
          total?: number;
          order_index?: number | null;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          description?: string;
          item_type?: "servicio" | "honorarios" | "tasa_judicial" | "tasa_catastral" | "gasto_notarial" | "otro";
          quantity?: number;
          unit_price?: number;
          applies_itbis?: boolean | null;
          itbis_amount?: number;
          total?: number;
          order_index?: number | null;
        };
        Relationships: GenericRelationship[];
      };
      payments: {
        Row: {
          id: string;
          company_id: string;
          receipt_number: string;
          client_id: string;
          payment_date: string;
          payment_method: "efectivo" | "transferencia" | "cheque" | "tarjeta" | "otro";
          reference_number: string | null;
          bank_name: string | null;
          amount: number;
          currency: "DOP" | "USD";
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          receipt_number: string;
          client_id: string;
          payment_date?: string;
          payment_method: "efectivo" | "transferencia" | "cheque" | "tarjeta" | "otro";
          reference_number?: string | null;
          bank_name?: string | null;
          amount: number;
          currency?: "DOP" | "USD";
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          receipt_number?: string;
          client_id?: string;
          payment_date?: string;
          payment_method?: "efectivo" | "transferencia" | "cheque" | "tarjeta" | "otro";
          reference_number?: string | null;
          bank_name?: string | null;
          amount?: number;
          currency?: "DOP" | "USD";
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      payment_applications: {
        Row: {
          id: string;
          payment_id: string;
          invoice_id: string;
          amount_applied: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          invoice_id: string;
          amount_applied: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          invoice_id?: string;
          amount_applied?: number;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      expenses: {
        Row: {
          id: string;
          company_id: string;
          expense_number: string;
          case_id: string | null;
          supplier_name: string | null;
          supplier_rnc: string | null;
          ncf: string | null;
          expense_date: string;
          category:
            | "tasas_judiciales"
            | "tasas_catastrales"
            | "gastos_notariales"
            | "peritajes"
            | "viaticos_combustible"
            | "suministros_oficina"
            | "servicios_basicos"
            | "honorarios_externos"
            | "otro";
          description: string;
          amount: number;
          itbis_paid: number | null;
          total_amount: number;
          currency: "DOP" | "USD";
          payment_status: "pendiente" | "pagado" | "reembolsado";
          is_billable_to_client: boolean | null;
          is_reimbursed: boolean | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          expense_number: string;
          case_id?: string | null;
          supplier_name?: string | null;
          supplier_rnc?: string | null;
          ncf?: string | null;
          expense_date?: string;
          category:
            | "tasas_judiciales"
            | "tasas_catastrales"
            | "gastos_notariales"
            | "peritajes"
            | "viaticos_combustible"
            | "suministros_oficina"
            | "servicios_basicos"
            | "honorarios_externos"
            | "otro";
          description: string;
          amount: number;
          itbis_paid?: number | null;
          total_amount: number;
          currency?: "DOP" | "USD";
          payment_status?: "pendiente" | "pagado" | "reembolsado";
          is_billable_to_client?: boolean | null;
          is_reimbursed?: boolean | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          expense_number?: string;
          case_id?: string | null;
          supplier_name?: string | null;
          supplier_rnc?: string | null;
          ncf?: string | null;
          expense_date?: string;
          category?:
            | "tasas_judiciales"
            | "tasas_catastrales"
            | "gastos_notariales"
            | "peritajes"
            | "viaticos_combustible"
            | "suministros_oficina"
            | "servicios_basicos"
            | "honorarios_externos"
            | "otro";
          description?: string;
          amount?: number;
          itbis_paid?: number | null;
          total_amount?: number;
          currency?: "DOP" | "USD";
          payment_status?: "pendiente" | "pagado" | "reembolsado";
          is_billable_to_client?: boolean | null;
          is_reimbursed?: boolean | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      bank_accounts: {
        Row: {
          id: string;
          company_id: string;
          bank_name: string;
          account_number: string;
          account_type: "corriente" | "ahorros";
          currency: "DOP" | "USD";
          initial_balance: number;
          current_balance: number;
          is_active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          bank_name: string;
          account_number: string;
          account_type?: "corriente" | "ahorros";
          currency?: "DOP" | "USD";
          initial_balance?: number;
          current_balance?: number;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          bank_name?: string;
          account_number?: string;
          account_type?: "corriente" | "ahorros";
          currency?: "DOP" | "USD";
          initial_balance?: number;
          current_balance?: number;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      cash_registers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          currency: "DOP" | "USD";
          initial_balance: number;
          current_balance: number;
          responsible_id: string | null;
          status: "abierta" | "cerrada";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          currency?: "DOP" | "USD";
          initial_balance?: number;
          current_balance?: number;
          responsible_id?: string | null;
          status?: "abierta" | "cerrada";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          currency?: "DOP" | "USD";
          initial_balance?: number;
          current_balance?: number;
          responsible_id?: string | null;
          status?: "abierta" | "cerrada";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      ecf_configs: {
        Row: {
          id: string;
          company_id: string;
          environment: "DEV" | "CERT" | "PROD";
          rnc: string;
          business_name: string;
          trade_name: string | null;
          economic_activity: string | null;
          certificate_alias: string | null;
          certificate_expiry: string | null;
          has_certificate: boolean | null;
          certificate_data: string | null;
          certificate_password_hash: string | null;
          auto_send_dgii: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          environment?: "DEV" | "CERT" | "PROD";
          rnc: string;
          business_name: string;
          trade_name?: string | null;
          economic_activity?: string | null;
          certificate_alias?: string | null;
          certificate_expiry?: string | null;
          has_certificate?: boolean | null;
          certificate_data?: string | null;
          certificate_password_hash?: string | null;
          auto_send_dgii?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          environment?: "DEV" | "CERT" | "PROD";
          rnc?: string;
          business_name?: string;
          trade_name?: string | null;
          economic_activity?: string | null;
          certificate_alias?: string | null;
          certificate_expiry?: string | null;
          has_certificate?: boolean | null;
          certificate_data?: string | null;
          certificate_password_hash?: string | null;
          auto_send_dgii?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      ecf_sequences: {
        Row: {
          id: string;
          company_id: string;
          ecf_type:
            | "E31"
            | "E32"
            | "E33"
            | "E34"
            | "E41"
            | "E43"
            | "E44"
            | "E45"
            | "E46"
            | "E47";
          series: string | null;
          current_number: number;
          start_number: number;
          end_number: number;
          expiration_date: string;
          is_active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          ecf_type:
            | "E31"
            | "E32"
            | "E33"
            | "E34"
            | "E41"
            | "E43"
            | "E44"
            | "E45"
            | "E46"
            | "E47";
          series?: string | null;
          current_number?: number;
          start_number?: number;
          end_number: number;
          expiration_date: string;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          ecf_type?:
            | "E31"
            | "E32"
            | "E33"
            | "E34"
            | "E41"
            | "E43"
            | "E44"
            | "E45"
            | "E46"
            | "E47";
          series?: string | null;
          current_number?: number;
          start_number?: number;
          end_number?: number;
          expiration_date?: string;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      ecf_invoices: {
        Row: {
          id: string;
          company_id: string;
          invoice_id: string | null;
          encf: string;
          ecf_type:
            | "E31"
            | "E32"
            | "E33"
            | "E34"
            | "E41"
            | "E43"
            | "E44"
            | "E45"
            | "E46"
            | "E47";
          environment: "DEV" | "CERT" | "PROD";
          security_code: string;
          sign_date: string | null;
          xml_unsigned: string | null;
          xml_signed: string | null;
          track_id: string | null;
          dgii_status:
            | "borrador"
            | "firmado"
            | "enviado"
            | "aceptado"
            | "rechazado"
            | "condicional"
            | "en_proceso"
            | "anulado";
          dgii_status_code: string | null;
          dgii_messages: Json | null;
          qr_code_url: string | null;
          buyer_acceptance_status: "pendiente" | "aprobado" | "rechazado";
          buyer_acceptance_date: string | null;
          buyer_rejection_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          invoice_id?: string | null;
          encf: string;
          ecf_type:
            | "E31"
            | "E32"
            | "E33"
            | "E34"
            | "E41"
            | "E43"
            | "E44"
            | "E45"
            | "E46"
            | "E47";
          environment?: "DEV" | "CERT" | "PROD";
          security_code: string;
          sign_date?: string | null;
          xml_unsigned?: string | null;
          xml_signed?: string | null;
          track_id?: string | null;
          dgii_status?:
            | "borrador"
            | "firmado"
            | "enviado"
            | "aceptado"
            | "rechazado"
            | "condicional"
            | "en_proceso"
            | "anulado";
          dgii_status_code?: string | null;
          dgii_messages?: Json | null;
          qr_code_url?: string | null;
          buyer_acceptance_status?: "pendiente" | "aprobado" | "rechazado";
          buyer_acceptance_date?: string | null;
          buyer_rejection_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          invoice_id?: string | null;
          encf?: string;
          ecf_type?:
            | "E31"
            | "E32"
            | "E33"
            | "E34"
            | "E41"
            | "E43"
            | "E44"
            | "E45"
            | "E46"
            | "E47";
          environment?: "DEV" | "CERT" | "PROD";
          security_code?: string;
          sign_date?: string | null;
          xml_unsigned?: string | null;
          xml_signed?: string | null;
          track_id?: string | null;
          dgii_status?:
            | "borrador"
            | "firmado"
            | "enviado"
            | "aceptado"
            | "rechazado"
            | "condicional"
            | "en_proceso"
            | "anulado";
          dgii_status_code?: string | null;
          dgii_messages?: Json | null;
          qr_code_url?: string | null;
          buyer_acceptance_status?: "pendiente" | "aprobado" | "rechazado";
          buyer_acceptance_date?: string | null;
          buyer_rejection_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      ecf_receptions: {
        Row: {
          id: string;
          company_id: string;
          emitter_rnc: string;
          emitter_name: string;
          encf: string;
          ecf_type: string;
          issue_date: string;
          total_amount: number;
          itbis_amount: number;
          security_code: string | null;
          commercial_status: "pendiente" | "aprobado" | "rechazado";
          commercial_rejection_reason: string | null;
          xml_received: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          emitter_rnc: string;
          emitter_name: string;
          encf: string;
          ecf_type: string;
          issue_date: string;
          total_amount: number;
          itbis_amount?: number;
          security_code?: string | null;
          commercial_status?: "pendiente" | "aprobado" | "rechazado";
          commercial_rejection_reason?: string | null;
          xml_received?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          emitter_rnc?: string;
          emitter_name?: string;
          encf?: string;
          ecf_type?: string;
          issue_date?: string;
          total_amount?: number;
          itbis_amount?: number;
          security_code?: string | null;
          commercial_status?: "pendiente" | "aprobado" | "rechazado";
          commercial_rejection_reason?: string | null;
          xml_received?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      entity_revisions: {
        Row: {
          id: string;
          company_id: string | null;
          entity_type: string;
          entity_id: string;
          version_number: number;
          snapshot: Json;
          operation_type:
            | "create"
            | "update"
            | "restore"
            | "archive"
            | "cancel"
            | "status_change";
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          entity_type: string;
          entity_id: string;
          version_number: number;
          snapshot: Json;
          operation_type:
            | "create"
            | "update"
            | "restore"
            | "archive"
            | "cancel"
            | "status_change";
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      snapshots: {
        Row: {
          id: string;
          company_id: string;
          entity_type: string;
          entity_id: string;
          label: string | null;
          data: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          entity_type: string;
          entity_id: string;
          label?: string | null;
          data: Json;
          created_by?: string | null;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
      audit_logs: {
        Row: {
          id: number;
          company_id: string | null;
          user_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          diff: Json | null;
          reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          company_id?: string | null;
          user_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          old_data?: Json | null;
          new_data?: Json | null;
          diff?: Json | null;
          reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        
        Relationships: GenericRelationship[];
      };
    };
    Views: {
      audit_logs_view: {
        Row: {
          id: number;
          company_id: string | null;
          user_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          diff: Json | null;
          reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Relationships: GenericRelationship[];
      };
    };
    Functions: {
      get_user_company_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      has_permission: {
        Args: {
          _company_id: string;
          _permission_key: string;
        };
        Returns: boolean;
      };
      is_admin: {
        Args: {
          _company_id: string;
        };
        Returns: boolean;
      };
      generate_case_number: {
        Args: {
          p_company_id: string;
          p_area_id: string;
        };
        Returns: string;
      };
      create_entity_revision: {
        Args: {
          p_company_id: string;
          p_entity_type: string;
          p_entity_id: string;
          p_snapshot: Json;
          p_operation_type: string;
          p_reason?: string | null;
        };
        Returns: string;
      };
      insert_audit_log: {
        Args: {
          p_company_id?: string | null;
          p_entity_type: string;
          p_entity_id: string;
          p_action: string;
          p_old_data?: Json | null;
          p_new_data?: Json | null;
          p_diff?: Json | null;
          p_reason?: string | null;
          p_ip_address?: string | null;
          p_user_agent?: string | null;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
