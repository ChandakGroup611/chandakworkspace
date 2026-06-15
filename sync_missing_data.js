const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    console.log('Syncing missing data from Old to New DB...');
    const oldClient = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });

    await oldClient.connect();
    await newClient.connect();
    await newClient.query("SET session_replication_role = replica;"); // Disable triggers for clean insert

    // 1. Sync User Master (1 missing)
    try {
        console.log("Fetching user_master...");
        const oldRes = await oldClient.query("SELECT * FROM public.user_master");
        let inserted = 0;
        for (const row of oldRes.rows) {
            const keys = Object.keys(row);
            const vals = Object.values(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO public.user_master (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
            const res = await newClient.query(query, vals);
            inserted += res.rowCount;
        }
        console.log(`Successfully merged ${inserted} missing users.`);
    } catch(e) { console.error("Error syncing user_master:", e.message); }

    // 2. Sync Task Participants (855 missing)
    try {
        console.log("Fetching task_participants...");
        const oldRes = await oldClient.query("SELECT * FROM public.task_participants");
        let inserted = 0;
        for (const row of oldRes.rows) {
            const keys = Object.keys(row);
            const vals = Object.values(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO public.task_participants (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (task_id, user_id) DO NOTHING`;
            const res = await newClient.query(query, vals);
            inserted += res.rowCount;
        }
        console.log(`Successfully merged ${inserted} missing task_participants.`);
    } catch(e) { console.error("Error syncing task_participants:", e.message); }

    // 3. Sync Task Checklists (2 missing)
    try {
        console.log("Fetching task_checklists...");
        const oldRes = await oldClient.query("SELECT * FROM public.task_checklists");
        let inserted = 0;
        for (const row of oldRes.rows) {
            const keys = Object.keys(row);
            const vals = Object.values(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO public.task_checklists (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
            const res = await newClient.query(query, vals);
            inserted += res.rowCount;
        }
        console.log(`Successfully merged ${inserted} missing task_checklists.`);
    } catch(e) { console.error("Error syncing task_checklists:", e.message); }

    await newClient.query("SET session_replication_role = origin;"); // Re-enable triggers
    await oldClient.end();
    await newClient.end();
    console.log("Sync complete!");
}

main().catch(console.error);
