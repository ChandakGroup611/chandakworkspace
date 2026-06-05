const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetSequences() {
  console.log('Fetching all records from sequences might not work via direct REST.');
  console.log('Let us try using the SQL endpoint if we have an RPC.');
  
  const sql = `
    DO $$ 
    DECLARE 
        r RECORD;
    BEGIN 
        FOR r IN 
            SELECT sequence_name 
            FROM information_schema.sequences 
            WHERE sequence_schema = 'public'
        LOOP 
            EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
        END LOOP; 
    END $$;
  `;

  const { data, error } = await supabase.rpc('execute_sql', { sql_string: sql });
  if (error) {
    console.error('Error executing RPC:', error);
  } else {
    console.log('Successfully reset sequences.');
  }
}

resetSequences();
