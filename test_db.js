const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
    console.log("Tables:", res.rows.map(r => r.tablename));
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.end();
  }
}

main();
