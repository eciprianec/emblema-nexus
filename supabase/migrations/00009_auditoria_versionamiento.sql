-- Migración 9: Auditoría y versionamiento

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id UUID,
    user_id UUID,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    diff JSONB,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

REVOKE UPDATE, DELETE, TRUNCATE ON audit.logs FROM PUBLIC;

CREATE TABLE IF NOT EXISTS entity_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    version_number INT NOT NULL,
    snapshot JSONB NOT NULL,
    operation_type TEXT CHECK (operation_type IN ('create','update','restore','archive','cancel','status_change')),
    reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (entity_type, entity_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_entity_revisions_lookup ON entity_revisions(company_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    label TEXT,
    data JSONB NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION audit.log_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_old_data JSONB;
    v_new_data JSONB;
    v_diff JSONB;
    v_entity_id UUID;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    IF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        v_entity_id := NEW.id;
        IF jsonb_typeof(v_new_data->'company_id') IS NOT NULL THEN
            v_company_id := (v_new_data->>'company_id')::UUID;
        END IF;
        
        INSERT INTO audit.logs (company_id, user_id, entity_type, entity_id, action, new_data)
        VALUES (v_company_id, v_user_id, TG_TABLE_NAME, v_entity_id, 'INSERT', v_new_data);
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_entity_id := NEW.id;
        IF jsonb_typeof(v_new_data->'company_id') IS NOT NULL THEN
            v_company_id := (v_new_data->>'company_id')::UUID;
        END IF;
        
        SELECT jsonb_object_agg(n.key, n.value) INTO v_diff
        FROM jsonb_each(v_new_data) n
        WHERE n.value IS DISTINCT FROM v_old_data->n.key;
        
        IF v_diff IS NOT NULL THEN
            INSERT INTO audit.logs (company_id, user_id, entity_type, entity_id, action, old_data, new_data, diff)
            VALUES (v_company_id, v_user_id, TG_TABLE_NAME, v_entity_id, 'UPDATE', v_old_data, v_new_data, v_diff);
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        v_entity_id := OLD.id;
        IF jsonb_typeof(v_old_data->'company_id') IS NOT NULL THEN
            v_company_id := (v_old_data->>'company_id')::UUID;
        END IF;
        
        INSERT INTO audit.logs (company_id, user_id, entity_type, entity_id, action, old_data)
        VALUES (v_company_id, v_user_id, TG_TABLE_NAME, v_entity_id, 'DELETE', v_old_data);
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION create_entity_revision(
    p_company_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_snapshot JSONB,
    p_operation_type TEXT,
    p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_next_version INT;
    v_revision_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
    FROM entity_revisions
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
    
    INSERT INTO entity_revisions (
        company_id, entity_type, entity_id, version_number, 
        snapshot, operation_type, reason, created_by
    ) VALUES (
        p_company_id, p_entity_type, p_entity_id, v_next_version,
        p_snapshot, p_operation_type, p_reason, v_user_id
    ) RETURNING id INTO v_revision_id;
    
    RETURN v_revision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
