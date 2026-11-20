/**
 * Meet query contract check (read-only).
 * Extracts every literal `.from("table")...select(...)` in Chandak Meet code and runs it with limit 0
 * against the database in .env.local, so broken joins (e.g. ambiguous user_master embeds) fail here
 * instead of silently returning empty lists in production.
 *
 *   npx tsx scripts/meet-query-check.ts            (exit 1 on any failing query)
 */
import { config } from "dotenv";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });

const ROOTS = ["lib/actions/meet", "app/meet", "components/meet", "workers/meet_jobs.ts", "lib/permissions/meet.ts", "lib/utils/meet-scope.ts"];

function files(p: string): string[] {
  if (statSync(p).isFile()) return [p];
  return readdirSync(p).flatMap((f) => files(join(p, f)));
}

interface Query {
  file: string;
  line: number;
  table: string;
  select: string;
}

function extract(file: string): Query[] {
  const src = readFileSync(file, "utf-8");
  const out: Query[] = [];
  const re = /\.from\(\s*["'`](\w+)["'`]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // The select must belong to the same chain: stop at the next .from( or statement end.
    const rest = src.slice(m.index + m[0].length);
    const nextFrom = rest.search(/\.from\(/);
    const chain = nextFrom === -1 ? rest : rest.slice(0, nextFrom);
    const sel = /^[\s\S]*?\.select\(\s*(["'`])([\s\S]*?)\1/.exec(chain);
    if (!sel) continue;
    const before = chain.slice(0, sel.index + sel[0].length);
    if (/;\s*\n/.test(before.slice(0, before.lastIndexOf(".select(")))) continue; // select is in a later statement
    if (sel[1] === "`" && sel[2].includes("${")) continue; // dynamic select
    out.push({
      file,
      line: src.slice(0, m.index).split("\n").length,
      table: m[1],
      select: sel[2].replace(/\s+/g, " ").trim(),
    });
  }
  return out;
}

(async () => {
  const { supabaseAdmin } = await import("../lib/supabase/service_role");
  const queries = ROOTS.flatMap(files)
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .flatMap(extract);

  let failed = 0;
  for (const q of queries) {
    const { error } = await supabaseAdmin.from(q.table).select(q.select).limit(0);
    if (error) {
      failed++;
      console.log(`FAIL ${q.file}:${q.line}  [${q.table}]  ${error.message}`);
    }
  }
  console.log(`\n${queries.length - failed}/${queries.length} Meet queries OK`);
  process.exit(failed > 0 ? 1 : 0);
})();
