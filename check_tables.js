const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tkovzymkubxtpcgynkgd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68');
supabase.from('system_settings').select('*').limit(1).then(res => console.log('system_settings:', res));
supabase.from('global_settings').select('*').limit(1).then(res => console.log('global_settings:', res));
