"use server";

import { revalidatePath } from "next/cache";
import { streamLLMResponse } from "@/lib/copilot/llm-provider";
import * as D from "./data";
import { NOTE_INSTRUCTION, factsFor, onlyKnownNumbers, ruleNote } from "./insights";

// Writes the budget summary of a version with the workspace's AI (Gemini or OpenAI, whichever key is
// set). The AI only words the facts this server worked out; if no AI is set up, or its text carries a
// number that is not among the facts, the note is written by rule instead.

type Result = { ok: true; provider: string } | { ok: false; error: string };

export async function writeBudgetSummary(projectId: number, versionNumber: number): Promise<Result> {
  const { sb, me } = await D.getSession();
  if (!me) return { ok: false, error: "Sign in again to write the summary" };
  if (!D.can(me, "report.export", projectId) || me.department_ids) {
    return { ok: false, error: "Writing the summary needs the Export reports right for the whole project" };
  }
  const project = (await D.getProjects(sb)).find((p) => p.id === projectId);
  if (!project) return { ok: false, error: "Project not found" };
  const versions = await D.getVersions(sb, projectId);
  const v = versions.find((x) => x.number === versionNumber);
  if (!v) return { ok: false, error: "Version not found" };

  const facts = await factsFor(sb, project, v, versions);
  let body = ruleNote(facts);
  let provider = "rules";
  try {
    const ai = await streamLLMResponse({
      prompt: `Facts:\n${facts.lines.map((l) => `- ${l}`).join("\n")}\n\nWrite the management note.`,
      history: [], systemInstruction: NOTE_INSTRUCTION, moduleCode: "ORG_BUDGET", onToken: () => {},
      signal: AbortSignal.timeout(45000),
    });
    const text = ai.fullText.replace(/[*#_`]/g, "").replace(/\s+/g, " ").trim();
    if (ai.provider !== "fallback" && text.length > 40 && text.length < 4000 && onlyKnownNumbers(text, facts)) {
      body = text;
      provider = ai.provider;
    }
  } catch {
    // keep the rule-written note
  }
  try {
    const { error } = await sb.from("budget_ai_notes").insert({ version_id: v.id, body, provider, facts: { lines: facts.lines } });
    if (error) {
      return { ok: false, error: error.message };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to save AI summary note." };
  }
  revalidatePath("/budget", "layout");
  return { ok: true, provider };
}
