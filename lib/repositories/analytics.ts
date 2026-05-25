import { supabaseAdmin } from '@/lib/supabase/service_role';
import { getVisibleTickets } from './tickets';
import { getVisibleTasks } from './tasks';
import { getVisibleRequirements } from './requirements';

export async function fetchDashboardAnalytics(userId: string) {
  // 1. Fetch scoped raw data strictly using Authorization Repository layer
  const [tickets, tasks, requirements] = await Promise.all([
    getVisibleTickets(userId),
    getVisibleTasks(userId),
    getVisibleRequirements(userId)
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

  // 6. SLA Governance Analytics
  // For demonstration, we simulate SLA calculation based on priority fields vs created_at, 
  // or simply map from existing SLA states if maintained in DB.
  // We'll calculate a mock SLA distribution based on priority for the heatmap
  const slaStats = {
    healthy: Math.max(0, ticketKpis.open - 2), // Mock logic
    warning: 1, // Mock logic
    breached: 1, // Mock logic
  };

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
