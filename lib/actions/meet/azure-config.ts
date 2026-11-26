"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { readMeetAzure, type MeetAzureConfig } from "@/lib/utils/meet-azure";

async function admin() {
  const auth = await requireMeet("MEET_ADMIN", { requireAdmin: true });
  if (!(auth.isSuperAdmin || auth.isMeetAdmin)) {
    throw new Error("Only a Meet admin can manage Microsoft Azure / Teams keys.");
  }
  return auth;
}

export interface MeetAzureForm extends Omit<MeetAzureConfig, "client_secret"> {
  hasClientSecret: boolean;
  hasEnvFallback: boolean;
}

export async function getMeetAzureForm(): Promise<MeetAzureForm> {
  await admin();
  const saved = await readMeetAzure();
  const hasEnvFallback = !!(
    (process.env.AZURE_TENANT_ID || process.env.MICROSOFT_TENANT_ID) &&
    (process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID) &&
    (process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET)
  );
  return {
    active: saved?.active || false,
    tenant_id: saved?.tenant_id || "",
    client_id: saved?.client_id || "",
    hasClientSecret: !!saved?.client_secret,
    hasEnvFallback,
  };
}

const clean = (i: Partial<MeetAzureConfig>, keepSecret: string): MeetAzureConfig => ({
  active: !!i.active,
  tenant_id: String(i.tenant_id || "").trim().slice(0, 120),
  client_id: String(i.client_id || "").trim().slice(0, 120),
  client_secret: String(i.client_secret || "").trim() || keepSecret,
});

export async function saveMeetAzure(
  input: Omit<MeetAzureConfig, "client_secret"> & { client_secret?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await admin();
    const prev = await readMeetAzure();
    const v = clean(input, prev?.client_secret || "");

    if (v.active && (!v.tenant_id || !v.client_id || !v.client_secret)) {
      return {
        success: false,
        error: "Enter Tenant ID, Client ID, and Client Secret before switching Teams integration on.",
      };
    }

    const { error } = await supabaseAdmin.from("core_module_settings").upsert(
      {
        module_key: "meet",
        key: "meet_azure",
        value_json: v,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "module_key,key" }
    );
    if (error) return { success: false, error: error.message };

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "meeting",
      entity_id: auth.userId,
      action: "azure_config_changed",
      field: "meet_azure",
      new_value: `${v.active ? "on" : "off"} · tenant:${v.tenant_id.slice(0, 8)}…`,
      user_id: auth.userId,
      channel: "web",
    });

    revalidatePath("/meet/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Couldn't save Azure configuration." };
  }
}

export async function testMeetAzure(
  input: Omit<MeetAzureConfig, "client_secret"> & { client_secret?: string }
): Promise<{ success: boolean; roles?: string[]; error?: string }> {
  try {
    await admin();
    const prev = await readMeetAzure();
    const v = clean(input, prev?.client_secret || "");
    if (!v.tenant_id || !v.client_id || !v.client_secret) {
      return { success: false, error: "Tenant ID, Client ID, and Client Secret are required to test." };
    }

    const res = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(v.tenant_id)}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: v.client_id,
          client_secret: v.client_secret,
          grant_type: "client_credentials",
          scope: "https://graph.microsoft.com/.default",
        }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { success: false, error: `Microsoft auth failed (${res.status}): ${txt.slice(0, 140)}` };
    }

    const data = await res.json();
    const token = String(data?.access_token || "");
    let roles: string[] = [];
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      if (Array.isArray(payload.roles)) roles = payload.roles;
    } catch {}

    return { success: true, roles };
  } catch (err: any) {
    return { success: false, error: err?.message || "Azure connection test failed." };
  }
}
