const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    console.log('Starting full database migration (auth & public)...');
    const oldClient = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });

    await oldClient.connect();
    await newClient.connect();

    console.log('Connected to both databases successfully.');

    // Disable triggers and foreign key constraints on the target database
    await newClient.query('SET session_replication_role = replica;');

    // Tables to migrate in exact order (auth first to avoid any weirdness, though FKs are disabled)
    const tablesToMigrate = [
        { schema: 'auth', name: 'users' },
        { schema: 'auth', name: 'identities' }
    ];

    // Fetch all public tables
    const publicTablesRes = await oldClient.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
    for (const r of publicTablesRes.rows) {
        tablesToMigrate.push({ schema: 'public', name: r.tablename });
    }

    for (const { schema, name } of tablesToMigrate) {
        try {
            // Check if table exists in target
            const targetCheck = await newClient.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)", [schema, name]);
            if (!targetCheck.rows[0].exists) {
                console.log(`Skipping ${schema}.${name} (does not exist in target)`);
                continue;
            }

            // Get count from old DB
            const countRes = await oldClient.query(`SELECT count(*) FROM ${schema}."${name}"`);
            const count = parseInt(countRes.rows[0].count);

            if (count === 0) {
                console.log(`Skipping ${schema}.${name} (0 rows)`);
                continue;
            }

            console.log(`Migrating ${count} rows for ${schema}.${name}...`);

            // Find common columns
            const oldColsRes = await oldClient.query("SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2", [schema, name]);
            const oldCols = oldColsRes.rows.map(r => r.column_name);

            const newColsRes = await newClient.query("SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2", [schema, name]);
            const newCols = newColsRes.rows.map(r => r.column_name);

            const intersection = newCols.filter(c => oldCols.includes(c));
            if (intersection.length === 0) continue;

            // Clear target table to prevent duplicate key violations
            // Using DELETE instead of TRUNCATE to avoid cascading issues
            await newClient.query(`DELETE FROM ${schema}."${name}"`);

            // Fetch data
            const dataRes = await oldClient.query(`SELECT "${intersection.join('", "')}" FROM ${schema}."${name}"`);
            const rows = dataRes.rows;

            // Chunk insertion
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

                const insertQuery = `INSERT INTO ${schema}."${name}" ("${intersection.join('", "')}") VALUES ${values.join(', ')}`;
                await newClient.query(insertQuery, flatParams);
            }
            console.log(` -> Successfully migrated ${count} rows to ${schema}.${name}`);
        } catch (e) {
            console.error(` Error migrating ${schema}.${name}:`, e.message);
        }
    }

    // Reset sequences for all migrated public tables
    console.log("Updating sequences...");
    const seqRes = await newClient.query("SELECT c.relname FROM pg_class c WHERE c.relkind = 'S'");
    for (const row of seqRes.rows) {
        const seqName = row.relname;
        const match = seqName.match(/^(.*)_(id|code)_seq$/);
        if (match) {
            const table = match[1];
            const col = match[2];
            try {
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

    // Restore standard trigger checks
    await newClient.query('SET session_replication_role = origin;');

    await oldClient.end();
    await newClient.end();
    console.log('Data migration fully completed!');
}

main().catch(console.error);
