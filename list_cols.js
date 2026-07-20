const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const res = await client.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('departments', 'designations') 
        ORDER BY table_name, ordinal_position;
    `);
    console.log("Columns:");
    res.rows.forEach(r => console.log(`${r.table_name}.${r.column_name} (${r.data_type})`));

    await client.end();
}

main().catch(console.error);
