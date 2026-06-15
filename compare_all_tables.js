const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    console.log('Comparing all tables across databases...');
    const oldClient = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });

    await oldClient.connect();
    await newClient.connect();

    const getTablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `;

    const tablesRes = await oldClient.query(getTablesQuery);
    const tables = tablesRes.rows.map(r => r.table_name);

    console.log(String("TABLE").padEnd(30) + String("OLD DB").padStart(10) + String("NEW DB").padStart(10) + String("DIFF").padStart(10));
    console.log("-".repeat(60));

    let totalMissing = 0;

    for (const table of tables) {
        try {
            const oldRes = await oldClient.query(`SELECT COUNT(*) FROM public.${table}`);
            const newRes = await newClient.query(`SELECT COUNT(*) FROM public.${table}`);
            
            const oldCount = parseInt(oldRes.rows[0].count);
            const newCount = parseInt(newRes.rows[0].count);
            const diff = oldCount - newCount;

            if (diff !== 0) {
                totalMissing += diff;
                console.log(
                    String(table).padEnd(30) + 
                    String(oldCount).padStart(10) + 
                    String(newCount).padStart(10) + 
                    String(diff).padStart(10) + "  <--- MISSING!"
                );
            } else {
                console.log(
                    String(table).padEnd(30) + 
                    String(oldCount).padStart(10) + 
                    String(newCount).padStart(10) + 
                    String(diff).padStart(10)
                );
            }
        } catch (e) {
            console.log(`Error checking table ${table}: ${e.message}`);
        }
    }

    console.log("-".repeat(60));
    if (totalMissing > 0) {
        console.log(`Found ${totalMissing} total missing rows across all tables.`);
    } else {
        console.log("All tables are perfectly synced!");
    }

    await oldClient.end();
    await newClient.end();
}

main().catch(console.error);
