const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  
  const superAdminRoleId = 'cd5be727-8785-482e-855e-b8494b51d93b';
  
  // Update super@gmail.com to actually have SUPER_ADMIN role instead of ROLE_ADMIN
  const res = await client.query("UPDATE user_master SET role_id = $1 WHERE email = 'super@gmail.com' RETURNING id, full_name, role_id", [superAdminRoleId]);
  console.log('Fixed super@gmail.com:', res.rows);
  
  // Also fix ui_superadmin@adios.com if they were supposed to be SUPER_ADMIN
  // and make sure chrome_superadmin@adios.com has it too!
  const res2 = await client.query("UPDATE user_master SET role_id = $1 WHERE email = 'chrome_superadmin@adios.com' RETURNING id, full_name, role_id", [superAdminRoleId]);
  console.log('Fixed chrome_superadmin@adios.com:', res2.rows);

  await client.end();
}
run().catch(console.error);
