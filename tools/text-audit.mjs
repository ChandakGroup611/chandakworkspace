#!/usr/bin/env node
/**
 * text-audit — checks every user-facing string in the app: spelling mistakes, ALL CAPS,
 * Title Case labels, vague messages, raw enum codes, mixed spellings (organisation vs
 * organization), banned terms, "..." and stray spaces. Rules live in tools/copy-glossary.json.
 *
 *   node tools/text-audit.mjs                    # whole app → text-audit-report.md + text-audit.csv
 *   node tools/text-audit.mjs --module vehicle   # one module (vehicle|design|dashboards|admin|auth|shared|tasks)
 *   node tools/text-audit.mjs --files a.tsx      # just these files
 *   node tools/text-audit.mjs --fix              # auto-fix SAFE issues only: known misspellings, repeated words,
 *                                                #   "..." → "…", double spaces. Everything else is a report.
 *   node tools/text-audit.mjs --fail             # exit 1 on any ERROR (CI / pre-commit)
 *
 * The CSV lists every string once with file:line, so a reviewer (or the business team) can
 * read all UI text in one sheet. Suppress a deliberate case with  // text-audit-ignore-next-line
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const ROOT = process.cwd();
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const G = JSON.parse(fs.readFileSync(fs.existsSync(path.join(here, "copy-glossary.json")) ? path.join(here, "copy-glossary.json") : path.join(ROOT, "tools/copy-glossary.json"), "utf8"));

const ACRO = new Set(G.acronyms);
const ACRO_UP = new Set(G.acronyms.map((a) => a.toUpperCase()));
const PROPER = [...G.properNouns].sort((a, b) => b.length - a.length);
const PROPER_WORDS = new Set(G.properNouns.filter((p) => !p.includes(" ")));
const SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or", "per", "the", "to", "via", "vs", "with", "&"]);
const MIS = G.misspellings;
const PREF_US = G.spelling === "us";
const VARIANTS = G.variants.map(([gb, us]) => (PREF_US ? { prefer: us, other: gb } : { prefer: gb, other: us }));

const SCAN_DIRS = ["app", "src", "components", "features", "modules", "lib", "Design_Tracking"].filter((d) => fs.existsSync(path.join(ROOT, d)));
const SKIP = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage", "__tests__", "tools", "examples", "_ui-kit"]);
const BUTTON_TAGS = new Set(["button", "AppButton", "Button", "DropdownMenuItem", "MenuItem"]);
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "th", "AppTableHead", "label", "DialogTitle", "AppCardTitle", "legend", "dt"]);

const MODULES = [
  ["vehicle", /(^|\/)(vehicle|fleet)(\/|$)/i], ["design", /(^|\/)design(\/|$)/i], ["dashboards", /(^|\/)(dashboards?|reports?|analytics)(\/|$)/i],
  ["admin", /(^|\/)(settings|rbac|iam|users?|masters?|compliance|subscription|profile|learning)(\/|$)/i], ["auth", /(^|\/)(login|register|select-module|auth)(\/|$)/i],
  ["shared", /^(components|src\/components|lib|src\/lib)\//i], ["tasks", /.*/],
];
const moduleOf = (rel) => MODULES.find(([, re]) => re.test(rel))[0];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(e.name) && !/\.(test|spec|stories)\./.test(e.name)) out.push(p);
  }
  return out;
}

const looksLikeCode = (s) => /[;=]|=>|&&|\|\||\(\)|^\s*[)\]}:?]|\s\?\s*$|\b(const|return|function|import|export|typeof|undefined|null)\b|^[\w.]+\(|className|\$\{/.test(s);
const hasLetters = (s) => /[A-Za-z]{2,}/.test(s);

/** Extract user-facing strings with kind + location. */
function extract(src) {
  const out = [];
  const add = (text, index, kind, raw) => {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t || !hasLetters(t) || t.length > 400) return;
    out.push({ text: t, rawText: raw ?? text, index, kind });
  };
  // JSX text between tags
  const reText = />([^<>{}]+)</g;
  let m;
  while ((m = reText.exec(src))) {
    const raw = m[1];
    if (!hasLetters(raw) || looksLikeCode(raw)) continue;
    const before = src.slice(Math.max(0, m.index - 400), m.index + 1);
    const tag = [...before.matchAll(/<([A-Za-z][\w.]*)/g)].pop()?.[1] ?? "";
    const kind = BUTTON_TAGS.has(tag) ? "button" : HEADING_TAGS.has(tag) ? "heading" : "text";
    add(raw, m.index + 1, kind, raw);
  }
  // attributes
  const reAttr = /\b(placeholder|title|aria-label|label|description|alt|hint|helperText|subtitle|emptyLabel|confirmLabel|cancelLabel|backLabel|tooltip|message|error)\s*=\s*(?:\{\s*)?(["'`])((?:(?!\2)[^\\]|\\.)*?)\2/g;
  while ((m = reAttr.exec(src))) {
    if (m[3].includes("${")) continue;
    const kind = /label|Label/.test(m[1]) && /confirm|cancel/.test(m[1]) ? "button" : m[1] === "label" ? "label" : "attr";
    add(m[3], m.index + m[0].indexOf(m[3]), kind, m[3]);
  }
  // object literals used for nav/menus/columns/options: label: "…", title: "…", header: "…"
  const reObj = /\b(label|title|header|name|description|text)\s*:\s*(["'`])((?:(?!\2)[^\\$]|\\.)*?)\2/g;
  while ((m = reObj.exec(src))) {
    if (!/\s/.test(m[3]) && /^[a-z0-9_-]+$/.test(m[3])) continue; // ids/keys like "overview"
    add(m[3], m.index + m[0].lastIndexOf(m[3]), m[1] === "header" ? "heading" : "label", m[3]);
  }
  // toasts / errors shown to users
  const reMsg = /\b(?:toast(?:\.\w+)?|setError|setErrorMessage|showError|showSuccess|notify(?:\.\w+)?|alert|confirm)\(\s*(["'`])((?:(?!\1)[^\\$]|\\.)*?)\1/g;
  while ((m = reMsg.exec(src))) add(m[2], m.index + m[0].lastIndexOf(m[2]), "message", m[2]);
  return out;
}

function sentenceCase(s) {
  let guard = s;
  const keep = [];
  for (const p of PROPER) if (p.includes(" ")) guard = guard.replace(new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), () => { keep.push(p); return `\u0000${keep.length - 1}\u0000`; });
  let first = true;
  const res = guard.replace(/\u0000\d+\u0000|[A-Za-z][A-Za-z'’-]*/g, (w) => {
    if (w.startsWith("\u0000")) { first = false; return keep[Number(w.slice(1, -1))]; }
    let r;
    if (ACRO_UP.has(w.toUpperCase()) && (w === w.toUpperCase() || ACRO.has(w))) r = [...ACRO].find((a) => a.toUpperCase() === w.toUpperCase()) ?? w.toUpperCase();
    else if (PROPER_WORDS.has(w) || PROPER_WORDS.has(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())) r = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    else r = first ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase();
    first = false;
    return r;
  });
  return res;
}

const words = (s) => s.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];

function check(str, variantCounts) {
  const issues = [];
  const t = str.text;
  const lower = t.toLowerCase();
  const isButton = str.kind === "button";

  for (const w of words(t)) {
    const fix = MIS[w.toLowerCase()];
    if (fix) issues.push(["ERROR", "spelling", `“${w}” is misspelt`, t.replace(new RegExp(`\\b${w}\\b`), matchCase(w, fix)), true]);
  }
  const rep = /\b(\w+)\s+\1\b/i.exec(t);
  if (rep && !/^\d+$/.test(rep[1])) issues.push(["ERROR", "repeated-word", `Repeated word “${rep[1]}”`, t.replace(rep[0], rep[1]), true]);

  for (const pt of G.preferredTerms) {
    if (pt.only === "button" && !isButton) continue;
    for (const a of pt.avoid) {
      const re = new RegExp(`(^|[^A-Za-z])${a.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}($|[^A-Za-z])`, a === a.toLowerCase() ? "i" : "");
      if (re.test(t)) issues.push([/Something went wrong|error occurred|Unknown error|Paytment/i.test(a) ? "ERROR" : "WARN", "wording", `Avoid “${a}”`, `Use ${pt.use}`, false]);
    }
  }
  const enumCode = /\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/.exec(t);
  if (enumCode) issues.push(["ERROR", "raw-code", `Raw code “${enumCode[0]}” shown to users`, t.replace(enumCode[0], sentenceCase(enumCode[0].replace(/_/g, " "))), false]);

  const ws = words(t);
  const capsWords = ws.filter((w) => w.length >= 3 && w === w.toUpperCase() && !ACRO_UP.has(w));
  if (capsWords.length && capsWords.length >= Math.ceil(ws.length / 2)) issues.push(["WARN", "all-caps", "ALL CAPS text", sentenceCase(t.replace(/_/g, " ")), false]);
  else if (["button", "heading", "label", "attr"].includes(str.kind) && ws.length >= 2 && ws.length <= 10) {
    const content = ws.filter((w, i) => i > 0 && !SMALL.has(w.toLowerCase()) && !ACRO_UP.has(w.toUpperCase()) && !PROPER_WORDS.has(w));
    const isProper = PROPER.some((p) => t === p);
    if (!isProper && content.length >= 1 && content.every((w) => /^[A-Z][a-z]/.test(w))) issues.push(["WARN", "title-case", "Title Case label", sentenceCase(t), false]);
  }
  if (/\.\.\.(?!\.)/.test(t)) issues.push(["WARN", "ellipsis", "Three dots", t.replace(/\.\.\./g, "…"), true]);
  if (/ {2,}/.test(str.rawText) && ["attr", "label", "message"].includes(str.kind)) issues.push(["WARN", "double-space", "Double space", t, true]);
  if (/\s[,.;:!?](\s|$)/.test(t)) issues.push(["WARN", "space-before-punct", "Space before punctuation", t.replace(/\s+([,.;:!?])/g, "$1"), false]);
  if (/!(\s|$)/.test(t) && str.kind !== "text") issues.push(["WARN", "exclamation", "Exclamation mark in UI copy", t.replace(/!+/g, "."), false]);
  if (isButton && /[.:]$/.test(t)) issues.push(["WARN", "button-punct", "Button label ends with punctuation", t.replace(/[.:]+$/, ""), false]);

  for (const v of VARIANTS) {
    const re = new RegExp(`\\b${v.other}\\b`, "i");
    if (re.test(lower) && (variantCounts[v.prefer] ?? 0) > 0) issues.push(["WARN", "mixed-spelling", `“${v.other}” — the app also uses “${v.prefer}”`, t.replace(new RegExp(`\\b${v.other}\\b`, "i"), (w) => matchCase(w, v.prefer)), false]);
  }
  return issues;
}

function matchCase(src, word) {
  if (src === src.toUpperCase()) return word.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return word.charAt(0).toUpperCase() + word.slice(1);
  return word;
}

// ---------- run ----------
let files = [];
if (args.includes("--files")) files = args.slice(args.indexOf("--files") + 1).filter((a) => !a.startsWith("--")).map((f) => path.resolve(f));
else for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);
const onlyModule = val("--module");

const all = [];
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  const mod = moduleOf(rel);
  if (onlyModule && mod !== onlyModule) continue;
  const src = fs.readFileSync(f, "utf8");
  if (/^\s*(\/\*|\/\/)\s*text-audit-disable/.test(src)) continue;
  const lines = src.split("\n");
  for (const s of extract(src)) {
    const line = src.slice(0, s.index).split("\n").length;
    const prev = lines[line - 2] ?? "";
    if (/text-audit-ignore-next-line/.test(prev)) continue;
    const lt = (lines[line - 1] ?? "").trim();
    if (lt.startsWith("//") || lt.startsWith("*") || lt.startsWith("/*")) continue;
    all.push({ ...s, file: rel, abs: f, line, module: mod });
  }
}
// dedupe identical string at same location (attribute + object regex overlap)
const seen = new Set();
const strings = all.filter((s) => { const k = `${s.file}:${s.line}:${s.text}`; if (seen.has(k)) return false; seen.add(k); return true; });

const variantCounts = {};
for (const s of strings) for (const v of VARIANTS) {
  if (new RegExp(`\\b${v.prefer}\\b`, "i").test(s.text)) variantCounts[v.prefer] = (variantCounts[v.prefer] ?? 0) + 1;
}
// If the app never uses the preferred variant, prefer is still the glossary choice: count it as present.
for (const v of VARIANTS) variantCounts[v.prefer] ??= 1;

const findings = [];
for (const s of strings) for (const [sev, rule, msg, suggestion, safe] of check(s, variantCounts)) findings.push({ ...s, severity: sev, rule, message: msg, suggestion, safe });

// ---------- safe auto-fix ----------
let fixed = 0;
if (flag("--fix")) {
  const byFile = {};
  for (const f of findings.filter((x) => x.safe)) (byFile[f.abs] ??= []).push(f);
  for (const [abs, list] of Object.entries(byFile)) {
    const lines = fs.readFileSync(abs, "utf8").split("\n");
    for (const f of list) {
      const i = f.line - 1;
      let ln = lines[i];
      if (f.rule === "spelling") {
        for (const w of words(f.rawText)) { const r = MIS[w.toLowerCase()]; if (r) ln = ln.replace(new RegExp(`\\b${w}\\b`), matchCase(w, r)); }
      } else if (f.rule === "repeated-word") {
        ln = ln.replace(/\b(\w+)\s+\1\b/i, "$1");
      } else if (f.rule === "ellipsis") {
        const fixedText = f.rawText.replace(/\.\.\./g, "…");
        if (ln.includes(f.rawText)) ln = ln.replace(f.rawText, fixedText);
      } else if (f.rule === "double-space") {
        if (ln.includes(f.rawText)) ln = ln.replace(f.rawText, f.rawText.replace(/ {2,}/g, " "));
      }
      if (ln !== lines[i]) { lines[i] = ln; fixed++; }
    }
    fs.writeFileSync(abs, lines.join("\n"));
  }
}

// ---------- report ----------
const errors = findings.filter((f) => f.severity === "ERROR").length;
const warns = findings.length - errors;
const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const byRule = {};
for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
const byMod = {};
for (const f of findings) { byMod[f.module] ??= { e: 0, w: 0 }; f.severity === "ERROR" ? byMod[f.module].e++ : byMod[f.module].w++; }

let md = `# UI text audit\n\n${strings.length} user-facing strings in ${files.length} files. **${errors} errors**, ${warns} warnings${flag("--fix") ? `, ${fixed} safe fixes applied` : ""}.\n\nRules and preferred terms: \`tools/copy-glossary.json\` (spelling: ${G.spelling}). Full string list for reviewers: \`text-audit.csv\`.\n\n## By module\n\n| Module | Errors | Warnings |\n|---|---:|---:|\n`;
for (const [m, c] of Object.entries(byMod)) md += `| ${m} | ${c.e} | ${c.w} |\n`;
md += `\n## By rule\n\n| Rule | Count |\n|---|---:|\n`;
for (const [r, c] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) md += `| \`${r}\` | ${c} |\n`;
md += `\n## Findings\n\n| Sev | File:line | Kind | Text | Issue | Suggested |\n|---|---|---|---|---|---|\n`;
for (const f of findings.sort((a, b) => (a.severity === b.severity ? a.file.localeCompare(b.file) || a.line - b.line : a.severity === "ERROR" ? -1 : 1)))
  md += `| ${f.severity} | \`${f.file}:${f.line}\` | ${f.kind} | ${esc(f.text)} | ${esc(f.message)} | ${esc(f.suggestion)} |\n`;
const out = val("--out") ?? "text-audit-report";
fs.writeFileSync(`${out}.md`, md);

const csvq = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const issueMap = new Map();
for (const f of findings) { const k = `${f.file}:${f.line}:${f.text}`; issueMap.set(k, [...(issueMap.get(k) ?? []), `${f.severity} ${f.rule}: ${f.suggestion}`]); }
let csv = "module,file,line,kind,text,issues\n";
for (const s of strings) csv += [s.module, s.file, s.line, s.kind, s.text, (issueMap.get(`${s.file}:${s.line}:${s.text}`) ?? []).join(" | ")].map(csvq).join(",") + "\n";
const csvPath = out.endsWith("-report") ? `${out.replace(/-report$/, "")}.csv` : `${out}.csv`;
fs.writeFileSync(csvPath, "\uFEFF" + csv); // BOM so Excel opens UTF-8 (₹, –) correctly

console.log(`text-audit: ${strings.length} strings, ${errors} errors, ${warns} warnings${flag("--fix") ? `, ${fixed} safe fixes applied` : ""} → ${out}.md`);
if (flag("--fail") && errors > 0) process.exit(1);
