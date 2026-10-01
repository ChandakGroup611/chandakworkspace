const fs = require('fs');

const code = fs.readFileSync('D:/adios/components/vehicle/FleetDeskHost.tsx', 'utf8');
const lines = code.split('\n');

for (let i = 12365; i < 13665; i++) {
  const line = lines[i];
  if (line && (line.includes('{/* SECTION') || line.includes('</TransactionFormLayout>'))) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}
