/**
 * Microsoft Teams & Microsoft 365 Auto-Meeting Generation Service
 * 
 * Provides zero-manual-effort meeting link generation for Chandak Workspace.
 * When a meeting or session is created, this service automatically synthesizes
 * an enterprise Microsoft Teams meeting link or queries Microsoft Graph API
 * if Azure tenant credentials are active.
 */

export interface GenerateTeamsMeetingParams {
  title: string;
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
    scheduledStart,
    scheduledEnd,
    organizerId,
    organizerEmail,
    meetingCode = "MTG",
    attendeeEmails = [],
    callType = "call",
  } = params;

  // 1. Try Microsoft Graph API if Azure App credentials are configured in environment
  const tenantId = process.env.AZURE_TENANT_ID || process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;

  if (tenantId && clientId && clientSecret) {
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

  // 3. For live calls & instant calls: use Microsoft Teams direct video call protocol
  // Format: https://teams.microsoft.com/l/call/0/0?users={emails}&withVideo=true
  // This opens Teams (App or Web) and immediately connects the participants with zero URL errors.
  if (callType === "call" && validEmails.length > 0) {
    const encodedUsers = validEmails.map((e) => encodeURIComponent(e)).join(",");
    return `https://teams.microsoft.com/l/call/0/0?users=${encodedUsers}&withVideo=true`;
  }

  // 4. For scheduled calendar meetings: use Microsoft Teams native meeting scheduler
  // Format: https://teams.microsoft.com/l/meeting/new?subject={title}&attendees={emails}&startTime={start}&endTime={end}
  const queryParams = new URLSearchParams();
  queryParams.set("subject", `Chandak Meet: ${title}`);
  if (validEmails.length > 0) {
    queryParams.set("attendees", validEmails.join(","));
  }
  if (scheduledStart) {
    queryParams.set("startTime", scheduledStart);
  }
  if (scheduledEnd) {
    queryParams.set("endTime", scheduledEnd);
  }

  return `https://teams.microsoft.com/l/meeting/new?${queryParams.toString()}`;
}

/**
 * Checks if a given URL is a valid Microsoft Teams link
 */
export function isMicrosoftTeamsLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    /teams\.microsoft\.com\/l\/(meetup-join|call|meeting)/i.test(url) ||
    /teams\.cloud\.microsoft/i.test(url) ||
    /teams\.microsoft\.com\/meet/i.test(url)
  );
}

