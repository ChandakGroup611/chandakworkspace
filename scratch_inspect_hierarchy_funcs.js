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
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname LIKE '%hierarchy%';
    `);
    console.log("\n--- Functions with 'hierarchy' in their name ---");
    for (const row of res.rows) {
      console.log(`\n================ ${row.proname} ================`);
      console.log(row.prosrc);
    }

  } catch (err) {
    console.error("Inspector failed:", err);
  } finally {
    await client.end();
  }
}

main();
