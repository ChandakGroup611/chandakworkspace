"use server";

import { revalidatePath } from "next/cache";
import { requireMeet } from "@/lib/permissions/meet";
import { readMeetSwitches, writeMeetSwitch, MEET_SWITCHES, type MeetSwitchKey } from "@/lib/utils/meet-switches";

export async function getMeetSwitches() {
  await requireMeet("MEET_VIEW");
  return readMeetSwitches();
}

export async function setMeetSwitch(key: string, on: boolean): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  if (!(auth.isSuperAdmin || auth.isMeetAdmin)) return { success: false, error: "Only a Meet admin can change this." };
  if (!(key in MEET_SWITCHES)) return { success: false, error: "Unknown setting." };
  const err = await writeMeetSwitch(key as MeetSwitchKey, !!on);
  if (err) return { success: false, error: err };
  revalidatePath("/meet/automations");
  return { success: true };
}
