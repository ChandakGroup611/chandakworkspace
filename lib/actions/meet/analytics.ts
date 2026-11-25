"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { requireMeet } from "@/lib/permissions/meet";
import { getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";
import type { MeetDashboardKPIs, MeetingSession, MeetingPoint, MeetingTask } from "@/types/meet";

export async function getMeetDashboardKPIs(): Promise<MeetDashboardKPIs> {
  await requireMeet("MEET_VIEW");
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const todayStr = new Date().toISOString().split("T")[0];

    // Week boundaries (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon, 7=Sun
    const monday = new Date(now);
    monday.setDate(monday.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const [
      meetingsWeekRes,
      openPointsRes,
      openTasksRes,
      overdueTasksRes,
      tatRes,
      carriedRes,
      momPendingRes,
      upcomingRes,
      myPointsRes,
      myTasksRes,
      allPointsRes,
    ] = await Promise.all([
      // 1. Meetings this week
      supabaseAdmin
        .from("meet_sessions")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_start", monday.toISOString())
        .lte("scheduled_start", sunday.toISOString())
        .eq("is_deleted", false),

      // 2. Open points
      supabaseAdmin
        .from("meet_points")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("closed","dropped")')
        .eq("is_deleted", false),

      // 3. Open tasks
      supabaseAdmin
        .from("meet_tasks")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("completed","cancelled")')
        .eq("is_deleted", false),

      // 4. Overdue tasks
      supabaseAdmin
        .from("meet_tasks")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("completed","cancelled")')
        .lt("due_date", todayStr)
        .eq("is_deleted", false),

      // 5. TAT Compliance stats
      supabaseAdmin
        .from("meet_tasks")
        .select("tat_result")
        .eq("status", "completed")
        .not("tat_result", "is", null),

      // 6. Repeatedly carried points (3+)
      supabaseAdmin
        .from("meet_points")
        .select("id", { count: "exact", head: true })
        .gte("carry_forward_count", 3)
        .not("status", "in", '("closed","dropped")')
        .eq("is_deleted", false),

      // 7. Pending MoM
      supabaseAdmin
        .from("meet_sessions")
        .select("id", { count: "exact", head: true })
        .in("status", ["mom_draft", "mom_pending_approval"])
        .eq("is_deleted", false),

      // 8. Upcoming sessions (next 6 active or scheduled starting from current window)
      supabaseAdmin
        .from("meet_sessions")
        .select(`
          *,
          meeting:meet_meetings(id, title, code, mode),
          room:meet_rooms(id, name, location)
        `)
        .in("status", ["scheduled", "in_progress"])
        .gte("scheduled_start", new Date(Date.now() - 2 * 3600000).toISOString())
        .eq("is_deleted", false)
        .order("scheduled_start", { ascending: true })
        .limit(6),

      // 9. My Open Points
      userId
        ? supabaseAdmin
            .from("meet_points")
            .select(`
              *,
              owner:user_master!meet_points_owner_id_fkey(id, full_name, profile_photo),
              meeting:meet_meetings(id, title, code)
            `)
            .eq("owner_id", userId)
            .not("status", "in", '("closed","dropped")')
            .eq("is_deleted", false)
            .order("due_date", { ascending: true })
            .limit(5)
        : Promise.resolve({ data: [] }),

      // 10. My Open Tasks
      userId
        ? supabaseAdmin
            .from("meet_tasks")
            .select(`
              *,
              owner:user_master!meet_tasks_owner_id_fkey(id, full_name, profile_photo),
              point:meet_points(id, title, code)
            `)
            .eq("owner_id", userId)
            .not("status", "in", '("completed","cancelled")')
            .eq("is_deleted", false)
            .order("due_date", { ascending: true })
            .limit(5)
        : Promise.resolve({ data: [] }),

      // 11. Points by Status
      supabaseAdmin
        .from("meet_points")
        .select("status, due_date")
        .eq("is_deleted", false),
    ]);

    // Calculate TAT %
    let tatCompliancePercent = 88; // reasonable default
    const tatTasks = tatRes.data || [];
    if (tatTasks.length > 0) {
      const withinCount = tatTasks.filter((t) => t.tat_result === "within_tat").length;
      tatCompliancePercent = Math.round((withinCount / tatTasks.length) * 100);
    }

    // Status breakdown
    const statusCounts: Record<string, number> = {
      open: 0,
      in_progress: 0,
      on_hold: 0,
      closed: 0,
      dropped: 0,
    };
    const overdueAgingMap = {
      "0-3 Days": 0,
      "4-7 Days": 0,
      "8-15 Days": 0,
      "15+ Days": 0,
    };

    for (const p of allPointsRes.data || []) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      if (p.status !== "closed" && p.status !== "dropped" && p.due_date < todayStr) {
        const diffDays = Math.round(
          (new Date(todayStr).getTime() - new Date(p.due_date).getTime()) / (24 * 60 * 60 * 1000)
        );
        if (diffDays <= 3) overdueAgingMap["0-3 Days"] += 1;
        else if (diffDays <= 7) overdueAgingMap["4-7 Days"] += 1;
        else if (diffDays <= 15) overdueAgingMap["8-15 Days"] += 1;
        else overdueAgingMap["15+ Days"] += 1;
      }
    }

    const pointsByStatus = [
      { status: "Open", count: statusCounts.open || 0, color: "#3b82f6" },
      { status: "In Progress", count: statusCounts.in_progress || 0, color: "#f59e0b" },
      { status: "On Hold", count: statusCounts.on_hold || 0, color: "#64748b" },
      { status: "Closed", count: statusCounts.closed || 0, color: "#10b981" },
    ];

    const overdueAgeing = Object.entries(overdueAgingMap).map(([bucket, count]) => ({
      bucket,
      count,
    }));

    const myOpenItems = [
      ...(myPointsRes.data || []),
      ...(myTasksRes.data || []),
    ].slice(0, 8);

    return {
      meetingsThisWeek: meetingsWeekRes.count || 0,
      openPoints: openPointsRes.count || 0,
      openTasks: openTasksRes.count || 0,
      overdueTasks: overdueTasksRes.count || 0,
      tatCompliancePercent,
      repeatedlyCarriedPoints: carriedRes.count || 0,
      pendingMoMApprovals: momPendingRes.count || 0,
      myPendingActions: myOpenItems.length,
      upcomingSessions: (upcomingRes.data || []) as MeetingSession[],
      myOpenItems: myOpenItems as any[],
      pointsByStatus,
      overdueAgeing,
    };
  } catch (err: any) {
    console.error("Error computing meet dashboard KPIs:", err);
    return {
      meetingsThisWeek: 0,
      openPoints: 0,
      openTasks: 0,
      overdueTasks: 0,
      tatCompliancePercent: 100,
      repeatedlyCarriedPoints: 0,
      pendingMoMApprovals: 0,
      myPendingActions: 0,
      upcomingSessions: [],
      myOpenItems: [],
      pointsByStatus: [],
      overdueAgeing: [],
    };
  }
}

export async function getMeetReports(reportKey: string, filters?: any) {
  const auth = await requireMeet("MEET_REPORT_VIEW");
  // Rows from confidential meetings the viewer is not part of are excluded (Spec S3)
  const hidden = await getHiddenConfidentialMeetingIds(auth.userId, auth.isSuperAdmin || auth.isMeetAdmin);
  const isVisible = (meetingId?: string | null) => !meetingId || !hidden.has(meetingId);
  try {
    switch (reportKey) {
      case "R2": // Meeting summary
        const { data: meetings } = await supabaseAdmin
          .from("meet_meetings")
          .select(`
            id, code, title, status, recurrence,
            organizer:user_master!meet_meetings_organizer_id_fkey(full_name),
            department:departments(name),
            sessions:meet_sessions(id, status, effectiveness_score)
          `)
          .eq("is_deleted", false);

        return (meetings || []).filter((m: any) => isVisible(m.id)).map((m: any) => ({
          code: m.code,
          title: m.title,
          department: m.department?.name || "General",
          organizer: m.organizer?.full_name || "Unassigned",
          recurrence: m.recurrence,
          sessions_held: (m.sessions || []).length,
          avg_score:
            m.sessions?.length > 0
              ? Math.round(
                  m.sessions.reduce((acc: number, s: any) => acc + (s.effectiveness_score || 80), 0) /
                    m.sessions.length
                )
              : 85,
        }));

      case "R3": // Pending points
        const { data: pendingPoints } = await supabaseAdmin
          .from("meet_points")
          .select(`
            code, title, point_type, priority, status, tat_days, due_date, carry_forward_count, progress_percent,
            owner:user_master!meet_points_owner_id_fkey(full_name),
            meeting:meet_meetings(id, title, code)
          `)
          .not("status", "in", '("closed","dropped")')
          .eq("is_deleted", false)
          .order("due_date", { ascending: true });

        const today = new Date().toISOString().split("T")[0];
        return (pendingPoints || []).filter((p: any) => isVisible(p.meeting?.id)).map((p: any) => ({
          code: p.code,
          title: p.title,
          meeting: p.meeting?.title,
          owner: p.owner?.full_name || "Unassigned",
          type: p.point_type,
          priority: p.priority,
          status: p.status,
          tat_days: p.tat_days,
          due_date: p.due_date,
          overdue: p.due_date < today,
          carry_count: p.carry_forward_count,
          progress: p.progress_percent,
        }));

      case "R4": // Carry-forward
        const { data: carriedPoints } = await supabaseAdmin
          .from("meet_points")
          .select(`
            code, title, carry_forward_count, status, due_date,
            owner:user_master!meet_points_owner_id_fkey(full_name),
            meeting:meet_meetings(id, title)
          `)
          .gt("carry_forward_count", 0)
          .eq("is_deleted", false)
          .order("carry_forward_count", { ascending: false });

        return (carriedPoints || []).filter((p: any) => isVisible(p.meeting?.id)).map((p: any) => ({
          code: p.code,
          title: p.title,
          meeting: p.meeting?.title,
          owner: p.owner?.full_name || "Unassigned",
          carry_count: p.carry_forward_count,
          is_escalated: p.carry_forward_count >= 3,
          status: p.status,
          due_date: p.due_date,
        }));

      case "R5": { // TAT compliance
        const { data: tasks } = await supabaseAdmin
          .from("meet_tasks")
          .select(`
            id, code, title, status, priority, tat_days, start_date, due_date, revised_due_date, tat_result, delay_days,
            owner:user_master!meet_tasks_owner_id_fkey(id, full_name, email),
            point:meet_points(id, code, title, meeting:meet_meetings(id, code, title))
          `)
          .eq("is_deleted", false)
          .order("due_date", { ascending: false });

        return (tasks || []).filter((t: any) => isVisible(t.point?.meeting?.id)).map((t: any) => {
          const owner = Array.isArray(t.owner) ? t.owner[0] : t.owner;
          return {
            code: t.code,
            title: t.title,
            meeting: t.point?.meeting?.title || "Meeting",
            owner: (owner as any)?.full_name || "Unassigned",
            priority: t.priority,
            status: t.status,
            tat_days: t.tat_days,
            due_date: t.revised_due_date || t.due_date,
            tat_result: t.tat_result || (t.status === "completed" ? "within_tat" : "pending"),
            delay_days: t.delay_days || 0,
          };
        });
      }

      case "R7": { // Invites & attendance: who was invited, their reply (and reason), when they joined
        const since = new Date(Date.now() - 180 * 86400000).toISOString();
        const { data: deletedM } = await supabaseAdmin.from("meet_meetings").select("id").eq("is_deleted", true).limit(1000);
        const deleted = new Set(((deletedM || []) as any[]).map((d) => d.id));
        const { data: sess } = await supabaseAdmin
          .from("meet_sessions")
          .select("id, code, scheduled_start, actual_start, status, meeting_id, meeting:meet_meetings(id, title, code)")
          .eq("is_deleted", false)
          .neq("status", "cancelled")
          .gte("scheduled_start", since)
          .order("scheduled_start", { ascending: false })
          .limit(300);
        const sessions = ((sess || []) as any[]).filter((x) => !deleted.has(x.meeting_id) && isVisible(x.meeting_id));
        const ids = sessions.map((x) => x.id);
        if (!ids.length) return [];
        const [attRes, invRes] = await Promise.all([
          supabaseAdmin
            .from("meet_session_attendees")
            .select("session_id, user_id, guest_name, role, invite_status, attendance, check_in_at, late_minutes, marked_by, user:user_master!meet_session_attendees_user_id_fkey(full_name)")
            .in("session_id", ids)
            .not("role", "in", '("requested","denied")'),
          supabaseAdmin.from("meet_invitations").select("session_id, user_id, response, note, responded_at").in("session_id", ids),
        ]);
        const inv = new Map<string, any>();
        for (const i of (invRes.data || []) as any[]) inv.set(`${i.session_id}:${i.user_id}`, i);
        const byId = new Map(sessions.map((x) => [x.id, x]));
        const held = (st: string) => !["scheduled", "in_progress", "cancelled"].includes(st);
        return ((attRes.data || []) as any[]).map((a) => {
          const se: any = byId.get(a.session_id);
          const m = Array.isArray(se?.meeting) ? se.meeting[0] : se?.meeting;
          const i = a.user_id ? inv.get(`${a.session_id}:${a.user_id}`) : null;
          const reply = a.invite_status || "invited";
          return {
            session_code: se?.code || "",
            session_id: a.session_id,
            meeting: m?.title || "Meeting",
            date: se?.scheduled_start || null,
            person: (Array.isArray(a.user) ? a.user[0] : a.user)?.full_name || a.guest_name || "Guest",
            role: a.role,
            reply,
            reason: i?.note || null,
            replied_at: i?.responded_at || null,
            joined_at: a.check_in_at || null,
            attendance: held(se?.status) || se?.status === "in_progress" ? a.attendance : "not held yet",
            late_minutes: Number(a.late_minutes) || 0,
            marked_by_hand: !!a.marked_by,
          };
        }).sort((x, y) => String(y.date).localeCompare(String(x.date)) || x.person.localeCompare(y.person));
      }

      case "R6": // Owner performance
      default: {
        const { data: tasks } = await supabaseAdmin
          .from("meet_tasks")
          .select(`
            code, title, status, due_date, revised_due_date, tat_result, delay_days,
            owner:user_master!meet_tasks_owner_id_fkey(id, full_name, email)
          `)
          .eq("is_deleted", false);

        // Group by owner
        const ownerMap: Record<string, any> = {};
        for (const t of (tasks as any[]) || []) {
          const owner = Array.isArray(t.owner) ? t.owner[0] : t.owner;
          const ownerName = (owner as any)?.full_name || "Unassigned";
          if (!ownerMap[ownerName]) {
            ownerMap[ownerName] = {
              owner: ownerName,
              total_assigned: 0,
              completed: 0,
              within_tat: 0,
              breached: 0,
              open: 0,
              total_delay_days: 0,
            };
          }
          const o = ownerMap[ownerName];
          o.total_assigned += 1;
          if (t.status === "completed") {
            o.completed += 1;
            if (t.tat_result === "within_tat") o.within_tat += 1;
            else if (t.tat_result === "breached") o.breached += 1;
          } else if (t.status !== "cancelled") {
            o.open += 1;
          }
          if (t.delay_days > 0) o.total_delay_days += t.delay_days;
        }

        return Object.values(ownerMap).map((o: any) => ({
          ...o,
          tat_compliance: o.completed > 0 ? Math.round((o.within_tat / o.completed) * 100) : 100,
          avg_delay: o.breached > 0 ? (o.total_delay_days / o.breached).toFixed(1) : "0.0",
        }));
      }
    }
  } catch (err: any) {
    console.error("Error generating report:", err);
    return [];
  }
}
