const fs = require('fs');
const path = require('path');

const hostPath = path.join('D:/adios', 'components/vehicle/FleetDeskHost.tsx');
const hostCode = fs.readFileSync(hostPath, 'utf8');

const checks = [];

// 1. Check for any unhandled .then() without .catch()
const unhandledPromises = [];
const lines = hostCode.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.then(') && !line.includes('.catch(') && !lines.slice(idx, idx + 4).some(l => l.includes('.catch('))) {
    unhandledPromises.push({ line: idx + 1, code: line.trim() });
  }
});
checks.push({ name: 'Unhandled Promises', count: unhandledPromises.length, samples: unhandledPromises.slice(0, 5) });

// 2. Check for unsafe property accesses like obj.data.map without ?
const unsafeChains = [];
const unsafePattern = /(\w+)\.(\w+)\.(map|filter|forEach|find|reduce)\(/g;
lines.forEach((line, idx) => {
  let match;
  while ((match = unsafePattern.exec(line)) !== null) {
    if (!line.includes(`${match[1]}?.${match[2]}`) && !line.includes(`${match[1]} && ${match[1]}.${match[2]}`)) {
      unsafeChains.push({ line: idx + 1, code: line.trim() });
    }
  }
});
checks.push({ name: 'Potentially Unsafe Nested Array Methods', count: unsafeChains.length, samples: unsafeChains.slice(0, 5) });

// 3. Check for document viewing modal setup in FleetDeskHost
const docViewer = {
  hasPreviewState: hostCode.includes('previewDocUrl') || hostCode.includes('docPreviewModal') || hostCode.includes('previewFile'),
  hasImageViewer: hostCode.includes('ZoomIn') || hostCode.includes('previewRotation'),
  hasDownloadButton: hostCode.includes('handleDownload') || hostCode.includes('download')
};
checks.push({ name: 'Universal Document Viewer Setup', status: docViewer });

// 4. Check for state management across tabs
const stateTabs = [
  'activeTab', 'inventoryViewMode', 'selectedVehicle', 'selectedVehicleDossierTab',
  'showRegisterModal', 'showEditModal', 'showServiceModal', 'showTripModal', 'showDriverModal'
];
const stateAnalysis = stateTabs.map(st => ({
  state: st,
  defined: hostCode.includes(st)
}));
checks.push({ name: 'Key Screen States', results: stateAnalysis });

console.log(JSON.stringify(checks, null, 2));
