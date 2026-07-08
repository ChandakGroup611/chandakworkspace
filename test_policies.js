require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.NEXT_PUBLIC_SUPABASE_URL
    .replace('https://', 'postgres://postgres:' + (process.env.SUPABASE_DB_PASSWORD || 'postgres') + '@')
    .replace('.supabase.co', '.supabase.co:6543/postgres')
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'software_amc'");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
