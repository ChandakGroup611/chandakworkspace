import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql") && !f.endsWith("_down.sql"))
  .sort();

const seenVersions = new Map();
for (const file of files) {
  const match = file.match(/^(\d{14})_([a-z0-9_]+)\.sql$/i);
  if (!match) {
    console.error(`Invalid migration filename format: ${file}`);
    process.exit(1);
  }
  const version = match[1];
  if (seenVersions.has(version)) {
    console.error(`Duplicate migration timestamp ${version}: ${seenVersions.get(version)} and ${file}`);
    process.exit(1);
  }
  seenVersions.set(version, file);
}
console.log(`Migration filename & uniqueness check passed (${files.length} files).`);

// Load .env.local if running locally without env vars
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const srKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supaUrl && srKey) {
  const requiredTables = [
    "dmac_drawings",
    "dmac_drawing_revisions",
    "dms_documents",
    "dms_folders",
    "dms_shares",
    "dms_share_policy",
    "dms_document_folder_tags",
    "notification_rules",
  ];
  for (const t of requiredTables) {
    const res = await fetch(`${supaUrl}/rest/v1/${t}?select=*&limit=1`, {
      headers: { apikey: srKey, Authorization: `Bearer ${srKey}` },
    });
    if (!res.ok) {
      console.error(`DB table health check failed for ${t}: HTTP ${res.status}`);
      process.exit(1);
    }
  }
  console.log(`Live Supabase schema check passed (${requiredTables.length} DMAC/DMS tables healthy).`);
} else {
  console.log("Skipping live Supabase REST check (env secrets not provided).");
}
