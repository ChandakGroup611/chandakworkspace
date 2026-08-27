const { Client } = require('pg');
const client = new Client('postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres');
client.connect()
  .then(() => Promise.all([
    client.query("SELECT id FROM auth.users WHERE email = 'avinashpise@chandakgroup.com'"),
    client.query("SELECT id FROM public.user_master WHERE email = 'avinashpise@chandakgroup.com'")
  ]))
  .then(results => { 
    console.log('Auth ID:', results[0].rows); 
    console.log('Master ID:', results[1].rows); 
    client.end(); 
  })
