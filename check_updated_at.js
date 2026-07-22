require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  const tables = [
    'issue_types', 'issue_subtypes', 'ticket_categories', 'ticket_subcategories', 
    'status_master', 'priority_master', 'assets', 'software_systems', 'software_modules', 
    'software_submodules', 'departments', 'designations', 'master_categories', 'master_roles'
  ];
  
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = ANY($1)
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = information_schema.tables.table_name
          AND column_name = 'updated_at'
      );
  `;
  
  const res = await client.query(query, [tables]);
  console.log("Tables missing updated_at:", res.rows.map(r => r.table_name));
  
  await client.end();
}
check().catch(console.error);
