"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";

/**
 * Files on Meet records (pre-reads on a meeting date, documents on points and tasks).
 * Stored in a private Supabase Storage bucket; links are signed for a few hours when shown.
 */

const BUCKET = "meet-attachments";
const MAX = 20 * 1024 * 1024;
type Entity = "session" | "point" | "task" | "decision";
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) await supabaseAdmin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX });
}

export interface MeetFile { id: string; name: string; size: number; url: string | null; by: string | null; at: string; preRead: boolean }

export async function getMeetFiles(entityType: Entity, entityId: string): Promise<MeetFile[]> {
  await requireMeet("MEET_VIEW");
  const { data } = await supabaseAdmin
    .from("meet_attachments")
    .select("id, file_name, file_url, size_bytes, is_pre_read, created_at, user:user_master(full_name)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  const out: MeetFile[] = [];
  for (const f of (data || []) as any[]) {
    let url: string | null = null;
    if (String(f.file_url).startsWith("storage:")) {
      const path = String(f.file_url).slice(`storage:${BUCKET}:`.length);
      const { data: s } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 4 * 3600, { download: f.file_name });
      url = s?.signedUrl || null;
    } else if (/^https?:\/\//.test(f.file_url)) url = f.file_url;
    out.push({ id: f.id, name: f.file_name, size: Number(f.size_bytes) || 0, url, by: one(f.user)?.full_name || null, at: f.created_at, preRead: !!f.is_pre_read });
  }
  return out;
}

export async function uploadMeetFile(form: FormData): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  const entityType = String(form.get("entityType") || "") as Entity;
  const entityId = String(form.get("entityId") || "");
  const file = form.get("file") as File | null;
  if (!["session", "point", "task", "decision"].includes(entityType) || !/^[0-9a-f-]{36}$/i.test(entityId)) return { success: false, error: "Unknown record." };
  if (!file || typeof file === "string" || !file.size) return { success: false, error: "Pick a file." };
  if (file.size > MAX) return { success: false, error: "Files can be up to 20 MB." };
  try {
    await ensureBucket();
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const path = `${entityType}/${entityId}/${Date.now()}_${clean}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) return { success: false, error: upErr.message };
    const { error } = await supabaseAdmin.from("meet_attachments").insert({
      entity_type: entityType, entity_id: entityId, file_name: file.name.slice(0, 200), file_url: `storage:${BUCKET}:${path}`,
      mime: file.type || null, size_bytes: file.size, is_pre_read: entityType === "session", uploaded_by: auth.userId,
    });
    if (error) return { success: false, error: error.message };
    await supabaseAdmin.from("meet_activity_log").insert({ entity_type: entityType, entity_id: entityId, action: "file_added", field: "file", new_value: file.name.slice(0, 200), user_id: auth.userId, channel: "web" });
    revalidatePath(entityType === "task" ? `/meet/tasks/${entityId}` : entityType === "point" ? `/meet/points/${entityId}` : entityType === "decision" ? `/meet/decisions/${entityId}` : `/meet/sessions/${entityId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Upload failed." };
  }
}
