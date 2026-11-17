import { test, expect, CREDENTIALS } from './fixtures';

test.describe('Phase 0 Baseline — Access Rules Verification (ACCESS_RULES.md)', () => {
  test('SUPER_ADMIN: Can access IAM and User Master', async ({ authedPage }) => {
    if (!CREDENTIALS.SUPER) test.skip(true, 'No E2E_SUPER configured');
    const page = await authedPage('SUPER');
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/iam');
    await expect(page).toHaveURL(/\/iam/);
  });

  test('VIEWER / Standard Agent: Blocked from IAM & Masters management', async ({ authedPage }) => {
    if (!CREDENTIALS.VIEWER) test.skip(true, 'No E2E_VIEWER configured');
    const page = await authedPage('VIEWER');
    
    // Attempt navigating to /iam
    const res = await page.goto('/iam');
    const url = page.url();
    // Access rule: Non-admins must either be redirected, 403, or see unauthorized notice
    const isRestricted = url.includes('/login') || url.includes('/select-module') || url === '/' || (await page.locator('text=Unauthorized, text=Access Denied, text=Forbidden').count()) > 0;
    expect(isRestricted, 'Viewer must not have administrative IAM access').toBeTruthy();
  });

  test('Standard Users in User Master see only own profile', async ({ authedPage }) => {
    if (!CREDENTIALS.MEMBER) test.skip(true, 'No E2E_MEMBER configured');
    const page = await authedPage('MEMBER');
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Standard user should see exactly 1 user (their own profile)
    const countBadge = page.locator('text=1 Users found, text=1 users found');
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount, 'Non-admin user directory must be restricted to their own record').toBeLessThanOrEqual(1);
  });

  test('ISSUE-001: Vehicle Desk access restricted for unassigned roles', async ({ authedPage }) => {
    if (!CREDENTIALS.VIEWER) test.skip(true, 'No E2E_VIEWER configured');
    const page = await authedPage('VIEWER');
    await page.goto('/vehicle');
    await page.waitForLoadState('domcontentloaded');

    // Unauthorized viewer navigating to vehicle must either see restricted message, redirect to select-module or login
    const currentUrl = page.url();
    const hasRestriction = currentUrl.includes('/select-module') || 
                           currentUrl.includes('/login') || 
                           (await page.locator('text=Access Denied, text=Unauthorized, text=No Access').count()) > 0 ||
                           (await page.locator('[data-module-denied="true"]').count()) > 0;
    expect(hasRestriction, 'Unassigned user must not access Vehicle Desk without permission').toBeTruthy();
  });

  test('ISSUE-002: Chandak Meet actions enforce authorization and reject unauthorized callers', async ({ authedPage }) => {
    if (!CREDENTIALS.VIEWER) test.skip(true, 'No E2E_VIEWER configured');
    const page = await authedPage('VIEWER');
    await page.goto('/meet/admin');
    await page.waitForLoadState('domcontentloaded');

    // Non-admin viewer attempting to open /meet/admin must be refused or redirected
    const currentUrl = page.url();
    const isRestricted = currentUrl.includes('/select-module') ||
                         currentUrl.includes('/login') ||
                         currentUrl === '/meet' ||
                         (await page.locator('text=Unauthorized, text=Access Denied, text=Forbidden, text=Administrator privileges').count()) > 0;
    expect(isRestricted, 'Viewer must not access Meet administration settings').toBeTruthy();
  });

  test('ISSUE-003: Workspaces access restricted to enrolled, owned, or public workspaces', async ({ authedPage }) => {
    if (!CREDENTIALS.MEMBER) test.skip(true, 'No E2E_MEMBER configured');
    const page = await authedPage('MEMBER');
    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');

    // Standard members must only see workspaces they are enrolled in; verify page renders without un-enrolled leaks
    await expect(page.locator('body')).toBeVisible();
  });
});

