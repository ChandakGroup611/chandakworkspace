import { supabaseAdmin } from "../lib/supabase/service_role";

export async function runMorningHttpErrorsCheck() {
  console.log("==================================================================");
  console.log("           08:30 MORNING APP HTTP ERRORS REPORT (E1/E6)           ");
  console.log("==================================================================");

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  // 1. Fetch errors from last 24 hours
  const { data: todayErrors, error: todayErr } = await supabaseAdmin
    .from("app_http_errors")
    .select("status, method, path, module, source, error_message, created_at")
    .gte("created_at", oneDayAgo);

  if (todayErr) {
    console.error("Failed to query app_http_errors for today:", todayErr.message);
    return;
  }

  // 2. Fetch errors from previous day (24-48h ago) for delta comparison
  const { data: yesterdayErrors, error: yestErr } = await supabaseAdmin
    .from("app_http_errors")
    .select("status")
    .gte("created_at", twoDaysAgo)
    .lt("created_at", oneDayAgo);

  const todayList = todayErrors || [];
  const yesterdayList = yesterdayErrors || [];

  // Group by status
  const todayCounts: Record<number, number> = {};
  todayList.forEach((e) => {
    todayCounts[e.status] = (todayCounts[e.status] || 0) + 1;
  });

  const yesterdayCounts: Record<number, number> = {};
  yesterdayList.forEach((e) => {
    yesterdayCounts[e.status] = (yesterdayCounts[e.status] || 0) + 1;
  });

  const allStatuses = Array.from(new Set([...Object.keys(todayCounts), ...Object.keys(yesterdayCounts)])).map(Number).sort();

  console.log("\n📊 24-HOUR HTTP ERROR COMPARISON (Today vs Previous Day):");
  console.log("------------------------------------------------------------------");
  console.log("| Status Code | Description            | Today (24h) | Yesterday | Trend    |");
  console.log("|:-----------:|:-----------------------|:-----------:|:---------:|:--------:|");

  const statusDesc: Record<number, string> = {
    0: "Client Network Drop / Abort",
    400: "Bad Request",
    401: "Unauthorized / Expired",
    403: "Forbidden / Access Denied",
    404: "Not Found / Dead Link",
    405: "Method Not Allowed",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable"
  };

  for (const status of allStatuses) {
    const today = todayCounts[status] || 0;
    const yest = yesterdayCounts[status] || 0;
    const desc = statusDesc[status] || "HTTP Status";
    let trend = "→ Flat";
    if (today < yest) trend = `📉 Down (-${yest - today})`;
    else if (today > yest) trend = `📈 Up (+${today - yest})`;

    console.log(`| ${String(status).padEnd(11)} | ${desc.padEnd(22)} | ${String(today).padEnd(11)} | ${String(yest).padEnd(9)} | ${trend.padEnd(8)} |`);
  }

  console.log("------------------------------------------------------------------");
  console.log(`Total Errors (Last 24h): ${todayList.length} | Previous Day: ${yesterdayList.length}`);

  // 3. Top 20 Error Paths & Groups
  console.log("\n🔝 TOP 20 FREQUENT HTTP ERRORS (Last 24 Hours):");
  const grouped: Record<string, { status: number; method: string; path: string; module: string; count: number; sampleMsg: string }> = {};

  todayList.forEach((e) => {
    const key = `${e.status}:${e.method}:${e.path}`;
    if (!grouped[key]) {
      grouped[key] = {
        status: e.status,
        method: e.method,
        path: e.path,
        module: e.module || "SYSTEM",
        count: 0,
        sampleMsg: e.error_message || ""
      };
    }
    grouped[key].count++;
  });

  const sortedGroups = Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 20);

  if (sortedGroups.length === 0) {
    console.log("🎉 Zero HTTP errors recorded in the last 24 hours!");
  } else {
    console.table(
      sortedGroups.map((g) => ({
        Status: g.status,
        Method: g.method,
        Path: g.path,
        Module: g.module,
        Occurrences: g.count,
        Message: g.sampleMsg.slice(0, 50)
      }))
    );
  }

  console.log("\n==================================================================\n");
}

if (require.main === module || process.argv[1]?.endsWith("morning-error-check.ts")) {
  runMorningHttpErrorsCheck().catch(console.error);
}
