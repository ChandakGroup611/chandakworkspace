const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const config = {};
lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) config[key.trim()] = value.trim();
});

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

fetch(`${supabaseUrl}/rest/v1/`, {
  headers: {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Accept": "application/openapi+json"
  }
})
.then(res => res.json())
.then(data => {
  const def = data.definitions?.workspace_tasks;
  if (def) {
    console.log("=== WORKSPACE_TASKS COLUMNS AND TYPES ===");
    for (const [col, colInfo] of Object.entries(def.properties)) {
      console.log(`- ${col}: ${colInfo.type} (${colInfo.format || 'no format'})`);
    }
  } else {
    console.log("Could not find workspace_tasks definition. Keys of definitions:", Object.keys(data.definitions || {}));
  }
})
.catch(err => {
  console.error("ERROR:", err);
});
