import pg from 'pg';
import fs from 'fs';
const { Client } = pg;
const connectionString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });
async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');
    const sql = fs.readFileSync('supabase/migrations/20260620000000_align_email_queue_schema.sql', 'utf8');
    await client.query(sql);
    console.log('Migration 1 applied!');
    const sql2 = fs.readFileSync('supabase/migrations/20260811000000_add_assignee_to_checklists.sql', 'utf8');
    await client.query(sql2);
    console.log('Migration 2 applied!');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
