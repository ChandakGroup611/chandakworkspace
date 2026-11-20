"use server";

import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { getVisibleTickets } from "@/lib/repositories/tickets";
import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * One row of the Ticket report. Every value is already resolved to display text so the
 * report screen and the Excel/PDF export show exactly the same thing.
 */
export interface TicketReportRow {
  id: string;
  code: string;
  title: string;
  description: string;
  scope: string;
  category: string;
  subcategory: string;
  issue_type: string;
  department: string;
  priority: string;
  priority_color: string | null;
  status: string;
  status_color: string | null;
  is_closed: boolean;
  creator_name: string;
  assigned_to: string;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  age_days: number | null;
}

const REPORT_PAGE_SIZE = 1000;
const REPORT_MAX_PAGES = 10; // up to 10,000 tickets per report

const REPORT_SELECT = `
  id, code, title, description, scope_id, custom_fields, due_date, created_at, updated_at,
  creator:user_master!fk_tickets_creator(full_name),
  assignee:user_master!fk_tickets_assignee(full_name),
  department:departments(name),
  priority:priority_master(priority_name, priority_color),
  status:status_master(status_name, status_color, is_terminal, is_closed)
`;

function nameMap(rows: any[] | null | undefined, field = "name"): Map<string, string> {
  const map = new Map<string, string>();
  (rows || []).forEach((r: any) => {
    if (r?.id) map.set(r.id, r[field] || r.name || r.code || "");
  });
  return map;
}

/**
 * Ticket list report. Uses the same visibility rules as the Tickets list (getVisibleTickets):
 * Super Admin and ticket managers see all tickets, everyone else sees their own / their team's.
 */
export async function generateTicketReportData(): Promise<{ rows: TicketReportRow[]; truncated: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { rows: [], truncated: false, error: "Please sign in again." };

  try {
    const all: any[] = [];
    let truncated = false;
    for (let page = 1; page <= REPORT_MAX_PAGES; page++) {
      const batch: any[] = (await getVisibleTickets(user.id, REPORT_SELECT, undefined, { page, limit: REPORT_PAGE_SIZE })) || [];
      all.push(...batch);
      if (batch.length < REPORT_PAGE_SIZE) break;
      if (page === REPORT_MAX_PAGES) truncated = true;
    }

    const [scopeRes, catRes, subcatRes, typeRes] = await Promise.all([
      supabaseAdmin.from("ticket_scopes").select("id, name, code"),
      supabaseAdmin.from("ticket_categories").select("id, name"),
      supabaseAdmin.from("ticket_subcategories").select("id, name"),
      supabaseAdmin.from("issue_types").select("id, name"),
    ]);
    const scopes = nameMap(scopeRes.data);
    const categories = nameMap(catRes.data);
    const subcategories = nameMap(subcatRes.data);
    const issueTypes = nameMap(typeRes.data);

    const now = Date.now();
    const rows: TicketReportRow[] = all.map((t: any) => {
      const custom = t.custom_fields || {};
      const isClosed = !!(t.status?.is_closed || t.status?.is_terminal);
      const created = t.created_at ? new Date(t.created_at).getTime() : null;
      return {
        id: t.id,
        code: t.code || `INC-${String(t.id).slice(0, 8)}`,
        title: t.title || "",
        description: String(t.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
        scope: scopes.get(t.scope_id) || "",
        category: categories.get(custom.category_id) || "",
        subcategory: subcategories.get(custom.subcategory_id) || "",
        issue_type: issueTypes.get(custom.issue_type_id) || "",
        department: t.department?.name || "",
        priority: t.priority?.priority_name || "",
        priority_color: t.priority?.priority_color || null,
        status: t.status?.status_name || "",
        status_color: t.status?.status_color || null,
        is_closed: isClosed,
        creator_name: t.creator?.full_name || "",
        assigned_to: t.assignee?.full_name || "Unassigned",
        due_date: t.due_date || null,
        created_at: t.created_at || null,
        updated_at: t.updated_at || null,
        age_days: created && !isClosed ? Math.max(0, Math.floor((now - created) / 86_400_000)) : null,
      };
    });

    return { rows, truncated };
  } catch (err: any) {
    console.error("[generateTicketReportData]", err);
    return { rows: [], truncated: false, error: err?.message || "Could not load the ticket report." };
  }
}
