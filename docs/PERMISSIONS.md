# Matriz de Permisos (RBAC)

## Filosofía
El sistema de permisos de Emblema Nexus está diseñado para manejar la complejidad organizativa del mundo real, permitiendo excepciones de permisos sobre entidades específicas u orígenes cruzados (por ejemplo, permiso base + restricciones por área de servicio).

## Resolución de Permisos Efectivos
El "Permiso Efectivo" es la evaluación final que determina si el usuario puede realizar la acción. Se calcula evaluando:
1. Permisos concedidos al Rol (o roles) del usuario (Permisos Base).
2. Permisos concedidos explícitamente al Usuario (Override positivo).
3. Permisos denegados explícitamente al Usuario (Override negativo).
4. Restricciones contextuales de Área de Servicio.

### Estructura del Nodo de Permiso
Nomenclatura usada: `recurso:accion`

Ejemplos:
- `users:create`, `users:read`, `users:update`, `users:delete`
- `dossiers:read_all`, `dossiers:read_own`
- `billing:generate_invoice`, `billing:approve_ecf`

## Matriz por Defecto (Roles)
- **Administrador del Sistema**: Acceso completo, `*:*`.
- **Gerente de Área**: Acceso a `dossiers:read_area`, `users:read`, `billing:read`.
- **Profesional (Abogado / Agrimensor)**: Acceso a `dossiers:read_own`, `dossiers:update_own`.
- **Asistente**: `dossiers:create`, `dossiers:read_area`.
