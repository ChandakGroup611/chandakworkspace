const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tkovzymkubxtpcgynkgd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68');
// Try to insert a dummy record
supabase.from('user_dashboard_preferences').upsert({
  user_id: '00000000-0000-0000-0000-000000000000',
  selected_theme: 'pristine-white',
  widget_layout: { theme: 'pristine-white' }
}).then(res => console.log('Dummy insert:', res));
