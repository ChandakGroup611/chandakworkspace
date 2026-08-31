const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const res = await client.query(`
    SELECT id, email, full_name, role_code 
    FROM user_master 
    ORDER BY full_name;
  `);
  console.log("Users in user_master:");
  res.rows.forEach(r => console.log(`${r.full_name} - ${r.email} (${r.role_code})`));

  await client.end();
}

main().catch(console.error);
