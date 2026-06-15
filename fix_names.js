const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query(`
    UPDATE public.user_master um
    SET full_name = COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'New Personnel')
    FROM auth.users au
    WHERE um.id = au.id
      AND um.full_name = 'New Personnel'
      AND (au.raw_user_meta_data->>'full_name' IS NOT NULL OR au.raw_user_meta_data->>'name' IS NOT NULL)
    RETURNING um.email, um.full_name;
  `);
  console.log("Updated rows:", res.rowCount);
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
