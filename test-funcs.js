const { Client } = require('pg'); 
const c = new Client({ connectionString: 'postgresql://postgres:Chandak_Workspace@db.tkovzymkubxtpcgynkgd.supabase.co:5432/postgres' }); 
c.connect().then(async () => { 
    const res = await c.query("SELECT proname FROM pg_proc WHERE proname LIKE '%workspace_descendants%'"); 
    console.log('FUNCTIONS:', res.rows.map(r => r.proname).join(', ')); 
    c.end(); 
});
