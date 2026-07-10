const fs = require('fs');

const files = [
  'd:/adios/app/masters/page.tsx',
  'd:/adios/app/sla/page.tsx',
  'd:/adios/components/dashboard/panels/MetricsRow.tsx',
  'd:/adios/components/layout/Navbar.tsx',
  'd:/adios/components/settings/SettingsGallery.tsx',
  'd:/adios/components/tasks/TaskExecutionController.tsx',
  'd:/adios/components/tickets/TicketFormERP.tsx',
  'd:/adios/components/tickets/TicketFormInfra.tsx',
  'd:/adios/components/tickets/TicketFormOthers.tsx',
  'd:/adios/components/workspaces/EnrolledWorkspacesClient.tsx',
  'd:/adios/components/workspaces/WorkspaceMasterTable.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let orig = content;

  // Nested isActive ternaries:
  // isLightMode ? (isActive ? "bg-white..." : "...") : (isActive ? "bg-black..." : "...")
  content = content.replace(/isLight(Mode)?\s*\?\s*\(isActive\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\)\s*:\s*\(isActive\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\)/g, (match, mode, lightActive, lightInactive, darkActive, darkInactive) => {
    let newActive = lightActive.replace('bg-white', 'bg-surface').replace('text-gray-900', 'text-foreground').replace('text-black', 'text-foreground').replace('border-gray-200', 'border-border');
    let newInactive = lightInactive.replace('bg-transparent', 'bg-transparent').replace('text-gray-700', 'text-muted').replace('text-gray-500', 'text-muted');
    return `(isActive ? "${newActive}" : "${newInactive}")`;
  });

  // Multi-line standard ternaries
  content = content.replace(/isLight(Mode)?\s*\n\s*\?\s*['"]([^'"]+)['"]\s*\n\s*:\s*['"]([^'"]+)['"]/g, (match, mode, lightStr, darkStr) => {
    let newStr = lightStr;
    if (newStr.includes('bg-white')) newStr = newStr.replace('bg-white', 'bg-surface');
    if (newStr.includes('bg-gray-50')) newStr = newStr.replace(/bg-gray-50(\/50)?/g, 'bg-elevated');
    if (newStr.includes('text-gray-900')) newStr = newStr.replace('text-gray-900', 'text-foreground');
    if (newStr.includes('text-gray-700') || newStr.includes('text-gray-500')) newStr = newStr.replace(/text-gray-(700|500)/g, 'text-muted');
    if (newStr.includes('border-gray-200') || newStr.includes('border-gray-100')) newStr = newStr.replace(/border-gray-(200|100)/g, 'border-border');
    return `"${newStr}"`;
  });

  // Specifically for the template string multi-line ones: ${isLightMode \n ? '...' : '...'}
  content = content.replace(/\$\{isLight(Mode)?\s*\n\s*\?\s*['"]([^'"]+)['"]\s*\n\s*:\s*['"]([^'"]+)['"]\}/g, (match, mode, lightStr, darkStr) => {
    let newStr = lightStr;
    if (newStr.includes('bg-white')) newStr = newStr.replace('bg-white', 'bg-surface');
    if (newStr.includes('bg-gray-50')) newStr = newStr.replace(/bg-gray-50(\/50)?/g, 'bg-elevated');
    if (newStr.includes('text-gray-900')) newStr = newStr.replace('text-gray-900', 'text-foreground');
    if (newStr.includes('text-gray-700') || newStr.includes('text-gray-500')) newStr = newStr.replace(/text-gray-(700|500)/g, 'text-muted');
    if (newStr.includes('border-gray-200') || newStr.includes('border-gray-100')) newStr = newStr.replace(/border-gray-(200|100)/g, 'border-border');
    return newStr;
  });

  if (orig !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed edge cases in:', file);
  }
});
