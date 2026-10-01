const fs = require('fs');

const hostPath = 'D:/adios/components/vehicle/FleetDeskHost.tsx';
const code = fs.readFileSync(hostPath, 'utf8');
const lines = code.split('\n');

function extractFunction(name) {
  let start = -1;
  let depth = 0;
  let body = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`const ${name} =`) || lines[i].includes(`async function ${name}`) || lines[i].includes(`function ${name}`)) {
      start = i;
      break;
    }
  }
  if (start === -1) return 'Not found';
  for (let i = start; i < lines.length; i++) {
    body.push(`Line ${i + 1}: ${lines[i]}`);
    if (lines[i].includes('{')) depth += (lines[i].match(/{/g) || []).length;
    if (lines[i].includes('}')) depth -= (lines[i].match(/}/g) || []).length;
    if (depth === 0 && body.length > 3) break;
  }
  return body.slice(0, 40).join('\n');
}

console.log('--- handleCreateVehicle ---\n', extractFunction('handleCreateVehicle'));
console.log('\n--- handleUpdateVehicle ---\n', extractFunction('handleUpdateVehicle'));
console.log('\n--- handleSaveTrip ---\n', extractFunction('handleSaveTrip'));
console.log('\n--- handleSaveMaintenance ---\n', extractFunction('handleSaveMaintenance'));
