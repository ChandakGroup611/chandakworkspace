const { Client } = require('pg');
const client = new Client('postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres');
client.connect().then(() => client.query("SELECT code FROM public.roles WHERE id = 'c940b6ee-d774-4ccd-aa8e-06e40135e69c';")).then(res => { console.log(res.rows); client.end(); })
