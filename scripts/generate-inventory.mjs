import fs from 'fs';
import path from 'path';

function getFiles(dir, matchFileName) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, matchFileName));
    } else if (file === matchFileName) {
      results.push(filePath.replace(/\\/g, '/'));
    }
  }
  return results;
}

const pages = getFiles('app', 'page.tsx');
const apiRoutes = getFiles('app', 'route.ts');
const rawActions = JSON.parse(fs.readFileSync('docs/baseline/server_actions_raw.json', 'utf8'));

const MODULES = [
  'Workspaces/Tasks',
  'Tickets',
  'Requirements',
  'SLA',
  'AMC',
  'Vehicle',
  'Design + DMS',
  'Meet',
  'Budget',
  'Dashboards',
  'Messenger',
  'Users/IAM',
  'Masters',
  'Settings',
  'Auth',
  'Core/Shared'
];

function categorize(p) {
  const s = p.toLowerCase();
  if (s.includes('/auth') || s.includes('app/login') || s.includes('app/register') || s.includes('auth-permissions')) return 'Auth';
  if (s.includes('vehicle')) return 'Vehicle';
  if (s.includes('/meet') || s.includes('app/meet') || s.includes('rooms') || s.includes('lib/actions/meet')) return 'Meet';
  if (s.includes('/budget') || s.includes('app/budget') || s.includes('lib/budget')) return 'Budget';
  if (s.includes('/dashboards') || s.includes('dashboardmetrics') || s.includes('portfoliometrics')) return 'Dashboards';
  if (s.includes('/design') || s.includes('dms') || s.includes('drawing') || s.includes('designtracking') || s.includes('dmac-drawings')) return 'Design + DMS';
  if (s.includes('/requirements') || s.includes('requirements.ts')) return 'Requirements';
  if (s.includes('/tickets') || s.includes('tickets.ts')) return 'Tickets';
  if (s.includes('/amc') || s.includes('amc.ts')) return 'AMC';
  if (s.includes('/sla') || s.includes('sla.ts')) return 'SLA';
  if (s.includes('/workspaces') || s.includes('/tasks') || s.includes('workspaces.ts') || s.includes('tasks.ts') || s.includes('dependencies.ts') || s.includes('workspace_reports')) return 'Workspaces/Tasks';
  if (s.includes('messenger') || s.includes('chat') || s.includes('mentions')) return 'Messenger';
  if (s.includes('/users') || s.includes('/iam') || s.includes('/rbac') || s.includes('iam.ts') || s.includes('users.ts') || s.includes('userperformance') || s.includes('user_report_layout')) return 'Users/IAM';
  if (s.includes('/masters') || s.includes('masters.ts') || s.includes('companies') || s.includes('departments') || s.includes('designations') || s.includes('vendors')) return 'Masters';
  if (s.includes('/settings') || s.includes('settings.ts') || s.includes('email-config') || s.includes('preferences.ts') || s.includes('compliance') || s.includes('subscription')) return 'Settings';
  
  return 'Core/Shared';
}

const inventory = {};
for (const m of MODULES) {
  inventory[m] = { pages: [], apiRoutes: [], serverActions: [] };
}

for (const p of pages) {
  const mod = categorize(p);
  const route = p.replace(/^app/, '').replace(/\/page\.tsx$/, '') || '/';
  inventory[mod].pages.push({ file: p, route: route.startsWith('/') ? route : '/' + route });
}

for (const r of apiRoutes) {
  const mod = categorize(r);
  const endpoint = r.replace(/^app/, '').replace(/\/route\.ts$/, '');
  inventory[mod].apiRoutes.push({ file: r, endpoint: endpoint.startsWith('/') ? endpoint : '/' + endpoint });
}

for (const [file, actions] of Object.entries(rawActions)) {
  const mod = categorize(file);
  inventory[mod].serverActions.push({ file, actions });
}

let md = '# Chandak Workspace — Complete Route & Action Inventory\n\n';
md += 'Generated as part of PHASE 0 baseline inventory.\n\n';
md += '## Summary Table\n\n';
md += '| Module | Page Routes | API Routes | Server Action Files | Server Actions Total |\n';
md += '| :--- | :---: | :---: | :---: | :---: |\n';

let totalPages = 0;
let totalApi = 0;
let totalActionFiles = 0;
let totalActionFns = 0;

for (const m of MODULES) {
  const pCount = inventory[m].pages.length;
  const aCount = inventory[m].apiRoutes.length;
  const fCount = inventory[m].serverActions.length;
  const fnCount = inventory[m].serverActions.reduce((sum, item) => sum + item.actions.length, 0);
  
  totalPages += pCount;
  totalApi += aCount;
  totalActionFiles += fCount;
  totalActionFns += fnCount;

  md += `| **${m}** | ${pCount} | ${aCount} | ${fCount} | ${fnCount} |\n`;
}

md += `| **TOTAL** | **${totalPages}** | **${totalApi}** | **${totalActionFiles}** | **${totalActionFns}** |\n\n`;
md += '---\n\n';

for (const m of MODULES) {
  const item = inventory[m];
  const fnCount = item.serverActions.reduce((sum, x) => sum + x.actions.length, 0);
  md += `## ${m}\n\n`;
  
  md += `### 1. Page Routes (${item.pages.length})\n`;
  if (item.pages.length === 0) {
    md += '_None_\n\n';
  } else {
    for (const p of item.pages) {
      md += `- \`${p.route}\` — [\`${p.file}\`](${p.file})\n`;
    }
    md += '\n';
  }

  md += `### 2. API Routes (${item.apiRoutes.length})\n`;
  if (item.apiRoutes.length === 0) {
    md += '_None_\n\n';
  } else {
    for (const a of item.apiRoutes) {
      md += `- \`${a.endpoint}\` — [\`${a.file}\`](${a.file})\n`;
    }
    md += '\n';
  }

  md += `### 3. Server Actions (${fnCount} across ${item.serverActions.length} files)\n`;
  if (item.serverActions.length === 0) {
    md += '_None_\n\n';
  } else {
    for (const f of item.serverActions) {
      md += `#### [\`${f.file}\`](${f.file}) (${f.actions.length} actions)\n`;
      for (const act of f.actions) {
        md += `- \`${act}()\`\n`;
      }
      md += '\n';
    }
  }
  md += '---\n\n';
}

fs.writeFileSync('docs/baseline/INVENTORY.md', md);
console.log('Successfully wrote docs/baseline/INVENTORY.md');
console.log(JSON.stringify({ totalPages, totalApi, totalActionFiles, totalActionFns }, null, 2));
