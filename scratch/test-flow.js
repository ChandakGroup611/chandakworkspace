const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tkovzymkubxtpcgynkgd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk4MDYyMiwiZXhwIjoyMDk2NTU2NjIyfQ.UsBMx2jpsI5cJavw2cFqYQJZO8tN7YHWwzvb2LYJ5wY'
);

async function test() {
  const reqId = "b90eb13f-d3c5-4389-a292-6f0227187c7e"; // I will just fetch any approval flow
  const { data, error } = await supabase
    .from('requirement_approval_flow')
    .select(`
      id, level, status, actioned_at, remarks, 
      approver:user_master!requirement_approval_flow_approver_id_fkey(id, full_name, profile_photo, role:user_roles(role_master(role_name)), designation:designations!fk_user_master_designation(name)),
      department:departments!requirement_approval_flow_department_id_fkey(id, name)
    `)
    .limit(1);
    
  console.log(JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test();
