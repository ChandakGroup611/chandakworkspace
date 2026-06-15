const { Client } = require('pg');

const oldConnectionString = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    console.log('Syncing missing data from Old to New DB...');
    const oldClient = new Client({ connectionString: oldConnectionString, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: newConnectionString, ssl: { rejectUnauthorized: false } });

    await oldClient.connect();
    await newClient.connect();

    await newClient.query("SET session_replication_role = replica;");

    const tablesToSync = [
        { schema: 'auth', name: 'users', pk: 'id' },
        { schema: 'public', name: 'user_master', pk: 'id' },
        { schema: 'public', name: 'workspace_members', pk: 'id' },
        { schema: 'public', name: 'tasks', pk: 'id' },
        { schema: 'public', name: 'task_participants', pk: 'id' },
        { schema: 'public', name: 'task_comments', pk: 'id' },
        { schema: 'public', name: 'task_activity_logs', pk: 'id' },
        { schema: 'public', name: 'task_audit_logs', pk: 'id' },
        { schema: 'public', name: 'task_attachments', pk: 'id' },
        { schema: 'public', name: 'task_chat_messages', pk: 'id' },
        { schema: 'public', name: 'system_domain_events', pk: 'id' }
    ];

    for (const { schema, name, pk } of tablesToSync) {
        try {
            console.log(`Syncing ${schema}.${name}...`);
            
            const oldColsRes = await oldClient.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND is_generated = 'NEVER'`, [schema, name]);
            const oldCols = oldColsRes.rows.map(r => r.column_name);

            const newColsRes = await newClient.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND is_generated = 'NEVER'`, [schema, name]);
            const newCols = newColsRes.rows.map(r => r.column_name);

            const intersection = newCols.filter(c => oldCols.includes(c));
            if(intersection.length === 0) continue;

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
                        ON CONFLICT ("${pk}") DO NOTHING
                    `;
                    const res = await newClient.query(insertQuery, params);
                    inserted += res.rowCount;
                } catch (err) {
                    // Silently ignore individual row errors (e.g., composite PK conflicts if pk is wrong)
                }
            }
            console.log(` -> Successfully merged ${inserted} missing rows into ${schema}.${name}`);
        } catch (e) {
            console.error(` Error syncing ${schema}.${name}:`, e.message);
        }
    }

    await newClient.query("SET session_replication_role = origin;");
    await oldClient.end();
    await newClient.end();
    console.log('Data sync complete!');
}

main().catch(console.error);
