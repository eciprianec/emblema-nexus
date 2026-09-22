# Modelo de Seguridad y Cumplimiento

## Seguridad de Acceso
El sistema Emblema Nexus utiliza Autenticación Basada en Tokens (JWT) provista por Supabase.
- Las contraseñas no se almacenan nunca en la base de datos de la aplicación.
- Soporte nativo para Multi-Factor Authentication (MFA) recomendado para usuarios administradores.
- Tiempo de vida (TTL) del token configurado a 15 minutos con rotación automática mediante refresh tokens.

## Aislamiento Multi-Tenant
La aplicación aísla los datos mediante `company_id` en cada tabla transaccional o maestra. La prevención de fuga de datos entre empresas se impone a nivel del motor de base de datos a través de PostgreSQL RLS.

## Sanitización de Datos
Todas las entradas de usuarios (Server Actions) son estrictamente validadas usando Zod:
- Sanitización de strings para evitar Inyección XSS.
- Parseo estricto de tipos de datos antes de interactuar con el cliente de Supabase o las APIs externas.

## Gestión de Credenciales
- Los secretos (Claves API de DGII, Credenciales WebDAV de Nextcloud, Claves Privadas de Firma de e-CF) se almacenan en variables de entorno o gestores de secretos (Vault / Supabase Vault), nunca en texto claro en repositorios.
