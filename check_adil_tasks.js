const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  const query = `
    SELECT u.full_name, COUNT(DISTINCT tp.task_id) as allocated_tasks
    FROM user_master u
    JOIN task_participants tp ON tp.user_id = u.id
    WHERE u.full_name ILIKE '%Adil%'
    GROUP BY u.full_name;
  `;
  const res = await client.query(query);
  console.log('Tasks allocated to Adil:');
  console.log(res.rows);
  
  await client.end();
}
run().catch(console.error);
