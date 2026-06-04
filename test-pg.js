const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL="([^"]+)"/)[1].trim();
const { Client } = require('pg');

async function test() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='task_dependencies';
  `);
  console.log(res.rows);
  await client.end();
}
test();
