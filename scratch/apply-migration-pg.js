const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const pool = new Pool({
  connectionString: 'postgresql://postgres.nmbzcygswfxlffnshylf:L@2o24L@2o24@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function apply() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Provide a migration file path");
    process.exit(1);
  }
  
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  try {
    console.log(`Applying migration: ${filePath}`);
    await pool.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    pool.end();
  }
}

apply();
