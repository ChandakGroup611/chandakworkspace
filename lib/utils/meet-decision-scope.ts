import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Extra facts about a decision that the decisions table has no columns for. Kept in
 * core_module_settings (module "meet", key "decision:<id>") so no schema change is needed.
 */
export interface DecisionScope {
  kind: string; // Policy, Approval, Instruction, Budget, Appointment, Other
  appliesTo: "everyone" | "departments" | "people" | "mixed";
  departmentIds: string[];
  personIds: string[];
  background: string | null;
  needsAck: boolean;
  noted: { userId: string; at: string }[];
}

export const DECISION_KINDS = ["Policy", "Approval", "Instruction", "Budget / spend", "Appointment / role", "Target", "Other"];

export async function readDecisionScope(id: string): Promise<DecisionScope | null> {
  const { data } = await supabaseAdmin.from("core_module_settings").select("value_json").eq("module_key", "meet").eq("key", `decision:${id}`).maybeSingle();
  return (data?.value_json as DecisionScope) || null;
}

export async function readDecisionScopes(ids: string[]): Promise<Map<string, DecisionScope>> {
  const map = new Map<string, DecisionScope>();
  if (!ids.length) return map;
  const { data } = await supabaseAdmin.from("core_module_settings").select("key, value_json").eq("module_key", "meet").in("key", ids.slice(0, 500).map((i) => `decision:${i}`));
  for (const r of (data || []) as any[]) map.set(String(r.key).slice("decision:".length), r.value_json as DecisionScope);
  return map;
}

export async function writeDecisionScope(id: string, scope: DecisionScope, userId: string | null) {
  return supabaseAdmin.from("core_module_settings").upsert(
    { module_key: "meet", key: `decision:${id}`, value_json: scope, updated_by: userId, updated_at: new Date().toISOString() },
    { onConflict: "module_key,key" }
  );
}

/** Everyone the decision applies to, as user ids (department members are resolved). */
export async function decisionAudience(scope: DecisionScope): Promise<string[]> {
  const ids = new Set(scope.personIds || []);
  if (scope.departmentIds?.length) {
    const { data } = await supabaseAdmin.from("user_master").select("id").in("department_id", scope.departmentIds).eq("is_deleted", false).eq("is_active", true);
    for (const u of data || []) ids.add((u as any).id);
  }
  return Array.from(ids);
}
