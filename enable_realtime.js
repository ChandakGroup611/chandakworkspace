const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  
  // Enable realtime for role_permissions and roles tables so the UI updates instantly!
  try {
    await client.query("ALTER PUBLICATION supabase_realtime ADD TABLE role_permissions;");
    console.log("Added role_permissions to realtime");
  } catch(e) { console.log(e.message); }
  
  try {
    await client.query("ALTER PUBLICATION supabase_realtime ADD TABLE roles;");
    console.log("Added roles to realtime");
  } catch(e) { console.log(e.message); }
  
  await client.end();
}
run().catch(console.error);
