const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});
const c = new Client({connectionString: process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL});
c.connect();
c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'requirements';").then(r => {
  console.log(r.rows);
  c.end();
}).catch(e => {
  console.error(e);
  c.end();
});
