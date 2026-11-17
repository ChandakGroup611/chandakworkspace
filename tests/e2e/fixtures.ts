import { test as base, Page, expect } from '@playwright/test';

export interface UserCredential {
  email: string;
  pass: string;
  role: 'SUPER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
}

export function parseCredential(raw: string | undefined, defaultRole: UserCredential['role']): UserCredential | null {
  if (!raw || !raw.trim()) return null;
  const str = raw.trim();
  if (str.startsWith('{')) {
    try {
      const obj = JSON.parse(str);
      return {
        email: obj.email || obj.username,
        pass: obj.password || obj.pass,
        role: defaultRole
      };
    } catch {
      return null;
    }
  }
  if (str.includes(':')) {
    const idx = str.indexOf(':');
    return {
      email: str.substring(0, idx).trim(),
      pass: str.substring(idx + 1).trim(),
      role: defaultRole
    };
  }
  return null;
}

export const CREDENTIALS: Record<UserCredential['role'], UserCredential | null> = {
  SUPER: parseCredential(process.env.E2E_SUPER, 'SUPER'),
  MANAGER: parseCredential(process.env.E2E_MANAGER, 'MANAGER'),
  MEMBER: parseCredential(process.env.E2E_MEMBER, 'MEMBER'),
  VIEWER: parseCredential(process.env.E2E_VIEWER, 'VIEWER')
};

export async function loginAsRole(page: Page, role: UserCredential['role']): Promise<boolean> {
  const cred = CREDENTIALS[role];
  if (!cred) {
    console.warn(`[E2E] No credentials configured for role: ${role} (check E2E_${role} env var)`);
    return false;
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  
  // Fill email & password
  const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
  const passInput = page.locator('input[type="password"], input[name="password"], input#password');
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');

  await emailInput.fill(cred.email);
  await passInput.fill(cred.pass);
  await submitBtn.click();

  // Wait for post-login destination (either / or /select-module or module path)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  
  // Handle /select-module if displayed
  if (page.url().includes('/select-module')) {
    const defaultModuleBtn = page.locator('button, div[role="button"]').first();
    if (await defaultModuleBtn.isVisible()) {
      await defaultModuleBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  return true;
}

export const test = base.extend<{
  authedPage: (role: UserCredential['role']) => Promise<Page>;
}>({
  authedPage: async ({ browser }, use) => {
    const contexts: any[] = [];
    await use(async (role: UserCredential['role']) => {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      const ok = await loginAsRole(page, role);
      if (!ok) {
        test.skip(!CREDENTIALS[role], `Missing E2E_${role} credentials in environment.`);
      }
      return page;
    });
    for (const ctx of contexts) {
      await ctx.close().catch(() => {});
    }
  }
});

export { expect };
