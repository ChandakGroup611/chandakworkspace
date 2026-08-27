const { Client } = require('pg');

const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: newConnectionString });
    await client.connect();

    console.log("Connected to DB.");

    try {
        const res = await client.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('status_master', 'priority_master', 'category_master', 'sub_category_master', 'approval_types', 'task_types') 
              AND column_name = 'scope_id'
        `);
        console.log("Tables with scope_id:", res.rows);

        const resCon = await client.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid::regclass::text IN ('status_master', 'priority_master', 'category_master', 'sub_category_master', 'approval_types', 'task_types')
            AND n.nspname = 'public'
            AND contype = 'u'
        `);
        console.log("Unique constraints:");
        for (let row of resCon.rows) {
            console.log(row.conname, "-", row.pg_get_constraintdef);
        }

    } catch(e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
main();
