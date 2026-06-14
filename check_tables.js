const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const dbUrl = env.match(/DATABASE_URL=(.*)/)[1].trim();

const client = new Client({ connectionString: dbUrl });

async function run() {
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(res.rows.map(r => r.table_name).filter(n => n.includes('workspace')));
  await client.end();
}

run();
