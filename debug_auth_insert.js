const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function testInsert() {
    const oldClient = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });

    await oldClient.connect();
    await newClient.connect();

    await newClient.query('SET session_replication_role = replica;');

    const oldColsRes = await oldClient.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'");
    const oldCols = oldColsRes.rows.map(r => r.column_name);

    const newColsRes = await newClient.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'");
    const newCols = newColsRes.rows.map(r => r.column_name);

    const intersection = newCols.filter(c => oldCols.includes(c));

    const dataRes = await oldClient.query(`SELECT "${intersection.join('", "')}" FROM auth.users LIMIT 1`);
    const row = dataRes.rows[0];

    const values = [];
    const params = [];
    let idx = 1;
    for (const col of intersection) {
        values.push(`$${idx++}`);
        params.push(row[col]);
    }

    try {
        const insertQuery = `
            INSERT INTO auth.users ("${intersection.join('", "')}") 
            VALUES (${values.join(', ')}) 
            ON CONFLICT (id) DO NOTHING
        `;
        await newClient.query(insertQuery, params);
        console.log('Success inserted auth.users');
    } catch (err) {
        console.error('Insert error:', err.message);
    }

    await oldClient.end();
    await newClient.end();
}

testInsert();
