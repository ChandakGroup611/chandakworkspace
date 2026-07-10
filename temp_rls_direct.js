const { Client } = require('pg');
const url = 'postgres://postgres:Chandak_Workspace@db.tkovzymkubxtpcgynkgd.supabase.co:5432/postgres';
const client = new Client({ connectionString: url });

async function run() {
  try {
    await client.connect();
    console.log('Connected to direct DB');
    await client.query("CREATE POLICY \"allow_all_task_attachments\" ON storage.objects FOR ALL USING (bucket_id = 'task_attachments') WITH CHECK (bucket_id = 'task_attachments');");
    console.log('Added task_attachments policy');
  } catch (e) {
    console.log(e.message);
  }
  try {
    await client.query("CREATE POLICY \"allow_all_ticket_attachments\" ON storage.objects FOR ALL USING (bucket_id = 'ticket_attachments') WITH CHECK (bucket_id = 'ticket_attachments');");
    console.log('Added ticket_attachments policy');
  } catch (e) {
    console.log(e.message);
  }
  await client.end();
}
run();
