import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { parseVoiceFields } from "@/lib/voice/field-parser";

export const runtime = "nodejs";

interface FieldSchema {
  label: string;
  type?: string;
  options?: string[];
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function extractWithLLM(transcript: string, fields: FieldSchema[]): Promise<Record<string, string> | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey && !openaiKey) return null;

  const fieldList = fields.length
    ? fields.map((f) => `- "${f.label}" (${f.type || "text"})${f.options?.length ? ` [options: ${f.options.slice(0, 30).join(", ")}]` : ""}`).join("\n")
    : `- "Subject" (text)\n- "Description" (text)\n- "Status" (select)\n- "Priority" (select)\n- "Start Date" (date)\n- "Due Date" (date)\n- "Department" (select)\n- "Primary Assignee" (select)\n- "Business Reason" (text)`;

  const systemPrompt = `You extract form field values from natural spoken text (including Indian English / Hinglish / speech-to-text typos like "object" for "subject", "voucher" for "watcher", "executive" for "primary assignee").
Today's date is ${todayIso()}. Convert relative dates ("today", "tomorrow", "next week") to YYYY-MM-DD.
For select fields with options, pick the closest matching option string.
Return ONLY a valid JSON object mapping ONLY the matched exact field labels from the list below to their extracted string values. Omit fields not mentioned.

Available fields:
${fieldList}`;

  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: transcript }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
          }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return JSON.parse(text);
      }
    } catch (e) {
      console.warn("[/api/voice/parse] Gemini error:", e);
    }
  }

  if (openaiKey) {
    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: transcript },
          ],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content;
        if (text) return JSON.parse(text);
      }
    } catch (e) {
      console.warn("[/api/voice/parse] OpenAI error:", e);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    const fields: FieldSchema[] = Array.isArray(body.fields) ? body.fields : [];

    if (!transcript) {
      return NextResponse.json({ values: {}, source: "empty" });
    }

    const llmValues = await extractWithLLM(transcript, fields);
    if (llmValues && typeof llmValues === "object") {
      return NextResponse.json({ values: llmValues, source: "llm" });
    }

    // Deterministic fallback when no LLM API key is configured
    const parsed = parseVoiceFields(transcript);
    const fallback: Record<string, string> = {};
    if (parsed.subject) fallback["Subject"] = parsed.subject;
    if (parsed.description) fallback["Description"] = parsed.description;
    if (parsed.status) fallback["Status"] = parsed.status;
    if (parsed.priority) fallback["Priority"] = parsed.priority;
    if (parsed.startDate) fallback["Start Date"] = parsed.startDate;
    if (parsed.dueDate) fallback["Due Date"] = parsed.dueDate;
    if (parsed.department) fallback["Department"] = parsed.department;
    if (parsed.assignee) fallback["Primary Assignee"] = parsed.assignee;
    if (parsed.businessReason) fallback["Business Reason"] = parsed.businessReason;

    return NextResponse.json({ values: fallback, source: "fallback" });
  } catch (err: any) {
    console.error("[/api/voice/parse] Error:", err);
    return NextResponse.json({ error: err?.message || "Failed to parse voice input" }, { status: 500 });
  }
}
