const { Client } = require('pg');

const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: newConnectionString });
    await client.connect();

    try {
        console.log("Finding duplicates...");
        const dupesRes = await client.query(`
            SELECT priority_code, scope_id, array_agg(id ORDER BY created_at ASC) as ids
            FROM priority_master
            GROUP BY priority_code, scope_id
            HAVING count(*) > 1;
        `);

        console.log("Duplicates found:", dupesRes.rows.length);

        for (const row of dupesRes.rows) {
            const primaryId = row.ids[0];
            const duplicateIds = row.ids.slice(1);
            
            console.log(`Primary: ${primaryId}, Duplicates: ${duplicateIds.join(', ')}`);

            // Update requirements
            await client.query(`
                UPDATE requirements 
                SET business_criticality_id = $1 
                WHERE business_criticality_id = ANY($2)
            `, [primaryId, duplicateIds]);

            // Update tickets
            await client.query(`
                UPDATE tickets 
                SET priority_id = $1 
                WHERE priority_id = ANY($2)
            `, [primaryId, duplicateIds]);

            // Update tasks
            await client.query(`
                UPDATE tasks 
                SET priority_id = $1 
                WHERE priority_id = ANY($2)
            `, [primaryId, duplicateIds]);

            // Now delete duplicates
            await client.query(`
                DELETE FROM priority_master 
                WHERE id = ANY($1)
            `, [duplicateIds]);
            console.log(`Deleted duplicates for ${row.priority_code}`);
        }

        console.log("Updating priority_master constraint...");
        await client.query(`ALTER TABLE priority_master DROP CONSTRAINT IF EXISTS priority_master_code_scope_key;`);
        await client.query(`ALTER TABLE priority_master ADD CONSTRAINT priority_master_code_scope_key UNIQUE (priority_code, scope_id);`);
        console.log("Constraint updated!");
        
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
main();
