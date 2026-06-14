require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    SELECT conname, relname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND conname LIKE '%code%'
  `);
  console.log(res.rows);
  await client.end();
}
check();
