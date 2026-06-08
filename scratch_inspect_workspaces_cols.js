const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to DB!");

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workspaces';
    `);
    console.log("\n--- 'workspaces' columns ---");
    console.table(res.rows);

    const resTriggers = await client.query(`
      SELECT trigger_name, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'workspaces';
    `);
    console.log("\n--- 'workspaces' triggers ---");
    console.table(resTriggers.rows);

  } catch (err) {
    console.error("Inspector failed:", err);
  } finally {
    await client.end();
  }
}

main();
