const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } }); 
client.connect().then(() => 
  client.query("SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'user_master';")
).then(res => { 
  console.log(res.rows); 
  client.end(); 
}).catch(console.error);
