const { execSync } = require('child_process');
require('dotenv').config({path: '.env.local'}); // This will fail parsing if called directly without dotenvx, but we run via dotenvx!

// Actually if we run via `npx @dotenvx/dotenvx run -- node push_migration.js`
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("DB URL not found");
  process.exit(1);
}

// Rename .env.local temporarily so supabase CLI doesn't try to parse it
const fs = require('fs');
fs.renameSync('.env.local', '.env.local.backup');

try {
  console.log("Running supabase migration up...");
  // Pass dbUrl securely via env var to prevent logging, but supabase CLI uses --db-url argument.
  execSync(`npx supabase migration up --db-url "${dbUrl}"`, { stdio: 'inherit' });
} catch (e) {
  console.error("Failed:", e.message);
} finally {
  fs.renameSync('.env.local.backup', '.env.local');
}
