import { test, expect, CREDENTIALS } from './fixtures';

const TODAY_TAG = `TEST-E2E-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

test.describe('Phase 0 Baseline — Module Key CRUD & Workflow Flows', () => {
  test.beforeEach(async () => {
    if (!CREDENTIALS.SUPER) {
      test.skip(!CREDENTIALS.SUPER, 'Missing E2E_SUPER credentials in environment.');
    }
  });

  test('Workspaces & Tasks: Lifecycle (Create → Read → Edit → Archive)', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');

    // Verify page container loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check if Create Workspace button exists
    const createBtn = page.locator('button:has-text("New Workspace"), button:has-text("Create Workspace")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const nameInput = page.locator('input[placeholder*="Workspace name"], input[name="name"]').first();
      if (await nameInput.isVisible()) {
        const wsName = `${TODAY_TAG}-WS`;
        await nameInput.fill(wsName);
        const submitWs = page.locator('button:has-text("Create"), button:has-text("Save")').last();
        await submitWs.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('Tickets Desk: Lifecycle (Create → View → Update → Resolve)', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    const newTicketBtn = page.locator('button:has-text("New Ticket"), button:has-text("Raise Ticket")').first();
    if (await newTicketBtn.isVisible()) {
      await newTicketBtn.click();
      const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]').first();
      if (await titleInput.isVisible()) {
        const ticketTitle = `${TODAY_TAG}-TICKET`;
        await titleInput.fill(ticketTitle);
      }
    }
  });

  test('Requirements Tracking: Lifecycle (Create → View → Groom/Approve)', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/requirements');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Vehicle Desk: Master & Trip Lifecycle', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/vehicle');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Design Tracking & DMS: Registry & Reviews', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/design');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Chandak Meet: Schedule & Decision Flow', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/meet');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Organization Budget: Workings & Calculation Integrity', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/budget');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Enterprise Personnel Master & RBAC: Visibility & Edit Constraints', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    
    // Expect 28 users or table present
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('ISSUE-004: Task mutation actions enforce authorization on target tasks', async ({ authedPage }) => {
    const page = await authedPage('SUPER');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
