-- Permisos explícitos para la API de datos, necesarios para publicar en Supabase en la nube.
-- Los proyectos nuevos (desde 2026-05-30) ya no conceden las tablas de public a anon,
-- authenticated ni service_role; sin esto, toda consulta de la app falla con 42501.
-- RLS sigue decidiendo qué filas ve cada usuario.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;

-- La concesión general deshace la restricción de columnas de 00022: se repone.
-- REVOKE ALL en una tabla también retira sus permisos por columna, por eso se conceden de nuevo.
REVOKE ALL ON public.ecf_configs FROM authenticated;
GRANT SELECT (
  id, company_id, environment, rnc, business_name, trade_name, economic_activity,
  certificate_alias, certificate_expiry, has_certificate, auto_send_dgii, created_at, updated_at
) ON public.ecf_configs TO authenticated;
GRANT INSERT (
  company_id, environment, rnc, business_name, trade_name, economic_activity,
  certificate_alias, certificate_expiry, auto_send_dgii
), UPDATE (
  environment, rnc, business_name, trade_name, economic_activity,
  certificate_alias, certificate_expiry, auto_send_dgii
) ON public.ecf_configs TO authenticated;

-- Un visitante sin sesión no necesita ninguna tabla: el login usa la API de Auth
-- y las pantallas del portal no consultan la base.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

DROP POLICY IF EXISTS "client_inquiries_anon_insert" ON public.client_inquiries;
DROP POLICY IF EXISTS "case_tracking_tokens_anon_read" ON public.case_tracking_tokens;

-- SECURITY DEFINER sin comprobar permisos: cualquiera con la clave pública podía llamarlas.
-- La aplicación no las usa; si algún día lo hace, deben validar el permiso por dentro.
REVOKE EXECUTE ON FUNCTION public.generate_case_number(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_entity_revision(uuid, text, uuid, jsonb, text, text) FROM PUBLIC, anon, authenticated;

-- Las políticas RLS las evalúan como el usuario con sesión; un visitante no las necesita.
REVOKE EXECUTE ON FUNCTION public.get_user_company_ids(), public.has_permission(uuid, text), public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company_ids(), public.has_permission(uuid, text), public.is_admin(uuid) TO authenticated, service_role;
