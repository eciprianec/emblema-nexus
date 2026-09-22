# Modelo de Datos - Emblema Nexus

## Visión General
El esquema de base de datos relacional de Emblema Nexus se apoya fundamentalmente en PostgreSQL (vía Supabase). Se utilizan UUIDs como llaves primarias y esquemas de Row Level Security (RLS) en todas las tablas.

## Tablas Principales

### `companies` (Empresas)
- `id` (UUID): Identificador único.
- `business_name` (VARCHAR): Razón social.
- `rnc` (VARCHAR): Registro Nacional de Contribuyente (único).
- `currency` (VARCHAR): Moneda base (ej. DOP, USD).
- `created_at`, `updated_at`: Timestamps.

### `users` (Usuarios y Empleados)
- `id` (UUID): FK a auth.users.
- `company_id` (UUID): FK a companies.
- `email` (VARCHAR): Correo electrónico.
- `full_name` (VARCHAR): Nombre completo del empleado.
- `is_active` (BOOLEAN): Estado de acceso.

### `roles` y `permissions` (Seguridad)
- `roles`: `id`, `company_id`, `name`, `description`.
- `permissions`: `id`, `name`, `module`, `description`.
- `role_permissions`: Tabla pivote.
- `user_roles`: Asignación de usuarios a roles.

### `areas` (Áreas de Servicio)
- `id` (UUID): Identificador de área.
- `company_id` (UUID): Empresa.
- `code` (VARCHAR): Código de área (ej. LEG, AGR).
- `name` (VARCHAR): Nombre del área (Legal, Agrimensura).

### `dossier_types` (Tipos de Expediente)
- `id` (UUID), `area_id` (UUID).
- `name` (VARCHAR): Nombre del trámite/expediente.
- `workflow_template` (JSONB): Pasos por defecto.

### `dossiers` (Expedientes)
- `id` (UUID): Identificador único.
- `company_id` (UUID), `dossier_type_id` (UUID), `assigned_to` (UUID).
- `client_id` (UUID): Cliente del expediente.
- `status` (VARCHAR): Estado actual (Abierto, En Proceso, Cerrado).

*Nota: Todas las tablas cuentan con auditoría estándar (`created_by`, `updated_by`).*
