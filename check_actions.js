const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tkovzymkubxtpcgynkgd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68');
supabase.from('permissions').select('action, code').then(res => {
  const actions = new Set(res.data.map(p => p.action));
  console.log('Distinct actions:', Array.from(actions));
  const weirdActions = res.data.filter(p => !['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'].includes(p.action?.toUpperCase()));
  console.log('Weird actions:', weirdActions);
});
