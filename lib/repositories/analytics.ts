import { supabaseAdmin } from '@/lib/supabase/service_role';
import { getVisibleTickets } from './tickets';
import { getVisibleTasks } from './tasks';
import { getVisibleRequirements } from './requirements';

export async function fetchDashboardAnalytics(userId: string) {
  // 1. Fetch scoped raw data strictly using Authorization Repository layer
  const [tickets, tasks, requirements] = await Promise.all([
    getVisibleTickets(userId, 'id, created_at, assignee_id, status:status_master!inner(is_closed), priority:priority_master(sla_target_minutes)'),
    getVisibleTasks(userId, 'id, status:status_master!inner(is_closed), assignees:task_assignees(user_id)'),
    getVisibleRequirements(userId, 'id, assigned_analyst_id, completion_percentage, status:status_master!inner(is_closed, status_name)')
  ]);

  // 2. Compute Ticket KPIs
  const ticketKpis = {
    total: tickets.length,
    open: tickets.filter((t: any) => !t.status?.is_closed).length,
    closed: tickets.filter((t: any) => t.status?.is_closed).length,
    overdue: 0, // Would be calculated if overdue boolean/logic exists
    unassigned: tickets.filter((t: any) => !t.assignee_id && !t.status?.is_closed).length,
  };

  // 3. Compute Task KPIs
  const taskKpis = {
    total: tasks.length,
    open: tasks.filter((t: any) => !t.status?.is_closed).length,
    closed: tasks.filter((t: any) => t.status?.is_closed).length,
    completion_percentage: tasks.length > 0 
      ? Math.round((tasks.filter((t: any) => t.status?.is_closed).length / tasks.length) * 100) 
      : 0
  };

  // 4. Compute Requirement KPIs
  const reqKpis = {
    total: requirements.length,
    pending: requirements.filter((r: any) => !r.status?.is_closed).length,
    uat: requirements.filter((r: any) => r.status?.status_name === 'UAT').length,
    avg_completion: requirements.length > 0
      ? Math.round(requirements.reduce((acc: number, r: any) => acc + (r.completion_percentage || 0), 0) / requirements.length)
      : 0
  };

  // 5. Workload Intelligence (Counts active items explicitly assigned to the user)
  const myWorkload = {
    active_tickets: tickets.filter((t: any) => t.assignee_id === userId && !t.status?.is_closed).length,
    active_tasks: tasks.filter((t: any) => 
      t.assignees?.some((a: any) => a.user_id === userId) && !t.status?.is_closed
    ).length,
    active_requirements: requirements.filter((r: any) => r.assigned_analyst_id === userId && !r.status?.is_closed).length,
  };

  const slaStats = {
    healthy: 0,
    warning: 0,
    breached: 0,
  };

  const now = new Date().getTime();

  tickets.filter((t: any) => !t.status?.is_closed).forEach((t: any) => {
    const createdTime = new Date(t.created_at).getTime();
    const elapsedMinutes = (now - createdTime) / (1000 * 60);
    // default SLA to 48 hours (2880 mins) if none specified
    const slaTarget = t.priority?.sla_target_minutes || 2880; 
    
    if (elapsedMinutes > slaTarget) {
      slaStats.breached++;
    } else if (elapsedMinutes > (slaTarget * 0.75)) {
      // Warning if > 75% of SLA consumed
      slaStats.warning++;
    } else {
      slaStats.healthy++;
    }
  });

  return {
    kpis: { tickets: ticketKpis, tasks: taskKpis, requirements: reqKpis },
    workload: myWorkload,
    sla: slaStats,
    raw_counts: {
      tickets: tickets.length,
      tasks: tasks.length,
      requirements: requirements.length
    }
  };
}

export async function getUserDashboardPreferences(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_dashboard_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Failed to fetch dashboard preferences:", error);
  }

  return data || {
    selected_theme: 'executive-light',
    widget_layout: {},
    pinned_analytics: [],
    saved_filters: {}
  };
}

export async function saveUserDashboardPreferences(userId: string, prefs: any) {
  const { data, error } = await supabaseAdmin
    .from('user_dashboard_preferences')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error("Failed to save preferences: " + error.message);
  return data;
}
