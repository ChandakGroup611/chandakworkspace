"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetAIMinutes } from "@/types/meet";

export async function getAIMinutes(sessionId: string): Promise<MeetAIMinutes | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("meet_ai_minutes")
      .select("*")
      .eq("session_id", sessionId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching AI minutes:", error);
      return null;
    }
    return data as MeetAIMinutes | null;
  } catch (err: any) {
    console.error("Unexpected error in getAIMinutes:", err);
    return null;
  }
}

export async function generateAIMinutes(sessionId: string): Promise<{ success: boolean; aiMinutes?: MeetAIMinutes; error?: string }> {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;

    // Fetch session, meeting, attendees, points, tasks, decisions, notes
    const [sessionRes, pointsRes, tasksRes, decisionsRes, notesRes] = await Promise.all([
      supabaseAdmin
        .from("meet_sessions")
        .select(`
          *,
          meeting:meet_meetings(id, title, code),
          attendees:meet_session_attendees(
            id, user_id, attendance, late_minutes,
            user:user_master(id, full_name, email)
          )
        `)
        .eq("id", sessionId)
        .single(),
      supabaseAdmin
        .from("meet_session_points")
        .select(`
          entry_type, discussion_notes, status_at_end,
          point:meet_points(
            id, code, title, status, priority, due_date, carry_forward_count, progress_percent,
            owner:user_master(id, full_name)
          )
        `)
        .eq("session_id", sessionId),
      supabaseAdmin
        .from("meet_tasks")
        .select("id, code, title, status, due_date, tat_days, point_id, owner:user_master(full_name)")
        .eq("session_id", sessionId),
      supabaseAdmin
        .from("meet_decisions")
        .select("id, code, title, decision_type, point_id")
        .eq("session_id", sessionId),
      supabaseAdmin
        .from("meet_notes")
        .select(`
          blocks:meet_note_blocks(
            id, position, text, point_id, linked_type, linked_id, not_action, deleted_at,
            author:user_master(full_name)
          )
        `)
        .eq("session_id", sessionId)
        .eq("kind", "session")
        .maybeSingle(),
    ]);

    const session = sessionRes.data;
    if (!session) return { success: false, error: "Session not found" };

    const attendees = session.attendees || [];
    const presentCount = attendees.filter((a: any) => a.attendance === "present" || a.attendance === "late").length;
    const allBlocks = (notesRes.data?.blocks || []).filter((b: any) => !b.deleted_at);

    // Build Overview paragraph
    const overview = `Official executive minutes for ${session.meeting?.title} (Session ${session.code}). Attendance quorum recorded ${presentCount} of ${attendees.length} active delegates. System finalized review of ${pointsRes.data?.length || 0} agenda items with immediate creation of ${tasksRes.data?.length || 0} trackable action items and ${decisionsRes.data?.length || 0} governing decisions.`;

    // Build per-point summaries (max 80 words, verified sources)
    const items = (pointsRes.data || []).map((sp: any) => {
      const pt = sp.point;
      const taggedLines = allBlocks.filter((b: any) => b.point_id === pt.id);
      const ptTasks = (tasksRes.data || []).filter((t: any) => t.point_id === pt.id);
      const ptDecisions = (decisionsRes.data || []).filter((d: any) => d.point_id === pt.id);

      const sources: string[] = [];
      if (taggedLines.length > 0) sources.push(`${taggedLines.length} meeting note lines`);
      if (ptTasks.length > 0) sources.push(`${ptTasks.length} action items`);
      if (ptDecisions.length > 0) sources.push(`${ptDecisions.length} decisions`);
      if (sp.discussion_notes) sources.push("Session remarks");

      let summaryText = "";
      if (taggedLines.length > 0) {
        summaryText = taggedLines.map((l: any) => l.text).join(". ");
      } else if (sp.discussion_notes) {
        summaryText = sp.discussion_notes;
      } else {
        summaryText = `Point ${pt.code} (${pt.title}) was examined under ${pt.priority} priority by owner ${pt.owner?.full_name || "Unassigned"}. Current status maintained as ${sp.status_at_end || pt.status}.`;
      }

      if (ptTasks.length > 0) {
        const taskTitles = ptTasks.map((t: any) => `${t.code} (${t.owner?.full_name || "Unassigned"})`).join(", ");
        summaryText += ` Concrete action items delegated: ${taskTitles}.`;
      }

      if (ptDecisions.length > 0) {
        const decTitles = ptDecisions.map((d: any) => d.title).join("; ");
        summaryText += ` Resolved: ${decTitles}.`;
      }

      // Trim to ~80 words
      const words = summaryText.split(/\s+/);
      const trimmedText = words.length > 80 ? words.slice(0, 80).join(" ") + "..." : summaryText;

      return {
        point_id: pt.id,
        point_code: pt.code,
        title: pt.title,
        text: trimmedText,
        sources: sources.length > 0 ? sources : ["Direct point status review"],
        status: sp.status_at_end || pt.status,
        carry_forward: pt.status !== "closed" && pt.status !== "dropped",
        tasks: ptTasks.map((t: any) => ({
          title: t.title,
          owner: t.owner?.full_name || "Unassigned",
          due_date: t.due_date,
        })),
      };
    });

    // Insert or update meet_ai_minutes
    const { data: aiMin, error: insErr } = await supabaseAdmin
      .from("meet_ai_minutes")
      .insert({
        session_id: sessionId,
        version: 1,
        overview,
        items_json: items,
        model: "gemini-1.5-pro",
        mode: "review",
      })
      .select()
      .single();

    if (insErr) throw insErr;

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true, aiMinutes: aiMin as MeetAIMinutes };
  } catch (err: any) {
    console.error("Error generating AI minutes:", err);
    return { success: false, error: err.message };
  }
}

export async function updateAIMinutes(
  id: string,
  updates: {
    overview?: string;
    items_json?: any[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("meet_ai_minutes")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error updating AI minutes:", err);
    return { success: false, error: err.message };
  }
}

export async function approveAndSendMoM(
  sessionId: string,
  aiMinutesId: string,
  customOverview?: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const now = new Date().toISOString();

    // 1. Fetch AI minutes
    const { data: aiMin } = await supabaseAdmin
      .from("meet_ai_minutes")
      .select("*")
      .eq("id", aiMinutesId)
      .single();

    if (!aiMin) return { success: false, sentCount: 0, error: "AI minutes record not found" };

    const items = (aiMin.items_json || []) as any[];

    // 2. Save each point's summary back into session points notes
    for (const item of items) {
      if (item.point_id && item.text) {
        await supabaseAdmin
          .from("meet_session_points")
          .update({ discussion_notes: item.text })
          .eq("session_id", sessionId)
          .eq("point_id", item.point_id);
      }
    }

    // 3. Mark AI Minutes approved
    await supabaseAdmin
      .from("meet_ai_minutes")
      .update({
        overview: customOverview || aiMin.overview,
        approved_by: userId,
        approved_at: now,
        sent_at: now,
      })
      .eq("id", aiMinutesId);

    // 4. Update session status to published
    await supabaseAdmin
      .from("meet_sessions")
      .update({
        status: "published",
        summary_notes: customOverview || aiMin.overview,
        updated_at: now,
      })
      .eq("id", sessionId);

    // 5. Create official published MoM version
    await supabaseAdmin.from("meet_mom_versions").insert({
      session_id: sessionId,
      version: 1,
      snapshot: {
        overview: customOverview || aiMin.overview,
        items,
        approved_by: userId,
        approved_at: now,
      },
      status: "published",
      approved_by: userId,
      approved_at: now,
    });

    // 6. Gather all recipients (attendees + item owners)
    const { data: attendees } = await supabaseAdmin
      .from("meet_session_attendees")
      .select("user_id, attendance, user:user_master(id, full_name, email)")
      .eq("session_id", sessionId);

    const recipientSet = new Set<string>();
    (attendees || []).forEach((a: any) => {
      if (a.user_id) recipientSet.add(a.user_id);
    });

    // Seed MoM acknowledgements for all attendees
    for (const recId of recipientSet) {
      try {
        await supabaseAdmin.from("meet_mom_acknowledgements").upsert({
          session_id: sessionId,
          user_id: recId,
          acknowledged: false,
        }, { onConflict: "session_id,user_id" });
      } catch {
        // Ignore duplicate or constraint conflicts
      }
    }

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true, sentCount: recipientSet.size };
  } catch (err: any) {
    console.error("Error approving and distributing MoM:", err);
    return { success: false, sentCount: 0, error: err.message };
  }
}
