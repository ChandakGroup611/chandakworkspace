"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetNote, MeetNoteBlock, NoteKind, NoteBlockType } from "@/types/meet";
import { isActionLikeText } from "@/lib/utils/meet-notes";
import { requireMeet } from "@/lib/permissions/meet";
import { getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";

/**
 * Check if the note belongs to a session whose MoM is already published (Spec N9)
 */
async function isNoteSessionPublished(noteId: string): Promise<boolean> {
  const { data: note } = await supabaseAdmin
    .from("meet_notes")
    .select("session_id, session:meet_sessions(status)")
    .eq("id", noteId)
    .single();

  if (!note?.session_id) return false;
  const status = (note.session as any)?.status;
  return status === "published" || status === "mom_published";
}

async function isBlockSessionPublished(blockId: string): Promise<boolean> {
  const { data: block } = await supabaseAdmin
    .from("meet_note_blocks")
    .select("note_id")
    .eq("id", blockId)
    .single();

  if (!block?.note_id) return false;
  return isNoteSessionPublished(block.note_id);
}

export async function getNotes(filters?: {
  kind?: string;
  q?: string;
  openLoopsOnly?: boolean;
}): Promise<MeetNote[]> {
  try {
    const auth = await requireMeet("MEET_NOTE_MANAGE");
    if (!auth.allowed) return [];

    const { user } = await getCachedUser();
    const userId = user?.id;

    let query = supabaseAdmin
      .from("meet_notes")
      .select(`
        *,
        owner:user_master!meet_notes_owner_id_fkey(id, full_name, email),
        session:meet_sessions(
          id, code, session_no,
          meeting:meet_meetings(id, title, code)
        ),
        blocks:meet_note_blocks(
          id, note_id, position, type, text, done, author_id, point_id,
          linked_type, linked_id, not_action, deleted_at,
          author:user_master(id, full_name, email),
          point:meet_points!meet_note_blocks_point_id_fkey(id, code, title)
        )
      `)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (filters?.kind === "mine") {
      query = query.eq("owner_id", userId);
    } else if (filters?.kind === "session") {
      query = query.eq("kind", "session");
    }

    if (filters?.q) {
      query = query.ilike("title", `%${filters.q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching meet notes:", error);
      return [];
    }

    // Privacy: personal notes are visible only to their owner;
    // session notes of confidential meetings only to participants (Spec N5, S3)
    const hidden = await getHiddenConfidentialMeetingIds(
      userId || "",
      auth.isSuperAdmin || auth.isMeetAdmin
    );
    const visible = (data || []).filter((note: any) => {
      if (note.kind === "personal" || note.visibility === "private") {
        return note.owner_id === userId;
      }
      const meetingId = note.meeting_id || note.session?.meeting?.id;
      return !meetingId || !hidden.has(meetingId);
    });

    // Process blocks and compute open loops
    const processed = visible.map((note: any) => {
      const activeBlocks = (note.blocks || [])
        .filter((b: any) => !b.deleted_at)
        .sort((a: any, b: any) => a.position - b.position);

      const openLoops = activeBlocks.filter((b: any) => {
        if (b.linked_id || b.not_action || b.done) return false;
        return b.type === "todo" || isActionLikeText(b.text);
      });

      return {
        ...note,
        blocks: activeBlocks,
        open_loops_count: openLoops.length,
      } as MeetNote;
    });

    if (filters?.openLoopsOnly) {
      return processed.filter((n) => (n.open_loops_count || 0) > 0);
    }

    return processed;
  } catch (err: any) {
    console.error("Unexpected error in getNotes:", err);
    return [];
  }
}

export async function getOrCreateSessionNotes(sessionId: string): Promise<MeetNote | null> {
  try {
    const auth = await requireMeet("MEET_VIEW", { sessionId });
    if (!auth.allowed) return null;

    const { user } = await getCachedUser();
    const userId = user?.id;

    // Check existing
    const { data: existing } = await supabaseAdmin
      .from("meet_notes")
      .select(`
        *,
        owner:user_master!meet_notes_owner_id_fkey(id, full_name, email),
        blocks:meet_note_blocks(
          id, note_id, position, type, text, done, author_id, point_id,
          linked_type, linked_id, not_action, deleted_at,
          author:user_master(id, full_name, email),
          point:meet_points!meet_note_blocks_point_id_fkey(id, code, title)
        )
      `)
      .eq("session_id", sessionId)
      .eq("kind", "session")
      .maybeSingle();

    if (existing) {
      const activeBlocks = (existing.blocks || [])
        .filter((b: any) => !b.deleted_at)
        .sort((a: any, b: any) => a.position - b.position);

      const openLoops = activeBlocks.filter((b: any) => {
        if (b.linked_id || b.not_action || b.done) return false;
        return b.type === "todo" || isActionLikeText(b.text);
      });

      return {
        ...existing,
        blocks: activeBlocks,
        open_loops_count: openLoops.length,
      } as MeetNote;
    }

    // Get session & meeting info
    const { data: session } = await supabaseAdmin
      .from("meet_sessions")
      .select("id, code, meeting_id, meeting:meet_meetings(title)")
      .eq("id", sessionId)
      .single();

    if (!session) return null;

    const title = `${(session.meeting as any)?.title || "Meeting"} - ${session.code} Notes`;

    const { data: newNote, error: insErr } = await supabaseAdmin
      .from("meet_notes")
      .insert({
        kind: "session",
        session_id: sessionId,
        meeting_id: session.meeting_id,
        owner_id: userId,
        title,
        visibility: "meeting",
        pinned: false,
      })
      .select()
      .single();

    if (insErr || !newNote) {
      console.error("Error creating session note:", insErr);
      return null;
    }

    return {
      ...newNote,
      blocks: [],
      open_loops_count: 0,
    } as MeetNote;
  } catch (err: any) {
    console.error("Error in getOrCreateSessionNotes:", err);
    return null;
  }
}

export async function createPersonalNote(title: string, tags: string[] = []): Promise<{ success: boolean; note?: MeetNote; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data, error } = await supabaseAdmin
      .from("meet_notes")
      .insert({
        kind: "personal",
        owner_id: user.id,
        title: title || "Untitled Note",
        visibility: "private",
        tags,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/meet/notes");
    return { success: true, note: data as MeetNote };
  } catch (err: any) {
    console.error("Error creating personal note:", err);
    return { success: false, error: err.message };
  }
}

/** Write access to a note: personal/private notes only by owner; session notes not in hidden confidential meetings. */
async function assertNoteWritable(
  noteId: string,
  auth: { userId: string; isSuperAdmin: boolean; isMeetAdmin: boolean }
): Promise<string | null> {
  const { data: note } = await supabaseAdmin
    .from("meet_notes")
    .select("id, kind, visibility, owner_id, meeting_id, session:meet_sessions(meeting_id)")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) return "Note not found";
  if (note.kind === "personal" || note.visibility === "private") {
    return note.owner_id === auth.userId ? null : "You can only edit your own personal notes";
  }
  const sess: any = Array.isArray(note.session) ? note.session[0] : note.session;
  const meetingId = note.meeting_id || sess?.meeting_id;
  if (meetingId) {
    const hidden = await getHiddenConfidentialMeetingIds(auth.userId, auth.isSuperAdmin || auth.isMeetAdmin);
    if (hidden.has(meetingId)) return "This meeting is confidential";
  }
  return null;
}

async function noteIdForBlock(blockId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("meet_note_blocks").select("note_id").eq("id", blockId).maybeSingle();
  return data?.note_id || null;
}

export async function addNoteBlock(input: {
  note_id: string;
  text: string;
  type?: NoteBlockType;
  point_id?: string | null;
  position?: number;
}): Promise<{ success: boolean; block?: MeetNoteBlock; error?: string }> {
  try {
    const auth = await requireMeet("MEET_NOTE_MANAGE");
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const denied = await assertNoteWritable(input.note_id, auth);
    if (denied) return { success: false, error: denied };

    // N9 Lock check: If session is published, only allow addendum blocks
    const isLocked = await isNoteSessionPublished(input.note_id);
    if (isLocked && input.type !== "addendum") {
      return {
        success: false,
        error: "Session notes are permanently locked after MoM publication (Spec N9). Only official addendums can be appended.",
      };
    }

    const { user } = await getCachedUser();
    const userId = user?.id || null;

    // Determine position
    let pos = input.position;
    if (pos === undefined) {
      const { data: maxBlock } = await supabaseAdmin
        .from("meet_note_blocks")
        .select("position")
        .eq("note_id", input.note_id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      pos = (maxBlock?.position ?? -1) + 1;
    }

    const { data, error } = await supabaseAdmin
      .from("meet_note_blocks")
      .insert({
        note_id: input.note_id,
        position: pos,
        type: input.type || (isLocked ? "addendum" : "text"),
        text: input.text,
        author_id: userId,
        point_id: input.point_id || null,
        done: false,
        not_action: false,
      })
      .select(`
        *,
        author:user_master(id, full_name, email),
        point:meet_points!meet_note_blocks_point_id_fkey(id, code, title)
      `)
      .single();

    if (error) throw error;

    // Touch note updated_at
    await supabaseAdmin
      .from("meet_notes")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.note_id);

    return { success: true, block: data as MeetNoteBlock };
  } catch (err: any) {
    console.error("Error adding note block:", err);
    return { success: false, error: err.message };
  }
}

export async function updateNoteBlock(
  blockId: string,
  updates: {
    text?: string;
    done?: boolean;
    point_id?: string | null;
    not_action?: boolean;
    type?: NoteBlockType;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireMeet("MEET_NOTE_MANAGE");
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const blockNoteId = await noteIdForBlock(blockId);
    if (!blockNoteId) return { success: false, error: "Note line not found" };
    const denied = await assertNoteWritable(blockNoteId, auth);
    if (denied) return { success: false, error: denied };

    // N9 Lock check: If session is published, existing blocks cannot be modified
    const isLocked = await isBlockSessionPublished(blockId);
    if (isLocked) {
      return {
        success: false,
        error: "Notes are permanently locked after MoM publication (Spec N9). Modifications are strictly forbidden.",
      };
    }

    const { error } = await supabaseAdmin
      .from("meet_note_blocks")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", blockId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error updating note block:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteNoteBlock(blockId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireMeet("MEET_NOTE_MANAGE");
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const blockNoteId = await noteIdForBlock(blockId);
    if (!blockNoteId) return { success: false, error: "Note line not found" };
    const denied = await assertNoteWritable(blockNoteId, auth);
    if (denied) return { success: false, error: denied };

    // N9 Lock check: If session is published, deletion is forbidden
    const isLocked = await isBlockSessionPublished(blockId);
    if (isLocked) {
      return {
        success: false,
        error: "Notes are permanently locked after MoM publication (Spec N9). Deletion is strictly forbidden.",
      };
    }

    const { error } = await supabaseAdmin
      .from("meet_note_blocks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", blockId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting note block:", err);
    return { success: false, error: err.message };
  }
}

export async function convertBlockToItem(
  blockId: string,
  to: "task" | "point" | "decision",
  payload: {
    meeting_id: string;
    session_id: string;
    title: string;
    owner_id?: string;
    tat_days?: number;
    point_id?: string; // required if to === 'task'
    priority?: any;
    decision_type?: any;
  }
): Promise<{ success: boolean; linked_item?: { code: string; title: string; status: string }; error?: string }> {
  try {
    const auth = await requireMeet("MEET_POINT_MANAGE", { sessionId: payload.session_id });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const userId = user?.id || null;

    if (to === "task") {
      if (!payload.point_id) {
        return { success: false, error: "Point is required to convert note into task" };
      }
      const tat = payload.tat_days || 3;
      const { data: dateRes } = await supabaseAdmin.rpc("fn_meet_calculate_due_date", {
        p_start_date: new Date().toISOString().split("T")[0],
        p_tat_days: tat,
      });
      const dueDate = dateRes || new Date(Date.now() + tat * 86400000).toISOString().split("T")[0];

      const { data: task, error: tErr } = await supabaseAdmin
        .from("meet_tasks")
        .insert({
          point_id: payload.point_id,
          session_id: payload.session_id,
          title: payload.title,
          owner_id: payload.owner_id || null,
          priority: payload.priority || "medium",
          tat_days: tat,
          due_date: dueDate,
          status: "not_started",
          source_note_block_id: blockId,
          created_by: userId,
        })
        .select("id, code, title, status")
        .single();

      if (tErr) throw tErr;

      // Link on note block
      await supabaseAdmin
        .from("meet_note_blocks")
        .update({
          linked_type: "task",
          linked_id: task.id,
          point_id: payload.point_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blockId);

      return {
        success: true,
        linked_item: { code: task.code, title: task.title, status: task.status },
      };
    } else if (to === "point") {
      const tat = payload.tat_days || 3;
      const { data: dateRes } = await supabaseAdmin.rpc("fn_meet_calculate_due_date", {
        p_start_date: new Date().toISOString().split("T")[0],
        p_tat_days: tat,
      });
      const dueDate = dateRes || new Date(Date.now() + tat * 86400000).toISOString().split("T")[0];

      const { data: point, error: pErr } = await supabaseAdmin
        .from("meet_points")
        .insert({
          meeting_id: payload.meeting_id,
          origin_session_id: payload.session_id,
          current_session_id: payload.session_id,
          title: payload.title,
          owner_id: payload.owner_id || null,
          priority: payload.priority || "medium",
          tat_days: tat,
          due_date: dueDate,
          status: "open",
          source_note_block_id: blockId,
          created_by: userId,
        })
        .select("id, code, title, status")
        .single();

      if (pErr) throw pErr;

      // Also register into session points
      await supabaseAdmin.from("meet_session_points").insert({
        session_id: payload.session_id,
        point_id: point.id,
        entry_type: "new",
        sort_order: 99,
      });

      // Link on note block
      await supabaseAdmin
        .from("meet_note_blocks")
        .update({
          linked_type: "point",
          linked_id: point.id,
          point_id: point.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blockId);

      return {
        success: true,
        linked_item: { code: point.code, title: point.title, status: point.status },
      };
    } else if (to === "decision") {
      const { data: dec, error: dErr } = await supabaseAdmin
        .from("meet_decisions")
        .insert({
          session_id: payload.session_id,
          point_id: payload.point_id || null,
          text: payload.title,
          source_note_block_id: blockId,
          created_by: userId,
        })
        .select("id, code, text")
        .single();

      if (dErr) throw dErr;

      // Link on note block
      await supabaseAdmin
        .from("meet_note_blocks")
        .update({
          linked_type: "decision",
          linked_id: dec.id,
          point_id: payload.point_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blockId);

      return {
        success: true,
        linked_item: { code: dec.code, title: dec.text, status: "Recorded" },
      };
    }

    return { success: false, error: "Unsupported conversion type" };
  } catch (err: any) {
    console.error("Error converting note block:", err);
    return { success: false, error: err.message };
  }
}

// D2.7 Automated Meeting Summary Generator (Rule-based, works without AI)
export async function generateSessionSummary(sessionId: string): Promise<{
  overview: string;
  pointsDiscussed: any[];
  decisions: any[];
  actionItems: any[];
  carriedForward: any[];
  otherNotes: any[];
  openLoops: any[];
}> {
  try {
    await requireMeet("MEET_VIEW", { sessionId });
    const [sessionRes, pointsRes, tasksRes, decisionsRes, noteRes] = await Promise.all([
      supabaseAdmin
        .from("meet_sessions")
        .select(`
          *,
          meeting:meet_meetings(title, code),
          attendees:meet_session_attendees(id, role, attendance, user:user_master!meet_session_attendees_user_id_fkey(full_name))
        `)
        .eq("id", sessionId)
        .single(),
      supabaseAdmin
        .from("meet_session_points")
        .select(`
          entry_type, discussion_notes,
          point:meet_points(
            id, code, title, status, priority, due_date, carry_forward_count, progress_percent,
            owner:user_master!meet_points_owner_id_fkey(full_name)
          )
        `)
        .eq("session_id", sessionId),
      supabaseAdmin
        .from("meet_tasks")
        .select("id, code, title, status, due_date, tat_days, owner:user_master!meet_tasks_owner_id_fkey(full_name)")
        .eq("session_id", sessionId),
      supabaseAdmin
        .from("meet_decisions")
        .select("id, code, text")
        .eq("session_id", sessionId),
      supabaseAdmin
        .from("meet_notes")
        .select(`
          blocks:meet_note_blocks(
            id, position, type, text, done, point_id, linked_type, linked_id, not_action, deleted_at,
            author:user_master(full_name)
          )
        `)
        .eq("session_id", sessionId)
        .eq("kind", "session")
        .maybeSingle(),
    ]);

    const session = sessionRes.data;
    const allPoints = (pointsRes.data || []).map((p: any) => ({
      ...p.point,
      entry_type: p.entry_type,
      discussion_notes: p.discussion_notes,
    }));

    const backupPoints = allPoints.filter((p: any) => p.entry_type === "carried_forward");
    const newPoints = allPoints.filter((p: any) => p.entry_type === "new");
    const closedPoints = allPoints.filter((p: any) => p.status === "closed" || p.status === "dropped");
    const carriedPoints = allPoints.filter((p: any) => p.status !== "closed" && p.status !== "dropped");

    const allBlocks = (noteRes.data?.blocks || []).filter((b: any) => !b.deleted_at);

    const openLoops = allBlocks.filter((b: any) => {
      if (b.linked_id || b.not_action || b.done) return false;
      return b.type === "todo" || isActionLikeText(b.text);
    });

    const otherNotes = allBlocks.filter((b: any) => !b.point_id && !b.linked_id);

    const attendeesCount = session?.attendees?.length || 0;
    const presentCount = (session?.attendees || []).filter((a: any) => a.attendance === "present" || a.attendance === "late").length;

    const overview = `Session ${session?.code} of ${session?.meeting?.title} was held with ${presentCount} of ${attendeesCount} members present. Reviewed ${backupPoints.length} carry-forward backup points and captured ${newPoints.length} new items. Resolved ${closedPoints.length} items during session; ${carriedPoints.length} items carried to next iteration with ${tasksRes.data?.length || 0} dedicated action items and ${decisionsRes.data?.length || 0} formal decisions recorded.`;

    // Map tagged notes to points
    const pointsDiscussed = allPoints.map((pt: any) => {
      const taggedLines = allBlocks.filter((b: any) => b.point_id === pt.id);
      return {
        ...pt,
        tagged_notes: taggedLines.map((l: any) => l.text),
      };
    });

    return {
      overview,
      pointsDiscussed,
      decisions: decisionsRes.data || [],
      actionItems: tasksRes.data || [],
      carriedForward: carriedPoints,
      otherNotes,
      openLoops,
    };
  } catch (err: any) {
    console.error("Error generating session summary:", err);
    return {
      overview: "Summary could not be generated.",
      pointsDiscussed: [],
      decisions: [],
      actionItems: [],
      carriedForward: [],
      otherNotes: [],
      openLoops: [],
    };
  }
}

export async function useSummaryInMoM(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireMeet("MEET_MOM_EDIT", { sessionId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const summary = await generateSessionSummary(sessionId);
    await supabaseAdmin
      .from("meet_sessions")
      .update({
        summary_notes: summary.overview,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error pushing summary into MoM:", err);
    return { success: false, error: err.message };
  }
}
