const { Client } = require('pg');

const newConnectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: newConnectionString });
    await client.connect();

    try {
        const { rows: users } = await client.query('SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 5;');
        console.log("Recent Auth Users:");
        users.forEach(u => console.log(u.email, u.id));

        const { rows: masters } = await client.query('SELECT id, email, first_name FROM public.user_master;');
        console.log("\nUser Master Records:");
        masters.forEach(u => console.log(u.email, u.id));

    } catch(e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
main();
