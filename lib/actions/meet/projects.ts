"use server";

import { revalidatePath } from "next/cache";
import { requireMeet } from "@/lib/permissions/meet";
import { readMeetProjects, writeMeetProjects, type MeetProject } from "@/lib/utils/meet-projects";

/** Settings › Projects: Chandak Meet's own project master. */

export async function getMeetProjects(): Promise<MeetProject[]> {
  await requireMeet("MEET_VIEW");
  return readMeetProjects();
}

export async function saveMeetProject(input: { id?: string; name: string; code?: string; active?: boolean }): Promise<{ success: boolean; error?: string; items?: MeetProject[] }> {
  const auth = await requireMeet("MEET_ADMIN", { requireAdmin: true });
  const name = String(input.name || "").trim().slice(0, 120);
  const code = String(input.code || "").trim().slice(0, 30) || null;
  if (!name) return { success: false, error: "Give the project a name." };
  try {
    const items = await readMeetProjects();
    const clash = items.find((p) => p.id !== input.id && p.name.toLowerCase() === name.toLowerCase());
    if (clash) return { success: false, error: "A project with this name already exists." };
    if (input.id) {
      const i = items.findIndex((p) => p.id === input.id);
      if (i < 0) return { success: false, error: "Project not found." };
      items[i] = { ...items[i], name, code, active: input.active ?? items[i].active };
    } else {
      items.push({ id: crypto.randomUUID(), name, code, active: true });
    }
    items.sort((a, b) => a.name.localeCompare(b.name));
    const { error } = await writeMeetProjects(items, auth.userId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/meet/admin");
    return { success: true, items };
  } catch (err: any) {
    return { success: false, error: err?.message || "Couldn't save the project." };
  }
}
