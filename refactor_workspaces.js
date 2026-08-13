const fs = require('fs');

const fetchTasksByWorkspaceCode = `export async function fetchTasksByWorkspace(workspaceId: string, page: number = 1, limit: number = 50, includeDescendants: boolean = false) {
  const tId = Math.random().toString(36).substr(2, 5);
  console.time(\`[PROFILER] fetchTasksByWorkspace_TOTAL_\${tId}\`);
  try {
    if (!workspaceId) return [];
  
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
  
    let targetWorkspaceIds = [workspaceId];
  
    if (includeDescendants) {
      console.log(\`[PROFILER] Hierarchy_CTE_Start_\${tId}\`);
      console.time(\`[PROFILER] Hierarchy_CTE_Duration_\${tId}\`);
      targetWorkspaceIds = await HierarchyManager.getDescendants('WORKSPACE', workspaceId);
      console.timeEnd(\`[PROFILER] Hierarchy_CTE_Duration_\${tId}\`);
      console.log(\`[PROFILER] Hierarchy_CTE_End_\${tId}\`);
    }
  
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit - 1;

    // We select exact columns needed + related embedded resources to avoid N+1 queries.
    const { data: workspaceTasks, error: tasksError } = await supabase
      .from("tasks")
      .select(\`
        id, subject, task_code, created_at, updated_at, start_date, due_date, status_id, priority_id, workspace_id, created_by, assigned_to, parent_task_id, is_deleted,
        title:subject,
        status:status_master(name:status_name, code:status_code, status_color),
        priority:priority_master(name:priority_name, code:priority_code, priority_color),
        department:departments(id, name),
        participants:task_participants(user_id, participation_role, user:user_master(id, full_name, profile_photo, manager_id)),
        workspace:workspaces(id, workspace_name, workspace_code, parent_workspace_id),
        creator:user_master!tasks_created_by_fkey(id, full_name, profile_photo, manager_id),
        assignee:user_master!tasks_assigned_to_fkey(id, full_name, profile_photo, manager_id),
        checklists:task_checklists(id, is_completed),
        attachments:task_attachments(id),
        comments:task_comments(id)
      \`)
      .in("workspace_id", targetWorkspaceIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(startIdx, endIdx);

    if (tasksError) {
      console.error("[Workspaces] Error fetching tasks by workspace:", tasksError);
      return [];
    }

    if (workspaceTasks && workspaceTasks.length > 0) {
      // Missing relationships like sub_workspaces or parent tasks that couldn't be efficiently queried deeply
      const wsIds = Array.from(new Set(workspaceTasks.map((t: any) => t.workspace?.parent_workspace_id).filter(Boolean)));
      
      let parentWorkspaces = [];
      if (wsIds.length > 0) {
        const { data: pWs } = await supabaseAdmin.from("workspaces").select("id, name:workspace_name, code:workspace_code").in("id", wsIds);
        if (pWs) parentWorkspaces = pWs;
      }
      
      workspaceTasks.forEach((t: any) => {
        // Fix up workspace mapping
        if (t.workspace && t.workspace.parent_workspace_id) {
          const parentWs = parentWorkspaces.find((w: any) => w.id === t.workspace.parent_workspace_id);
          t.sub_workspace = t.workspace;
          if (parentWs) t.workspace = parentWs;
        } else {
          t.sub_workspace = null;
        }

        t.assignees = []; // Implicitly workspace members

        // Extract Extensions counts
        t.attachmentCount = t.attachments ? t.attachments.length : 0;
        t.commentCount = t.comments ? t.comments.length : 0;

        // Map Participants
        t.executors = [];
        t.reviewers = [];
        if (t.participants) {
          t.participants.forEach((p: any) => {
            if (p.participation_role === "EXECUTOR" && p.user) t.executors.push(p.user);
            if ((p.participation_role === "REVIEWER" || p.participation_role === "WATCHER") && p.user) t.reviewers.push(p.user);
          });
        }

        // Calculate progress percentage
        if (t.status?.code === "CLOSED" || t.status?.code === "RESOLVED" || t.status?.code === "DONE") {
          t.progress_percentage = 100;
        } else if (t.checklists && t.checklists.length > 0) {
          const completed = t.checklists.filter((c: any) => c.is_completed).length;
          t.progress_percentage = Math.round((completed / t.checklists.length) * 100);
        } else {
          // Fallback: Use status to infer progress if no checklists exist
          if (t.status?.code === "IN_PROGRESS" || t.status?.code === "WIP") {
            t.progress_percentage = 50;
          } else if (t.status?.code === "REVIEW" || t.status?.code === "TESTING") {
            t.progress_percentage = 80;
          } else {
            t.progress_percentage = 0;
          }
        }
      });
    }

    // Also fetch parent tasks for sub-tasks
    const subTasks = workspaceTasks?.filter(t => t.parent_task_id) || [];
    if (subTasks.length > 0) {
      const parentIds = Array.from(new Set(subTasks.map(t => t.parent_task_id)));
      const { data: parentTasks } = await supabaseAdmin.from("tasks").select("id, subject, task_code").in("id", parentIds);
      if (parentTasks) {
        const taskMap = new Map(parentTasks.map(t => [t.id, { id: t.id, title: t.subject, code: t.task_code }]));
        workspaceTasks?.forEach(t => {
          if (t.parent_task_id && taskMap.has(t.parent_task_id)) {
            t.parent_task = taskMap.get(t.parent_task_id);
          }
        });
      }
    }
    
    return workspaceTasks || [];
  } finally {
    console.timeEnd(\`[PROFILER] fetchTasksByWorkspace_TOTAL_\${tId}\`);
  }
}
`;

const fetchAllTasksCode = `export async function fetchAllTasks() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch workspaces the user has access to
  const visibleWorkspaces = await getVisibleWorkspaces(user.id);
  const visibleWsIds = visibleWorkspaces.map((w: any) => w.id);

  // Fetch task IDs where user is a participant
  const { data: partData } = await supabaseAdmin.from("task_participants").select("task_id").eq("user_id", user.id);
  const partTaskIds = partData ? partData.map((p: any) => p.task_id) : [];

  let query = supabase
    .from("tasks")
    .select(\`
      id, subject, task_code, created_at, updated_at, start_date, due_date, status_id, priority_id, workspace_id, created_by, assigned_to, parent_task_id, is_deleted,
      title:subject,
      status:status_master(name:status_name, code:status_code, status_color),
      priority:priority_master(name:priority_name, code:priority_code, priority_color),
      department:departments(id, name),
      participants:task_participants(user_id, participation_role, user:user_master(id, full_name, profile_photo, manager_id)),
      workspace:workspaces(id, workspace_name, workspace_code, parent_workspace_id),
      creator:user_master!tasks_created_by_fkey(id, full_name, profile_photo, manager_id),
      assignee:user_master!tasks_assigned_to_fkey(id, full_name, profile_photo, manager_id),
      checklists:task_checklists(id, is_completed),
      attachments:task_attachments(id),
      comments:task_comments(id)
    \`)
    .eq("is_deleted", false);

  if (visibleWsIds.length > 0 && partTaskIds.length > 0) {
    query = query.or(\`workspace_id.in.(\${visibleWsIds.join(',')}),id.in.(\${partTaskIds.join(',')}),assigned_to.eq.\${user.id},owner_id.eq.\${user.id}\`);
  } else if (visibleWsIds.length > 0) {
    query = query.or(\`workspace_id.in.(\${visibleWsIds.join(',')}),assigned_to.eq.\${user.id},owner_id.eq.\${user.id}\`);
  } else if (partTaskIds.length > 0) {
    query = query.or(\`id.in.(\${partTaskIds.join(',')}),assigned_to.eq.\${user.id},owner_id.eq.\${user.id}\`);
  } else {
    query = query.or(\`assigned_to.eq.\${user.id},owner_id.eq.\${user.id}\`);
  }

  const { data: allTasks, error: tasksError } = await query.order("created_at", { ascending: false });

  if (tasksError) {
    console.error("[Workspaces] Error fetching all tasks:", tasksError);
    return [];
  }
  
  if (allTasks && allTasks.length > 0) {
      const wsIds = Array.from(new Set(allTasks.map((t: any) => t.workspace?.parent_workspace_id).filter(Boolean)));
      
      let parentWorkspaces = [];
      if (wsIds.length > 0) {
        const { data: pWs } = await supabaseAdmin.from("workspaces").select("id, name:workspace_name, code:workspace_code").in("id", wsIds);
        if (pWs) parentWorkspaces = pWs;
      }
        
      allTasks.forEach((t: any) => {
        if (t.workspace && t.workspace.parent_workspace_id) {
          const parentWs = parentWorkspaces.find((w: any) => w.id === t.workspace.parent_workspace_id);
          t.sub_workspace = t.workspace;
          if (parentWs) t.workspace = parentWs;
        } else {
          t.sub_workspace = null;
        }

        t.assignees = []; // Implicitly workspace members

        // Extract Extensions counts
        t.attachmentCount = t.attachments ? t.attachments.length : 0;
        t.commentCount = t.comments ? t.comments.length : 0;

        // Map Participants
        t.executors = [];
        t.reviewers = [];
        if (t.participants) {
          t.participants.forEach((p: any) => {
            if (p.participation_role === "EXECUTOR" && p.user) t.executors.push(p.user);
            if ((p.participation_role === "REVIEWER" || p.participation_role === "WATCHER") && p.user) t.reviewers.push(p.user);
          });
        }

        // Calculate progress percentage
        if (t.status?.code === "CLOSED" || t.status?.code === "RESOLVED" || t.status?.code === "DONE") {
          t.progress_percentage = 100;
        } else if (t.checklists && t.checklists.length > 0) {
          const completed = t.checklists.filter((c: any) => c.is_completed).length;
          t.progress_percentage = Math.round((completed / t.checklists.length) * 100);
        } else {
          // Fallback: Use status to infer progress if no checklists exist
          if (t.status?.code === "IN_PROGRESS" || t.status?.code === "WIP") {
            t.progress_percentage = 50;
          } else if (t.status?.code === "REVIEW" || t.status?.code === "TESTING") {
            t.progress_percentage = 80;
          } else {
            t.progress_percentage = 0;
          }
        }
      });
  }

  return allTasks || [];
}
`;

let code = fs.readFileSync('lib/actions/workspaces.ts', 'utf8');

const start1 = code.indexOf('export async function fetchTasksByWorkspace');
let end1 = code.indexOf('export async function fetchAllTasks', start1 + 10);
if (end1 === -1) {
    end1 = code.indexOf('export async function', start1 + 10);
}

const start2 = code.indexOf('export async function fetchAllTasks');
let end2 = code.indexOf('export async function', start2 + 10);
if (end2 === -1) end2 = code.length;

// If we find both, we can just replace them.
if (start1 !== -1 && end1 !== -1) {
    code = code.substring(0, start1) + fetchTasksByWorkspaceCode + '\n\n' + code.substring(end1);
}

// Reload after first change
const start2b = code.indexOf('export async function fetchAllTasks');
let end2b = code.indexOf('export async function', start2b + 10);
if (end2b === -1) end2b = code.length;

if (start2b !== -1) {
    code = code.substring(0, start2b) + fetchAllTasksCode + '\n\n' + code.substring(end2b);
}

fs.writeFileSync('lib/actions/workspaces.ts', code);
console.log("Successfully replaced both functions!");
