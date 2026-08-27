const { Client } = require('pg');

const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: newConnectionString });
    await client.connect();

    try {
        console.log("Dropping workflow_states_code_key...");
        await client.query(`ALTER TABLE status_master DROP CONSTRAINT IF EXISTS workflow_states_code_key;`);
        
        console.log("Adding status_master_code_scope_key...");
        await client.query(`ALTER TABLE status_master ADD CONSTRAINT status_master_code_scope_key UNIQUE (status_code, scope_id);`);
        
        console.log("Dropping approval_types_code_key...");
        await client.query(`ALTER TABLE approval_types DROP CONSTRAINT IF EXISTS approval_types_code_key;`);
        
        console.log("Adding approval_types_code_scope_key...");
        // Assuming approval_types uses 'code' as column name.
        await client.query(`ALTER TABLE approval_types ADD CONSTRAINT approval_types_code_scope_key UNIQUE (code, scope_id);`);

        console.log("Dropping task_types_code_key...");
        await client.query(`ALTER TABLE task_types DROP CONSTRAINT IF EXISTS task_types_code_key;`);
        
        console.log("Adding task_types_code_scope_key...");
        // Assuming task_types uses 'code' as column name.
        await client.query(`ALTER TABLE task_types ADD CONSTRAINT task_types_code_scope_key UNIQUE (code, scope_id);`);
        
        console.log("All constraints updated successfully!");
    } catch(e) {
        console.error("Error updating constraints:", e);
    } finally {
        await client.end();
    }
}
main();
