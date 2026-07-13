const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } }); 
client.connect().then(() => client.query(`
  SELECT um.id, um.email 
  FROM public.user_master um 
  LEFT JOIN auth.users au ON um.id = au.id 
  WHERE au.id IS NULL;
`))
.then(res => { 
  console.log('User master without Auth records:', res.rows); 
  client.end(); 
}).catch(console.error);
