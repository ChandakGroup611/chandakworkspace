const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } }); 
client.connect().then(() => 
  client.query("SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname IN ('handle_new_user', 'on_auth_user_created');")
).then(res => { 
  console.log(res.rows); 
  client.end(); 
}).catch(console.error);
