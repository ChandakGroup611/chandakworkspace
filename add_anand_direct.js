const { Client } = require('pg');
const crypto = require('crypto');

async function addAnand() {
  const connectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET session_replication_role = replica;');

    const authRes = await client.query(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'anand@gmail.com', crypt('Anand@123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Anand Mohta", "full_name":"Anand Mohta"}', now(), now(), '', '', '', ''
      ) RETURNING id;
    `);
    const newUserId = authRes.rows[0].id;
    console.log("Created auth.users row with ID:", newUserId);

    await client.query(`
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
      ) VALUES (
        gen_random_uuid(), '${newUserId}', jsonb_build_object('sub', '${newUserId}', 'email', 'anand@gmail.com'), 'email', now(), now(), now(), '${newUserId}'
      );
    `);
    console.log("Created auth.identities row.");

    const userCode = 'USR-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    await client.query(`
      INSERT INTO public.user_master (
        id, full_name, email, password_hash, user_code, is_active, created_at, updated_at
      ) VALUES (
        '${newUserId}', 'Anand Mohta', 'anand@gmail.com', 'MIGRATED_AUTH', '${userCode}', true, now(), now()
      );
    `);
    console.log("Created public.user_master row with user_code:", userCode);

    await client.query('SET session_replication_role = origin;');
    await client.query('COMMIT');
    console.log("Successfully added Anand Mohta!");

  } catch (e) {
    await client.query('ROLLBACK');
    console.error("PG Error:", e.message);
  } finally {
    await client.end();
  }
}

addAnand();
