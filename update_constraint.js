const { Client } = require('pg');

const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    await client.query("ALTER TABLE public.task_participants DROP CONSTRAINT task_participants_participation_role_check;");
    await client.query("ALTER TABLE public.task_participants ADD CONSTRAINT task_participants_participation_role_check CHECK (participation_role = ANY (ARRAY['OWNER'::text, 'EXECUTOR'::text, 'REVIEWER'::text, 'WATCHER'::text]));");
    console.log('Constraint updated successfully');

    await client.end();
}

main().catch(console.error);
