const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Starting Regression Validation (Phase S3)...");
  
  // Create test users
  const { data: adminUser } = await supabase.auth.admin.createUser({ email: `admin-${Date.now()}@test.com`, password: 'password', email_confirm: true });
  const { data: regularUser } = await supabase.auth.admin.createUser({ email: `user-${Date.now()}@test.com`, password: 'password', email_confirm: true });
  const { data: approverUser } = await supabase.auth.admin.createUser({ email: `approver-${Date.now()}@test.com`, password: 'password', email_confirm: true });
  
  // Assign Admin role
  const { data: roles } = await supabase.from('roles').select('id, code').eq('code', 'SUPER_ADMIN').single();
  await supabase.from('user_roles').insert({ user_id: adminUser.user.id, role_id: roles.id });
  
  // Insert users into user_master
  await supabase.from('user_master').insert([
    { id: adminUser.user.id, full_name: 'Test Admin', email: adminUser.user.email },
    { id: regularUser.user.id, full_name: 'Test User', email: regularUser.user.email },
    { id: approverUser.user.id, full_name: 'Test Approver', email: approverUser.user.email }
  ]);
  
  // Create a requirement
  const { data: req } = await supabase.from('requirements').insert({
    title: 'Test Requirement S3',
    creator_id: regularUser.user.id,
    approval_status: 'Pending',
    current_assignee_id: approverUser.user.id
  }).select().single();
  
  // Create approval flow
  const { data: flow } = await supabase.from('requirement_approval_flow').insert({
    requirement_id: req.id,
    approver_id: approverUser.user.id,
    level: 1,
    status: 'Pending'
  }).select().single();
  
  console.log("Test Environment Setup Complete. Req ID:", req.id);
  
  const { processApprovalAction } = require('./.next/server/app/requirements/[id]/page.js') || require('./lib/actions/requirements'); // Mock or rely on actual action if callable from node? We can't easily call nextjs server action from pure node without compiling.
  
  console.log("Done.");
}

run().catch(console.error);
