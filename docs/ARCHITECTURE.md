# Arquitectura de Emblema Nexus

## Introducción
Emblema Nexus es una Plataforma Integral de Gestión Empresarial desarrollada sobre tecnologías modernas orientadas a la alta disponibilidad, rendimiento, y seguridad.

## Stack Tecnológico Principal
- **Frontend**: Next.js 15 (App Router), React, Server Components.
- **Estilos**: Tailwind CSS v4, shadcn/ui, Radix UI.
- **Backend & Base de Datos**: Supabase (PostgreSQL), Next.js Server Actions (`next-safe-action`).
- **Almacenamiento Documental**: Nextcloud vía WebDAV.
- **Facturación Electrónica**: Integración con DGII e-CF.
- **Autenticación**: Supabase Auth con soporte para MFA y RBAC.

## Principios de Diseño
1. **Server-First**: Máximo uso de React Server Components para reducir el bundle enviado al cliente y mejorar el SEO/rendimiento.
2. **Aislamiento Multi-Empresa**: Arquitectura diseñada para soportar múltiples empresas (tenant-level isolation) usando Row Level Security (RLS) en PostgreSQL.
3. **Mínimo Privilegio**: Políticas estrictas de acceso y matriz granular de permisos por roles, áreas y jerarquía de usuarios.
4. **Resiliencia e Idempotencia**: Integraciones con sistemas externos (Nextcloud, DGII) manejadas con colas de reintentos y logs de auditoría exhaustivos.

## Flujos de Datos Principales
- **Autenticación**: Cliente -> Supabase Auth -> JWT -> Middleware Next.js -> Validación de Sesión.
- **Gestión Documental**: Subida a Next.js (Server Action) -> Procesamiento y Metadatos -> Upload a Nextcloud (WebDAV) -> Registro de Enlace en PostgreSQL.
- **Facturación e-CF**: Generación de Factura en App -> Firma Digital -> Envío a API DGII -> Recepción de TrackId -> Verificación Asíncrona de Estado.
