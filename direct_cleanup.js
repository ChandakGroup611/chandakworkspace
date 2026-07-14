const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    console.log("1. Cleaning up duplicate self-healed user_master rows...");
    const dupRes = await client.query(`
      SELECT u1.id as new_id, u1.email, u2.id as old_id
      FROM public.user_master u1
      JOIN public.user_master u2 ON u1.email = u2.email AND u1.id != u2.id
      WHERE u1.created_at > u2.created_at
    `);
    
    for (const row of dupRes.rows) {
      console.log(`Fixing duplicate for email ${row.email}. New ID: ${row.new_id}, Old ID: ${row.old_id}`);
      
      // Scramble self-healed user_master row
      await client.query(`
        UPDATE public.user_master 
        SET email = $1, is_deleted = true, is_active = false
        WHERE id = $2
      `, [`deleted_dup_${row.new_id}@adios.local`, row.new_id]);
      
      // Scramble corresponding auth.users row
      await client.query(`
        UPDATE auth.users 
        SET email = $1
        WHERE id = $2
      `, [`deleted_dup_${row.new_id}@adios.local`, row.new_id]);
    }

    console.log("2. Seeding auth.users for missing user_master rows...");
    const missingRes = await client.query(`
      SELECT id, email, full_name 
      FROM public.user_master 
      WHERE id NOT IN (SELECT id FROM auth.users)
        AND email IS NOT NULL
        AND is_deleted = false
    `);
    
    for (const row of missingRes.rows) {
      console.log(`Seeding auth.users for ${row.email} (ID: ${row.id})`);
      
      await client.query(`
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, recovery_sent_at, last_sign_in_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
            $2, '$2a$10$T.s8y/eT.S3hWk0R5b/7x.g/Y9v2.e2f8y/eT.S3hWk0R5b/7x.gc', 
            now(), now(), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', $3), now(), now()
        ) ON CONFLICT (id) DO NOTHING;
      `, [row.id, row.email, row.full_name]);
      
      await client.query(`
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            $1, $1, jsonb_build_object('sub', $1, 'email', $2, 'email_verified', true),
            'email', now(), now(), now()
        ) ON CONFLICT (provider, id) DO NOTHING;
      `, [row.id, row.email]);
    }
    
    console.log("Cleanup and seeding completed successfully.");
    
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

run();
