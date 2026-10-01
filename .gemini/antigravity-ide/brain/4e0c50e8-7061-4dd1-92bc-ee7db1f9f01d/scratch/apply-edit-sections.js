const fs = require('fs');

const hostPath = 'D:/adios/components/vehicle/FleetDeskHost.tsx';
let code = fs.readFileSync(hostPath, 'utf8');

// 1. Add editVehicleSectionTab state if not already present
if (!code.includes('editVehicleSectionTab')) {
  code = code.replace(
    'const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);',
    `const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);\n  const [editVehicleSectionTab, setEditVehicleSectionTab] = useState<"SPECS" | "REGISTRATION" | "FINANCIALS" | "ALLOCATION" | "DOCS">("SPECS");`
  );
  console.log('Added editVehicleSectionTab state');
}

// 2. Add setEditVehicleSectionTab("SPECS") in openEditVehicleModal
if (!code.includes('setEditVehicleSectionTab("SPECS");')) {
  code = code.replace(
    'setIsEditVehicleOpen(true);',
    'setEditVehicleSectionTab("SPECS");\n    setIsEditVehicleOpen(true);'
  );
  console.log('Added setEditVehicleSectionTab("SPECS") in openEditVehicleModal');
}

// 3. Fix viewingVehicle rendering condition so it NEVER renders when isEditVehicleOpen or any sub-modal is open
const oldViewingCheck = '{viewingVehicle && (';
const newViewingCheck = `{viewingVehicle && !isEditVehicleOpen && !isAddMaintenanceOpen && !isEditMaintenanceOpen && !isDispatchTripOpen && !isAddPartOpen && !isEditPartOpen && !isRenewPartOpen && !isRenewPolicyModalOpen && !isPolicyHistoryModalOpen && !isRenewPucModalOpen && !isPucHistoryModalOpen && !isSpecHistoryModalOpen && !isAddEntitlementModalOpen && !isRedeemEntitlementModalOpen && !isAddDriverOpen && !isEditDriverOpen && (`

if (code.includes(oldViewingCheck)) {
  code = code.replace(oldViewingCheck, newViewingCheck);
  console.log('Updated viewingVehicle rendering guard');
}

fs.writeFileSync(hostPath, code, 'utf8');
console.log('File updated.');
