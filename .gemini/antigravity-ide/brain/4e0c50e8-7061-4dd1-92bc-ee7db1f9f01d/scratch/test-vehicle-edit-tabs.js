const fs = require('fs');

const hostPath = 'D:/adios/components/vehicle/FleetDeskHost.tsx';
let content = fs.readFileSync(hostPath, 'utf8');

// Check lines around 842 for editVehicleSectionTab
console.log('Has editVehicleSectionTab:', content.includes('editVehicleSectionTab'));
console.log('Has isAnySubModalActiveOverDossier:', content.includes('isAnySubModalActiveOverDossier'));
