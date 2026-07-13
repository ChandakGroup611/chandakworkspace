const fs = require('fs');
const path = require('path');

const routes = [
  { path: 'app/requirements/page.tsx', expected: 'REQUIREMENTS_VIEW' },
  { path: 'app/requirements/approvals/page.tsx', expected: 'REQUIREMENTS_APPROVALS_VIEW' },
  { path: 'app/requirements/reports/page.tsx', expected: 'REQUIREMENTS_REPORTS_VIEW' },
  { path: 'app/workspaces/page.tsx', expected: 'WORKSPACES_VIEW' },
  { path: 'components/workspaces/EnrolledWorkspacesClient.tsx', expected: 'ENROLLED_WORKSPACES_VIEW' },
  { path: 'app/workspaces/tasks/page.tsx', expected: 'TASKS_VIEW' },
  { path: 'app/workspaces/transfer-tasks/page.tsx', expected: 'TASKS_TRANSFER_VIEW' },
  { path: 'app/migration/page.tsx', expected: 'DATA_MIGRATION_VIEW' },
  { path: 'app/workspaces/reports/page.tsx', expected: 'REPORTS_VIEW' },
  { path: 'app/masters/page.tsx', expected: 'SYSTEM_MASTERS_VIEW' },
  { path: 'app/masters/companies/page.tsx', expected: 'COMPANIES_VIEW' },
  { path: 'app/settings/page.tsx', expected: 'SETTINGS_THEME_VIEW' },
  { path: 'app/settings/identity/page.tsx', expected: 'SETTINGS_IDENTITY_VIEW' },
  { path: 'app/settings/communication/page.tsx', expected: 'SETTINGS_COMMUNICATION_VIEW' },
  { path: 'app/settings/notifications/page.tsx', expected: 'SETTINGS_NOTIFICATIONS_VIEW' }
];

routes.forEach(route => {
  const fullPath = path.join('d:\\adios', route.path);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const regex = /hasPermission\s*\(\s*["']([A-Z0-9_]+)["']\s*\)/g;
    let match;
    const perms = new Set();
    while ((match = regex.exec(content)) !== null) {
      perms.add(match[1]);
    }
    console.log(`[${route.path}] Expected: ${route.expected} | Found in code:`, Array.from(perms));
  } else {
    console.log(`[${route.path}] NOT FOUND`);
  }
});
