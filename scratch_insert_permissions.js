const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' }); 
client.connect().then(() => 
  client.query(`INSERT INTO permissions_master (permission_code, permission_name, module_name, description) VALUES 
  ('DATA_MIGRATION_VIEW', 'Data Migration Access', 'System Settings', 'Access to the bulk Data Migration engine'), 
  ('TASKS_TRANSFER', 'Transfer Tasks', 'Workspaces', 'Access to transfer tasks in bulk across workspaces') 
  ON CONFLICT DO NOTHING;`)
    .then(res => { console.log(res); client.end(); })
).catch(console.error);
