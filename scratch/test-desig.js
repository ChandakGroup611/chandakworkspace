const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tkovzymkubxtpcgynkgd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk4MDYyMiwiZXhwIjoyMDk2NTU2NjIyfQ.UsBMx2jpsI5cJavw2cFqYQJZO8tN7YHWwzvb2LYJ5wY'
);

async function test() {
  const { data, error } = await supabase
    .from('user_master')
    .select(`
      id, full_name, designation:designations!fk_user_master_designation(name)
    `)
    .limit(1);
    
  console.log(JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test();
