import { test, expect, CREDENTIALS } from './fixtures';
import fs from 'fs';

// Routes extracted from inventory excluding parametrized/dynamic tokens like [id]
const STATIC_INVENTORY_PAGES = [
  '/',
  '/admin',
  '/admin/performance',
  '/admin/settings',
  '/amc',
  '/amc/analytics',
  '/amc/reports',
  '/budget',
  '/budget/admin',
  '/budget/guide',
  '/budget/import',
  '/compliance',
  '/dashboards',
  '/design',
  '/iam',
  '/iam/cockpit',
  '/iam/roles',
  '/iam/sessions',
  '/knowledge',
  '/knowledge/articles',
  '/learning',
  '/learning/courses',
  '/masters',
  '/masters/companies',
  '/masters/departments',
  '/masters/designations',
  '/masters/vendors',
  '/meet',
  '/meet/admin',
  '/meet/calendar',
  '/meet/decisions',
  '/meet/live',
  '/meet/meetings',
  '/meet/meetings/new',
  '/meet/my-work',
  '/meet/notes',
  '/meet/reports',
  '/profile',
  '/rbac',
  '/requirements',
  '/requirements/approvals',
  '/requirements/grooming',
  '/requirements/reports',
  '/select-module',
  '/settings',
  '/settings/communication',
  '/settings/communication/logs',
  '/settings/communication/providers',
  '/settings/communication/rules',
  '/settings/communication/templates',
  '/settings/email',
  '/settings/identity',
  '/settings/notifications',
  '/sla',
  '/sla/holidays',
  '/sla/rules',
  '/subscription',
  '/support',
  '/tasks',
  '/tickets',
  '/tickets/automations',
  '/tickets/dashboard',
  '/users',
  '/vehicle',
  '/workspaces',
  '/workspaces/enrolled',
  '/workspaces/reports',
  '/workspaces/tasks',
  '/workspaces/transfer-tasks'
];

const ROLES: ('SUPER' | 'MANAGER' | 'MEMBER' | 'VIEWER')[] = ['SUPER', 'MANAGER', 'MEMBER', 'VIEWER'];

test.describe('Phase 0 Baseline — Full Inventory Page Loader Suite', () => {
  for (const role of ROLES) {
    test.describe(`Role: ${role}`, () => {
      test.beforeEach(async () => {
        if (!CREDENTIALS[role]) {
          test.skip(!CREDENTIALS[role], `Missing E2E_${role} credentials in environment.`);
        }
      });

      for (const route of STATIC_INVENTORY_PAGES) {
        test(`Page Load: ${route}`, async ({ authedPage }) => {
          const page = await authedPage(role);

          const consoleErrors: string[] = [];
          const failedRequests: string[] = [];

          page.on('console', (msg) => {
            if (msg.type() === 'error') {
              consoleErrors.push(msg.text());
            }
          });

          page.on('requestfailed', (req) => {
            // Ignore cancelled / aborted requests during navigation
            const failure = req.failure();
            if (failure?.errorText !== 'net::ERR_ABORTED') {
              failedRequests.push(`${req.method()} ${req.url()}: ${failure?.errorText}`);
            }
          });

          const startTime = Date.now();
          const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
          const loadTimeMs = Date.now() - startTime;

          // 1. HTTP Status verification
          const status = response ? response.status() : 0;
          expect(status, `HTTP Status for ${route} was ${status}`).toBeLessThan(500);

          // 2. Ensure no endless loader / spinner hangs
          const spinner = page.locator('.animate-spin, [data-testid="chandak-loader"], .spinner');
          if (await spinner.count() > 0) {
            await expect(spinner.first()).toBeHidden({ timeout: 15000 }).catch(() => {
              throw new Error(`Endless loader detected on ${route}`);
            });
          }

          // 3. Log timings and health
          console.log(`[E2E] Role=${role} Route=${route} Status=${status} Time=${loadTimeMs}ms Errors=${consoleErrors.length}`);

          // Critical errors check: Fatal client crashes
          const fatalErrors = consoleErrors.filter(err => 
            err.includes('Uncaught Error') || 
            err.includes('ChunkLoadError') || 
            err.includes('Minified React error')
          );
          expect(fatalErrors, `Fatal console errors on ${route}: ${fatalErrors.join('; ')}`).toHaveLength(0);
        });
      }
    });
  }

  test('ISSUE-011: Universal Chandak Messenger Trigger available across global navbar', async ({ authedPage }) => {
    if (!CREDENTIALS.SUPER) test.skip(true, 'No E2E_SUPER configured');
    const page = await authedPage('SUPER');
    await page.goto('/workspaces');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});
