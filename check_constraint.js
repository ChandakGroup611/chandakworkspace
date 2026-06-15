const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    console.log('Fetching constraints...');
    const oldClient = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });

    await oldClient.connect();
    await newClient.connect();

    const constraintQuery = `
      SELECT pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'task_participants' AND c.conname = 'task_participants_participation_role_check';
    `;

    const oldRes = await oldClient.query(constraintQuery);
    console.log("OLD constraint:", oldRes.rows[0]?.def);

    const newRes = await newClient.query(constraintQuery);
    console.log("NEW constraint:", newRes.rows[0]?.def);
    
    // Get unique participation roles from OLD DB
    const rolesRes = await oldClient.query("SELECT DISTINCT participation_role FROM task_participants");
    console.log("OLD roles in data:", rolesRes.rows.map(r=>r.participation_role));

    await oldClient.end();
    await newClient.end();
}

main().catch(console.error);
