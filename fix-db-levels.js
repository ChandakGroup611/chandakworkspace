const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const env = fs.readFileSync('.env.local', 'utf-8');
  const url = env.match(/DATABASE_URL=(.*)/)[1].trim();
  const client = new Client({ connectionString: url });
  
  await client.connect();
  try {
    await client.query('ALTER TABLE public.requirement_approval_flow DROP CONSTRAINT IF EXISTS requirement_approval_flow_requirement_id_level_key');
    console.log('Dropped unique constraint');
    
    await client.query("UPDATE public.requirement_approval_flow SET level = 1 WHERE id = '34a9d315-71c7-4301-bb95-9697cf68bec4'");
    await client.query("UPDATE public.requirement_approval_flow SET level = 2 WHERE id = '5b915dce-50d8-4232-af1e-a9a810f4d699'");
    await client.query("UPDATE public.requirement_approval_flow SET level = 2 WHERE id = 'ef281638-ed47-4abd-a0c0-ce72b8045532'");
    
    console.log('Updated levels successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
