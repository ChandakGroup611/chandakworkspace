const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL="([^"]+)"/)[1].trim();
const { Client } = require('pg');

async function test() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'priority_master'`);
  console.log(res.rows.map(r => r.column_name));
  await client.end();
}
test();
