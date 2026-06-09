const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    console.log("Starting retry data migration...");
    const oldClient = new Client({ connectionString: oldConnectionString });
    const newClient = new Client({ connectionString: newConnectionString });

    await oldClient.connect();
    await newClient.connect();

    console.log("Connected to both databases.");

    // Disable triggers and foreign keys on the target connection for bulk insert
    await newClient.query("SET session_replication_role = replica;");

    // Only retry the failed tables!
    const failedTables = ['user_master', 'priority_master', 'status_master'];

    for (const table of failedTables) {
        try {
            // Check if there is data
            const countRes = await oldClient.query(`SELECT count(*) FROM public.${table}`);
            const count = parseInt(countRes.rows[0].count);

            if (count > 0) {
                console.log(`Migrating ${count} rows for table: ${table}`);
                
                const oldColsRes = await oldClient.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table]);
                const oldCols = oldColsRes.rows.map(r => r.column_name);

                const newColsRes = await newClient.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table]);
                const newCols = newColsRes.rows.map(r => r.column_name);

                const intersection = newCols.filter(c => oldCols.includes(c));
                console.log(`  Columns mapped for ${table}:`, intersection.join(', '));

                // Fetch all data using only intersected columns
                const dataRes = await oldClient.query(`SELECT "${intersection.join('", "')}" FROM public.${table}`);
                const rows = dataRes.rows;

                if (rows.length === 0) continue;

                // Clear the target table first
                await newClient.query(`DELETE FROM public.${table}`);

                // Bulk insert rows
                const CHUNK_SIZE = 500;
                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + CHUNK_SIZE);
                    
                    const values = [];
                    const flatParams = [];
                    let paramIdx = 1;

                    for (const row of chunk) {
                        const rowPlaceholders = [];
                        for (const col of intersection) {
                            rowPlaceholders.push(`$${paramIdx++}`);
                            flatParams.push(row[col]);
                        }
                        values.push(`(${rowPlaceholders.join(', ')})`);
                    }

                    const insertQuery = `INSERT INTO public.${table} ("${intersection.join('", "')}") VALUES ${values.join(', ')}`;
                    
                    try {
                        await newClient.query(insertQuery, flatParams);
                    } catch (err) {
                        console.error(`  [INSERT ERROR in ${table}]:`, err.message);
                        console.error(`  Failing Query Sample: INSERT INTO public.${table} ("${intersection.join('", "')}") VALUES (${chunk[0][intersection[0]]}...)`);
                        // Try inserting one by one to see which row fails!
                        for(const r of chunk) {
                            const rVals = [];
                            const rParams = [];
                            let rIdx = 1;
                            for (const col of intersection) {
                                rVals.push(`$${rIdx++}`);
                                rParams.push(r[col]);
                            }
                            try {
                                await newClient.query(`INSERT INTO public.${table} ("${intersection.join('", "')}") VALUES (${rVals.join(', ')})`, rParams);
                            } catch(innerErr) {
                                console.error(`    Row failed: ${JSON.stringify(r)} => ${innerErr.message}`);
                            }
                        }
                    }
                }
                console.log(`  -> Successfully processed ${table}`);
            }
        } catch (e) {
            console.error(`Error migrating table ${table}:`, e.message);
        }
    }

    // Restore normal trigger behavior
    await newClient.query("SET session_replication_role = origin;");

    await oldClient.end();
    await newClient.end();
    console.log("Retry done!");
}

main().catch(console.error);
