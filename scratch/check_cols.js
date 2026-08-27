const { Client } = require('pg');

const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: newConnectionString });
    await client.connect();

    try {
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'status_master'
        `);
        console.log("status_master columns:", res.rows.map(r => r.column_name));
    } catch(e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
main();
