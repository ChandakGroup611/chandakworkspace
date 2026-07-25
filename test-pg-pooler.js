require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

async function run() {
  const connectionString = 'postgresql://postgres:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?options=project%3Dtkovzymkubxtpcgynkgd';
  const sql = postgres(connectionString, { ssl: 'require' });

  try {
    const result = await sql`SELECT 1 as test`;
    console.log("Connection successful! Result:", result);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await sql.end();
  }
}

run();
