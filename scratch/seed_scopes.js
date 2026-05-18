const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const config = {};
lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) config[key.trim()] = value.trim();
});

// Use Service Role Key if available for seeding
const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = config.SUPABASE_SERVICE_ROLE_KEY || config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedScopes() {
  console.log('Seeding ticket_scopes...');
  const { data, error } = await supabase.from('ticket_scopes').upsert([
    {
      id: 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1',
      code: 'INFRA',
      name: 'IT Infrastructure',
      description: 'Server issues, hardware faults, network connectivity, and assigned asset support.'
    },
    {
      id: 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2',
      code: 'ERP',
      name: 'ERP & Software Systems',
      description: 'SAP, Salesforce, internal modules, bugs, and software requirement requests.'
    },
    {
      id: 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3',
      code: 'OTHERS',
      name: 'General Inquiries',
      description: 'General support, access requests, and other non-technical operational help.'
    }
  ]);

  if (error) {
    console.error('Error seeding scopes:', error.message);
  } else {
    console.log('Scopes seeded successfully.');
  }
}

seedScopes();
