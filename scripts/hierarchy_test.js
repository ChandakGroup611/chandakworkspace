const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

async function runTests() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log("Connected to database. Running Phase W4 Hierarchy Tests...");

    // Setup mock schema and data just for testing the CTE logic locally
    await client.query(`
      CREATE TEMP TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_workspace_id UUID,
        is_deleted BOOLEAN DEFAULT false
      );

      CREATE OR REPLACE FUNCTION pg_temp.get_workspace_descendants(root_id UUID)
      RETURNS SETOF UUID
      LANGUAGE sql
      STABLE
      AS $$
        WITH RECURSIVE workspace_tree(id, path) AS (
          SELECT id, ARRAY[id]
          FROM workspaces
          WHERE id = root_id 
          AND is_deleted = false
          
          UNION ALL
          
          SELECT w.id, path || w.id
          FROM workspaces w
          JOIN workspace_tree wt ON w.parent_workspace_id = wt.id
          WHERE w.is_deleted = false
            AND NOT w.id = ANY(path)
        )
        SELECT id FROM workspace_tree;
      $$;
    `);

    // Helper to run query
    const getDescendants = async (id) => {
      const res = await client.query(`SELECT * FROM pg_temp.get_workspace_descendants($1)`, [id]);
      return res.rows.map(r => r.get_workspace_descendants);
    };

    // Test 1: Simple Hierarchy
    console.log("\n--- Test 1: Simple Hierarchy ---");
    const t1 = await client.query(`
      INSERT INTO workspaces (id, parent_workspace_id) VALUES 
        ('11111111-1111-1111-1111-111111111111', NULL),
        ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
        ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111')
      RETURNING id;
    `);
    const r1 = await getDescendants('11111111-1111-1111-1111-111111111111');
    console.log(`Expected 3 nodes. Got: ${r1.length}. ${r1.length === 3 ? 'PASS' : 'FAIL'}`);

    // Test 2: Deep Hierarchy
    console.log("\n--- Test 2: Deep Hierarchy ---");
    await client.query(`
      INSERT INTO workspaces (id, parent_workspace_id) VALUES 
        ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333'),
        ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444')
    `);
    const r2 = await getDescendants('11111111-1111-1111-1111-111111111111');
    console.log(`Expected 5 nodes (A,B,C,D,E). Got: ${r2.length}. ${r2.length === 5 ? 'PASS' : 'FAIL'}`);

    // Test 3: Deleted Node Exclusion
    console.log("\n--- Test 3: Deleted Node Exclusion ---");
    await client.query(`
      INSERT INTO workspaces (id, parent_workspace_id, is_deleted) VALUES 
        ('66666666-6666-6666-6666-666666666666', NULL, false),
        ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', true),
        ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', false)
    `);
    const r3 = await getDescendants('66666666-6666-6666-6666-666666666666');
    console.log(`Expected 1 node (Root only, skipping deleted B and orphan C). Got: ${r3.length}. ${r3.length === 1 ? 'PASS' : 'FAIL'}`);

    // Test 4: Cycle Protection
    console.log("\n--- Test 4: Cycle Protection ---");
    await client.query(`
      INSERT INTO workspaces (id, parent_workspace_id) VALUES 
        ('99999999-9999-9999-9999-999999999999', NULL),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999'),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
        
      UPDATE workspaces SET parent_workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = '99999999-9999-9999-9999-999999999999';
    `);
    const r4 = await getDescendants('99999999-9999-9999-9999-999999999999');
    console.log(`Cycle bypassed successfully. Got unique nodes: ${r4.length}. ${r4.length === 3 ? 'PASS' : 'FAIL'}`);

    // Test 5: Large Dataset
    console.log("\n--- Test 5: Large Dataset (10000 nodes) ---");
    let largeRoot = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    await client.query(`INSERT INTO workspaces (id, parent_workspace_id) VALUES ('${largeRoot}', NULL)`);
    
    // Create 10,000 children attached to largeRoot
    let values = [];
    for (let i = 0; i < 10000; i++) {
      values.push(`(gen_random_uuid(), '${largeRoot}')`);
    }
    
    // Batch insert
    console.log("Inserting 10,000 nodes...");
    await client.query(`INSERT INTO workspaces (id, parent_workspace_id) VALUES ${values.join(',')}`);
    
    console.log("Querying CTE...");
    console.time("Hierarchy_CTE_Duration");
    const r5 = await getDescendants(largeRoot);
    console.timeEnd("Hierarchy_CTE_Duration");
    
    console.log(`Expected 10001 nodes. Got: ${r5.length}. ${r5.length === 10001 ? 'PASS' : 'FAIL'}`);

  } catch (err) {
    console.error("Test Error:", err.message);
  } finally {
    await client.end();
  }
}

runTests();
