/**
 * Universal DOM-Aware Voice Form Filler
 * Works across ALL Chandak Workspace modules, Settings, and Masters pages.
 * Parses arbitrary "<field name> is/should be/as <value>" clauses and sets
 * React-controlled <input>, <textarea>, and <select> elements on the active screen.
 */

import { parseSpokenDate } from "./field-parser";

export interface DomFillResult {
  filled: { label: string; value: string }[];
  unmatched: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getFieldLabel(el: HTMLElement): string {
  const id = el.getAttribute("id");
  if (id) {
    const explicit = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (explicit?.textContent) return explicit.textContent.replace(/[*()]/g, " ").trim();
  }
  const wrapping = el.closest("label");
  if (wrapping?.textContent) return wrapping.textContent.replace(/[*()]/g, " ").trim();

  // Check sibling/parent container label
  const parent = el.parentElement;
  if (parent) {
    const lbl = parent.querySelector("label, .theme-label, dt");
    if (lbl?.textContent) return lbl.textContent.replace(/[*()]/g, " ").trim();
    const grand = parent.parentElement;
    if (grand) {
      const glbl = grand.querySelector("label, .theme-label, dt");
      if (glbl?.textContent) return glbl.textContent.replace(/[*()]/g, " ").trim();
    }
  }
  return (
    el.getAttribute("aria-label") ||
    el.getAttribute("placeholder") ||
    el.getAttribute("name") ||
    ""
  ).trim();
}

function setReactControlValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const FIELD_SYNONYMS: Record<string, string[]> = {
  object: ["subject", "title", "task title", "name"],
  subject: ["task title", "title", "name", "subject"],
  "task creation description": ["description", "details", "remark"],
  "end date": ["due date", "end date", "target date"],
  "due date": ["end date", "due date", "target date"],
  "task assignee": ["primary assignee", "assignee", "owner"],
  executive: ["primary assignee", "assignee", "executor"],
  voucher: ["watcher", "watchers"],
};

/** Splits arbitrary natural speech like "name is IT, code is IT01, status should be active" into pairs. */
export function parseGenericFieldPairs(transcript: string): { field: string; value: string }[] {
  const text = transcript.trim();
  if (!text) return [];

  // Match "<field words> (is|are|should be|as|to|:)[., ]+"
  const triggerRe = /(?:^|[,.]\s*|\band\s+)([a-zA-Z][a-zA-Z0-9\s/-]{1,35}?)\s+(?:is|are|should\s+be|as|to|:)[.,:\s]+/gi;
  const matches: { field: string; start: number; valueStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = triggerRe.exec(text)) !== null) {
    const rawField = m[1]
      .replace(/^(?:my|the|a|an|create\s+(?:a|an)?|new)\s+/i, "")
      .trim();
    if (!rawField) continue;
    matches.push({ field: rawField, start: m.index, valueStart: m.index + m[0].length });
  }

  if (matches.length === 0) return [];

  const pairs: { field: string; value: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].start : text.length;
    const val = text
      .slice(cur.valueStart, nextStart)
      .replace(/^[\s,.:-]+/, "")
      .replace(/^also\s+/i, "")
      .replace(/[\s,.;]+$/, "")
      .trim();
    if (val) pairs.push({ field: cur.field, value: val });
  }
  return pairs;
}

/** Fills matching inputs in the active modal/drawer or main page from a spoken transcript. */
export function fillActiveFormFromVoice(transcript: string): DomFillResult {
  const pairs = parseGenericFieldPairs(transcript);
  if (pairs.length === 0) return { filled: [], unmatched: [] };

  // Prefer the topmost open dialog/drawer if one is visible
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(
    (d) => (d as HTMLElement).offsetParent !== null
  );
  const root: ParentNode =
    dialogs.length > 0
      ? dialogs[dialogs.length - 1]
      : document.querySelector("main") || document.body;

  const controls = Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type="hidden"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
    )
  ).filter((el) => el.offsetParent !== null);

  const filled: { label: string; value: string }[] = [];
  const unmatched: string[] = [];

  for (const { field, value } of pairs) {
    const fq = normalize(field);
    if (!fq) continue;
    const aliases = [fq, ...(FIELD_SYNONYMS[fq] || [])];

    // Rank matching controls by label similarity (including speech-to-text synonyms)
    let best: { el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement; label: string; score: number } | null = null;
    for (const el of controls) {
      const label = getFieldLabel(el);
      const nl = normalize(label);
      const nn = normalize(el.getAttribute("name") || "");
      const np = normalize(el.getAttribute("placeholder") || "");
      let score = 0;
      for (const alias of aliases) {
        if (nl === alias || nn === alias) score = Math.max(score, 100);
        else if (nl.startsWith(alias) || nn.startsWith(alias)) score = Math.max(score, 80);
        else if (nl.includes(alias) || (alias.includes(nl) && nl.length > 2)) score = Math.max(score, 60);
        else if (np && (np.includes(alias) || alias.includes(np))) score = Math.max(score, 40);
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { el, label: label || field, score };
      }
    }

    if (!best) {
      unmatched.push(field);
      continue;
    }

    const target = best.el;
    if (target instanceof HTMLSelectElement) {
      const vq = normalize(value);
      const opt =
        Array.from(target.options).find((o) => normalize(o.text) === vq || normalize(o.value) === vq) ||
        Array.from(target.options).find((o) => normalize(o.text).includes(vq) || vq.includes(normalize(o.text)));
      if (opt) {
        setReactControlValue(target, opt.value);
        filled.push({ label: best.label, value: opt.text });
      } else {
        unmatched.push(field);
      }
    } else if (target instanceof HTMLInputElement && target.type === "checkbox") {
      const truthy = /^(yes|true|on|active|enable|enabled|check|checked)$/i.test(value);
      const falsy = /^(no|false|off|inactive|disable|disabled|uncheck|unchecked)$/i.test(value);
      if (truthy || falsy) {
        if (target.checked !== truthy) target.click();
        filled.push({ label: best.label, value: truthy ? "Yes" : "No" });
      } else {
        unmatched.push(field);
      }
    } else if (target instanceof HTMLInputElement && target.type === "date") {
      const iso = parseSpokenDate(value);
      if (iso) {
        setReactControlValue(target, iso);
        filled.push({ label: best.label, value: iso });
      } else {
        unmatched.push(field);
      }
    } else {
      setReactControlValue(target, value);
      filled.push({ label: best.label, value });
    }
  }

  return { filled, unmatched };
}

function getActiveControls() {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(
    (d) => (d as HTMLElement).offsetParent !== null
  );
  const root: ParentNode =
    dialogs.length > 0
      ? dialogs[dialogs.length - 1]
      : document.querySelector("main") || document.body;

  return Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type="hidden"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
    )
  ).filter((el) => el.offsetParent !== null);
}

/** Collects fixed field labels & options from the active modal/page for AI extraction. */
export function inspectActiveFormFields(): { label: string; type: string; options?: string[] }[] {
  const controls = getActiveControls();
  const seen = new Set<string>();
  const out: { label: string; type: string; options?: string[] }[] = [];
  for (const el of controls) {
    const label = getFieldLabel(el);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    if (el instanceof HTMLSelectElement) {
      const opts = Array.from(el.options).map((o) => o.text.trim()).filter((t) => t && !t.startsWith("--"));
      out.push({ label, type: "select", options: opts });
    } else {
      out.push({ label, type: el instanceof HTMLTextAreaElement ? "textarea" : el.type || "text" });
    }
  }
  return out;
}

/** Applies a `{ fieldLabel: value }` map (from AI or parser) to the active DOM form. */
export function applyValuesToActiveForm(values: Record<string, string>): DomFillResult {
  const syntheticTranscript = Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${k} is ${String(v).trim()}`)
    .join(". ");
  if (!syntheticTranscript) return { filled: [], unmatched: [] };
  return fillActiveFormFromVoice(syntheticTranscript);
}
