-- Datos mínimos para desarrollo LOCAL: una empresa, un administrador y un cliente.
-- Nunca lo ejecutes en producción: crea un usuario con contraseña conocida.
-- Usuario: dev@emblema.test  ·  Contraseña: SOEGGv6ZMIqUZkTKWNeZ

DO $$
DECLARE
    v_company UUID := '50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b';
    v_user UUID := '6f1a2b3c-0000-4000-8000-000000000001';
BEGIN
    INSERT INTO public.companies (id, name, rnc, address)
    VALUES (v_company, 'Emblema Nexus SRL (desarrollo)', '131880738', 'Av. Winston Churchill, Santo Domingo')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
        'dev@emblema.test', extensions.crypt('SOEGGv6ZMIqUZkTKWNeZ', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{"first_name":"Usuario","last_name":"Desarrollo"}',
        now(), now(), '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_user, v_user::text, 'email',
        jsonb_build_object('sub', v_user::text, 'email', 'dev@emblema.test'), now(), now(), now()
    ) ON CONFLICT DO NOTHING;

    INSERT INTO public.company_members (company_id, user_id) VALUES (v_company, v_user)
    ON CONFLICT (company_id, user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role_id, company_id)
    SELECT v_user, r.id, v_company FROM public.roles r WHERE r.name = 'Administrador' AND r.is_system
    ON CONFLICT DO NOTHING;

    INSERT INTO public.clients (company_id, client_type, business_name, rnc, email, address)
    SELECT v_company, 'persona_juridica', 'Inversiones Caribe SRL', '101672919', 'pagos@caribe.test', 'Calle El Sol 10, Santiago'
    WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.company_id = v_company AND c.rnc = '101672919');
END $$;
