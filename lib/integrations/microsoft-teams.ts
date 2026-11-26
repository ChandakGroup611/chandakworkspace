/**
 * Microsoft Teams & Microsoft 365 Auto-Meeting Generation Service
 * 
 * Provides zero-manual-effort meeting link generation for Chandak Workspace.
 * When a meeting or session is created, this service automatically synthesizes
 * an enterprise Microsoft Teams meeting link or queries Microsoft Graph API
 * if Azure tenant credentials are active.
 */

import { getAzureCredentials } from "@/lib/utils/meet-azure";

export interface GenerateTeamsMeetingParams {
  title: string;
  description?: string;
  content?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  organizerId?: string;
  organizerEmail?: string;
  meetingCode?: string;
  attendeeEmails?: string[];
  callType?: "call" | "meeting";
}

/**
 * Automatically generates an authentic Microsoft Teams meeting/call link.
 * Uses official Microsoft Teams deep-linking protocol (/l/call or /l/meeting/new)
 * or Microsoft Graph API when Azure tenant credentials are configured.
 * Never outputs synthetic/fabricated thread URLs that fail with "Unable to join".
 */
export async function generateTeamsMeetingLink(
  params: GenerateTeamsMeetingParams
): Promise<string> {
  const {
    title,
    description,
    content,
    scheduledStart,
    scheduledEnd,
    organizerId,
    organizerEmail,
    meetingCode = "MTG",
    attendeeEmails = [],
    callType = "meeting",
  } = params;

  // 1. Try Microsoft Graph API using Meet Settings UI keys (or env fallback)
  const creds = await getAzureCredentials();

  if (creds) {
    const { tenantId, clientId, clientSecret } = creds;
    try {
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "client_credentials",
            scope: "https://graph.microsoft.com/.default",
          }),
        }
      );

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (accessToken) {
          const userTarget = organizerEmail || "me";
          const meetingRes = await fetch(
            `https://graph.microsoft.com/v1.0/users/${userTarget}/onlineMeetings`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                startDateTime: scheduledStart || new Date().toISOString(),
                endDateTime:
                  scheduledEnd ||
                  new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                subject: `Chandak Meet: ${title}`,
              }),
            }
          );

          if (meetingRes.ok) {
            const meetingData = await meetingRes.json();
            if (meetingData.joinWebUrl) {
              return meetingData.joinWebUrl;
            }
          }
        }
      }
    } catch (graphErr) {
      console.warn("[Microsoft Teams] Graph API fallback triggered:", graphErr);
    }
  }

  // 2. Clean and deduplicate attendee email list
  const validEmails = Array.from(
    new Set(
      [...(organizerEmail ? [organizerEmail] : []), ...attendeeEmails]
        .map((e) => e?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e && e.includes("@")))
    )
  );

  // 3. For instant calls (e.g. 1-on-1 chat calls): use Microsoft Teams direct video call protocol
  // Format: https://teams.microsoft.com/l/call/0/0?users=user1@domain.com,user2@domain.com&withVideo=true
  if (callType === "call" && validEmails.length > 0 && !scheduledStart) {
    return `https://teams.microsoft.com/l/call/0/0?users=${validEmails.join(",")}&withVideo=true`;
  }

  // 4. For meetings & scheduled sessions: use Microsoft Teams meeting scheduler with all parameters
  // Official format: https://teams.microsoft.com/l/meeting/new?subject=<title>&attendees=<emails>&startTime=<start>&endTime=<end>&content=<content>
  // Opens Microsoft Teams directly pre-filled with subject, attendees, times, and description
  const parts: string[] = [];
  parts.push(`subject=${encodeURIComponent(`Chandak Meet: ${title}`)}`);

  if (validEmails.length > 0) {
    parts.push(`attendees=${validEmails.join(",")}`);
  }

  if (scheduledStart) {
    try {
      const startStr = scheduledStart.includes("T")
        ? new Date(scheduledStart).toISOString().replace(/\.\d{3}Z$/, "")
        : scheduledStart;
      parts.push(`startTime=${encodeURIComponent(startStr)}`);
    } catch {
      parts.push(`startTime=${encodeURIComponent(scheduledStart)}`);
    }
  }

  if (scheduledEnd) {
    try {
      const endStr = scheduledEnd.includes("T")
        ? new Date(scheduledEnd).toISOString().replace(/\.\d{3}Z$/, "")
        : scheduledEnd;
      parts.push(`endTime=${encodeURIComponent(endStr)}`);
    } catch {
      parts.push(`endTime=${encodeURIComponent(scheduledEnd)}`);
    }
  }

  const bodyContent = content || description || `Meeting conducted via Chandak Meet Workspace (${meetingCode})`;
  if (bodyContent) {
    parts.push(`content=${encodeURIComponent(bodyContent)}`);
  }

  return `https://teams.microsoft.com/l/meeting/new?${parts.join("&")}`;
}

/**
 * Checks if a given URL is a broken synthetic Teams link (e.g. fabricated thread.v2)
 */
export function isBrokenSyntheticTeamsLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    /19(:|%3A)meeting_.*thread\.v2/i.test(url) ||
    /enterprise-internal-tenant-id/i.test(url) ||
    /enterprise-bridge/i.test(url)
  );
}

/**
 * Sanitizes or repairs any synthetic or legacy Teams link into an authentic Microsoft Teams URL
 */
export function sanitizeTeamsUrl(
  url: string | null | undefined,
  fallbackEmails: string[] = [],
  title?: string
): string | null {
  if (!url) return null;
  if (!isBrokenSyntheticTeamsLink(url)) return url;

  // Extract attendee emails or use fallback
  const valid = Array.from(
    new Set(
      fallbackEmails
        .map((e) => e?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e && e.includes("@")))
    )
  );

  if (valid.length > 0) {
    return `https://teams.microsoft.com/l/call/0/0?users=${valid.join(",")}&withVideo=true`;
  }

  const queryParams = new URLSearchParams();
  queryParams.set("subject", `Chandak Meet: ${title || "Team Meeting"}`);
  return `https://teams.microsoft.com/l/meeting/new?${queryParams.toString()}`;
}

/**
 * Checks if a given URL is a valid Microsoft Teams link
 */
export function isMicrosoftTeamsLink(url: string | null | undefined): boolean {
  if (!url) return false;
  if (isBrokenSyntheticTeamsLink(url)) return false;
  return (
    /teams\.microsoft\.com\/l\/(meetup-join|call|meeting)/i.test(url) ||
    /teams\.cloud\.microsoft/i.test(url) ||
    /teams\.microsoft\.com\/meet/i.test(url)
  );
}

