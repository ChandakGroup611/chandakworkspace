require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testAuthInsert() {
  const connectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const res = await client.query(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'anand@gmail.com', 'dummy_hash', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Anand Mohta"}', now(), now(), '', '', '', ''
      ) RETURNING id;
    `);
    console.log("Success:", res.rows[0]);
  } catch (e) {
    console.error("PG Error:", e.message);
  } finally {
    await client.end();
  }
}

testAuthInsert();
