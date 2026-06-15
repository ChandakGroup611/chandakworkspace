const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
    const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const query = `
      SELECT w.workspace_name, COUNT(t.id) as task_count
      FROM tasks t
      LEFT JOIN workspaces w ON t.workspace_id = w.id
      GROUP BY w.workspace_name
      ORDER BY task_count DESC;
    `;
    const res = await client.query(query);
    console.log("Task Breakdown by Workspace:");
    res.rows.forEach(r => {
        console.log(`- ${r.workspace_name || 'NO WORKSPACE (Direct Tasks)'}: ${r.task_count}`);
    });

    const total = await client.query("SELECT COUNT(*) FROM tasks");
    console.log(`\nTotal Tasks in DB: ${total.rows[0].count}`);

    await client.end();
}

main().catch(console.error);
