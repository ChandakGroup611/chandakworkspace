const fs = require('fs');

const hits = JSON.parse(fs.readFileSync('D:/adios/.gemini/antigravity-ide/brain/4e0c50e8-7061-4dd1-92bc-ee7db1f9f01d/scratch/color-hits.json', 'utf8'));

const hostHits = hits.filter(h => h.file === 'components\\vehicle\\FleetDeskHost.tsx');
console.log('FleetDeskHost hits count:', hostHits.length);

hostHits.slice(0, 30).forEach(h => {
  console.log(`[L${h.line}] [${h.matches.join(', ')}] ${h.text.slice(0, 100)}`);
});
