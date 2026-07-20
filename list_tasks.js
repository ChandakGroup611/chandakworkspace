const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position");
    res.rows.forEach(r => console.log(r.column_name + ' (' + r.data_type + ')'));
    await client.end();
}
main().catch(console.error);
