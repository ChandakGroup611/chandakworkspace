"use server";

import { requireMeet } from "@/lib/permissions/meet";
import {
  teamsConnectionStatus,
  pullTeamsAttendance,
  pullTeamsTranscript,
  type TeamsConnection,
} from "@/lib/integrations/teams-artifacts";

/** Teams attendance and transcript, from the minutes review (see lib/integrations/teams-artifacts.ts). */

export async function getTeamsConnection(): Promise<TeamsConnection> {
  await requireMeet("MEET_VIEW");
  return teamsConnectionStatus();
}

export async function importTeamsAttendance(sessionId: string) {
  const auth = await requireMeet("MEET_SESSION_RUN", { sessionId });
  if (!auth.allowed) return { success: false, error: auth.error || "Not allowed." };
  return pullTeamsAttendance(sessionId, auth.userId);
}

export async function importTeamsTranscript(sessionId: string) {
  const auth = await requireMeet("MEET_SESSION_RUN", { sessionId });
  if (!auth.allowed) return { success: false, error: auth.error || "Not allowed." };
  return pullTeamsTranscript(sessionId, auth.userId);
}
