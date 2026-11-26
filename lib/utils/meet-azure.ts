import { supabaseAdmin } from "@/lib/supabase/service_role";

export interface MeetAzureConfig {
  active: boolean;
  tenant_id: string;
  client_id: string;
  client_secret: string;
}

export interface ResolvedAzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  source: "settings" | "env";
}

/** Reads the saved Microsoft Azure / Teams config from core_module_settings (server-only). */
export async function readMeetAzure(): Promise<MeetAzureConfig | null> {
  const { data } = await supabaseAdmin
    .from("core_module_settings")
    .select("value_json")
    .eq("module_key", "meet")
    .eq("key", "meet_azure")
    .maybeSingle();

  const v = data?.value_json as Partial<MeetAzureConfig> | null | undefined;
  if (!v || typeof v !== "object") return null;
  return {
    active: !!v.active,
    tenant_id: String(v.tenant_id || "").trim(),
    client_id: String(v.client_id || "").trim(),
    client_secret: String(v.client_secret || "").trim(),
  };
}

/**
 * Resolves Microsoft Azure / Teams credentials for Chandak Meet.
 * Prefers active keys stored via Meet Settings UI; falls back to server env vars if configured.
 */
export async function getAzureCredentials(): Promise<ResolvedAzureCredentials | null> {
  try {
    const saved = await readMeetAzure();
    if (saved?.active && saved.tenant_id && saved.client_id && saved.client_secret) {
      return {
        tenantId: saved.tenant_id,
        clientId: saved.client_id,
        clientSecret: saved.client_secret,
        source: "settings",
      };
    }
  } catch {
    // Fall through to env fallback if settings table lookup fails
  }

  const tenantId = (process.env.AZURE_TENANT_ID || process.env.MICROSOFT_TENANT_ID || "").trim();
  const clientId = (process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || "").trim();
  const clientSecret = (process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || "").trim();
  if (tenantId && clientId && clientSecret) {
    return { tenantId, clientId, clientSecret, source: "env" };
  }
  return null;
}
