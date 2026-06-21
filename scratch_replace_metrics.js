const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', 'adios', 'lib', 'actions', 'dashboardMetrics.ts');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Fix workspaces fetching to include sub workspaces
code = code.replace(
  `workspacesPromise = workspaceIds.length > 0 ? supabaseAdmin
        .from("workspaces")
        .select(\`
          id, created_at, workspace_name,
          status_id, status_master(status_name),
          end_date
        \`)
        .in('id', workspaceIds)`,
  `const idsToFetch = [...workspaceIds, ...subWorkspaceIds];
      workspacesPromise = idsToFetch.length > 0 ? supabaseAdmin
        .from("workspaces")
        .select(\`
          id, created_at, workspace_name, parent_workspace_id,
          status_id, status_master(status_name),
          end_date
        \`)
        .in('id', idsToFetch)`
);

// also update the select for super admin for workspaces
code = code.replace(
  `        .select(\`
          id, created_at, workspace_name,
          status_id, status_master(status_name),
          end_date
        \`)
        .eq('is_deleted', false)`,
  `        .select(\`
          id, created_at, workspace_name, parent_workspace_id,
          status_id, status_master(status_name),
          end_date
        \`)
        .eq('is_deleted', false)`
);

// 2. Add subTasksPromise fetching after tasksPromise block
const tasksPromiseBlock = `      });
    }`;
const subTasksCode = `
    let subTasksPromise: any;
    if (isSuperAdmin) {
      subTasksPromise = supabaseAdmin
        .from("sub_tasks")
        .select(\`
          id, created_at, created_by, assigned_to, subject,
          status
        \`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
    } else {
      const createdSubPromise = supabaseAdmin.from("sub_tasks").select(\`id, created_at, created_by, assigned_to, subject, status\`).eq('created_by', userId).eq("is_deleted", false);
      const assignedSubPromise = supabaseAdmin.from("sub_tasks").select(\`id, created_at, created_by, assigned_to, subject, status\`).eq('assigned_to', userId).eq("is_deleted", false);
      
      subTasksPromise = Promise.all([createdSubPromise, assignedSubPromise]).then(([cRes, aRes]) => {
        if (cRes.error) return { data: null, error: cRes.error };
        if (aRes.error) return { data: null, error: aRes.error };
        const merged = [...(cRes.data || []), ...(aRes.data || [])];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
        return { data: unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), error: null };
      });
    }
`;
code = code.replace(tasksPromiseBlock, tasksPromiseBlock + "\n" + subTasksCode);

// Add to Promise.all
code = code.replace(
  `    const [
      { data: tasksData, error: tasksError },
      { data: ticketsData, error: ticketsError },
      { data: requirementsData, error: requirementsError },
      { data: workspacesData, error: workspacesError }
    ] = await Promise.all([
      tasksPromise,
      ticketsPromise,
      requirementsPromise,
      workspacesPromise
    ]);`,
  `    const [
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
    ]);`
);

// Add to userIdsToFetch
code = code.replace(
  `tasksData?.forEach((t: any) => { if (t.assigned_to) userIdsToFetch.add(t.assigned_to); if (t.created_by) userIdsToFetch.add(t.created_by); });`,
  `tasksData?.forEach((t: any) => { if (t.assigned_to) userIdsToFetch.add(t.assigned_to); if (t.created_by) userIdsToFetch.add(t.created_by); });
    subTasksData?.forEach((t: any) => { if (t.assigned_to) userIdsToFetch.add(t.assigned_to); if (t.created_by) userIdsToFetch.add(t.created_by); });`
);

// 3. Sub Tasks Mapping
const subTasksMapping = `
    subTasksData?.forEach((t: any) => {
      const status = mapStatus(t.status);
      allItems.push({
        module: "Sub Tasks",
        id: t.id,
        code: null,
        title: t.subject || "Untitled Sub Task",
        status: status,
        rawStatus: t.status || "Unknown",
        user: userMap[t.assigned_to] || userMap[t.created_by] || "Unassigned",
        priority: "N/A",
        createdAt: t.created_at,
        dueDate: null,
        isOverdue: false
      });
    });
`;
code = code.replace(
  `ticketsData?.forEach((t: any) => {`,
  subTasksMapping + `\n    ticketsData?.forEach((t: any) => {`
);

// 4. Workspaces Mapping update
code = code.replace(
  `      allItems.push({
        module: "Workspaces",
        id: w.id,`,
  `      allItems.push({
        module: w.parent_workspace_id ? "Sub Workspaces" : "Workspaces",
        id: w.id,`
);

// 5. Update kpis to the new structure
const oldKpisBlock = `    const kpis = {
      tasks: {
        total: totalTasks,
        resolved: resolvedCount,
        upcoming_due: upcomingTasks,
      },
      workspaces: {
        enrolled_workspaces: isSuperAdmin ? (workspacesData?.length || 0) : workspaceIds.length,
        enrolled_sub_workspaces: subWorkspaceIds.length
      },
      tickets_reqs: {
        total_tickets: ticketsData?.length || 0,
        total_requirements: requirementsData?.length || 0
      },
      sla: {
        escalated_or_breached: escalatedCount,
        healthy: Math.max(0, allItems.length - escalatedCount - upcomingTasks),
        warning: upcomingTasks,
        breached: escalatedCount
      },
      workload: {
        active_tasks: totalTasks - resolvedCount,
        active_tickets: (ticketsData?.length || 0) - (ticketsData?.filter((t: any) => mapStatus(t.status_master?.status_name) === 'Resolved').length || 0),
        active_requirements: (requirementsData?.length || 0) - (requirementsData?.filter((r: any) => mapStatus(r.status_master?.status_name) === 'Resolved').length || 0)
      }
    };`;

const newKpisBlock = `    const kpis = {
      workspaces: { total: workspacesData?.filter(w => !w.parent_workspace_id).length || 0, resolved: workspacesData?.filter(w => !w.parent_workspace_id && mapStatus(w.status_master?.status_name) === 'Resolved').length || 0 },
      sub_workspaces: { total: workspacesData?.filter(w => w.parent_workspace_id).length || 0, resolved: workspacesData?.filter(w => w.parent_workspace_id && mapStatus(w.status_master?.status_name) === 'Resolved').length || 0 },
      tasks: { total: tasksData?.length || 0, resolved: tasksData?.filter(t => mapStatus(t.status_master?.status_name) === 'Resolved').length || 0, upcoming_due: tasksData?.filter(t => t.end_date && mapStatus(t.status_master?.status_name) !== 'Resolved' && (new Date(t.end_date).getTime() - now) / (1000 * 3600 * 24) >= 0 && (new Date(t.end_date).getTime() - now) / (1000 * 3600 * 24) <= 7).length || 0 },
      sub_tasks: { total: subTasksData?.length || 0, resolved: subTasksData?.filter(t => mapStatus(t.status) === 'Resolved').length || 0 },
      requirements: { total: requirementsData?.length || 0, resolved: requirementsData?.filter(t => mapStatus(t.status_master?.status_name) === 'Resolved').length || 0, upcoming_due: requirementsData?.filter(t => t.due_date && mapStatus(t.status_master?.status_name) !== 'Resolved' && (new Date(t.due_date).getTime() - now) / (1000 * 3600 * 24) >= 0 && (new Date(t.due_date).getTime() - now) / (1000 * 3600 * 24) <= 7).length || 0 },
      tickets: { total: ticketsData?.length || 0, resolved: ticketsData?.filter(t => mapStatus(t.status_master?.status_name) === 'Resolved').length || 0, upcoming_due: ticketsData?.filter(t => t.due_date && mapStatus(t.status_master?.status_name) !== 'Resolved' && (new Date(t.due_date).getTime() - now) / (1000 * 3600 * 24) >= 0 && (new Date(t.due_date).getTime() - now) / (1000 * 3600 * 24) <= 7).length || 0 },
    };`;

code = code.replace(oldKpisBlock, newKpisBlock);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated dashboardMetrics.ts');
