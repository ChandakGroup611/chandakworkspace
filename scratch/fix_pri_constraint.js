const { Client } = require('pg');

const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: newConnectionString });
    await client.connect();

    try {
        console.log("Removing duplicates...");
        await client.query(`
            DELETE FROM priority_master 
            WHERE id IN (
                SELECT id 
                FROM (
                    SELECT id, row_number() OVER (PARTITION BY priority_code, scope_id ORDER BY created_at ASC) as rnum 
                    FROM priority_master
                ) t 
                WHERE t.rnum > 1
            );
        `);
        console.log("Duplicates removed!");

        console.log("Updating priority_master constraint...");
        await client.query(`ALTER TABLE priority_master DROP CONSTRAINT IF EXISTS priority_master_code_scope_key;`);
        await client.query(`ALTER TABLE priority_master ADD CONSTRAINT priority_master_code_scope_key UNIQUE (priority_code, scope_id);`);
        console.log("Constraint updated!");
        
    } catch(e) {
        console.error("Error updating priority_master:", e);
    } finally {
        await client.end();
    }
}
main();
