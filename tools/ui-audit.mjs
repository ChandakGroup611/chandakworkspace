#!/usr/bin/env node
/**
 * ui-audit — finds UI code that bypasses the design system, grouped by module.
 *
 *   node tools/ui-audit.mjs                     # whole app → ui-audit-report.md + .json, summary in terminal
 *   node tools/ui-audit.mjs --module vehicle    # one module (vehicle | design | dashboards | tasks | admin | auth | shared)
 *   node tools/ui-audit.mjs --files a.tsx b.tsx # just these files
 *   node tools/ui-audit.mjs --fail              # exit 1 if any ERROR (use in CI / pre-commit)
 *   node tools/ui-audit.mjs --include-kit       # also scan components/ui (the kit itself)
 *
 * Suppress a deliberate exception:   // ui-audit-ignore-next-line  <reason>
 *                                    {/* ui-audit-ignore-next-line <reason> *\/}
 * Whole file (generated code only):  /* ui-audit-disable *\/  on the first line
 *
 * Zero ERRORs per module = that module is "clean". WARNs are reviewed by a human.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src", "components", "features", "modules", "lib", "Design_Tracking"].filter((d) => fs.existsSync(path.join(ROOT, d)));
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage", "__tests__", "tools", "examples", "_ui-kit", "_ui-kit-v3"]);

const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTIL = "bg|text|border|border-[trblxy]|ring|ring-offset|from|to|via|fill|stroke|divide|outline|decoration|accent|caret|placeholder|shadow";

/** id, severity, regex (global), message, fix */
const RULES = [
  ["hex-colour", "ERROR", new RegExp(`\\b(?:${UTIL})-\\[#[0-9a-fA-F]{3,8}\\]`, "g"), "Hard-coded hex colour class", "Use a token class (bg-surface, text-muted, border-border, bg-primary …)"],
  ["hex-literal", "ERROR", /["'`]#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?["'`]|["'`]#[0-9a-fA-F]{3}["'`]/g, "Hex colour literal in code (inline style, chart prop, map)", "Use var(--token) or CHART_THEME / STATUS_COLOR from components/ui/charts/chartTheme"],
  ["rgb-literal", "ERROR", /["'`]rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g, "rgb()/rgba() colour literal", "Use a token, or color-mix(in srgb, var(--token) N%, transparent)"],
  ["palette-colour", "ERROR", new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${UTIL})-(?:${PALETTE})-\\d{2,3}(?:\\/\\d{1,3})?\\b`, "g"), "Tailwind palette colour (doesn't follow the theme)", "Status → StatusBadge / *-soft *-text tokens; neutrals → text-muted, bg-sunken, border-border"],
  ["black-white", "WARN", /(?<![\w-])(?:[a-z0-9-]+:)*(?:bg|border)-(?:black|white)(?:\/\d{1,3})?\b|(?<![\w-])text-black\b/g, "Pure black/white surface or text", "bg-surface / bg-sunken / bg-[var(--overlay)]; text-foreground"],
  ["text-white", "WARN", /(?<![\w-])(?:[a-z0-9-]+:)*text-white\b/g, "text-white (unreadable on light themes unless on a primary/danger fill)", "On primary fills use text-primary-foreground; elsewhere text-foreground"],
  ["dashed-pill", "ERROR", /border-dashed/g, "Dashed border (dashed status pills / boxes)", "StatusBadge for statuses; FileDropzone is the only dashed element"],
  ["hover-move", "ERROR", /hover:-?(?:translate-[xy]-|scale-|rotate-)/g, "Element moves on hover (jitter, blurry text)", "Change colour / border / shadow on hover instead"],
  ["legacy-theme-id", "ERROR", /["'`](?:light-neumorphic|dark-neumorphic|pure-white(?:-neumorphic)?|amazon(?:-prime-upi)?|cyberpunk|industrial-control|executive-light|glass-intelligence|midnight-operations|enterprise-bento|tactical-utility)["'`]/g, "Old theme id hard-coded", "const { isLight, mode } = useTheme()"],
  ["huge-z", "ERROR", /z-\[(?:[1-9]\d{3,})\]/g, "Arbitrary z-index ≥ 1000", "Use the scale: z-[var(--z-popover)], z-[var(--z-modal)] …"],
  ["adhoc-z", "WARN", /z-\[(?:100|200|500|999)\]/g, "Ad-hoc z-index", "Use the scale variables"],
  ["native-dialog", "ERROR", /(?<![\w.])(?:window\.)?(?:confirm|alert|prompt)\(\s*["'`]/g, "Browser alert/confirm/prompt", "ConfirmDialog or toast"],
  ["uppercase", "WARN", /(?<![\w-])uppercase\b/g, "UPPERCASE text", "Sentence case. Only overline labels may use the .theme-label class"],
  ["heavy-weight", "WARN", /\bfont-(?:extrabold|black)\b/g, "Extra-bold weight", "font-semibold for headings, font-medium for emphasis"],
  ["important-mod", "WARN", /(?<=["'`\s])!(?:[a-z-]+:)*(?:(?:min-|max-)?[hw]|p[xytrbl]?|m[xytrbl]?|text|bg|border|rounded|font|z|top|left|right|bottom|gap|inset|shadow|ring|leading|tracking|opacity)-[\w./\[\]-]+|(?<=["'`\s])!(?:hidden|block|flex|inline-flex|grid|inline-block)(?=["'`\s])/g, "Tailwind !important modifier (fighting the cascade)", "Fix the component variant instead of forcing"],
  ["blur", "WARN", /\bbackdrop-blur(?:-\w+)?\b/g, "backdrop-blur (disabled app-wide; leaves translucent panels)", "Use opaque bg-elevated / bg-surface"],
  ["date-format", "WARN", /toLocaleDateString\(|toLocaleString\(\s*\)|format\([^)]*["'`](?:dd[-/]MM[-/]yyyy|yyyy-MM-dd|DD[-/]MM[-/]YYYY|YYYY-MM-DD)["'`]|\.split\(\s*["']T["']\s*\)\[0\]/g, "Ad-hoc date formatting (mixed formats)", "DateCell / DueDateCell / formatDate() from components/ui/data"],
  ["emoji", "WARN", /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "Emoji in UI", "Use a lucide icon or plain text"],
  ["old-hover-token", "ERROR", /hover:opacity-90\/10|\bbg-hover\b|border-border-subtle\b|ring-focus-ring\b|shadow-\[var\(--shadow-ambient\)\]/g, "Class that resolves to nothing", "See UI_STANDARDS.md token list"],
];

const MODULES = [
  ["vehicle", "Vehicle Desk", /(^|\/)(vehicle|fleet)(\/|$)/i],
  ["design", "Design Tracking", /(^|\/)(design|Design_Tracking|verify-drawing)(\/|$)/i],
  ["dashboards", "Dashboards & Reports", /(^|\/)(dashboards?|reports?|analytics)(\/|$)/i],
  ["admin", "Admin, RBAC & Masters", /(^|\/)(settings|rbac|iam|users?|masters?|compliance|subscription|profile|learning)(\/|$)/i],
  ["auth", "Login & module select", /(^|\/)(login|register|select-module|auth)(\/|$)/i],
  ["shared", "Shared components & layout", /^((src\/)?components\/(ui|theme|layout|providers|collaboration|common|shared)\/|(src\/)?lib\/|app\/(layout|providers|error|not-found|loading)\.)/i],
  ["tasks", "Task Workflow (tickets, requirements, workspaces, SLA, AMC…)", /.*/],
];
const moduleOf = (rel) => MODULES.find(([, , re]) => re.test(rel)) ?? MODULES[MODULES.length - 1];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const rel = path.relative(ROOT, p).replace(/\\/g, "/");
      if (!flag("--include-kit") && /(^|\/)components\/(ui|theme)(\/|$)/.test(rel)) continue;
      walk(p, out);
    } else if (/\.(tsx|jsx|ts|js)$/.test(e.name) && !/\.(test|spec|stories|d)\.[jt]sx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Finds JSX opening tags, respecting {...} so `=>` inside handlers doesn't end the tag. */
function* tags(src, name) {
  const re = new RegExp(`<${name}\\b`, "g");
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + name.length + 1, depth = 0, quote = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) { if (c === quote && src[i - 1] !== "\\") quote = null; continue; }
      if (c === '"' || c === "'" || c === "`") { if (depth > 0 || c !== "`") quote = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    yield { index: m.index, text: src.slice(m.index, i + 1) };
  }
}

const lineAt = (src, idx) => src.slice(0, idx).split("\n").length;

function auditFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  if (/^\s*(\/\*|\/\/)\s*ui-audit-disable/.test(src)) return [];
  const lines = src.split("\n");
  const ignored = new Set();
  lines.forEach((l, i) => { if (/ui-audit-ignore-next-line/.test(l)) ignored.add(i + 2); if (/ui-audit-ignore(?!-next)/.test(l)) ignored.add(i + 1); });
  const found = [];
  const push = (rule, sev, idx, snippet, msg, fix) => {
    const line = lineAt(src, idx);
    if (ignored.has(line)) return;
    const lt = (lines[line - 1] || "").trim();
    if (lt.startsWith("//") || lt.startsWith("*") || lt.startsWith("/*")) return; // comments
    found.push({ file: rel, line, rule, severity: sev, snippet: snippet.slice(0, 80), message: msg, fix });
  };
  const isJs = /\.(tsx|jsx)$/.test(file);

  for (const [id, sev, re, msg, fix] of RULES) {
    if (!isJs && !["hex-literal", "legacy-theme-id", "native-dialog", "date-format"].includes(id)) continue;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      // comment lines don't count
      const ls = src.lastIndexOf("\n", m.index) + 1;
      const lineTxt = src.slice(ls, src.indexOf("\n", m.index) === -1 ? src.length : src.indexOf("\n", m.index)).trim();
      if (lineTxt.startsWith("//") || lineTxt.startsWith("*") || lineTxt.startsWith("/*")) continue;
      // text-white on a primary/danger fill in the same className is fine
      if (id === "text-white") {
        const cls = src.slice(Math.max(0, m.index - 160), m.index + 40);
        if (/bg-(primary|danger-solid|danger|success|info|warning|sidebar|accent)\b/.test(cls)) continue;
      }
      push(id, sev, m.index, m[0], msg, fix);
    }
  }
  if (isJs) {
    for (const t of tags(src, "button")) {
      if (!/\btype\s*=/.test(t.text)) push("button-type", "WARN", t.index, t.text.split("\n")[0], "<button> without type (submits surrounding forms)", 'Add type="button" (or "submit" for the form\'s submit)');
      const inner = src.slice(t.index + t.text.length, src.indexOf("</button>", t.index));
      const iconOnly = /^\s*<[A-Z]\w*[^>]*\/>\s*$/.test(inner);
      if (iconOnly && !/aria-label|title=/.test(t.text)) push("icon-button-label", "ERROR", t.index, t.text.split("\n")[0], "Icon-only button without aria-label", 'aria-label="Edit task" (name the action and the record)');
    }
    for (const tagName of ["div", "span", "li", "tr", "td"]) {
      for (const t of tags(src, tagName)) {
        if (/\bonClick\s*=/.test(t.text) && !/\brole\s*=|\btabIndex\s*=|onClick=\{\s*\(?e?\)?\s*=>\s*e\.stopPropagation\(\)\s*\}/.test(t.text) && tagName !== "tr")
          push("clickable-div", "WARN", t.index, t.text.split("\n")[0], `Clickable <${tagName}> (not keyboard accessible)`, "Use <button type=\"button\"> or <Link>; rows may be clickable if they also have a link/button inside");
      }
    }
    for (const t of tags(src, "img")) {
      if (!/\balt\s*=/.test(t.text)) push("img-alt", "WARN", t.index, t.text.split("\n")[0], "<img> without alt", 'alt="" for decorative images, a description otherwise');
    }
  }
  return found;
}

// ---------- run ----------
let files = [];
if (val("--files") !== undefined) {
  const i = args.indexOf("--files");
  files = args.slice(i + 1).filter((a) => !a.startsWith("--")).map((f) => path.resolve(f));
} else {
  for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);
}
const onlyModule = val("--module");
const results = [];
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  const [mid] = moduleOf(rel);
  if (onlyModule && mid !== onlyModule) continue;
  for (const r of auditFile(f)) results.push({ ...r, module: mid });
}

const byModule = new Map(MODULES.map(([id, label]) => [id, { id, label, files: new Set(), errors: 0, warns: 0 }]));
for (const r of results) {
  const m = byModule.get(r.module);
  m.files.add(r.file);
  r.severity === "ERROR" ? m.errors++ : m.warns++;
}
const byRule = {};
for (const r of results) {
  byRule[r.rule] ??= { rule: r.rule, severity: r.severity, count: 0, message: r.message, fix: r.fix };
  byRule[r.rule].count++;
}
const byFile = {};
for (const r of results) {
  byFile[r.file] ??= { file: r.file, module: r.module, errors: 0, warns: 0 };
  r.severity === "ERROR" ? byFile[r.file].errors++ : byFile[r.file].warns++;
}
const totalE = results.filter((r) => r.severity === "ERROR").length;
const totalW = results.length - totalE;

let md = `# UI audit report\n\nScanned ${files.length} files${onlyModule ? ` (module: ${onlyModule})` : ""}. **${totalE} errors**, ${totalW} warnings.\n\nA module is *clean* when it has 0 errors and every remaining warning has been reviewed.\n\n## By module\n\n| Module | Files with issues | Errors | Warnings | Clean? |\n|---|---:|---:|---:|---|\n`;
for (const m of byModule.values()) {
  if (onlyModule && m.id !== onlyModule) continue;
  md += `| ${m.label} (\`${m.id}\`) | ${m.files.size} | ${m.errors} | ${m.warns} | ${m.errors === 0 ? "✅" : "❌"} |\n`;
}
md += `\n## By rule\n\n| Rule | Severity | Count | What | Fix |\n|---|---|---:|---|---|\n`;
for (const r of Object.values(byRule).sort((a, b) => b.count - a.count)) md += `| \`${r.rule}\` | ${r.severity} | ${r.count} | ${r.message} | ${r.fix} |\n`;
md += `\n## Worst 40 files\n\n| File | Module | Errors | Warnings |\n|---|---|---:|---:|\n`;
for (const f of Object.values(byFile).sort((a, b) => b.errors - a.errors || b.warns - a.warns).slice(0, 40)) md += `| \`${f.file}\` | ${f.module} | ${f.errors} | ${f.warns} |\n`;
md += `\n## All findings\n\n`;
for (const [file, list] of Object.entries(results.reduce((a, r) => ((a[r.file] ??= []).push(r), a), {}))) {
  md += `### \`${file}\`\n\n`;
  for (const r of list) md += `- L${r.line} **${r.severity}** \`${r.rule}\`: \`${r.snippet.replace(/`/g, "'").replace(/\|/g, "\\|")}\` → ${r.fix}\n`;
  md += "\n";
}

const outBase = val("--out") ?? "ui-audit-report";
fs.writeFileSync(`${outBase}.md`, md);
fs.writeFileSync(`${outBase}.json`, JSON.stringify({ files: files.length, errors: totalE, warnings: totalW, modules: [...byModule.values()].map((m) => ({ ...m, files: m.files.size })), rules: byRule, findings: results }, null, 2));

console.log(`ui-audit: ${files.length} files, ${totalE} errors, ${totalW} warnings → ${outBase}.md`);
for (const m of byModule.values()) if (!onlyModule || m.id === onlyModule) console.log(`  ${m.errors === 0 ? "✓" : "✗"} ${m.label.padEnd(58)} ${String(m.errors).padStart(5)} err ${String(m.warns).padStart(5)} warn`);
if (flag("--fail") && totalE > 0) process.exit(1);
