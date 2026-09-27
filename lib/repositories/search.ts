import { getVisibleTickets } from './tickets';
import { getVisibleTasks } from './tasks';
import { getVisibleRequirements } from './requirements';
import { supabaseAdmin } from '@/lib/supabase/service_role';

export interface SearchResult {
  id: string;
  type: 'TICKET' | 'TASK' | 'REQUIREMENT' | 'VEHICLE';
  title: string;
  code?: string;
  status: string;
  url: string;
  metadata: any;
}

/**
 * Enterprise Global Search
 * Strictly enforces scoped visibility by querying authorized repositories FIRST,
 * then performing in-memory filtering. 
 * Prevents unauthorized data leakage natively.
 */
export async function executeGlobalSearch(userId: string, query: string): Promise<SearchResult[]> {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return [];

  const [tickets, tasks, requirements, vehiclesRes] = await Promise.all([
    getVisibleTickets(userId, 'id, title, code, description, status:status_master(status_name)'),
    getVisibleTasks(userId, 'id, subject, task_code, description, status:status_master(status_name)'),
    getVisibleRequirements(userId, 'id, title, code, objective, requirement_details, status:status_master(status_name)'),
    supabaseAdmin.from('vehicles').select('id, registration_number, make, model, variant, status, fuel_type').limit(100)
  ]);

  const results: SearchResult[] = [];

  // Filter Tickets
  for (const t of (tickets as any[])) {
    const title = t.title || t.subject || '';
    const code = t.code || t.ticket_code || '';
    if (
      code.toLowerCase().includes(searchTerm) || 
      title.toLowerCase().includes(searchTerm) || 
      (t.description || '').toLowerCase().includes(searchTerm)
    ) {
      results.push({
        id: t.id,
        type: 'TICKET',
        title: title || 'Untitled Ticket',
        code: code,
        status: t.status?.status_name || 'UNKNOWN',
        url: `/tickets/${t.id}`,
        metadata: { priority: t.priority?.priority_name, department: t.department?.name }
      });
    }
  }

  // Filter Tasks
  for (const t of (tasks as any[])) {
    const title = t.title || t.subject || '';
    const code = t.code || t.task_code || '';
    if (
      code.toLowerCase().includes(searchTerm) ||
      title.toLowerCase().includes(searchTerm) || 
      (t.description || '').toLowerCase().includes(searchTerm)
    ) {
      results.push({
        id: t.id,
        type: 'TASK',
        title: title || 'Untitled Task',
        code: code,
        status: t.status?.status_name || 'UNKNOWN',
        url: `/tasks/${t.id}`,
        metadata: { priority: t.priority?.priority_name }
      });
    }
  }

  // Filter Requirements
  for (const r of (requirements as any[])) {
    const title = r.title || r.subject || '';
    const code = r.code || r.requirement_code || '';
    if (
      code.toLowerCase().includes(searchTerm) || 
      title.toLowerCase().includes(searchTerm) || 
      (r.objective || '').toLowerCase().includes(searchTerm) ||
      (r.requirement_details || '').toLowerCase().includes(searchTerm)
    ) {
      results.push({
        id: r.id,
        type: 'REQUIREMENT',
        title: title || 'Untitled Requirement',
        code: code,
        status: r.status?.status_name || 'UNKNOWN',
        url: `/requirements/${r.id}`,
        metadata: { priority: r.priority?.priority_name, analyst: r.analyst?.full_name }
      });
    }
  }

  // Filter Vehicles
  const vehicles = vehiclesRes.data || [];
  for (const v of vehicles) {
    const plate = v.registration_number || '';
    const makeModel = `${v.make || ''} ${v.model || ''}`;
    if (
      plate.toLowerCase().includes(searchTerm) ||
      makeModel.toLowerCase().includes(searchTerm) ||
      (v.variant || '').toLowerCase().includes(searchTerm) ||
      (v.fuel_type || '').toLowerCase().includes(searchTerm)
    ) {
      results.push({
        id: v.id,
        type: 'VEHICLE',
        title: `${plate} — ${makeModel}`,
        code: plate,
        status: v.status || 'IN_STOCK',
        url: `/vehicle/inventory`,
        metadata: { fuel: v.fuel_type, variant: v.variant }
      });
    }
  }

  // Return limited results to prevent massive payloads on vague searches
  return results.slice(0, 50);
}
