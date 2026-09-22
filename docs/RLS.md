# Row Level Security (RLS)

## Concepto Base
El acceso a las filas de la base de datos de PostgreSQL está bloqueado por defecto (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`). Ningún rol, a excepción del administrador de la base de datos (Postgres `postgres` role o Supabase `service_role`), puede leer o escribir datos a menos que se defina explícitamente en una política RLS.

## Estructura de las Políticas
Emblema Nexus emplea una doble capa de políticas:
1. **Políticas RESTRICTIVE**: Garantizan el aislamiento tenant. Ningún usuario puede ver filas de una empresa a la que no pertenece.
2. **Políticas PERMISSIVE**: Proveen acceso funcional basado en los permisos de rol asignados.

### Ejemplo de Aislamiento Tenant (RESTRICTIVE)
```sql
CREATE POLICY "Tenant Isolation" ON public.dossiers
AS RESTRICTIVE
USING (
  company_id = (SELECT company_id FROM public.users WHERE auth_id = auth.uid())
);
```

### Ejemplo de Política Permisiva (PERMISSIVE)
```sql
CREATE POLICY "View Dossiers" ON public.dossiers
AS PERMISSIVE
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_permissions_view up
    WHERE up.auth_id = auth.uid() AND up.permission_name = 'dossiers:read'
  )
);
```

## Beneficios
- La lógica de seguridad acompaña a los datos.
- Los bugs a nivel de API o Frontend nunca pueden comprometer los datos de otra empresa.
- Simplifica las consultas en el backend: No hay necesidad de agregar explícitamente `WHERE company_id = X` en cada query, Postgres lo inyecta a nivel de capa de acceso.
