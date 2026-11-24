import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * On/off switches for optional Chandak Meet automations, kept as rows in meet_alert_rules
 * (event_key "switch:<key>", is_active = on). A missing row means OFF: nothing optional runs
 * until an admin turns it on.
 */
export const MEET_SWITCHES = {
  teams_auto_attendance: {
    name: "Pull attendance from Teams after each meeting",
    detail: "About 20 minutes after a Teams meeting ends, people Teams saw are marked present or late.",
  },
  teams_auto_transcript: {
    name: "Pull action lines from the Teams transcript",
    detail: "After a Teams meeting with transcription on, lines that sound like an action or decision go into the notes as suggestions for the minutes.",
  },
} as const;

export type MeetSwitchKey = keyof typeof MEET_SWITCHES;

export async function readMeetSwitches(): Promise<Record<MeetSwitchKey, boolean>> {
  const keys = Object.keys(MEET_SWITCHES) as MeetSwitchKey[];
  const out = Object.fromEntries(keys.map((k) => [k, false])) as Record<MeetSwitchKey, boolean>;
  const { data } = await supabaseAdmin
    .from("meet_alert_rules")
    .select("event_key, is_active")
    .in("event_key", keys.map((k) => `switch:${k}`));
  for (const r of data || []) {
    const k = String((r as any).event_key).replace(/^switch:/, "") as MeetSwitchKey;
    if (k in out) out[k] = !!(r as any).is_active;
  }
  return out;
}

export async function writeMeetSwitch(key: MeetSwitchKey, on: boolean): Promise<string | null> {
  const event_key = `switch:${key}`;
  const now = new Date().toISOString();
  const { data: row } = await supabaseAdmin.from("meet_alert_rules").select("id").eq("event_key", event_key).maybeSingle();
  const { error } = row
    ? await supabaseAdmin.from("meet_alert_rules").update({ is_active: on, updated_at: now }).eq("id", (row as any).id)
    : await supabaseAdmin.from("meet_alert_rules").insert({ name: MEET_SWITCHES[key].name, event_key, channels: [], timing: "system", is_active: on });
  return error ? error.message : null;
}
