const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    `);
    console.log("Public Tables:");
    res.rows.forEach(r => console.log(r.table_name));

    await client.end();
}

main().catch(console.error);
