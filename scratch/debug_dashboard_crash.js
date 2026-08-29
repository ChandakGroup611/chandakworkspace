const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const mapStatus = (sName) => {
  if (!sName) return "Active";
  const name = String(sName).toLowerCase();
  if (name.includes('resolv') || name.includes('done') || name.includes('close')) return "Resolved";
  if (name.includes('escalat') || name.includes('block') || name.includes('hold')) return "Escalated";
  if (name.includes('review') || name.includes('verify')) return "Review";
  return "Active";
};

async function run() {
  const userId = 'd1b0c396-eeb2-4567-a6bd-cb04adb8327a'; // Avinash / Super Admin
  
  try {
    const tasksPromise = supabaseAdmin.from("tasks")
      .select(`id, created_at, created_by, assigned_to, subject, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), end_date, parent_task_id`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .then(res => ({ data: res.data || [], error: res.error }));

    const subTasksPromise = supabaseAdmin.from("sub_tasks")
      .select(`id, created_at, updated_at, created_by, assigned_to, subject, status`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .then(res => ({ data: res.data || [], error: res.error }));

    const ticketsPromise = supabaseAdmin.from("tickets")
      .select(`id, created_at, updated_at, creator_id, title, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), due_date, assignee_id`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .then(res => ({ data: res.data || [], error: res.error }));

    const requirementsPromise = supabaseAdmin
      .from("requirements")
      .select(`id, created_at, updated_at, creator_id, current_assignee_id, title, status_id, status_master(status_name), due_date`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    const workspacesPromise = supabaseAdmin
      .from("workspaces")
      .select(`id, created_at, updated_at, workspace_name, parent_workspace_id, status_id, status_master(status_name), end_date`)
      .eq('is_deleted', false)
      .order("created_at", { ascending: false });

    const [
      { data: tasksData, error: tasksError },
      { data: subTasksData, error: subTasksError },
      { data: ticketsData, error: ticketsError },
      { data: requirementsData, error: requirementsError },
      { data: workspacesData, error: workspacesError }
    ] = await Promise.all([
      tasksPromise,
      subTasksPromise,
      ticketsPromise,
      requirementsPromise,
      workspacesPromise
    ]);

    if (tasksError) console.error("Tasks Error:", tasksError);
    if (subTasksError) console.error("SubTasks Error:", subTasksError);
    if (ticketsError) console.error("Tickets Error:", ticketsError);
    if (requirementsError) console.error("Requirements Error:", requirementsError);
    if (workspacesError) console.error("Workspaces Error:", workspacesError);

    const userIdsToFetch = new Set();
    tasksData?.forEach((t) => { if (t.assigned_to) userIdsToFetch.add(t.assigned_to); if (t.created_by) userIdsToFetch.add(t.created_by); });
    subTasksData?.forEach((t) => { if (t.assigned_to) userIdsToFetch.add(t.assigned_to); if (t.created_by) userIdsToFetch.add(t.created_by); });
    ticketsData?.forEach((t) => { if (t.creator_id) userIdsToFetch.add(t.creator_id); if (t.assignee_id) userIdsToFetch.add(t.assignee_id); });
    requirementsData?.forEach((t) => { if (t.current_assignee_id) userIdsToFetch.add(t.current_assignee_id); if (t.creator_id) userIdsToFetch.add(t.creator_id); });

    let userMap = {};
    if (userIdsToFetch.size > 0) {
      const { data: usersData, error: uError } = await supabaseAdmin
        .from('user_master')
        .select('id, full_name, role_id, roles(name)')
        .in('id', Array.from(userIdsToFetch));
      
      if (uError) console.error("User Master Fetch Error:", uError);
      
      if (usersData) {
        usersData.forEach((u) => {
          userMap[u.id] = {
            name: u.full_name,
            role: u.roles?.name || "Team Member"
          };
        });
      }
    }

    const allItems = [];
    const now = Date.now();
    let upcomingTasks = 0;
    let escalatedCount = 0;

    tasksData?.forEach((t) => {
      const status = mapStatus((t.status_master)?.status_name);
      if (t.end_date && status !== "Resolved") {
        const diffDays = (new Date(t.end_date).getTime() - now) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) upcomingTasks++;
        if (diffDays < 0) escalatedCount++;
      }

      allItems.push({
        module: t.parent_task_id ? "Sub Tasks" : "Tasks",
        id: t.id,
        code: t.task_code || `TSK-${t.id.substring(0, 6).toUpperCase()}`,
        title: t.subject || "Untitled Task",
        status: status,
        rawStatus: (t.status_master)?.status_name || "Unknown",
        user: userMap[t.assigned_to]?.name || "Unassigned",
        userRole: userMap[t.assigned_to]?.role || "Team Member",
        priority: t.priority?.priority_name || "Medium",
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        dueDate: t.end_date,
        isOverdue: t.end_date && new Date(t.end_date).getTime() < now && status !== "Resolved"
      });
    });

    subTasksData?.forEach((t) => {
      const status = mapStatus(t.status);
      allItems.push({
        module: "Sub Tasks",
        id: t.id,
        code: null,
        title: t.subject || "Untitled Sub Task",
        status: status,
        rawStatus: t.status || "Unknown",
        user: userMap[t.assigned_to]?.name || "Unassigned",
        userRole: userMap[t.assigned_to]?.role || "Team Member",
        priority: "Medium",
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        dueDate: null,
        isOverdue: false
      });
    });

    ticketsData?.forEach((t) => {
      const status = mapStatus((t.status_master)?.status_name);
      if (t.due_date && status !== "Resolved") {
        const diffDays = (new Date(t.due_date).getTime() - now) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) upcomingTasks++;
        if (diffDays < 0) escalatedCount++;
      }

      allItems.push({
        module: "Tickets",
        id: t.id,
        code: `TCK-${t.id.substring(0, 6).toUpperCase()}`,
        title: t.title || "Untitled Ticket",
        status: status,
        rawStatus: (t.status_master)?.status_name || "Unknown",
        user: userMap[t.assignee_id]?.name || "Unassigned",
        userRole: userMap[t.assignee_id]?.role || "Team Member",
        priority: t.priority?.priority_name || "Medium",
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        dueDate: t.due_date,
        isOverdue: t.due_date && new Date(t.due_date).getTime() < now && status !== "Resolved"
      });
    });

    requirementsData?.forEach((r) => {
      const status = mapStatus((r.status_master)?.status_name);
      if (r.due_date && status !== "Resolved") {
        const diffDays = (new Date(r.due_date).getTime() - now) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) upcomingTasks++;
        if (diffDays < 0) escalatedCount++;
      }

      allItems.push({
        module: "Requirements",
        id: r.id,
        code: r.code,
        title: r.title || "Untitled Requirement",
        status: status,
        rawStatus: (r.status_master)?.status_name || "Unknown",
        user: userMap[r.current_assignee_id]?.name || "Unassigned",
        userRole: userMap[r.current_assignee_id]?.role || "Team Member",
        priority: "N/A", 
        createdAt: r.created_at,
        updatedAt: r.updated_at || r.created_at,
        dueDate: r.due_date,
        isOverdue: r.due_date && new Date(r.due_date).getTime() < now && status !== "Resolved"
      });
    });

    workspacesData?.forEach((w) => {
      const status = mapStatus((w.status_master)?.status_name);
      if (w.end_date && status !== "Resolved") {
        const diffDays = (new Date(w.end_date).getTime() - now) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) upcomingTasks++;
        if (diffDays < 0) escalatedCount++;
      }

      allItems.push({
        module: w.parent_workspace_id ? "Sub Workspaces" : "Workspaces",
        id: w.id,
        code: `WS-${w.id.substring(0, 6).toUpperCase()}`,
        title: w.workspace_name || "Untitled Workspace",
        status: status,
        rawStatus: (w.status_master)?.status_name || "Unknown",
        user: "System",
        priority: "N/A",
        createdAt: w.created_at,
        dueDate: w.end_date,
        isOverdue: w.end_date && new Date(w.end_date).getTime() < now && status !== "Resolved"
      });
    });

    console.log("Success! Total items processed:", allItems.length);
  } catch (err) {
    console.error("Crash during execution:", err);
  }
}

run();
