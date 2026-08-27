const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' });
client.connect().then(() => 
    client.query(`SELECT priority_code, priority_name, scope_id, scope_type, is_active FROM priority_master WHERE priority_code = 'NORMAL'`)
        .then(res => { console.log(res.rows); client.end(); })
);
