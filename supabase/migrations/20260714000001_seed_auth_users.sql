-- Migration to seed auth.users from user_master to prevent SSO ID mismatches

DO $$ 
DECLARE
    r RECORD;
    v_crypt_password text;
    v_dup RECORD;
BEGIN
    -- 1. CLEANUP: Delete newly created self-healed user_master rows and their corresponding auth.users
    -- We can identify self-healed rows because they were created recently and have a duplicate email 
    -- with an older user_master row.
    FOR v_dup IN 
        SELECT u1.id as new_id, u1.email
        FROM public.user_master u1
        JOIN public.user_master u2 ON u1.email = u2.email AND u1.id != u2.id
        WHERE u1.created_at > u2.created_at
    LOOP
        -- Delete the self-healed user_master row
        DELETE FROM public.user_master WHERE id = v_dup.new_id;
        
        -- Delete the corresponding auth.users row
        DELETE FROM auth.users WHERE id = v_dup.new_id;
    END LOOP;

    -- 2. SEEDING: Create a default encrypted password for seeded users
    -- We'll just use crypt('Password123!', gen_salt('bf'))
    v_crypt_password := crypt('Password123!', gen_salt('bf'));

    FOR r IN 
        SELECT id, email, full_name 
        FROM public.user_master 
        WHERE id NOT IN (SELECT id FROM auth.users)
          AND email IS NOT NULL
          AND is_deleted = false
    LOOP
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            r.id,
            'authenticated',
            'authenticated',
            r.email,
            v_crypt_password,
            now(),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', r.full_name),
            now(),
            now(),
            '',
            '',
            '',
            ''
        ) ON CONFLICT (id) DO NOTHING;
        
        -- Also insert into auth.identities to ensure SSO links correctly
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            r.id,
            r.id,
            jsonb_build_object('sub', r.id, 'email', r.email, 'email_verified', true),
            'email',
            now(),
            now(),
            now()
        ) ON CONFLICT (provider, id) DO NOTHING;
    END LOOP;
END $$;
