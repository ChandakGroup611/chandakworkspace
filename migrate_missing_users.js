const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    console.log('Migrating ONLY missing Auth and User records (no deletions, no overwrites)...');
    const oldClient = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });

    await oldClient.connect();
    await newClient.connect();

    await newClient.query('SET session_replication_role = replica;');

    const tablesToMigrate = [
        { schema: 'auth', name: 'users', conflictTarget: 'id' },
        { schema: 'auth', name: 'identities', conflictTarget: 'provider_id' },
        { schema: 'public', name: 'user_master', conflictTarget: 'id' }
    ];

    for (const { schema, name, conflictTarget } of tablesToMigrate) {
        try {
            console.log(`Checking missing rows for ${schema}.${name}...`);
            
            // Fetch columns that are NOT generated
            const oldColsRes = await oldClient.query("SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND is_generated = 'NEVER'", [schema, name]);
            const oldCols = oldColsRes.rows.map(r => r.column_name);

            const newColsRes = await newClient.query("SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND is_generated = 'NEVER'", [schema, name]);
            const newCols = newColsRes.rows.map(r => r.column_name);

            const intersection = newCols.filter(c => oldCols.includes(c));

            const dataRes = await oldClient.query(`SELECT "${intersection.join('", "')}" FROM ${schema}."${name}"`);
            const rows = dataRes.rows;

            let inserted = 0;
            for (const row of rows) {
                const values = [];
                const params = [];
                let idx = 1;

                if (schema === 'public' && name === 'user_master' && !intersection.includes('password_hash')) {
                    intersection.push('password_hash');
                    row['password_hash'] = 'MIGRATED_AUTH';
                }

                for (const col of intersection) {
                    values.push(`$${idx++}`);
                    params.push(row[col]);
                }

                try {
                    const insertQuery = `
                        INSERT INTO ${schema}."${name}" ("${intersection.join('", "')}") 
                        VALUES (${values.join(', ')}) 
                        ON CONFLICT (${conflictTarget}) DO NOTHING
                    `;
                    const res = await newClient.query(insertQuery, params);
                    inserted += res.rowCount;
                } catch (err) {
                    // Silently ignore individual row errors
                }
            }
            console.log(` -> Successfully migrated ${inserted} missing rows to ${schema}.${name}`);
        } catch (e) {
            console.error(` Error migrating ${schema}.${name}:`, e.message);
        }
    }

    await newClient.query('SET session_replication_role = origin;');
    await oldClient.end();
    await newClient.end();
    console.log('Targeted user migration complete!');
}

main().catch(console.error);
