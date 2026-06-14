const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedMasterData() {
  const reqStatuses = [
    { code: 'REQ_REGISTRATION', name: 'Requirement Registration', color: '#3b82f6', order: 10, type: 'REQUIREMENT' },
    { code: 'REQ_PENDING', name: 'Pending', color: '#f59e0b', order: 20, type: 'REQUIREMENT' },
    { code: 'REQ_PLANNING', name: 'Planning', color: '#8b5cf6', order: 30, type: 'REQUIREMENT' },
    { code: 'REQ_APPROVED', name: 'Approved', color: '#10b981', order: 40, type: 'REQUIREMENT' },
    { code: 'REQ_REJECTED', name: 'Rejected', color: '#ef4444', order: 50, type: 'REQUIREMENT' },
    { code: 'REQ_HOLD', name: 'Hold', color: '#6b7280', order: 60, type: 'REQUIREMENT' },
    { code: 'REQ_CLARIFICATION', name: 'Clarification Requested', color: '#ec4899', order: 70, type: 'REQUIREMENT' },
    { code: 'REQ_ANALYSIS', name: 'Analysis', color: '#06b6d4', order: 80, type: 'REQUIREMENT' },
    { code: 'REQ_DEVELOPMENT', name: 'Development', color: '#3b82f6', order: 90, type: 'REQUIREMENT' },
    { code: 'REQ_UAT', name: 'UAT', color: '#f59e0b', order: 100, type: 'REQUIREMENT' },
    { code: 'REQ_DEPLOYED', name: 'Deployed', color: '#10b981', order: 110, type: 'REQUIREMENT' },
    { code: 'REQ_CLOSED', name: 'Closed', color: '#6b7280', order: 120, type: 'REQUIREMENT' }
  ];

  for (const s of reqStatuses) {
    const { data: existing } = await supabase.from('status_master').select('id').eq('status_code', s.code).eq('scope_type', s.type);
    
    if (!existing || existing.length === 0) {
      const { error } = await supabase.from('status_master').insert({
        status_code: s.code,
        status_name: s.name,
        status_color: s.color,
        status_order: s.order,
        scope_type: s.type,
        module: 'REQUIREMENT',
        is_deleted: false
      });
      if (error) console.error("Error inserting", s.code, error);
      else console.log("Seeded", s.code);
    } else {
      console.log("Already exists:", s.code);
    }
  }

  // Seed "Converted To Requirement" for Ticket scope
  const { data: existTk } = await supabase.from('status_master').select('id').eq('status_code', 'CONVERTED_TO_REQ');
  if (!existTk || existTk.length === 0) {
    const { error: ticketErr } = await supabase.from('status_master').insert({
      status_code: 'CONVERTED_TO_REQ',
      status_name: 'Converted To Requirement',
      status_color: '#8b5cf6',
      status_order: 999,
      scope_type: 'GLOBAL', // Fallback to global if needed
      module: 'TICKET',
      is_deleted: false
    });
    if (ticketErr) console.error("Error inserting CONVERTED_TO_REQ", ticketErr);
    else console.log("Seeded CONVERTED_TO_REQ");
  } else {
    console.log("Already exists: CONVERTED_TO_REQ");
  }

  console.log("Master Data Seed Complete.");
}

seedMasterData();
