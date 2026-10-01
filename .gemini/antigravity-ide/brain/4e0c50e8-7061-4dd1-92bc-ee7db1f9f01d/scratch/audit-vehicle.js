const fs = require('fs');
const path = require('path');

const hostPath = path.join('D:/adios', 'components/vehicle/FleetDeskHost.tsx');
const actionsPath = path.join('D:/adios', 'lib/actions/vehicle.ts');

const hostCode = fs.readFileSync(hostPath, 'utf8');
const actionsCode = fs.readFileSync(actionsPath, 'utf8');

console.log('--- VEHICLE MODULE STATIC CODE AUDIT ---');
console.log('FleetDeskHost size:', (hostCode.length / 1024).toFixed(1), 'KB | lines:', hostCode.split('\n').length);
console.log('actions/vehicle.ts size:', (actionsCode.length / 1024).toFixed(1), 'KB | lines:', actionsCode.split('\n').length);

// 1. Check all sub-tabs and routing
const tabsMatch = hostCode.match(/activeTab === ['"][^'"]+['"]/g);
const uniqueTabs = [...new Set(tabsMatch ? tabsMatch.map(t => t.replace(/activeTab === /, '').replace(/['"]/g, '')) : [])];
console.log('\nUnique Navigation Tabs detected:', uniqueTabs);

// 2. Check all detail tabs in Vehicle Details / Dossier view
const detailTabsMatch = hostCode.match(/detailsTab === ['"][^'"]+['"]/g);
const uniqueDetailTabs = [...new Set(detailTabsMatch ? detailTabsMatch.map(t => t.replace(/detailsTab === /, '').replace(/['"]/g, '')) : [])];
console.log('Unique Details Sub-Tabs detected:', uniqueDetailTabs);

// 3. Check for any remaining '360' or '360°' or 'all-in-one' text
const remaining360 = [];
hostCode.split('\n').forEach((line, idx) => {
  if (line.toLowerCase().includes('360') || line.toLowerCase().includes('all-in-one')) {
    remaining360.push({ line: idx + 1, text: line.trim() });
  }
});
console.log('\nRemaining "360" or "All-in-One" occurrences:', remaining360);

// 4. Check for unhandled exceptions, console.error without toast, or NaN vulnerabilities
const nanIssues = [];
hostCode.split('\n').forEach((line, idx) => {
  if (line.includes('parseFloat(') || line.includes('parseInt(') || line.includes('Number(')) {
    if (!line.includes('|| 0') && !line.includes('isNaN') && !line.includes('?') && !line.includes('Number.is')) {
      nanIssues.push({ line: idx + 1, text: line.trim().slice(0, 100) });
    }
  }
});
console.log('\nPotential Unsafe Number/NaN parsing (first 5):', nanIssues.slice(0, 5));

// 5. Check Document View & Download coverage
const docHandlers = {
  hasViewModal: hostCode.includes('previewDoc') || hostCode.includes('docPreviewModal') || hostCode.includes('showDocModal'),
  hasDownloadHelper: hostCode.includes('handleDownload') || hostCode.includes('downloadDocument') || hostCode.includes('download'),
  hasProxyAttachment: hostCode.includes('/api/proxy-attachment') || hostCode.includes('createObjectURL')
};
console.log('\nDocument Handling Compliance:', docHandlers);

// 6. Check Action signatures in lib/actions/vehicle.ts
const exportedFunctions = actionsCode.match(/export async function [a-zA-Z0-9_]+/g);
console.log('\nServer Actions in lib/actions/vehicle.ts:', exportedFunctions);
