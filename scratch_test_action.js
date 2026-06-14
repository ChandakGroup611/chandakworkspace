const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchRequirementAuditLogs(reqId) {
  const { data: logs, error } = await supabaseAdmin.from('activity_events').select('*').eq('module_type', 'REQUIREMENT').eq('record_id', reqId).order('performed_at', { ascending: false });
  if (error || !logs) return [];
  const userIds = [...new Set(logs.map(l => l.performed_by).filter(Boolean))];
  
  let usersMap = {};
  if (userIds.length > 0) {
    const { data: usersData } = await supabaseAdmin.from('user_master').select('id, full_name, email, profile_photo').in('id', userIds);
    if (usersData) usersData.forEach(u => usersMap[u.id] = u);
  }
  return logs.map(l => ({ ...l, user: usersMap[l.performed_by] || { full_name: 'System' } }));
}

async function main() {
  const reqId = 'c59e1d64-433a-4900-a445-cc00da265c73'; // ID for ERP-REQ-2026-518423
  const logs = await fetchRequirementAuditLogs(reqId);
  console.log("Returned Logs:", JSON.stringify(logs, null, 2));
}

main();
