import { test, expect, type Browser, type Page } from "@playwright/test";
import { parseCredential, type UserCredential } from "./fixtures";

/**
 * Chandak Meet end-to-end flow, organiser + attendee:
 *   schedule (with attendee invited) -> attendee sees invite and accepts -> organiser sees the reply
 *   -> attendee joins (gets "You're attending", no End button, My brief) -> organiser runs and ends
 *   -> minutes page opens -> invite report lists the reply -> test meeting is deleted (soft).
 *
 * Creates ZZ-TEST-SANDBOX data only and deletes it at the end.
 * Needs E2E_MEET_ORGANIZER and E2E_MEET_ATTENDEE (email:password); skipped otherwise.
 *
 *   npx playwright test --config=tests/e2e/playwright.config.ts meet-flow
 */

const ORG = parseCredential(process.env.E2E_MEET_ORGANIZER, "MANAGER");
const ATT = parseCredential(process.env.E2E_MEET_ATTENDEE, "MEMBER");

async function signIn(browser: Browser, cred: UserCredential): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(cred.email);
  await page.getByLabel(/password/i).fill(cred.pass);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  return page;
}

test.describe("Chandak Meet full flow", () => {
  test.skip(!ORG || !ATT, "E2E_MEET_ORGANIZER / E2E_MEET_ATTENDEE not set");
  test.setTimeout(240_000);

  test("schedule -> accept -> join -> end -> minutes -> report -> delete", async ({ browser }) => {
    const title = `ZZ-TEST-SANDBOX e2e ${Date.now()}`;
    const org = await signIn(browser, ORG!);
    const att = await signIn(browser, ATT!);

    // 1. Organiser schedules a meeting 10 minutes from now and invites the attendee
    await org.goto("/meet/meetings/new");
    await org.getByPlaceholder("e.g. Weekly sales review").fill(title);
    const start = new Date(Date.now() + 10 * 60000);
    const hh = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(start);
    await org.getByLabel(/^start$/i).fill(hh);
    const search = org.getByPlaceholder(/search people|add people|name or email/i).first();
    await search.fill(ATT!.email.split("@")[0]);
    await org.getByRole("option").first().click();
    await org.getByRole("button", { name: "Schedule and send invites" }).click();
    await org.waitForURL(/\/meet\/meetings\/[0-9a-f-]{36}$/);
    const meetingUrl = org.url();
    const joinHref = await org.getByRole("link", { name: /^join$/i }).first().getAttribute("href");
    expect(joinHref).toMatch(/\/meet\/join\//);
    const sessionId = joinHref!.split("/").pop()!;

    // 2. Attendee sees the invite and accepts on the join page
    await att.goto(`/meet/join/${sessionId}`);
    await expect(att.getByText("Please reply to the invite")).toBeVisible();
    await att.getByRole("button", { name: /accept|attending/i }).first().click();
    await expect(att.getByText("You've accepted this meeting")).toBeVisible({ timeout: 15_000 });

    // 3. Organiser sees the reply before the meeting
    await org.goto(meetingUrl);
    await expect(org.getByText(/1 attending/)).toBeVisible();

    // 4. Attendee joins: attendee view, no running controls, brief available
    await att.goto(`/meet/join/${sessionId}`);
    await att.getByRole("button", { name: /join here only/i }).click();
    await att.waitForURL(/\/meet\/live\//);
    await expect(att.getByText("You're attending")).toBeVisible();
    await expect(att.getByRole("button", { name: "End meeting" })).toHaveCount(0);
    await expect(att.getByText("Your brief for this meeting")).toBeVisible();

    // 5. Organiser runs the meeting: sees the run controls and the attendee's reply
    await org.goto(`/meet/live/${sessionId}`);
    await expect(org.getByText("You run this meeting")).toBeVisible();
    await org.getByRole("textbox").first().fill("ZZ-TEST-SANDBOX e2e point");
    await org.getByRole("button", { name: "Capture" }).click();
    await expect(org.getByText("ZZ-TEST-SANDBOX e2e point")).toBeVisible();

    // 6. End the meeting (accepting the checks) -> minutes page
    await org.getByRole("button", { name: "End meeting" }).click();
    const dialog = org.getByRole("dialog");
    await dialog.getByLabel(/want to end the meeting anyway/i).check().catch(() => undefined);
    await dialog.getByRole("button", { name: "End meeting" }).click();
    await org.waitForURL(/\/review$/, { timeout: 60_000 });
    await expect(org.getByText(/Minutes of meeting/i)).toBeVisible();

    // 7. Invite report has the attendee's reply
    await org.goto("/meet/reports");
    await org.getByRole("button", { name: /R7/ }).click();
    await expect(org.getByText(title).first()).toBeVisible();

    // 8. Clean up: delete the test meeting (soft delete) with a reason
    await org.goto(`${meetingUrl}/delete`);
    await org.locator("main textarea").first().fill("ZZ-TEST-SANDBOX e2e cleanup");
    await org.getByRole("button", { name: "Remove everything in order" }).click();
    await org.getByRole("button", { name: /Yes, remove all/ }).click();
    await org.waitForURL(/\/meet\/meetings$/, { timeout: 60_000 });
  });
});
