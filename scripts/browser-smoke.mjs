// Post-deploy browser smoke check (read-only, no sign-in).
//
// The server-side checks only ask whether pages respond. On 26 Nov 2026 every page
// responded 200 but crashed in the browser ("Chandak Workspace didn't load") because
// server-only code was bundled into the root layout. This opens real pages in a
// headless browser and fails only if the app's error screen appears or the server
// errors (5xx / no response). Other browser errors are logged as warnings, so ordinary
// console noise can never trigger a rollback. Usage: BASE_URL=https://chandakgroup.tech node scripts/browser-smoke.mjs
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "https://chandakgroup.tech").replace(/\/$/, "");
// Public pages that still load the root layout and its shared chunks.
const PATHS = ["/login", "/no-access"];
const CRASH_TEXT = /didn't load|Application error|Unhandled Runtime Error/i;

const browser = await chromium.launch();
const failures = [];
try {
  for (const path of PATHS) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err && err.message ? err.message : err)));
    let status = 0;
    try {
      const res = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
      status = res ? res.status() : 0;
      await page.waitForTimeout(2500);
    } catch (err) {
      errors.push("navigation: " + String(err && err.message ? err.message : err));
    }
    const text = await page.locator("body").innerText().catch(() => "");
    const crashed = CRASH_TEXT.test(text);
    const ok = status > 0 && status < 500 && !crashed;
    console.log(`${ok ? "OK  " : "FAIL"} ${path} · HTTP ${status}${crashed ? " · error screen shown" : ""}`);
    if (errors.length) console.log(`     warnings: ${errors.slice(0, 3).join(" | ")}`);
    if (!ok) failures.push(path);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Browser smoke check failed on: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("Browser smoke check passed.");
