const { createClient } = require('@supabase/supabase-js');
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

// Fetch OpenAPI specification from PostgREST root
fetch(supabaseUrl, {
  headers: {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`
  }
})
.then(res => res.json())
.then(data => {
  const taskDef = data.definitions?.workspace_tasks;
  if (taskDef) {
    console.log("=== WORKSPACE_TASKS PROPERTIES ===");
    console.log(JSON.stringify(taskDef.properties, null, 2));
  } else {
    console.log("Could not find workspace_tasks definition. Keys of definitions:", Object.keys(data.definitions || {}));
  }
})
.catch(err => {
  console.error("ERROR:", err);
});
