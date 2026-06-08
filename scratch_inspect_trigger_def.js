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
      SELECT tgname, pg_get_triggerdef(oid) AS trigger_def
      FROM pg_trigger
      WHERE tgname = 'trg_update_task_count';
    `);
    console.log("\n--- Trigger 'trg_update_task_count' Definition ---");
    if (res.rows.length > 0) {
      console.log(res.rows[0].trigger_def);
    } else {
      console.log("Trigger trg_update_task_count not found.");
    }

  } catch (err) {
    console.error("Inspector failed:", err);
  } finally {
    await client.end();
  }
}

main();
