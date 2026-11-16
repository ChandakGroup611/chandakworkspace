/**
 * Access Rule Verification: Vehicle Desk Module
 * Validates against rules specified in docs/ACCESS_RULES.md (Section 6)
 */

import assert from 'assert';
import fs from 'fs';

export async function runVehicleAccessTest() {
  const results = [];
  const logPass = (rule, desc) => results.push({ module: 'Vehicle Desk', rule, desc, status: 'PASS' });
  const logFail = (rule, desc, error) => results.push({ module: 'Vehicle Desk', rule, desc, status: 'FAIL', error });

  const vehicleContent = fs.readFileSync('lib/actions/vehicle.ts', 'utf8');

  function getFunctionBody(fnName) {
    const startIdx = vehicleContent.indexOf(`function ${fnName}`);
    if (startIdx === -1) return '';
    const nextIdx = vehicleContent.indexOf('\nexport async function ', startIdx + 20);
    return nextIdx !== -1 ? vehicleContent.slice(startIdx, nextIdx) : vehicleContent.slice(startIdx);
  }

  // Test 1: Zero permissive fallbacks in permission helpers
  try {
    const helpers = ['canUserViewVehicles', 'canUserManageVehicles', 'canUserManageMaintenance', 'canUserManageParts', 'canUserManageVendors', 'canUserManageDrivers', 'canUserManageTrips'];
    for (const h of helpers) {
      const body = getFunctionBody(h);
      assert(body, `Helper ${h} not found`);
      assert(!body.includes('// By default, authenticated users accessing fleet operations are permitted unless explicitly restricted'), `${h} still contains permissive fallback comment`);
      assert(body.includes('return false;'), `${h} does not return false on unprivileged access`);
    }
    logPass('VEHICLE_PERMISSION_HELPERS_STRICT', 'All vehicle permission helpers return false by default for unauthorized users');
  } catch (err) {
    logFail('VEHICLE_PERMISSION_HELPERS_STRICT', 'Permission helper check failed', err.message);
  }

  // Test 2: Read actions verify VEHICLES_VIEW or fleet role
  try {
    const readFns = ['fetchVehicleDashboardStats', 'fetchVehiclesList'];
    for (const fn of readFns) {
      const body = getFunctionBody(fn);
      assert(body, `Read function ${fn} not found`);
      assert(body.includes('canUserViewVehicles'), `${fn} does not call canUserViewVehicles`);
      assert(body.includes('Access Denied'), `${fn} does not return Access Denied on unprivileged read`);
    }
    logPass('VEHICLE_READ_QUERIES_GATED', 'Vehicle list and KPI dashboard stats strictly enforce canUserViewVehicles');
  } catch (err) {
    logFail('VEHICLE_READ_QUERIES_GATED', 'Read query gating check failed', err.message);
  }

  // Test 3: Document mutations strictly gated by canUserManageVehicles
  try {
    const docFns = ['createVehicleDocumentAction', 'updateVehicleDocumentAction', 'deleteVehicleDocumentAction'];
    for (const fn of docFns) {
      const body = getFunctionBody(fn);
      assert(body, `${fn} not found`);
      assert(body.includes('canUserManageVehicles'), `${fn} missing canUserManageVehicles check`);
    }
    logPass('VEHICLE_DOCUMENTS_MUTATIONS_GATED', 'Document upload, update, and deletion strictly enforce canUserManageVehicles');
  } catch (err) {
    logFail('VEHICLE_DOCUMENTS_MUTATIONS_GATED', 'Document mutation gating check failed', err.message);
  }

  // Test 4: Compliance mutations (Insurance & PUC) strictly gated
  try {
    const compFns = ['renewVehicleInsurancePolicyAction', 'deleteVehicleInsurancePolicyAction', 'renewVehiclePucCertificateAction', 'deleteVehiclePucCertificateAction'];
    for (const fn of compFns) {
      const body = getFunctionBody(fn);
      assert(body, `${fn} not found`);
      assert(body.includes('canUserManageVehicles'), `${fn} missing canUserManageVehicles check`);
    }
    logPass('VEHICLE_COMPLIANCE_MUTATIONS_GATED', 'Insurance and PUC renewals and deletions strictly enforce canUserManageVehicles');
  } catch (err) {
    logFail('VEHICLE_COMPLIANCE_MUTATIONS_GATED', 'Compliance mutation gating check failed', err.message);
  }

  // Test 5: Parts and Vendors mutations strictly gated
  try {
    const vendorFns = ['createInsuranceVendorAction', 'updateInsuranceVendorAction', 'deleteInsuranceVendorAction'];
    for (const fn of vendorFns) {
      const body = getFunctionBody(fn);
      assert(body, `${fn} not found`);
      assert(body.includes('canUserManageVendors'), `${fn} missing canUserManageVendors check`);
    }

    const partFns = ['createVehiclePartAction', 'createVehiclePartsBatchAction', 'updateVehiclePartAction', 'deleteVehiclePartAction', 'renewPartPolicyAction'];
    for (const fn of partFns) {
      const body = getFunctionBody(fn);
      assert(body, `${fn} not found`);
      assert(body.includes('canUserManageParts'), `${fn} missing canUserManageParts check`);
    }
    logPass('VEHICLE_PARTS_VENDORS_MUTATIONS_GATED', 'Vendor and parts inventory mutations strictly enforce canUserManageVendors / canUserManageParts');
  } catch (err) {
    logFail('VEHICLE_PARTS_VENDORS_MUTATIONS_GATED', 'Parts/vendors mutation gating check failed', err.message);
  }

  // Test 6: Service Entitlements & Records strictly gated
  try {
    const entFns = ['createVehicleServiceEntitlementAction', 'redeemVehicleServiceEntitlementAction', 'deleteVehicleServiceEntitlementAction', 'deleteServiceRecordAction'];
    for (const fn of entFns) {
      const body = getFunctionBody(fn);
      assert(body, `${fn} not found`);
      assert(body.includes('canUserManageMaintenance'), `${fn} missing canUserManageMaintenance check`);
    }
    logPass('VEHICLE_ENTITLEMENTS_MUTATIONS_GATED', 'Service entitlements and service records strictly enforce canUserManageMaintenance');
  } catch (err) {
    logFail('VEHICLE_ENTITLEMENTS_MUTATIONS_GATED', 'Entitlement mutation gating check failed', err.message);
  }

  return results;
}

if (process.argv[1].endsWith('test-vehicle.mjs')) {
  runVehicleAccessTest().then(res => {
    console.table(res);
    const hasFail = res.some(r => r.status === 'FAIL');
    process.exit(hasFail ? 1 : 0);
  });
}
