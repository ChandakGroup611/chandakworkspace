const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    const oldClient = new Client({ connectionString: oldConnectionString });
    const newClient = new Client({ connectionString: newConnectionString });

    await oldClient.connect();
    await newClient.connect();

    await newClient.query("SET session_replication_role = replica;");

    const failedTables = [
        { name: 'priority_master', constraint: 'master_priorities_code_key' },
        { name: 'status_master', constraint: 'workflow_states_code_key' }
    ];

    for (const tableObj of failedTables) {
        const table = tableObj.name;
        const constraint = tableObj.constraint;

        // Clear existing
        await newClient.query(`DELETE FROM public.${table}`);

        const oldColsRes = await oldClient.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table]);
        const oldCols = oldColsRes.rows.map(r => r.column_name);

        const newColsRes = await newClient.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table]);
        const newCols = newColsRes.rows.map(r => r.column_name);

        const intersection = newCols.filter(c => oldCols.includes(c));
        const dataRes = await oldClient.query(`SELECT "${intersection.join('", "')}" FROM public.${table}`);
        const rows = dataRes.rows;

        for (const r of rows) {
            const rVals = [];
            const rParams = [];
            let rIdx = 1;
            for (const col of intersection) {
                rVals.push(`$${rIdx++}`);
                rParams.push(r[col]);
            }
            try {
                await newClient.query(
                    `INSERT INTO public.${table} ("${intersection.join('", "')}") VALUES (${rVals.join(', ')}) ON CONFLICT ON CONSTRAINT "${constraint}" DO NOTHING`, 
                    rParams
                );
            } catch(e) {
                console.error(`Row failed unconditionally: ${JSON.stringify(r)} => ${e.message}`);
            }
        }
        console.log(`Successfully migrated ${table} with conflict resolution.`);
    }

    await newClient.query("SET session_replication_role = origin;");
    await oldClient.end();
    await newClient.end();
    console.log("Migration finalized!");
}

main().catch(console.error);
