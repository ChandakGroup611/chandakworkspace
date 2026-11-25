/**
 * Voice Field Parser & Fuzzy Option Matcher
 * Parses natural-language spoken commands like:
 *   "my task subject is Server Backup, description is Check logs, status should be New, priority is High, due date is tomorrow"
 * into structured form fields.
 */

export interface ParsedVoiceFields {
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  startDate?: string; // YYYY-MM-DD
  dueDate?: string;   // YYYY-MM-DD
  department?: string;
  assignee?: string;
  businessReason?: string;
  moduleHint?: "TASK" | "SUBTASK" | "TICKET" | "REQUIREMENT";
}

const FIELD_PATTERNS: { key: keyof Omit<ParsedVoiceFields, "moduleHint">; regex: RegExp }[] = [
  { key: "subject", regex: /\b(?:my\s+)?(?:task|subtask|sub-task|ticket|requirement)?\s*(?:subject|title|name|heading)\s+(?:is|should\s+be|as|:)\s+/i },
  { key: "description", regex: /\b(?:description|details?|summary|remark|remarks|notes?)\s+(?:is|are|should\s+be|as|:)\s+/i },
  { key: "status", regex: /\b(?:status)\s+(?:is|should\s+be|as|to|:)\s+/i },
  { key: "priority", regex: /\b(?:priority)\s+(?:is|should\s+be|as|to|:)\s+/i },
  { key: "startDate", regex: /\b(?:start\s*date|from\s*date|starts?\s+on)\s+(?:is|should\s+be|as|:)?\s*/i },
  { key: "dueDate", regex: /\b(?:due\s*date|end\s*date|target\s*date|deadline|due\s+on)\s+(?:is|should\s+be|as|:)?\s*/i },
  { key: "department", regex: /\b(?:department|dept)\s+(?:is|should\s+be|as|:)\s+/i },
  { key: "assignee", regex: /\b(?:primary\s*assignee|assignee|assign\s+to|assigned\s+to|owner|executor)\s+(?:is|should\s+be|as|:)?\s*/i },
  { key: "businessReason", regex: /\b(?:business\s*reason|reason|justification)\s+(?:is|should\s+be|as|:)\s+/i },
];

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Resolves spoken date phrases ("today", "tomorrow", "next monday", "2026-11-30", "28 nov") to YYYY-MM-DD. */
export function parseSpokenDate(raw: string): string | undefined {
  const s = raw.trim().toLowerCase().replace(/[,.;]+$/, "");
  if (!s) return undefined;

  const now = new Date();
  if (/\btoday\b/.test(s)) return toIsoDate(now);
  if (/\bday\s+after\s+tomorrow\b/.test(s)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return toIsoDate(d);
  }
  if (/\btomorrow\b/.test(s)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }
  const inDays = s.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) {
    const d = new Date(now);
    d.setDate(d.getDate() + Number(inDays[1]));
    return toIsoDate(d);
  }
  const iso = s.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const parsed = new Date(raw.trim());
  if (!Number.isNaN(parsed.getTime())) {
    if (parsed.getFullYear() < 2000) parsed.setFullYear(now.getFullYear());
    return toIsoDate(parsed);
  }
  return undefined;
}

/** Parses a spoken transcript into structured transaction fields by field name. */
export function parseVoiceFields(transcript: string): ParsedVoiceFields {
  const text = transcript.trim();
  if (!text) return {};

  const out: ParsedVoiceFields = {};
  if (/\bsub-?task\b/i.test(text)) out.moduleHint = "SUBTASK";
  else if (/\brequirement\b/i.test(text)) out.moduleHint = "REQUIREMENT";
  else if (/\bticket\b/i.test(text)) out.moduleHint = "TICKET";
  else if (/\btask\b/i.test(text)) out.moduleHint = "TASK";

  // Find all field trigger positions in the transcript
  const matches: { key: keyof Omit<ParsedVoiceFields, "moduleHint">; start: number; valueStart: number }[] = [];
  for (const { key, regex } of FIELD_PATTERNS) {
    const globalRe = new RegExp(regex.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = globalRe.exec(text)) !== null) {
      matches.push({ key, start: m.index, valueStart: m.index + m[0].length });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  if (matches.length === 0) {
    // Fallback: treat short single utterance as subject
    out.subject = text.replace(/[.]+$/, "").trim();
    return out;
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].start : text.length;
    const rawVal = text
      .slice(cur.valueStart, nextStart)
      .replace(/^[\s,:-]+/, "")
      .replace(/[\s,.;]+$/, "")
      .replace(/\s+(?:and|with|then)$/i, "")
      .trim();

    if (!rawVal) continue;
    if (cur.key === "startDate" || cur.key === "dueDate") {
      const iso = parseSpokenDate(rawVal);
      if (iso) out[cur.key] = iso;
    } else {
      out[cur.key] = rawVal;
    }
  }

  return out;
}

/** Fuzzy-matches a spoken label (e.g. "high", "new", "avinash") to an option object. */
export function matchOptionByLabel<T extends Record<string, any>>(
  spoken: string | undefined,
  options: T[],
  labelKeys: string[] = ["name", "status_name", "priority_name", "full_name", "label"]
): T | undefined {
  if (!spoken || !options.length) return undefined;
  const q = spoken.trim().toLowerCase();
  if (!q) return undefined;

  const labelOf = (item: T) => {
    for (const k of labelKeys) {
      if (typeof item[k] === "string" && item[k].trim()) return item[k].trim().toLowerCase();
    }
    return "";
  };

  return (
    options.find((o) => labelOf(o) === q) ||
    options.find((o) => labelOf(o).startsWith(q)) ||
    options.find((o) => labelOf(o).includes(q) || q.includes(labelOf(o)))
  );
}
