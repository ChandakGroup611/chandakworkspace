/**
 * Voice Field Parser & Fuzzy Option Matcher
 * Parses both structured spoken commands ("subject is ..., priority is High, duration is 5 days")
 * and natural conversational sentences ("Create a high priority IT task for Avinash to ... in 5 days")
 * into structured form fields.
 */

export interface ParsedVoiceFields {
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  duration?: string;  // numeric days string e.g. "5"
  startDate?: string; // YYYY-MM-DD
  dueDate?: string;   // YYYY-MM-DD
  department?: string;
  assignee?: string;
  executors?: string;
  watchers?: string;
  businessReason?: string;
  moduleHint?: "TASK" | "SUBTASK" | "TICKET" | "REQUIREMENT" | "VEHICLE" | "BUDGET" | "MEETING" | "DESIGN" | "AMC";
  spokenModulePhrase?: string;
}

const SEP = `(?:\\s+(?:is|are|should\\s+be|will\\s+be|as|to)\\b[.,:\\s]*|[.:\\-]+\\s*)`;
// Boundary-anchored space-only separator so "Priority High. Duration 15 days." works without false-triggering mid-sentence
const BOUNDARY = `(?:^|(?<=[.,;!?]\\s*))`;

const FIELD_DEFS: { key: keyof Omit<ParsedVoiceFields, "moduleHint" | "spokenModulePhrase">; trigger: string }[] = [
  { key: "subject", trigger: `(?:my\\s+)?(?:task|subtask|sub-task|ticket|requirement)?\\s*(?:subject|object|topic|title|name|heading)` },
  { key: "description", trigger: `(?:task\\s+creation\\s+|task\\s+)?(?:description|details?|summary|remark|remarks|notes?)` },
  { key: "duration", trigger: `(?:duration(?:\\s+in\\s+days)?|due\\s+days)` },
  { key: "status", trigger: `status` },
  { key: "priority", trigger: `priority` },
  { key: "startDate", trigger: `(?:start\\s*date|from\\s*date|starts?\\s+on)` },
  { key: "dueDate", trigger: `(?:due\\s*date|end\\s*date|target\\s*date|deadline|due\\s+on)` },
  { key: "department", trigger: `(?:department|dept)` },
  { key: "assignee", trigger: `(?:primary\\s*assignee(?:\\s*\\(?owner\\)?)?|task\\s*assignee|assignee|assign\\s+to|assigned\\s+to|owner)` },
  { key: "executors", trigger: `(?:executors?|executives?)` },
  { key: "watchers", trigger: `(?:watchers?|vouchers?)` },
  { key: "businessReason", trigger: `(?:business\\s*reason|reason|justification)` },
];

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90,
};

function extractNumber(raw: string): string | undefined {
  const digit = raw.match(/\d+/);
  if (digit) return digit[0];
  const lower = raw.toLowerCase();
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) return String(num);
  }
  return undefined;
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Resolves spoken date phrases ("today", "tomorrow", "next week", "in 3 days", "2026-11-30") to YYYY-MM-DD. */
export function parseSpokenDate(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
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
  if (/\bnext\s+week\b/.test(s)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return toIsoDate(d);
  }
  if (/\bnext\s+month\b/.test(s)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 30);
    return toIsoDate(d);
  }
  const inDays = s.match(/\b(?:in|after)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty)\s+days?\b/);
  if (inDays) {
    const n = extractNumber(inDays[1]);
    if (n) {
      const d = new Date(now);
      d.setDate(d.getDate() + Number(n));
      return toIsoDate(d);
    }
  }
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < weekdays.length; i++) {
    if (new RegExp(`\\b(?:next|this)\\s+${weekdays[i]}\\b`).test(s)) {
      const d = new Date(now);
      const diff = (i - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return toIsoDate(d);
    }
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

/** Parses natural conversational sentences when explicit "<field> is" triggers are omitted. */
function parseConversationalFallback(text: string, out: ParsedVoiceFields): ParsedVoiceFields {
  let cleaned = text.replace(/[.]+$/, "").trim();

  // Priority: "high priority", "urgent", "medium priority", "low priority"
  const prioMatch = cleaned.match(/\b(urgent|critical|high|medium|normal|low)(?:\s+priority)?\b/i);
  if (prioMatch && !out.priority) {
    out.priority = prioMatch[1];
    cleaned = cleaned.replace(prioMatch[0], " ");
  }

  // Department (case-sensitive for short acronyms like IT / HR so "it" pronoun never false-matches)
  const deptMatch =
    cleaned.match(/\b(IT|HR)\b/) ||
    cleaned.match(/\b(Finance|Operations|Sales|Admin|Accounts|Engineering|Support|Marketing)\b/i);
  if (deptMatch && !out.department) {
    out.department = deptMatch[1];
    cleaned = cleaned.replace(deptMatch[0], " ");
  }

  // Duration: "in 5 days" / "for 10 days"
  const durMatch = cleaned.match(/\b(?:in|for)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty)\s+days?\b/i);
  if (durMatch && !out.duration) {
    const n = extractNumber(durMatch[1]);
    if (n) out.duration = n;
    cleaned = cleaned.replace(durMatch[0], " ");
  }

  // Due date: "due tomorrow", "by next week", "tomorrow", "today"
  const dueMatch = cleaned.match(/\b(?:(?:due|by|before|on)\s+)?(day\s+after\s+tomorrow|tomorrow|today|next\s+week|next\s+month)\b/i);
  if (dueMatch && !out.dueDate) {
    const iso = parseSpokenDate(dueMatch[1]);
    if (iso) out.dueDate = iso;
    cleaned = cleaned.replace(dueMatch[0], " ");
  }

  // Assignee: "for <Name> to ..." or "assigned to <Name>"
  const assignMatch =
    cleaned.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+to\b/) ||
    cleaned.match(/\bassign(?:ed)?\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i);
  if (assignMatch && !out.assignee) {
    out.assignee = assignMatch[1];
    cleaned = cleaned.replace(new RegExp(`\\bfor\\s+${assignMatch[1]}\\s+to\\b`, "i"), " ");
    cleaned = cleaned.replace(new RegExp(`\\bassign(?:ed)?\\s+to\\s+${assignMatch[1]}\\b`, "i"), " ");
  }

  // Clean up leading command boilerplate ("create a task", "raise a ticket for", etc.) for subject
  cleaned = cleaned
    .replace(/^(?:please\s+)?(?:create|add|make|raise|log|open|new)\s+(?:an?\s+)?(?:task|subtask|sub-task|ticket|requirement)?\s*(?:for|to|about)?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.:;\s]+|[,.:;\s]+$/g, "")
    .trim();

  if (cleaned && !out.subject) {
    out.subject = cleaned;
  }
  return out;
}

/** Parses a spoken transcript into structured transaction fields by field name. */
export function parseVoiceFields(transcript: string): ParsedVoiceFields {
  const text = transcript.trim();
  if (!text) return {};

  const out: ParsedVoiceFields = {};
  const explicitIntent = text.match(
    /\b(?:create|new|add|raise|log|open|make|go\s+to)\s+(?:a\s+|an\s+|in\s+)?([a-z][a-z0-9\s-]{1,28}?)(?=\s*(?:[.,;:]|\b(?:subject|title|name|object|description|priority|status|duration|for|with|is)\b|$))/i
  );
  if (explicitIntent?.[1]) {
    out.spokenModulePhrase = explicitIntent[1].trim();
  }
  const intentWord = explicitIntent?.[1]?.toLowerCase().replace("-", "") || "";
  if (intentWord === "subtask" || /\bsub-?task\b/i.test(text)) out.moduleHint = "SUBTASK";
  else if (intentWord === "requirement" || /\brequirement\b/i.test(text)) out.moduleHint = "REQUIREMENT";
  else if (intentWord === "ticket" || /\bticket\b/i.test(text)) out.moduleHint = "TICKET";
  else if (intentWord === "vehicle" || /\bvehicle\b/i.test(text)) out.moduleHint = "VEHICLE";
  else if (intentWord === "budget" || /\bbudget\b/i.test(text)) out.moduleHint = "BUDGET";
  else if (intentWord === "meeting" || /\bmeeting\b/i.test(text)) out.moduleHint = "MEETING";
  else if (intentWord.includes("design") || /\bdesign\s*(?:tracking)?\b/i.test(text)) out.moduleHint = "DESIGN";
  else if (intentWord === "amc" || /\b(?:amc|subscription)\b/i.test(text)) out.moduleHint = "AMC";
  else if (intentWord === "task" || /\btask\b/i.test(text)) out.moduleHint = "TASK";

  // Pass 1: match explicit separators (is/are/should be/as/to/./:/-) OR boundary-anchored space-only headers
  const matches: { key: keyof Omit<ParsedVoiceFields, "moduleHint" | "spokenModulePhrase">; start: number; valueStart: number }[] = [];
  for (const { key, trigger } of FIELD_DEFS) {
    const explicitRe = new RegExp(`\\b${trigger}${SEP}`, "gi");
    let m: RegExpExecArray | null;
    while ((m = explicitRe.exec(text)) !== null) {
      matches.push({ key, start: m.index, valueStart: m.index + m[0].length });
    }

    const boundaryRe = new RegExp(`${BOUNDARY}${trigger}\\s+`, "gi");
    while ((m = boundaryRe.exec(text)) !== null) {
      // Avoid duplicate if explicitRe already matched the exact same start index
      if (!matches.some((x) => Math.abs(x.start - m!.index) < 3)) {
        matches.push({ key, start: m.index, valueStart: m.index + m[0].length });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);

  if (matches.length === 0) {
    return parseConversationalFallback(text, out);
  }

  // Deduplicate overlapping matches keeping the earliest/longest match
  const deduped: typeof matches = [];
  for (const cur of matches) {
    const prev = deduped[deduped.length - 1];
    if (prev && cur.start < prev.valueStart) {
      if (cur.valueStart > prev.valueStart) {
        deduped[deduped.length - 1] = cur;
      }
      continue;
    }
    deduped.push(cur);
  }

  for (let i = 0; i < deduped.length; i++) {
    const cur = deduped[i];
    const nextStart = i + 1 < deduped.length ? deduped[i + 1].start : text.length;
    const rawVal = text
      .slice(cur.valueStart, nextStart)
      .replace(/^[\s,.:-]+/, "")
      .replace(/^also\s+/i, "")
      .replace(/[\s,.;]+$/, "")
      .replace(/\s+(?:and|with|then)$/i, "")
      .trim();

    if (!rawVal) continue;
    if (cur.key === "startDate" || cur.key === "dueDate") {
      const iso = parseSpokenDate(rawVal);
      if (iso) out[cur.key] = iso;
    } else if (cur.key === "duration") {
      const n = extractNumber(rawVal);
      if (n) out.duration = n;
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
  if (!spoken || typeof spoken !== "string" || !options.length) return undefined;
  const q = spoken.trim().replace(/^also\s+/i, "").toLowerCase();
  if (!q) return undefined;

  const labelOf = (item: T) => {
    for (const k of labelKeys) {
      if (typeof item[k] === "string" && item[k].trim()) return item[k].trim().toLowerCase();
    }
    return "";
  };

  return (
    options.find((o) => {
      const lbl = labelOf(o);
      return Boolean(lbl) && lbl === q;
    }) ||
    options.find((o) => {
      const lbl = labelOf(o);
      return Boolean(lbl) && lbl.startsWith(q);
    }) ||
    options.find((o) => {
      const lbl = labelOf(o);
      return Boolean(lbl) && (lbl.includes(q) || q.includes(lbl));
    })
  );
}

/** Matches comma / "and" separated spoken names (e.g. "Adil, Rahul and Priya") against options. */
export function matchMultipleOptionsByLabel<T extends Record<string, any>>(
  spoken: string | undefined,
  options: T[],
  labelKeys: string[] = ["full_name", "name", "email", "label"]
): T[] {
  if (!spoken || typeof spoken !== "string" || !options.length) return [];
  const parts = spoken
    .split(/,|\band\b|&/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const matched: T[] = [];
  const seen = new Set<any>();
  for (const part of parts) {
    const m = matchOptionByLabel(part, options, labelKeys);
    if (m && !seen.has(m.id ?? m)) {
      seen.add(m.id ?? m);
      matched.push(m);
    }
  }
  return matched;
}
