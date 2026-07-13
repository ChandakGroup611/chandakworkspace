const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } }); 
client.connect().then(() => client.query('SELECT COUNT(*) FROM auth.users;'))
.then(res => { 
  console.log('Auth users:', res.rows[0].count); 
  return client.query('SELECT COUNT(*) FROM public.user_master;'); 
})
.then(res => { 
  console.log('User master:', res.rows[0].count); 
  client.end(); 
}).catch(console.error);
