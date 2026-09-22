-- Migración 11: Triggers y auditoría

-- Ya hemos creado handle_updated_at y está aplicado. 
-- handle_new_user también está creado y aplicado en 00001.

-- Aplicar trigger de auditoría a tablas correspondientes:

CREATE TRIGGER audit_companies_changes
AFTER INSERT OR UPDATE OR DELETE ON companies
FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER audit_clients_changes
AFTER INSERT OR UPDATE OR DELETE ON clients
FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER audit_cases_changes
AFTER INSERT OR UPDATE OR DELETE ON cases
FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER audit_case_participants_changes
AFTER INSERT OR UPDATE OR DELETE ON case_participants
FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER audit_case_stage_instances_changes
AFTER INSERT OR UPDATE OR DELETE ON case_stage_instances
FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER audit_case_tasks_changes
AFTER INSERT OR UPDATE OR DELETE ON case_tasks
FOR EACH ROW EXECUTE FUNCTION audit.log_change();
