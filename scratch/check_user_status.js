const { Client } = require('pg');

const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: newConnectionString });
    await client.connect();

    try {
        const { rows: masters } = await client.query('SELECT is_active, is_deleted, department_id, designation_id, manager_id, role_id FROM public.user_master WHERE email = \'avinashpise@chandakgroup.com\';');
        console.log("\nUser Master Status:");
        console.log(masters);

    } catch(e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
main();
