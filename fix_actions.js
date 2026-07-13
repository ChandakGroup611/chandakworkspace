const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tkovzymkubxtpcgynkgd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68');

async function fix() {
  await supabase.from('permissions').update({ action: 'VIEW' }).eq('code', 'AMC_VIEW');
  await supabase.from('permissions').update({ action: 'CREATE' }).eq('code', 'AMC_CREATE');
  await supabase.from('permissions').update({ action: 'UPDATE' }).eq('code', 'AMC_EDIT');
  await supabase.from('permissions').update({ action: 'VIEW' }).eq('code', 'AUDIT_READ'); // if AUDIT_READ exists
  await supabase.from('permissions').update({ action: 'MANAGE' }).eq('code', 'REPORTS_EXPORT');
  console.log('Fixed AMC and other misaligned actions!');
}
fix();
