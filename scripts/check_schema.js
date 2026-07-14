const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
async function run() {
  await client.connect();
  const res2 = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'email_queue'
  `);
  console.log('email_queue columns:', res2.rows.map(r => r.column_name));
  await client.end();
}
run().catch(console.error);
