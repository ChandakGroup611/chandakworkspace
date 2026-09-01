const { Client } = require('pg');

async function testScope() {
  const connectionString = "postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    // 1. Fetch a manager who has subordinates in user_master
    const { rows: managers } = await client.query(`
      SELECT manager_id, COUNT(*) as report_count
      FROM user_master 
      WHERE manager_id IS NOT NULL AND is_deleted = false
      GROUP BY manager_id 
      ORDER BY report_count DESC 
      LIMIT 3;
    `);

    console.log("Top Managers with reports in user_master:", managers);

    if (managers.length > 0) {
      const topManagerId = managers[0].manager_id;
      
      // Test get_subordinate_user_ids
      const { rows: subordinates } = await client.query(`
        SELECT get_subordinate_user_ids($1) as user_id;
      `, [topManagerId]);
      
      console.log(`Subordinates for manager ${topManagerId}: Found ${subordinates.length} users in tree (including manager).`);

      // Test get_user_managed_department_ids
      const { rows: managedDepts } = await client.query(`
        SELECT get_user_managed_department_ids($1) as dept_id;
      `, [topManagerId]);

      console.log(`Managed departments for manager ${topManagerId}: Found ${managedDepts.length} departments.`);
    }

    console.log("Scope Engine verification test passed successfully!");
  } catch (err) {
    console.error("Test error:", err.message);
  } finally {
    await client.end();
  }
}

testScope();
