const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const resTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('tasks', 'sub_tasks');
  `);
  console.log("Matching tables in DB:", resTables.rows.map(r => r.table_name));

  for (const table of resTables.rows.map(r => r.table_name)) {
    const resCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);
    console.log(`Columns in ${table}:`, resCols.rows.map(r => `${r.column_name} (${r.data_type})`));
  }

  await client.end();
}

main().catch(console.error);
