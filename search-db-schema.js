const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function run() {
  let url = process.env.DATABASE_URL;
  const match = url.match(/postgresql:\/\/(postgres\.[^:]+):([^@]+)@([^:]+):6543\/(.+)/);
  if (match) {
    const password = match[2];
    const projectRef = match[1].split('.')[1];
    url = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name LIKE '%executive%'");
  console.log("executive:", res.rows);
  const res2 = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name LIKE '%assign%'");
  console.log("assign:", res2.rows);
  await client.end();
}
run();
