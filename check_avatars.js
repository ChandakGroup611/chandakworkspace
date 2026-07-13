const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const client = new Client({ connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  client.query(`
    SELECT id, full_name, profile_photo 
    FROM user_master 
    WHERE is_active = true 
    LIMIT 10;
  `).then(res => {
    console.table(res.rows);
    client.end();
  });
});
