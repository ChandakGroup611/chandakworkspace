const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function reloadSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query('NOTIFY pgrst, reload_schema;');
    console.log("Schema cache reloaded successfully!");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

reloadSchema();
