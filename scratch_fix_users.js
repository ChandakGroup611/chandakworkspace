require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { data: depts } = await supabase.from('departments').select('id, name');
  console.log('Depts:', depts);
  
  const itDept = depts.find(d => d.name.toLowerCase() === 'it');
  const entDept = depts.find(d => d.name.toLowerCase().includes('enterprise'));
  
  if (itDept && entDept) {
    const { data: users } = await supabase.from('user_master').select('id').limit(10);
    if (users && users.length >= 2) {
      await supabase.from('user_master').update({ department_id: itDept.id }).in('id', users.slice(0, 5).map(u => u.id));
      await supabase.from('user_master').update({ department_id: entDept.id }).in('id', users.slice(5, 10).map(u => u.id));
      console.log('Assigned users to IT and Enterprise Operations.');
    }
  } else {
    console.log('Could not find departments.');
  }
}
fix();
