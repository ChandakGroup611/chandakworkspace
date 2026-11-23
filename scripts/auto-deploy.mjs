#!/usr/bin/env node
/**
 * Chandak Workspace - auto-deploy helper
 * ---------------------------------------
 * Watches  .deploy-queue/  for request files written by Claude, and for each one:
 *   1. checks it (only listed files, no secrets, nothing else staged, on branch develop)
 *   2. runs  npx tsc --noEmit   -> stops if there are type errors
 *   3. git add <only the listed files>, git commit -m "<message>"
 *   4. git push origin develop
 *   5. git checkout main, git pull --ff-only, git merge develop, git push origin main, git checkout develop
 *      (pushing main triggers the existing GitHub Actions deploy to Hostinger)
 *   6. waits for production /api/version to show the new commit (up to 15 min)
 * and writes  .deploy-queue/result-<id>.json  so Claude can read what happened.
 *
 * Start it once in a VS Code terminal and leave it running:
 *     node scripts/auto-deploy.mjs
 * Stop it with Ctrl+C. It never force-pushes, never uses "git add .", and never touches .env files.
 *
 * Request file format (.deploy-queue/request-<id>.json):
 *   { "id": "meet-stage-2", "message": "commit message", "files": ["app/meet/page.tsx", ...] }
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const QUEUE = path.join(ROOT, ".deploy-queue");
const DONE = path.join(QUEUE, "done");
const LOG = path.join(QUEUE, "log.txt");
const PROD_VERSION_URL = "https://chandakgroup.tech/api/version";
const POLL_MS = 10_000;

fs.mkdirSync(DONE, { recursive: true });

// Keep the queue folder out of git without editing .gitignore
try {
  const exclude = path.join(ROOT, ".git", "info", "exclude");
  const cur = fs.existsSync(exclude) ? fs.readFileSync(exclude, "utf8") : "";
  if (!cur.includes(".deploy-queue/")) fs.appendFileSync(exclude, `${cur.endsWith("\n") || !cur ? "" : "\n"}.deploy-queue/\n`);
} catch {}

function log(msg) {
  const line = `[${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + "\n"); } catch {}
}

// useShell is only for npx (a .cmd file on Windows). git runs WITHOUT a shell so arguments with
// spaces, colons or brackets (commit messages, "app/[id]/page.tsx") are passed exactly as written.
function run(cmd, args, timeoutMs = 120_000, useShell = false) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: useShell && process.platform === "win32", timeout: timeoutMs, maxBuffer: 50 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  return { ok: r.status === 0, code: r.status, out };
}

function git(...args) { return run("git", args); }

function writeResult(id, data) {
  const file = path.join(QUEUE, `result-${id}.json`);
  fs.writeFileSync(file, JSON.stringify({ id, finishedAt: new Date().toISOString(), ...data }, null, 2));
  log(`Result for ${id}: ${data.status}${data.commit ? ` (${data.commit})` : ""}`);
}

const FORBIDDEN = [/(^|\/)\.env/i, /secret/i, /credential/i, /\.pem$/i, /\.key$/i, /(^|\/)node_modules\//, /(^|\/)\.next\//, /^\.deploy-queue\//];

function validate(req) {
  if (!req || typeof req !== "object") return "Request is not valid JSON.";
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(String(req.id || ""))) return "Request id is missing or has odd characters.";
  if (!req.message || String(req.message).length > 500) return "Commit message is missing or too long.";
  if (!Array.isArray(req.files) || req.files.length === 0 || req.files.length > 200) return "File list is empty or too long.";
  for (const f of req.files) {
    const rel = String(f).replace(/\\/g, "/");
    if (path.isAbsolute(rel) || rel.includes("..")) return `File path not allowed: ${f}`;
    if (FORBIDDEN.some((re) => re.test(rel))) return `File not allowed to be committed automatically: ${f}`;
    const exists = fs.existsSync(path.join(ROOT, rel));
    const tracked = git("ls-files", "--error-unmatch", "--", rel).ok;
    if (!exists && !tracked) return `File not found: ${f}`;
  }
  return null;
}

async function waitForProduction(shortHash) {
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${PROD_VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
      const text = await res.text();
      if (text.includes(shortHash)) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 30_000));
  }
  return false;
}

async function handle(file) {
  const raw = fs.readFileSync(file, "utf8");
  let req;
  try { req = JSON.parse(raw); } catch { req = null; }
  const id = req?.id && /^[A-Za-z0-9._-]{1,80}$/.test(req.id) ? req.id : path.basename(file, ".json").replace(/^request-/, "");
  log(`Picked up request ${id}`);

  const bad = validate(req);
  if (bad) return writeResult(id, { status: "rejected", reason: bad });

  const branch = git("rev-parse", "--abbrev-ref", "HEAD").out;
  if (branch !== "develop") return writeResult(id, { status: "rejected", reason: `Current branch is "${branch}", expected "develop". Nothing was changed.` });

  // Anything already staged must be one of this request's files (e.g. left over from an earlier failed
  // attempt). Someone else's staged work is never committed.
  const listed = new Set(req.files.map((f) => String(f).replace(/\\/g, "/")));
  const staged = git("diff", "--cached", "--name-only").out.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const foreign = staged.filter((f) => !listed.has(f));
  if (foreign.length) {
    return writeResult(id, { status: "rejected", reason: `Other changes are already staged: ${foreign.slice(0, 10).join(", ")}. Commit or unstage them first. Nothing was changed.` });
  }

  log("Type check: npx tsc --noEmit (can take a few minutes)...");
  const tsc = run("npx", ["tsc", "--noEmit"], 15 * 60_000, true);
  if (!tsc.ok) return writeResult(id, { status: "tsc_failed", output: tsc.out.slice(-12000) });

  const files = req.files.map((f) => String(f).replace(/\\/g, "/"));
  const add = git("add", "--", ...files);
  if (!add.ok) return writeResult(id, { status: "git_failed", step: "add", output: add.out });

  if (git("diff", "--cached", "--quiet").ok) return writeResult(id, { status: "no_changes", reason: "The listed files have no changes to commit." });

  const commit = git("commit", "-m", String(req.message));
  if (!commit.ok) return writeResult(id, { status: "git_failed", step: "commit", output: commit.out });
  const hash = git("rev-parse", "HEAD").out;
  const short = hash.slice(0, 8);

  const pushDev = git("push", "origin", "develop");
  if (!pushDev.ok) return writeResult(id, { status: "git_failed", step: "push develop", commit: short, output: pushDev.out });

  if (req.deploy === false) return writeResult(id, { status: "pushed_develop_only", commit: short });

  // Release: main <- develop (fast, safe; abort on any conflict)
  const co = git("checkout", "main");
  if (!co.ok) return writeResult(id, { status: "git_failed", step: "checkout main", commit: short, output: co.out });
  let failed = null;
  const pull = git("pull", "--ff-only", "origin", "main");
  if (!pull.ok) failed = { step: "pull main", output: pull.out };
  if (!failed) {
    const merge = git("merge", "--no-edit", "develop");
    if (!merge.ok) { git("merge", "--abort"); failed = { step: "merge develop into main", output: merge.out }; }
  }
  if (!failed) {
    const pushMain = git("push", "origin", "main");
    if (!pushMain.ok) failed = { step: "push main", output: pushMain.out };
  }
  const back = git("checkout", "develop");
  if (failed) return writeResult(id, { status: "git_failed", commit: short, ...failed, backOnDevelop: back.ok });
  if (!back.ok) log("WARNING: could not switch back to develop: " + back.out);

  writeResult(id, { status: "pushed_waiting_for_deploy", commit: short });
  // Watch production in the background so the next request isn't held up.
  watchers++;
  waitForProduction(short)
    .then((live) =>
      writeResult(id, { status: live ? "deployed" : "pushed_deploy_not_confirmed", commit: short,
        note: live ? "Production /api/version shows this commit." : "Pushed to main, but production did not show this commit within 15 minutes. Check GitHub Actions." })
    )
    .finally(() => { watchers--; });
}

const SELF = fileURLToPath(import.meta.url);
// Compare CONTENT, not modified time: git checkout touches the file without changing it.
const selfHash = () => { try { return createHash("sha1").update(fs.readFileSync(SELF)).digest("hex"); } catch { return ""; } };
const startHash = selfHash();
let watchers = 0; // production checks still running in the background

let busy = false;
async function tick() {
  if (busy) return;
  // Claude updated this helper: hand over to the new version (the supervisor restarts it).
  try {
    if (process.env.AUTO_DEPLOY_CHILD === "1" && watchers === 0 && selfHash() !== startHash) {
      log("Helper was updated, restarting with the new version...");
      process.exit(75);
    }
  } catch {}
  busy = true;
  try {
    const pending = fs.readdirSync(QUEUE).filter((f) => /^request-.*\.json$/.test(f)).sort();
    for (const f of pending) {
      // Claim the request first (move it to done/) so it can never run twice, even after a crash.
      const full = path.join(DONE, f);
      try { fs.renameSync(path.join(QUEUE, f), full); } catch { continue; }
      try { await handle(full); }
      catch (e) { log(`Error handling ${f}: ${e?.message || e}`); writeResult(path.basename(f, ".json").replace(/^request-/, ""), { status: "error", reason: String(e?.message || e) }); }
    }
  } finally {
    busy = false;
  }
}

if (process.env.AUTO_DEPLOY_CHILD !== "1") {
  // Supervisor: runs the helper as a child and restarts it when it updates itself (exit code 75).
  const { spawn } = await import("node:child_process");
  const start = () => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, AUTO_DEPLOY_CHILD: "1" },
    });
    child.on("exit", (code) => {
      if (code === 75) return start();
      process.exit(code ?? 0);
    });
  };
  start();
} else {
  log(`Auto-deploy helper started in ${ROOT}. Watching .deploy-queue/ every ${POLL_MS / 1000}s. Press Ctrl+C to stop.`);
  tick();
  setInterval(tick, POLL_MS);
}
