const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function queryDB() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    console.log("--- Checking User Master for recently created users ---");
    const res = await client.query(`
      SELECT id, full_name, email, is_deleted, created_at 
      FROM user_master 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.log(res.rows);

    if (res.rows.length > 0) {
      const recentUserId = res.rows[0].id;
      console.log(`\n--- Checking Roles for User ${recentUserId} ---`);
      const roleRes = await client.query(`
        SELECT r.code 
        FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = $1
      `, [recentUserId]);
      console.log(roleRes.rows);

      console.log(`\n--- Checking Notification Queue ---`);
      const nqRes = await client.query(`
        SELECT id, target_user_id, action_type 
        FROM notification_queue 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log(nqRes.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

queryDB();
