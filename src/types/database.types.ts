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
      cadastral_parcels: {
        Row: {
          id: string;
          company_id: string;
          case_id: string | null;
          client_id: string | null;
          designation: string;
          title_number: string | null;
          cadastral_district: string;
          portion_number: string | null;
          solar_number: string | null;
          block_number: string | null;
          province: string;
          municipality: string;
          sector: string | null;
          address: string | null;
          area_m2: number;
          area_tareas: number | null;
          perimeter_m: number | null;
          utm_zone: string | null;
          datum: string | null;
          centroid_lat: number | null;
          centroid_lng: number | null;
          centroid_utm_north: number | null;
          centroid_utm_east: number | null;
          polygon_geometry: Json | null;
          boundaries: Json | null;
          status:
            | "en_proceso"
            | "sometido_dnmc"
            | "observado"
            | "aprobado_dnmc"
            | "titulado"
            | "rechazado";
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          case_id?: string | null;
          client_id?: string | null;
          designation: string;
          title_number?: string | null;
          cadastral_district: string;
          portion_number?: string | null;
          solar_number?: string | null;
          block_number?: string | null;
          province: string;
          municipality: string;
          sector?: string | null;
          address?: string | null;
          area_m2: number;
          area_tareas?: number | null;
          perimeter_m?: number | null;
          utm_zone?: string | null;
          datum?: string | null;
          centroid_lat?: number | null;
          centroid_lng?: number | null;
          centroid_utm_north?: number | null;
          centroid_utm_east?: number | null;
          polygon_geometry?: Json | null;
          boundaries?: Json | null;
          status?:
            | "en_proceso"
            | "sometido_dnmc"
            | "observado"
            | "aprobado_dnmc"
            | "titulado"
            | "rechazado";
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          case_id?: string | null;
          client_id?: string | null;
          designation?: string;
          title_number?: string | null;
          cadastral_district?: string;
          portion_number?: string | null;
          solar_number?: string | null;
          block_number?: string | null;
          province?: string;
          municipality?: string;
          sector?: string | null;
          address?: string | null;
          area_m2?: number;
          area_tareas?: number | null;
          perimeter_m?: number | null;
          utm_zone?: string | null;
          datum?: string | null;
          centroid_lat?: number | null;
          centroid_lng?: number | null;
          centroid_utm_north?: number | null;
          centroid_utm_east?: number | null;
          polygon_geometry?: Json | null;
          boundaries?: Json | null;
          status?:
            | "en_proceso"
            | "sometido_dnmc"
            | "observado"
            | "aprobado_dnmc"
            | "titulado"
            | "rechazado";
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      cadastral_files: {
        Row: {
          id: string;
          company_id: string;
          case_id: string;
          parcel_id: string | null;
          operation_type:
            | "deslinde"
            | "subdivision"
            | "refundicion"
            | "urbanizacion"
            | "actualizacion_parcelaria"
            | "saneamiento"
            | "replanteo"
            | "modificacion_parcelaria"
            | "otro";
          dnmc_file_number: string | null;
          regional_directorate:
            | "central"
            | "norte"
            | "este"
            | "noreste"
            | "suroeste";
          surveyor_id: string | null;
          codia_number: string | null;
          authorization_date: string | null;
          field_work_date: string | null;
          newspaper_publication_date: string | null;
          submission_date: string | null;
          current_stage:
            | "solicitud_autorizacion"
            | "aviso_publicacion"
            | "trabajos_campo"
            | "elaboracion_planos"
            | "sometido_dnmc"
            | "revision_tecnica"
            | "oficio_observacion"
            | "aprobado_dnmc"
            | "en_tribunal_tierras"
            | "en_registro_titulos"
            | "concluido_titulado";
          approval_date: string | null;
          approval_resolution_number: string | null;
          rejection_reason: string | null;
          observation_details: string | null;
          observation_due_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          case_id: string;
          parcel_id?: string | null;
          operation_type:
            | "deslinde"
            | "subdivision"
            | "refundicion"
            | "urbanizacion"
            | "actualizacion_parcelaria"
            | "saneamiento"
            | "replanteo"
            | "modificacion_parcelaria"
            | "otro";
          dnmc_file_number?: string | null;
          regional_directorate:
            | "central"
            | "norte"
            | "este"
            | "noreste"
            | "suroeste";
          surveyor_id?: string | null;
          codia_number?: string | null;
          authorization_date?: string | null;
          field_work_date?: string | null;
          newspaper_publication_date?: string | null;
          submission_date?: string | null;
          current_stage?:
            | "solicitud_autorizacion"
            | "aviso_publicacion"
            | "trabajos_campo"
            | "elaboracion_planos"
            | "sometido_dnmc"
            | "revision_tecnica"
            | "oficio_observacion"
            | "aprobado_dnmc"
            | "en_tribunal_tierras"
            | "en_registro_titulos"
            | "concluido_titulado";
          approval_date?: string | null;
          approval_resolution_number?: string | null;
          rejection_reason?: string | null;
          observation_details?: string | null;
          observation_due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          case_id?: string;
          parcel_id?: string | null;
          operation_type?:
            | "deslinde"
            | "subdivision"
            | "refundicion"
            | "urbanizacion"
            | "actualizacion_parcelaria"
            | "saneamiento"
            | "replanteo"
            | "modificacion_parcelaria"
            | "otro";
          dnmc_file_number?: string | null;
          regional_directorate?:
            | "central"
            | "norte"
            | "este"
            | "noreste"
            | "suroeste";
          surveyor_id?: string | null;
          codia_number?: string | null;
          authorization_date?: string | null;
          field_work_date?: string | null;
          newspaper_publication_date?: string | null;
          submission_date?: string | null;
          current_stage?:
            | "solicitud_autorizacion"
            | "aviso_publicacion"
            | "trabajos_campo"
            | "elaboracion_planos"
            | "sometido_dnmc"
            | "revision_tecnica"
            | "oficio_observacion"
            | "aprobado_dnmc"
            | "en_tribunal_tierras"
            | "en_registro_titulos"
            | "concluido_titulado";
          approval_date?: string | null;
          approval_resolution_number?: string | null;
          rejection_reason?: string | null;
          observation_details?: string | null;
          observation_due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      survey_points: {
        Row: {
          id: string;
          company_id: string;
          parcel_id: string;
          point_name: string;
          point_type:
            | "vertice_lindero"
            | "estacion_referencia"
            | "punto_control_cors"
            | "detalle_fisico"
            | "arbol_mojon"
            | "canal_rio"
            | "calle_camino";
          utm_north: number;
          utm_east: number;
          elevation: number | null;
          latitude: number | null;
          longitude: number | null;
          order_index: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          parcel_id: string;
          point_name: string;
          point_type?:
            | "vertice_lindero"
            | "estacion_referencia"
            | "punto_control_cors"
            | "detalle_fisico"
            | "arbol_mojon"
            | "canal_rio"
            | "calle_camino";
          utm_north: number;
          utm_east: number;
          elevation?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          order_index: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          parcel_id?: string;
          point_name?: string;
          point_type?:
            | "vertice_lindero"
            | "estacion_referencia"
            | "punto_control_cors"
            | "detalle_fisico"
            | "arbol_mojon"
            | "canal_rio"
            | "calle_camino";
          utm_north?: number;
          utm_east?: number;
          elevation?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          order_index?: number;
          description?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      survey_field_sessions: {
        Row: {
          id: string;
          company_id: string;
          cadastral_file_id: string;
          session_date: string;
          chief_surveyor_id: string | null;
          equipment_type:
            | "gps_gnss_rtk"
            | "estacion_total"
            | "nivel_optico"
            | "dron_fotogrametrico"
            | "mixto";
          equipment_model: string | null;
          calibration_certificate_number: string | null;
          base_station_point: string | null;
          weather_conditions: string | null;
          witness_attendees: Json | null;
          linear_closure_error: number | null;
          angular_closure_error: number | null;
          status:
            | "programada"
            | "en_curso"
            | "completada"
            | "reprogramada_lluvia"
            | "suspendida_conflicto";
          field_notes: string | null;
          raw_file_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          cadastral_file_id: string;
          session_date: string;
          chief_surveyor_id?: string | null;
          equipment_type:
            | "gps_gnss_rtk"
            | "estacion_total"
            | "nivel_optico"
            | "dron_fotogrametrico"
            | "mixto";
          equipment_model?: string | null;
          calibration_certificate_number?: string | null;
          base_station_point?: string | null;
          weather_conditions?: string | null;
          witness_attendees?: Json | null;
          linear_closure_error?: number | null;
          angular_closure_error?: number | null;
          status?:
            | "programada"
            | "en_curso"
            | "completada"
            | "reprogramada_lluvia"
            | "suspendida_conflicto";
          field_notes?: string | null;
          raw_file_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          cadastral_file_id?: string;
          session_date?: string;
          chief_surveyor_id?: string | null;
          equipment_type?:
            | "gps_gnss_rtk"
            | "estacion_total"
            | "nivel_optico"
            | "dron_fotogrametrico"
            | "mixto";
          equipment_model?: string | null;
          calibration_certificate_number?: string | null;
          base_station_point?: string | null;
          weather_conditions?: string | null;
          witness_attendees?: Json | null;
          linear_closure_error?: number | null;
          angular_closure_error?: number | null;
          status?:
            | "programada"
            | "en_curso"
            | "completada"
            | "reprogramada_lluvia"
            | "suspendida_conflicto";
          field_notes?: string | null;
          raw_file_url?: string | null;
          created_at?: string;
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
      properties: {
        Row: {
          id: string;
          company_id: string;
          parcel_id: string | null;
          case_id: string | null;
          owner_client_id: string | null;
          code: string;
          title: string;
          description: string | null;
          property_type:
            | "apartamento"
            | "casa"
            | "villa"
            | "solar_terreno"
            | "local_comercial"
            | "nave_industrial"
            | "oficina"
            | "edificio"
            | "finca";
          listing_type:
            | "venta"
            | "alquiler"
            | "alquiler_amueblado"
            | "venta_o_alquiler";
          status:
            | "disponible"
            | "reservada"
            | "bajo_contrato"
            | "vendida"
            | "alquilada"
            | "inactiva";
          currency: "USD" | "DOP";
          sale_price: number | null;
          rental_price: number | null;
          maintenance_fee: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          half_bathrooms: number | null;
          parking_spots: number | null;
          construction_area_m2: number | null;
          land_area_m2: number | null;
          land_area_tareas: number | null;
          year_built: number | null;
          levels: number | null;
          furnished:
            | "no_amueblado"
            | "semi_amueblado"
            | "completamente_amueblado";
          amenities: Json;
          address_province: string;
          address_municipality: string;
          address_sector: string;
          address_street: string | null;
          latitude: number | null;
          longitude: number | null;
          images: Json;
          virtual_tour_url: string | null;
          title_deed_number: string | null;
          is_exclusive: boolean;
          commission_percentage: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          parcel_id?: string | null;
          case_id?: string | null;
          owner_client_id?: string | null;
          code: string;
          title: string;
          description?: string | null;
          property_type:
            | "apartamento"
            | "casa"
            | "villa"
            | "solar_terreno"
            | "local_comercial"
            | "nave_industrial"
            | "oficina"
            | "edificio"
            | "finca";
          listing_type:
            | "venta"
            | "alquiler"
            | "alquiler_amueblado"
            | "venta_o_alquiler";
          status?:
            | "disponible"
            | "reservada"
            | "bajo_contrato"
            | "vendida"
            | "alquilada"
            | "inactiva";
          currency?: "USD" | "DOP";
          sale_price?: number | null;
          rental_price?: number | null;
          maintenance_fee?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          half_bathrooms?: number | null;
          parking_spots?: number | null;
          construction_area_m2?: number | null;
          land_area_m2?: number | null;
          land_area_tareas?: number | null;
          year_built?: number | null;
          levels?: number | null;
          furnished?:
            | "no_amueblado"
            | "semi_amueblado"
            | "completamente_amueblado";
          amenities?: Json;
          address_province?: string;
          address_municipality?: string;
          address_sector?: string;
          address_street?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          images?: Json;
          virtual_tour_url?: string | null;
          title_deed_number?: string | null;
          is_exclusive?: boolean;
          commission_percentage?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          parcel_id?: string | null;
          case_id?: string | null;
          owner_client_id?: string | null;
          code?: string;
          title?: string;
          description?: string | null;
          property_type?:
            | "apartamento"
            | "casa"
            | "villa"
            | "solar_terreno"
            | "local_comercial"
            | "nave_industrial"
            | "oficina"
            | "edificio"
            | "finca";
          listing_type?:
            | "venta"
            | "alquiler"
            | "alquiler_amueblado"
            | "venta_o_alquiler";
          status?:
            | "disponible"
            | "reservada"
            | "bajo_contrato"
            | "vendida"
            | "alquilada"
            | "inactiva";
          currency?: "USD" | "DOP";
          sale_price?: number | null;
          rental_price?: number | null;
          maintenance_fee?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          half_bathrooms?: number | null;
          parking_spots?: number | null;
          construction_area_m2?: number | null;
          land_area_m2?: number | null;
          land_area_tareas?: number | null;
          year_built?: number | null;
          levels?: number | null;
          furnished?:
            | "no_amueblado"
            | "semi_amueblado"
            | "completamente_amueblado";
          amenities?: Json;
          address_province?: string;
          address_municipality?: string;
          address_sector?: string;
          address_street?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          images?: Json;
          virtual_tour_url?: string | null;
          title_deed_number?: string | null;
          is_exclusive?: boolean;
          commission_percentage?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      property_contracts: {
        Row: {
          id: string;
          company_id: string;
          property_id: string;
          contract_number: string;
          contract_type:
            | "alquiler"
            | "promesa_venta"
            | "opcion_compra"
            | "administracion";
          status:
            | "borrador"
            | "vigente"
            | "vencido"
            | "resuelto"
            | "cancelado";
          lessor_client_id: string | null;
          tenant_client_id: string | null;
          case_id: string | null;
          start_date: string;
          end_date: string | null;
          currency: "USD" | "DOP";
          amount: number;
          deposit_amount: number | null;
          deposit_months: number;
          payment_frequency: string;
          late_fee_percentage: number;
          grace_period_days: number;
          terms_conditions: string | null;
          document_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          property_id: string;
          contract_number: string;
          contract_type:
            | "alquiler"
            | "promesa_venta"
            | "opcion_compra"
            | "administracion";
          status?:
            | "borrador"
            | "vigente"
            | "vencido"
            | "resuelto"
            | "cancelado";
          lessor_client_id?: string | null;
          tenant_client_id?: string | null;
          case_id?: string | null;
          start_date: string;
          end_date?: string | null;
          currency?: "USD" | "DOP";
          amount: number;
          deposit_amount?: number | null;
          deposit_months?: number;
          payment_frequency?: string;
          late_fee_percentage?: number;
          grace_period_days?: number;
          terms_conditions?: string | null;
          document_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          property_id?: string;
          contract_number?: string;
          contract_type?:
            | "alquiler"
            | "promesa_venta"
            | "opcion_compra"
            | "administracion";
          status?:
            | "borrador"
            | "vigente"
            | "vencido"
            | "resuelto"
            | "cancelado";
          lessor_client_id?: string | null;
          tenant_client_id?: string | null;
          case_id?: string | null;
          start_date?: string;
          end_date?: string | null;
          currency?: "USD" | "DOP";
          amount?: number;
          deposit_amount?: number | null;
          deposit_months?: number;
          payment_frequency?: string;
          late_fee_percentage?: number;
          grace_period_days?: number;
          terms_conditions?: string | null;
          document_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      property_showings: {
        Row: {
          id: string;
          company_id: string;
          property_id: string;
          client_id: string | null;
          agent_id: string | null;
          showing_date: string;
          status: "programada" | "completada" | "cancelada" | "no_asistio";
          interest_level: "alto" | "medio" | "bajo" | "descartado";
          feedback: string | null;
          offer_made: boolean;
          offer_amount: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          property_id: string;
          client_id?: string | null;
          agent_id?: string | null;
          showing_date: string;
          status?: "programada" | "completada" | "cancelada" | "no_asistio";
          interest_level?: "alto" | "medio" | "bajo" | "descartado";
          feedback?: string | null;
          offer_made?: boolean;
          offer_amount?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          property_id?: string;
          client_id?: string | null;
          agent_id?: string | null;
          showing_date?: string;
          status?: "programada" | "completada" | "cancelada" | "no_asistio";
          interest_level?: "alto" | "medio" | "bajo" | "descartado";
          feedback?: string | null;
          offer_made?: boolean;
          offer_amount?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      broker_commissions: {
        Row: {
          id: string;
          company_id: string;
          property_id: string;
          contract_id: string | null;
          invoice_id: string | null;
          beneficiary_type:
            | "agente_interno"
            | "corredor_externo"
            | "empresa"
            | "colaborador";
          agent_id: string | null;
          external_broker_name: string | null;
          external_broker_rnc: string | null;
          total_deal_amount: number;
          commission_percentage: number;
          commission_amount: number;
          tax_withholding: number;
          net_amount: number;
          status: "pendiente" | "aprobada" | "pagada" | "cancelada";
          paid_date: string | null;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          property_id: string;
          contract_id?: string | null;
          invoice_id?: string | null;
          beneficiary_type:
            | "agente_interno"
            | "corredor_externo"
            | "empresa"
            | "colaborador";
          agent_id?: string | null;
          external_broker_name?: string | null;
          external_broker_rnc?: string | null;
          total_deal_amount: number;
          commission_percentage: number;
          commission_amount: number;
          tax_withholding?: number;
          net_amount: number;
          status?: "pendiente" | "aprobada" | "pagada" | "cancelada";
          paid_date?: string | null;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          property_id?: string;
          contract_id?: string | null;
          invoice_id?: string | null;
          beneficiary_type?:
            | "agente_interno"
            | "corredor_externo"
            | "empresa"
            | "colaborador";
          agent_id?: string | null;
          external_broker_name?: string | null;
          external_broker_rnc?: string | null;
          total_deal_amount?: number;
          commission_percentage?: number;
          commission_amount?: number;
          tax_withholding?: number;
          net_amount?: number;
          status?: "pendiente" | "aprobada" | "pagada" | "cancelada";
          paid_date?: string | null;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      client_portal_access: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          email: string;
          access_token: string;
          is_active: boolean;
          magic_code: string | null;
          magic_code_expires_at: string | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id: string;
          email: string;
          access_token: string;
          is_active?: boolean;
          magic_code?: string | null;
          magic_code_expires_at?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          client_id?: string;
          email?: string;
          access_token?: string;
          is_active?: boolean;
          magic_code?: string | null;
          magic_code_expires_at?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      case_tracking_tokens: {
        Row: {
          id: string;
          company_id: string;
          case_id: string;
          tracking_code: string;
          is_public: boolean;
          allow_document_download: boolean;
          views_count: number;
          last_viewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          case_id: string;
          tracking_code: string;
          is_public?: boolean;
          allow_document_download?: boolean;
          views_count?: number;
          last_viewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          case_id?: string;
          tracking_code?: string;
          is_public?: boolean;
          allow_document_download?: boolean;
          views_count?: number;
          last_viewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      client_inquiries: {
        Row: {
          id: string;
          company_id: string;
          full_name: string;
          email: string;
          phone: string | null;
          rnc_cedula: string | null;
          service_type:
            | "legal_inmobiliario"
            | "deslinde_mensura"
            | "compraventa"
            | "constitucion_compania"
            | "otro";
          message: string;
          status: "nuevo" | "contactado" | "en_cotizacion" | "convertido" | "descartado";
          client_id: string | null;
          case_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          rnc_cedula?: string | null;
          service_type:
            | "legal_inmobiliario"
            | "deslinde_mensura"
            | "compraventa"
            | "constitucion_compania"
            | "otro";
          message: string;
          status?: "nuevo" | "contactado" | "en_cotizacion" | "convertido" | "descartado";
          client_id?: string | null;
          case_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          rnc_cedula?: string | null;
          service_type?:
            | "legal_inmobiliario"
            | "deslinde_mensura"
            | "compraventa"
            | "constitucion_compania"
            | "otro";
          message?: string;
          status?: "nuevo" | "contactado" | "en_cotizacion" | "convertido" | "descartado";
          client_id?: string | null;
          case_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      client_document_requests: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          case_id: string | null;
          title: string;
          description: string | null;
          status: "pendiente" | "subido" | "revisado" | "rechazado";
          uploaded_document_id: string | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id: string;
          case_id?: string | null;
          title: string;
          description?: string | null;
          status?: "pendiente" | "subido" | "revisado" | "rechazado";
          uploaded_document_id?: string | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          client_id?: string;
          case_id?: string | null;
          title?: string;
          description?: string | null;
          status?: "pendiente" | "subido" | "revisado" | "rechazado";
          uploaded_document_id?: string | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
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

// Tipos de conveniencia para Inmobiliaria y Bienes Raíces (Fase 7)
export type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
export type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];

export type PropertyContractRow = Database["public"]["Tables"]["property_contracts"]["Row"];
export type PropertyContractInsert = Database["public"]["Tables"]["property_contracts"]["Insert"];
export type PropertyContractUpdate = Database["public"]["Tables"]["property_contracts"]["Update"];

export type PropertyShowingRow = Database["public"]["Tables"]["property_showings"]["Row"];
export type PropertyShowingInsert = Database["public"]["Tables"]["property_showings"]["Insert"];
export type PropertyShowingUpdate = Database["public"]["Tables"]["property_showings"]["Update"];

export type BrokerCommissionRow = Database["public"]["Tables"]["broker_commissions"]["Row"];
export type BrokerCommissionInsert = Database["public"]["Tables"]["broker_commissions"]["Insert"];
export type BrokerCommissionUpdate = Database["public"]["Tables"]["broker_commissions"]["Update"];

export type PropertyType = PropertyRow["property_type"];
export type ListingType = PropertyRow["listing_type"];
export type PropertyStatus = PropertyRow["status"];
export type ContractType = PropertyContractRow["contract_type"];
export type ContractStatus = PropertyContractRow["status"];
export type ShowingStatus = PropertyShowingRow["status"];
export type ShowingInterestLevel = PropertyShowingRow["interest_level"];
export type BeneficiaryType = BrokerCommissionRow["beneficiary_type"];
export type CommissionStatus = BrokerCommissionRow["status"];

// Tipos de conveniencia para Portal de Clientes y Tracking (Fase 8)
export type ClientPortalAccessRow = Database["public"]["Tables"]["client_portal_access"]["Row"];
export type ClientPortalAccessInsert = Database["public"]["Tables"]["client_portal_access"]["Insert"];
export type ClientPortalAccessUpdate = Database["public"]["Tables"]["client_portal_access"]["Update"];

export type CaseTrackingTokenRow = Database["public"]["Tables"]["case_tracking_tokens"]["Row"];
export type CaseTrackingTokenInsert = Database["public"]["Tables"]["case_tracking_tokens"]["Insert"];
export type CaseTrackingTokenUpdate = Database["public"]["Tables"]["case_tracking_tokens"]["Update"];

export type ClientInquiryRow = Database["public"]["Tables"]["client_inquiries"]["Row"];
export type ClientInquiryInsert = Database["public"]["Tables"]["client_inquiries"]["Insert"];
export type ClientInquiryUpdate = Database["public"]["Tables"]["client_inquiries"]["Update"];

export type ClientDocumentRequestRow = Database["public"]["Tables"]["client_document_requests"]["Row"];
export type ClientDocumentRequestInsert = Database["public"]["Tables"]["client_document_requests"]["Insert"];
export type ClientDocumentRequestUpdate = Database["public"]["Tables"]["client_document_requests"]["Update"];

export type InquiryServiceType = ClientInquiryRow["service_type"];
export type InquiryStatus = ClientInquiryRow["status"];
export type DocumentRequestStatus = ClientDocumentRequestRow["status"];

// Tipos de conveniencia para Expedientes, Clientes y Facturación
export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
export type CaseInsert = Database["public"]["Tables"]["cases"]["Insert"];
export type CaseUpdate = Partial<CaseInsert>;

export type CaseStageInstanceRow = Database["public"]["Tables"]["case_stage_instances"]["Row"];
export type CaseStageInstanceInsert = Database["public"]["Tables"]["case_stage_instances"]["Insert"];
export type CaseStageInstanceUpdate = Partial<CaseStageInstanceInsert>;

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Partial<ClientInsert>;

export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];

export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];


