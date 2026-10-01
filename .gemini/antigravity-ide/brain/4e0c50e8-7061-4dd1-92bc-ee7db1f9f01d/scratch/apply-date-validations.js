const fs = require('fs');

const hostPath = 'D:/adios/components/vehicle/FleetDeskHost.tsx';
const actionsPath = 'D:/adios/lib/actions/vehicle.ts';

let hostCode = fs.readFileSync(hostPath, 'utf8');
let actionsCode = fs.readFileSync(actionsPath, 'utf8');

console.log('--- APPLYING VEHICLE DATE VALIDATIONS ---');

// 1. In FleetDeskHost.tsx: handleCreateVehicle date validations
const createVehicleValidationInsert = `      if (!regDate) {
        triggerToast("Registration Date is mandatory.", true);
        setModalSubmitting(false);
        return;
      }
      if (insExp && regDate && insExp < regDate) {
        triggerToast("Insurance Expiry Date cannot be earlier than Vehicle Registration Date.", true);
        setModalSubmitting(false);
        return;
      }
      if (!isElectric && pucExp && regDate && pucExp < regDate) {
        triggerToast("PUC Expiry Date cannot be earlier than Vehicle Registration Date.", true);
        setModalSubmitting(false);
        return;
      }
      if (fitExp && regDate && fitExp < regDate) {
        triggerToast("Fitness Expiry Date cannot be earlier than Vehicle Registration Date.", true);
        setModalSubmitting(false);
        return;
      }`;

hostCode = hostCode.replace(
  `      if (!regDate) {\n        triggerToast("Registration Date is mandatory.", true);\n        setModalSubmitting(false);\n        return;\n      }`,
  createVehicleValidationInsert
);

// 2. In FleetDeskHost.tsx: handleUpdateVehicle date validations
const updateVehicleValidationTarget = `    setModalSubmitting(true);\n    try {`;
const updateVehicleValidationInsert = `    if (editVehicleRegDate && editVehicleInsuranceExpiry && editVehicleInsuranceExpiry < editVehicleRegDate) {
      triggerToast("Insurance Expiry Date cannot be earlier than Vehicle Registration Date.", true);
      return;
    }
    if (editVehicleRegDate && editVehiclePucExpiry && editVehiclePucExpiry < editVehicleRegDate) {
      triggerToast("PUC Expiry Date cannot be earlier than Vehicle Registration Date.", true);
      return;
    }
    if (editVehicleRegDate && editVehicleFitnessExpiry && editVehicleFitnessExpiry < editVehicleRegDate) {
      triggerToast("Fitness Expiry Date cannot be earlier than Vehicle Registration Date.", true);
      return;
    }
    if (editVehicleRegDate && editVehicleCustomExtendedExpiryDate && editVehicleCustomExtendedExpiryDate <= editVehicleRegDate) {
      triggerToast("Custom Extended Expiry Date must be after Registration Date.", true);
      return;
    }

    setModalSubmitting(true);\n    try {`;

hostCode = hostCode.replace(updateVehicleValidationTarget, updateVehicleValidationInsert);

// 3. In FleetDeskHost.tsx: handleDispatchTrip date validations
const tripValidationTarget = `    if (!newTripVehicleId || !newTripDriverId || !newTripTraveler.trim() || !newTripPurpose.trim() || !newTripOrigin.trim() || !newTripDestination.trim()) {
      triggerToast("Please fill in vehicle, driver, traveler name, purpose, origin and destination.", true);
      return;
    }`;

const tripValidationInsert = `    if (!newTripVehicleId || !newTripDriverId || !newTripTraveler.trim() || !newTripPurpose.trim() || !newTripOrigin.trim() || !newTripDestination.trim()) {
      triggerToast("Please fill in vehicle, driver, traveler name, purpose, origin and destination.", true);
      return;
    }
    if (newTripStartTime && newTripEndTime && newTripEndTime < newTripStartTime) {
      triggerToast("Trip End Time cannot be earlier than Trip Start Time.", true);
      return;
    }`;

hostCode = hostCode.replace(tripValidationTarget, tripValidationInsert);

// 4. In FleetDeskHost.tsx: handleCreateMaintenance and handleUpdateMaintenance date validations
const maintCreateTarget = `    if (!newMaintVehicleId || !newMaintServiceType.trim() || !newMaintVendor.trim()) {
      triggerToast("Please select a target vehicle, specify service scope, and authorized workshop.", true);
      return;
    }`;

const maintCreateInsert = `    if (!newMaintVehicleId || !newMaintServiceType.trim() || !newMaintVendor.trim()) {
      triggerToast("Please select a target vehicle, specify service scope, and authorized workshop.", true);
      return;
    }
    if (newMaintDate && newMaintNextDue && newMaintNextDue <= newMaintDate) {
      triggerToast("Next Service Due Date must be after Service Date.", true);
      return;
    }
    if (newMaintOdometer && newMaintNextDueOdometer && Number(newMaintNextDueOdometer) <= Number(newMaintOdometer)) {
      triggerToast("Next Service Due Odometer must be greater than Current Service Odometer.", true);
      return;
    }`;

hostCode = hostCode.replace(maintCreateTarget, maintCreateInsert);

const maintUpdateTarget = `    if (!editMaintVehicleId || !editMaintServiceType.trim() || !editMaintVendor.trim()) {
      triggerToast("Please select a target vehicle, specify service scope, and authorized workshop.", true);
      return;
    }`;

const maintUpdateInsert = `    if (!editMaintVehicleId || !editMaintServiceType.trim() || !editMaintVendor.trim()) {
      triggerToast("Please select a target vehicle, specify service scope, and authorized workshop.", true);
      return;
    }
    if (editMaintDate && editMaintNextDue && editMaintNextDue <= editMaintDate) {
      triggerToast("Next Service Due Date must be after Service Date.", true);
      return;
    }
    if (editMaintOdometer && editMaintNextDueOdometer && Number(editMaintNextDueOdometer) <= Number(editMaintOdometer)) {
      triggerToast("Next Service Due Odometer must be greater than Current Service Odometer.", true);
      return;
    }`;

hostCode = hostCode.replace(maintUpdateTarget, maintUpdateInsert);

// 5. In FleetDeskHost.tsx: handleSaveRenewPolicy and handleSaveVehiclePucRenewal date validations
const renewPolicyTarget = `    if (!renewPolicyStartDate || !renewPolicyEndDate) {
      triggerToast("Policy start and end dates are required.", true);
      return;
    }`;

const renewPolicyInsert = `    if (!renewPolicyStartDate || !renewPolicyEndDate) {
      triggerToast("Policy start and end dates are required.", true);
      return;
    }
    if (renewPolicyEndDate <= renewPolicyStartDate) {
      triggerToast("Policy End Date must be after Policy Start Date.", true);
      return;
    }`;

hostCode = hostCode.replace(renewPolicyTarget, renewPolicyInsert);

const renewPucTarget = `    if (!renewPucValidFrom || !renewPucValidUpto) {
      triggerToast("Validity start and expiry dates are required.", true);
      return;
    }`;

const renewPucInsert = `    if (!renewPucValidFrom || !renewPucValidUpto) {
      triggerToast("Validity start and expiry dates are required.", true);
      return;
    }
    if (renewPucValidUpto <= renewPucValidFrom) {
      triggerToast("PUC Expiry Date must be after Validity Start Date.", true);
      return;
    }`;

hostCode = hostCode.replace(renewPucTarget, renewPucInsert);

fs.writeFileSync(hostPath, hostCode, 'utf8');
console.log('Updated FleetDeskHost.tsx with comprehensive date validations!');
