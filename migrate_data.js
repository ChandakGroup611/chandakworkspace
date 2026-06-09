const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    console.log("Starting data migration...");
    const oldClient = new Client({ connectionString: oldConnectionString });
    const newClient = new Client({ connectionString: newConnectionString });

    await oldClient.connect();
    await newClient.connect();

    console.log("Connected to both databases.");

    // Disable triggers and foreign keys on the target connection for bulk insert
    await newClient.query("SET session_replication_role = replica;");

    // Get all tables in the public schema of the old database
    const tablesRes = await oldClient.query(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`);
    const allTables = tablesRes.rows.map(r => r.tablename);

    // Get all tables in the public schema of the new database (to ensure they exist)
    const newTablesRes = await newClient.query(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`);
    const newTables = newTablesRes.rows.map(r => r.tablename);

    for (const table of allTables) {
        if (!newTables.includes(table)) {
            console.log(`Skipping ${table} (does not exist in new database)`);
            continue;
        }

        try {
            // Check if there is data
            const countRes = await oldClient.query(`SELECT count(*) FROM public.${table}`);
            const count = parseInt(countRes.rows[0].count);

            if (count > 0) {
                console.log(`Migrating ${count} rows for table: ${table}`);
                
                // Fetch all data
                const dataRes = await oldClient.query(`SELECT * FROM public.${table}`);
                const rows = dataRes.rows;

                if (rows.length === 0) continue;

                // Build insert query
                const columns = Object.keys(rows[0]);
                
                // Clear the target table first to avoid conflicts
                // await newClient.query(`TRUNCATE TABLE public.${table} CASCADE`);
                // Wait, truncate might fail or cascade to other tables unnecessarily if we do it table-by-table while FKs are disabled?
                // Actually, since session_replication_role is replica, TRUNCATE without cascade is fine, or DELETE is fine.
                await newClient.query(`DELETE FROM public.${table}`);

                // Bulk insert rows in chunks of 500 to avoid query size limits
                const CHUNK_SIZE = 500;
                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + CHUNK_SIZE);
                    
                    const values = [];
                    const flatParams = [];
                    let paramIdx = 1;

                    for (const row of chunk) {
                        const rowPlaceholders = [];
                        for (const col of columns) {
                            rowPlaceholders.push(`$${paramIdx++}`);
                            flatParams.push(row[col]);
                        }
                        values.push(`(${rowPlaceholders.join(', ')})`);
                    }

                    const insertQuery = `INSERT INTO public.${table} ("${columns.join('", "')}") VALUES ${values.join(', ')}`;
                    await newClient.query(insertQuery, flatParams);
                }
                console.log(`  -> Successfully migrated ${table}`);
            }
        } catch (e) {
            console.error(`Error migrating table ${table}:`, e.message);
        }
    }

    // Restore normal trigger behavior
    await newClient.query("SET session_replication_role = origin;");

    console.log("Data migration complete! Updating sequences...");

    // Update sequences
    const seqRes = await newClient.query(`SELECT c.relname FROM pg_class c WHERE c.relkind = 'S'`);
    for (const row of seqRes.rows) {
        const seqName = row.relname;
        // Attempt to guess the table and column name from the sequence name (table_id_seq)
        const match = seqName.match(/^(.*)_(id|code)_seq$/);
        if (match) {
            const table = match[1];
            const col = match[2];
            if (newTables.includes(table)) {
                try {
                    // Reset sequence to max value
                    if (col === 'code') {
                         await newClient.query(`SELECT setval('public.${seqName}', COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '\\D', '', 'g'), '')::integer) FROM public.${table}), 0) + 1, false)`);
                    } else {
                         await newClient.query(`SELECT setval('public.${seqName}', COALESCE((SELECT MAX(id) FROM public.${table}), 0) + 1, false)`);
                    }
                } catch (e) {
                    // Ignore sequence update errors
                }
            }
        }
    }

    await oldClient.end();
    await newClient.end();
    console.log("All done!");
}

main().catch(console.error);
