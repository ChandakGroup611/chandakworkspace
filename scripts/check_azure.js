const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@db.tkovzymkubxtpcgynkgd.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to direct DB.");
    
    // Check if we can select from auth.users
    const res = await client.query(`
      SELECT id, email, raw_user_meta_data, raw_app_meta_data 
      FROM auth.users 
      WHERE raw_app_meta_data->>'provider' = 'azure'
      ORDER BY created_at DESC LIMIT 5;
    `);
    console.log("Azure users in auth.users:");
    console.log(JSON.stringify(res.rows, null, 2));
    
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
