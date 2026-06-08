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
      SELECT prosrc 
      FROM pg_proc 
      WHERE proname = 'update_task_count';
    `);
    console.log("\n--- Function 'update_task_count' source ---");
    if (res.rows.length > 0) {
      console.log(res.rows[0].prosrc);
    } else {
      console.log("Function update_task_count not found.");
    }

  } catch (err) {
    console.error("Inspector failed:", err);
  } finally {
    await client.end();
  }
}

main();
