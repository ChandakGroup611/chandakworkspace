import { getVisibleTickets } from './tickets';
import { getVisibleTasks } from './tasks';
import { getVisibleRequirements } from './requirements';

export interface SearchResult {
  id: string;
  type: 'TICKET' | 'TASK' | 'REQUIREMENT';
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

  const [tickets, tasks, requirements] = await Promise.all([
    getVisibleTickets(userId),
    getVisibleTasks(userId),
    getVisibleRequirements(userId)
  ]);

  const results: SearchResult[] = [];

  // Filter Tickets
  for (const t of (tickets as any[])) {
    if (
      t.code?.toLowerCase().includes(searchTerm) || 
      t.subject?.toLowerCase().includes(searchTerm) || 
      t.description?.toLowerCase().includes(searchTerm)
    ) {
      results.push({
        id: t.id,
        type: 'TICKET',
        title: t.subject || 'Untitled Ticket',
        code: t.code,
        status: t.status?.status_name || 'UNKNOWN',
        url: `/tickets/${t.id}`,
        metadata: { priority: t.priority?.priority_name, department: t.department?.name }
      });
    }
  }

  // Filter Tasks
  for (const t of (tasks as any[])) {
    if (
      t.subject?.toLowerCase().includes(searchTerm) || 
      t.description?.toLowerCase().includes(searchTerm)
    ) {
      results.push({
        id: t.id,
        type: 'TASK',
        title: t.subject || 'Untitled Task',
        status: t.status?.status_name || 'UNKNOWN',
        url: `/tasks/${t.id}`,
        metadata: { priority: t.priority?.priority_name }
      });
    }
  }

  // Filter Requirements
  for (const r of (requirements as any[])) {
    if (
      r.requirement_code?.toLowerCase().includes(searchTerm) || 
      r.title?.toLowerCase().includes(searchTerm) || 
      r.description?.toLowerCase().includes(searchTerm)
    ) {
      results.push({
        id: r.id,
        type: 'REQUIREMENT',
        title: r.title || 'Untitled Requirement',
        code: r.requirement_code,
        status: r.status?.status_name || 'UNKNOWN',
        url: `/requirements/${r.id}`,
        metadata: { priority: r.priority?.priority_name, analyst: r.analyst?.full_name }
      });
    }
  }

  // Return limited results to prevent massive payloads on vague searches
  return results.slice(0, 50);
}
