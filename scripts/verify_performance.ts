import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const results: any = {};
  
  // 1. Measure fetchHierarchyRoots (Root metadata payload)
  const startRoots = performance.now();
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, workspace_name, workspace_code, parent_workspace_id, created_by, created_at, hierarchy_task_count, hierarchy_subws_count')
    .eq('is_deleted', false)
    .is('parent_workspace_id', null)
    .limit(50);
  const endRoots = performance.now();
  
  results.root_workspaces = {
    execution_ms: Math.round(endRoots - startRoots),
    payload_kb: wsError ? 0 : (Buffer.byteLength(JSON.stringify(workspaces), 'utf8') / 1024).toFixed(2)
  };

  // 2. Measure fetchTasksByWorkspace (Paginated)
  const startTasks = performance.now();
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      id, subject, task_code, description, owner_id, workspace_id, parent_task_id, status_id, priority_id, start_date, end_date, created_at, created_by,
      status:status_master(status_name, status_code, status_color),
      priority:priority_master(priority_name, priority_code),
      assignee:user_master!tasks_assigned_to_fkey(id, full_name, user_code)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(0, 49);
  const endTasks = performance.now();

  results.tasks_paginated = {
    execution_ms: Math.round(endTasks - startTasks),
    payload_kb: tasksError ? 0 : (Buffer.byteLength(JSON.stringify(tasks), 'utf8') / 1024).toFixed(2),
    record_count: tasks?.length || 0
  };

  // 3. EXPLAIN ANALYZE for Workspaces (if possible)
  try {
    const { data: explainWs } = await supabase.rpc('execute_sql', { 
      sql_query: "EXPLAIN ANALYZE SELECT * FROM workspaces WHERE is_deleted = false AND parent_workspace_id IS NULL;" 
    });
    results.explain_workspaces = explainWs;
  } catch (e) {
    results.explain_workspaces = "RPC 'execute_sql' not available for direct explain analyze.";
  }

  console.log(JSON.stringify(results, null, 2));
}

run();
