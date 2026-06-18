require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function fixFk() {
  const password = process.env.DATABASE_URL.match(/:([^:@]+)@/)[1];
  
  // Use direct port 5432 and default postgres user
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    const sql = `
      ALTER TABLE public.designations
      DROP CONSTRAINT IF EXISTS designations_department_id_fkey;

      ALTER TABLE public.designations
      ADD CONSTRAINT designations_department_id_fkey
      FOREIGN KEY (department_id)
      REFERENCES public.departments(id)
      ON DELETE CASCADE;
    `;
    
    console.log("Applying FK fix...");
    await client.query(sql);
    console.log("Successfully applied FK fix!");
  } catch (err) {
    console.error("Error applying FK fix:", err);
  } finally {
    await client.end();
  }
}

fixFk();
