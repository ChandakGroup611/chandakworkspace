"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import { requireMeet } from "@/lib/permissions/meet";

export async function generateMoMSnapshot(sessionId: string) {
  try {
    const { userId } = await requireMeet("MEET_VIEW", { sessionId });

    // Fetch session details, meeting, attendees, points, tasks, decisions
    const [sessionRes, attendeesRes, pointsRes, decisionsRes] = await Promise.all([
      supabaseAdmin
        .from("meet_sessions")
        .select(`
          *,
          meeting:meet_meetings(
            title, code, description, mode, venue_text, video_link,
            organizer:user_master!meet_meetings_organizer_id_fkey(full_name, email),
            chair:user_master!meet_meetings_chair_id_fkey(full_name, email)
          ),
          minute_taker:user_master!meet_sessions_minute_taker_id_fkey(full_name, email)
        `)
        .eq("id", sessionId)
        .single(),
      supabaseAdmin
        .from("meet_session_attendees")
        .select("*, user:user_master(full_name, email)")
        .eq("session_id", sessionId),
      supabaseAdmin
        .from("meet_session_points")
        .select(`
          entry_type, discussion_notes,
          point:meet_points(
            id, code, title, description, point_type, priority, status, tat_days, due_date,
            carry_forward_count, progress_percent,
            owner:user_master!meet_points_owner_id_fkey(full_name, email),
            tasks:meet_tasks(
              code, title, status, due_date, tat_result,
              owner:user_master(full_name)
            )
          )
        `)
        .eq("session_id", sessionId),
      supabaseAdmin
        .from("meet_decisions")
        .select("*")
        .eq("session_id", sessionId),
    ]);

    const session = sessionRes.data;
    if (!session) return { success: false, error: "Session not found" };

    const snapshot = {
      generated_at: new Date().toISOString(),
      meeting_title: session.meeting?.title,
      meeting_code: session.meeting?.code,
      session_code: session.code,
      session_no: session.session_no,
      scheduled_start: session.scheduled_start,
      scheduled_end: session.scheduled_end,
      actual_start: session.actual_start,
      actual_end: session.actual_end,
      organizer: session.meeting?.organizer?.full_name,
      chair: session.meeting?.chair?.full_name,
      minute_taker: session.minute_taker?.full_name,
      summary_notes: session.summary_notes,
      attendees: (attendeesRes.data || []).map((a: any) => ({
        name: a.user?.full_name || a.guest_name,
        email: a.user?.email || a.guest_email,
        role: a.role,
        attendance: a.attendance,
      })),
      backup_points: (pointsRes.data || [])
        .filter((sp: any) => sp.entry_type === "carried_forward")
        .map((sp: any) => ({
          code: sp.point?.code,
          title: sp.point?.title,
          owner: sp.point?.owner?.full_name,
          status: sp.point?.status,
          carry_count: sp.point?.carry_forward_count,
          progress: sp.point?.progress_percent,
          discussion_notes: sp.discussion_notes,
        })),
      new_points: (pointsRes.data || [])
        .filter((sp: any) => sp.entry_type === "new")
        .map((sp: any) => ({
          code: sp.point?.code,
          title: sp.point?.title,
          type: sp.point?.point_type,
          priority: sp.point?.priority,
          owner: sp.point?.owner?.full_name,
          tat_days: sp.point?.tat_days,
          due_date: sp.point?.due_date,
          status: sp.point?.status,
          discussion_notes: sp.discussion_notes,
          tasks: (sp.point?.tasks || []).map((t: any) => ({
            code: t.code,
            title: t.title,
            owner: t.owner?.full_name,
            due_date: t.due_date,
            status: t.status,
          })),
        })),
      decisions: (decisionsRes.data || []).map((d: any) => ({
        code: d.code,
        text: d.text,
        decided_by: d.decided_by,
        effective_from: d.effective_from,
      })),
    };

    // Upsert Version 1 draft
    const { data: momVersion, error: vErr } = await supabaseAdmin
      .from("meet_mom_versions")
      .upsert(
        {
          session_id: sessionId,
          version: 1,
          snapshot,
          status: "draft",
          created_by: userId,
        },
        { onConflict: "session_id,version" }
      )
      .select()
      .single();

    if (vErr) return { success: false, error: vErr.message };

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true, snapshot, momVersion };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function publishMoM(sessionId: string, version: number = 1) {
  try {
    const { userId, roleInMeeting, isSuperAdmin, isMeetAdmin } = await requireMeet("MEET_MOM_PUBLISH", { sessionId });
    const now = new Date().toISOString();

    // 1. Enforce chair approval gate (M3 / R2)
    const { data: session } = await supabaseAdmin
      .from("meet_sessions")
      .select("meeting:meet_meetings(requires_mom_approval, chair_id, title)")
      .eq("id", sessionId)
      .single();

    const requiresApproval = (session as any)?.meeting?.requires_mom_approval ?? false;
    if (requiresApproval && !isSuperAdmin && !isMeetAdmin) {
      const { data: vRecord } = await supabaseAdmin
        .from("meet_mom_versions")
        .select("status")
        .eq("session_id", sessionId)
        .eq("version", version)
        .maybeSingle();

      if (vRecord?.status !== "approved" && roleInMeeting !== "chair") {
        return { success: false, error: "Chair approval is required before publishing Minutes of Meeting." };
      }
    }

    // 2. Update version status to published
    await supabaseAdmin
      .from("meet_mom_versions")
      .update({
        status: "published",
        approved_by: userId,
        approved_at: now,
      })
      .eq("session_id", sessionId)
      .eq("version", version);

    // 3. Update session status (using standard 'published' consistent with ai-minutes.ts and spec)
    await supabaseAdmin
      .from("meet_sessions")
      .update({
        status: "published",
        mom_version: version,
        mom_published_at: now,
        mom_published_by: userId,
        updated_at: now,
      })
      .eq("id", sessionId);

    // 4. Activity log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "mom",
      entity_id: sessionId,
      action: "published",
      field: "version",
      old_value: "draft",
      new_value: String(version),
      user_id: userId,
      channel: "web",
    });

    // 5. Queue MoM distribution emails to all attendees (A7 / E8)
    const { data: attendees } = await supabaseAdmin
      .from("meet_session_attendees")
      .select("user_id, guest_email, user:user_master(id, full_name, email)")
      .eq("session_id", sessionId);

    const emailRows: any[] = [];
    for (const att of attendees || []) {
      const u = att.user as any;
      const email = (Array.isArray(u) ? u[0]?.email : u?.email) || att.guest_email;
      if (email) {
        emailRows.push({
          recipient_email: email,
          subject: `Minutes of Meeting Published: ${(session as any)?.meeting?.title || "Meeting"}`,
          html_body: `<p>The official Minutes of Meeting have been published.</p><p><a href="https://chandakgroup.tech/meet/sessions/${sessionId}">Click here to view MoM and acknowledge receipt</a>.</p>`,
          body_template: `The official Minutes of Meeting have been published. View MoM: https://chandakgroup.tech/meet/sessions/${sessionId}`,
          module: "meet",
          event: "meet.mom.published",
          status: "PENDING",
        });
      }
    }

    if (emailRows.length > 0) {
      await supabaseAdmin.from("email_queue").insert(emailRows);
    }

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function acknowledgeMoM(sessionId: string, version: number = 1, comment?: string) {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin
      .from("meet_mom_acknowledgements")
      .upsert(
        {
          session_id: sessionId,
          mom_version: version,
          user_id: user.id,
          acknowledged_at: new Date().toISOString(),
          comment: comment || null,
        },
        { onConflict: "session_id,mom_version,user_id" }
      );

    if (error) return { success: false, error: error.message };

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMoMVersions() {
  try {
    await requireMeet("MEET_VIEW");
    const { data, error } = await supabaseAdmin
      .from("meet_mom_versions")
      .select(`
        *,
        session:meet_sessions(
          id, code, session_no, scheduled_date, scheduled_start,
          meeting:meet_meetings(id, code, title)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching MoM versions:", error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("Unexpected error in getMoMVersions:", err);
    return [];
  }
}
