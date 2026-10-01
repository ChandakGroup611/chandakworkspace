const fs = require('fs');

const code = fs.readFileSync('D:/adios/components/vehicle/FleetDeskHost.tsx', 'utf8');
const lines = code.split('\n');

const editLines = lines.slice(12366, 13665);
console.log('Edit Vehicle lines count:', editLines.length);

const sectionHeaders = [];
editLines.forEach((l, i) => {
  if (l.includes('SECTION') || l.includes('text-xs font-semibold') || l.includes('<h3') || l.includes('<h4') || l.includes('<h5') || l.includes('rounded-xl border')) {
    sectionHeaders.push({ line: 12367 + i, text: l.trim() });
  }
});

console.log('Section headers found:', sectionHeaders);
