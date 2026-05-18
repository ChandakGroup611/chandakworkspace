const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function provisionUsers() {
  console.log("Starting provisioning of 3 test personas...");

  const timestamp = Date.now();
  const personas = [
    { email: `superadmin_${timestamp}@adios.enterprise`, name: 'Test Super Admin', code: 'SUPER_ADMIN' },
    { email: `deptadmin_${timestamp}@adios.enterprise`, name: 'Test Dept Admin', code: 'ROLE_MANAGER' },
    { email: `staff_${timestamp}@adios.enterprise`, name: 'Test Staff', code: 'ROLE_STAFF' },
  ];

  const results = [];

  for (const p of personas) {
    const { data, error } = await supabase.auth.signUp({
      email: p.email,
      password: 'SecurePassword123!',
      options: { data: { full_name: p.name } }
    });

    if (error) {
      console.error(`Failed to create ${p.name}:`, error);
    } else {
      results.push({
        id: data.user.id,
        email: p.email,
        roleCode: p.code
      });
      console.log(`Created ${p.name}: ${data.user.id}`);
    }
  }

  console.log("\n==========================================");
  console.log("USER CREATION COMPLETE.");
  console.log("==========================================\n");
  console.log("ACTION REQUIRED: Run the following SQL in your Supabase Dashboard to grant roles:\n");
  
  let sql = "";
  for (const r of results) {
    sql += `INSERT INTO public.user_roles (user_id, role_id) \n`;
    sql += `SELECT '${r.id}', id FROM public.roles WHERE code = '${r.roleCode}';\n\n`;
  }
  
  console.log(sql);
}

provisionUsers();
