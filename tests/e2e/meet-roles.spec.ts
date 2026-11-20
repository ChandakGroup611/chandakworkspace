import { test, expect, type Page, type Browser } from "@playwright/test";
import { parseCredential, type UserCredential } from "./fixtures";

/**
 * Chandak Meet role tests (read-only: they only open pages, never create data).
 *
 * Credentials (email:password), seeded by scripts/seed-test-users.ts:
 *   E2E_MEET_ORGANIZER  test.meet.organizer@chandakgroup.tech (ROLE_MANAGER, Meet module)
 *   E2E_MEET_ATTENDEE   test.meet.attendee@chandakgroup.tech  (ROLE_AGENT, Meet module)
 *   E2E_MEET_NOACCESS   test.meet.noaccess@chandakgroup.tech  (no Meet module)
 * Tests for a role are skipped when its variable is not set.
 *
 *   npx playwright test --config=tests/e2e/playwright.config.ts meet-roles
 */

const MEET = {
  ORGANIZER: parseCredential(process.env.E2E_MEET_ORGANIZER, "MANAGER"),
  ATTENDEE: parseCredential(process.env.E2E_MEET_ATTENDEE, "MEMBER"),
  NOACCESS: parseCredential(process.env.E2E_MEET_NOACCESS, "VIEWER"),
};

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const MEMBER_PAGES = ["/meet", "/meet/meetings", "/meet/my-work", "/meet/notes", "/meet/decisions", "/meet/calendar"];
const ORGANIZER_PAGES = [...MEMBER_PAGES, "/meet/reports", "/meet/meetings/new"];

async function signIn(browser: Browser, cred: UserCredential | null, viewport = VIEWPORTS[2]): Promise<Page> {
  test.skip(!cred, "Meet test credentials not set (E2E_MEET_*)");
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"], input#email').fill(cred!.email);
  await page.locator('input[type="password"], input[name="password"], input#password').fill(cred!.pass);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
  return page;
}

/** Page rendered without the error boundary and without sideways page scroll. */
async function expectHealthy(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: "networkidle" });
  expect(res?.status(), `${path} HTTP status`).toBeLessThan(500);
  await expect(page.getByText("This page didn't load"), `${path} hit the error boundary`).toHaveCount(0);
  await expect(page.getByText("Chandak Workspace didn't load"), `${path} hit the global error page`).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);
}

test.describe("Meet: unauthenticated", () => {
  test("Meet pages redirect to login", async ({ page }) => {
    await page.goto("/meet/my-work");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Meet jobs cron rejects missing or wrong secret", async ({ request }) => {
    expect((await request.get("/api/cron/meet-jobs")).status()).toBe(401);
    const wrong = await request.get("/api/cron/meet-jobs", { headers: { authorization: "Bearer not-the-secret" } });
    expect(wrong.status()).toBe(401);
  });

  test("Meet jobs cron rejects unsupported methods", async ({ request }) => {
    expect((await request.delete("/api/cron/meet-jobs")).status()).toBe(405);
  });
});

test.describe("Meet: user without the Meet module", () => {
  test("is sent away from /meet", async ({ browser }) => {
    const page = await signIn(browser, MEET.NOACCESS);
    await page.goto("/meet");
    await expect(page).not.toHaveURL(/\/meet(\/|$)/);
  });
});

test.describe("Meet: attendee", () => {
  for (const vp of VIEWPORTS) {
    test(`member pages load at ${vp.name} size`, async ({ browser }) => {
      const page = await signIn(browser, MEET.ATTENDEE, vp);
      for (const path of MEMBER_PAGES) await expectHealthy(page, path);
    });
  }

  test("cannot open Meet administration", async ({ browser }) => {
    const page = await signIn(browser, MEET.ATTENDEE);
    await page.goto("/meet/admin");
    await expect(page.getByText("Meet Administration Restricted")).toBeVisible();
  });
});

test.describe("Meet: organizer", () => {
  for (const vp of VIEWPORTS) {
    test(`organizer pages load at ${vp.name} size`, async ({ browser }) => {
      const page = await signIn(browser, MEET.ORGANIZER, vp);
      for (const path of ORGANIZER_PAGES) await expectHealthy(page, path);
    });
  }

  test("meeting detail and session pages open from the list", async ({ browser }) => {
    const page = await signIn(browser, MEET.ORGANIZER);
    await page.goto("/meet/meetings", { waitUntil: "networkidle" });
    const first = page.locator('a[href^="/meet/meetings/"]:not([href$="/new"])').first();
    test.skip((await first.count()) === 0, "Organizer has no meetings yet");
    const href = (await first.getAttribute("href"))!;
    await expectHealthy(page, href);
    const session = page.locator('a[href^="/meet/sessions/"]').first();
    if ((await session.count()) > 0) await expectHealthy(page, (await session.getAttribute("href"))!);
  });
});
