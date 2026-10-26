"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetSLAPolicy, MeetSLAInstance, MeetNotificationTemplate } from "@/types/meet";

export async function getSLAPolicies(): Promise<MeetSLAPolicy[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("meet_sla_policies")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching SLA policies:", error);
      return [];
    }
    return (data || []) as MeetSLAPolicy[];
  } catch (err: any) {
    console.error("Error in getSLAPolicies:", err);
    return [];
  }
}

export async function getSLAInstances(filters?: { state?: string }): Promise<MeetSLAInstance[]> {
  try {
    let query = supabaseAdmin
      .from("meet_sla_instances")
      .select(`
        *,
        policy:meet_sla_policies(id, name),
        escalated_to:user_master!meet_sla_instances_escalated_to_id_fkey(id, full_name)
      `)
      .order("created_at", { ascending: false });

    if (filters?.state) {
      query = query.eq("state", filters.state);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching SLA instances:", error);
      return [];
    }
    return (data || []) as MeetSLAInstance[];
  } catch (err: any) {
    console.error("Error in getSLAInstances:", err);
    return [];
  }
}

export async function acknowledgeEscalation(
  instanceId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin
      .from("meet_sla_instances")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanceId);

    if (error) throw error;
    revalidatePath("/meet/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Error acknowledging escalation:", err);
    return { success: false, error: err.message };
  }
}

export async function getAlertRules(): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("meet_alert_rules")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching alert rules:", error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("Error in getAlertRules:", err);
    return [];
  }
}

export async function saveAlertRule(payload: {
  id?: string;
  name: string;
  event_key?: string;
  channels: string[];
  timing: string;
  template_key?: string;
  throttle_hours?: number;
  is_active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const dataToSave = {
      name: payload.name,
      event_key: payload.event_key || null,
      channels: payload.channels || ["email"],
      timing: payload.timing || "immediate",
      template_key: payload.template_key || null,
      throttle_hours: payload.throttle_hours || 4,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (payload.id) {
      const { error } = await supabaseAdmin
        .from("meet_alert_rules")
        .update(dataToSave)
        .eq("id", payload.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("meet_alert_rules")
        .insert(dataToSave);
      if (error) throw error;
    }

    revalidatePath("/meet/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Error saving alert rule:", err);
    return { success: false, error: err.message };
  }
}

export async function getNotificationTemplates(): Promise<MeetNotificationTemplate[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("core_notification_templates")
      .select("*")
      .eq("module_key", "meet")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching notification templates:", error);
      return [];
    }
    return (data || []) as MeetNotificationTemplate[];
  } catch (err: any) {
    console.error("Error in getNotificationTemplates:", err);
    return [];
  }
}

export async function saveNotificationTemplate(payload: {
  id?: string;
  key: string;
  name: string;
  event_key: string;
  channel: string;
  subject: string;
  body: string;
  attach_mom?: boolean;
}): Promise<{ success: boolean; template?: MeetNotificationTemplate; error?: string }> {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const now = new Date().toISOString();

    if (payload.id) {
      // Increments version on update
      const { data: current } = await supabaseAdmin
        .from("core_notification_templates")
        .select("version")
        .eq("id", payload.id)
        .single();

      const newVer = (current?.version || 1) + 1;

      const { data, error } = await supabaseAdmin
        .from("core_notification_templates")
        .update({
          name: payload.name,
          subject: payload.subject,
          body: payload.body,
          attach_mom: payload.attach_mom ?? false,
          version: newVer,
          updated_by: userId,
          updated_at: now,
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      revalidatePath("/meet/admin");
      return { success: true, template: data as MeetNotificationTemplate };
    } else {
      const { data, error } = await supabaseAdmin
        .from("core_notification_templates")
        .insert({
          module_key: "meet",
          key: payload.key,
          name: payload.name,
          event_key: payload.event_key,
          channel: payload.channel || "email",
          language: "en",
          subject: payload.subject,
          body: payload.body,
          attach_mom: payload.attach_mom ?? false,
          version: 1,
          is_active: true,
          updated_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      revalidatePath("/meet/admin");
      return { success: true, template: data as MeetNotificationTemplate };
    }
  } catch (err: any) {
    console.error("Error saving notification template:", err);
    return { success: false, error: err.message };
  }
}
