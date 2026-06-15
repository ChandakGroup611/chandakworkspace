const { Client } = require('pg');
const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function check() {
  const oldC = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
  const newC = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });
  await oldC.connect(); await newC.connect();
  
  const tables = await oldC.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  
  console.log('Table Counts (Old vs New):');
  for(let row of tables.rows) {
    const t = row.table_name;
    try {
      const oCount = await oldC.query('SELECT count(*) FROM public."' + t + '"');
      const nCount = await newC.query('SELECT count(*) FROM public."' + t + '"');
      if (oCount.rows[0].count !== nCount.rows[0].count) {
         console.log(t, '-> Old:', oCount.rows[0].count, 'New:', nCount.rows[0].count);
      }
    } catch(e) {}
  }
  await oldC.end(); await newC.end();
}
check();
