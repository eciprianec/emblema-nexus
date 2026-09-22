-- Seed de Base de Datos para Emblema Nexus
-- Ejecución en entorno de desarrollo o inicialización

-- 1. Insertar Empresa Principal
INSERT INTO public.companies (id, business_name, rnc, phone, email, currency, created_at, updated_at)
VALUES (
    '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b',
    'Emblema Nexus - Oficina Central',
    '130862346',
    '809-555-0100',
    'contacto@emblemanexus.com',
    'DOP',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- 2. Insertar Áreas de Servicio
INSERT INTO public.areas (id, company_id, code, name, created_at, updated_at)
VALUES 
    ('10000000-0000-0000-0000-000000000001', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'LEG', 'Legal', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000002', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'AGR', 'Agrimensura', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000003', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'INM', 'Inmobiliaria', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. Insertar Tipos de Expediente (Legal)
INSERT INTO public.dossier_types (id, area_id, company_id, name, workflow_template, created_at, updated_at)
VALUES 
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Contrato de Trabajo', '{}', NOW(), NOW()),
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Constitución de Empresa', '{}', NOW(), NOW()),
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Demanda Laboral', '{}', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insertar Tipos de Expediente (Agrimensura)
INSERT INTO public.dossier_types (id, area_id, company_id, name, workflow_template, created_at, updated_at)
VALUES 
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Legalización de Título', '{}', NOW(), NOW()),
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Deslinde', '{}', NOW(), NOW()),
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Levantamiento Parcelario', '{}', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insertar Tipos de Expediente (Inmobiliaria)
INSERT INTO public.dossier_types (id, area_id, company_id, name, workflow_template, created_at, updated_at)
VALUES 
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Venta de Inmueble', '{}', NOW(), NOW()),
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Alquiler', '{}', NOW(), NOW()),
    (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Reserva', '{}', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 4. Perfiles de Demostración y Usuarios (asumiendo que las tablas de auth son gestionadas por Supabase)
-- Enmanuel Ciprian Arias (Admin)
INSERT INTO public.users (id, company_id, email, full_name, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b',
    'admin@emblemanexus.com',
    'Enmanuel Ciprian Arias',
    true,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- María Pérez (Abogada)
INSERT INTO public.users (id, company_id, email, full_name, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b',
    'maria.perez@emblemanexus.com',
    'María Pérez',
    true,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- 5. Tipos de Participantes Predeterminados
INSERT INTO public.participant_types (id, company_id, name, created_at, updated_at)
VALUES 
    (gen_random_uuid(), '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Comprador', NOW(), NOW()),
    (gen_random_uuid(), '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Vendedor', NOW(), NOW()),
    (gen_random_uuid(), '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Testigo', NOW(), NOW()),
    (gen_random_uuid(), '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b', 'Notario', NOW(), NOW())
ON CONFLICT DO NOTHING;
