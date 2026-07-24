const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    await client.query("ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS status_trigger text DEFAULT 'ANY';");
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}
run();
