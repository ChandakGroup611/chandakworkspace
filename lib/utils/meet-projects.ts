import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Chandak Meet's own project list (a Meet master, separate from Workspace task projects).
 * Stored in core_module_settings so no schema change is needed:
 *   module "meet", key "projects"                   -> { items: MeetProject[] }
 *   module "meet", key "meeting_project:<meetingId>" -> { project_id }
 */

export interface MeetProject {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
}

const MOD = "meet";

export async function readMeetProjects(): Promise<MeetProject[]> {
  const { data } = await supabaseAdmin.from("core_module_settings").select("value_json").eq("module_key", MOD).eq("key", "projects").maybeSingle();
  const items = (data?.value_json as any)?.items;
  return Array.isArray(items) ? (items as MeetProject[]).filter((p) => p && p.id && p.name) : [];
}

export async function writeMeetProjects(items: MeetProject[], userId: string | null) {
  return supabaseAdmin.from("core_module_settings").upsert(
    { module_key: MOD, key: "projects", value_json: { items }, updated_by: userId, updated_at: new Date().toISOString() },
    { onConflict: "module_key,key" }
  );
}

/** meetingId -> project id, for the given meetings (or all when ids omitted). */
export async function readMeetingProjectMap(meetingIds?: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let q = supabaseAdmin.from("core_module_settings").select("key, value_json").eq("module_key", MOD);
  if (meetingIds && meetingIds.length) {
    if (meetingIds.length > 300) q = q.like("key", "meeting_project:%");
    else q = q.in("key", meetingIds.map((id) => `meeting_project:${id}`));
  } else {
    q = q.like("key", "meeting_project:%");
  }
  const { data } = await q;
  for (const r of (data || []) as any[]) {
    const pid = r?.value_json?.project_id;
    if (pid) map.set(String(r.key).slice("meeting_project:".length), String(pid));
  }
  return map;
}

export async function setMeetingProject(meetingId: string, projectId: string | null, userId: string | null) {
  if (!projectId) {
    return supabaseAdmin.from("core_module_settings").delete().eq("module_key", MOD).eq("key", `meeting_project:${meetingId}`);
  }
  return supabaseAdmin.from("core_module_settings").upsert(
    { module_key: MOD, key: `meeting_project:${meetingId}`, value_json: { project_id: projectId }, updated_by: userId, updated_at: new Date().toISOString() },
    { onConflict: "module_key,key" }
  );
}
