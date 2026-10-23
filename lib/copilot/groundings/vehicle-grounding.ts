/**
 * Chandak AI Copilot — Groundings: Vehicle Desk / FleetDesk
 * Grounded in Fleet Desk RBAC policies, vehicle state machine, and transport regulations.
 */

export interface VehicleConceptDefinition {
  concept: string;
  definition: string;
  applicableRoles: string[];
  rules: string[];
  sourceDocument: string;
}

export const VEHICLE_CONCEPTS: Record<string, VehicleConceptDefinition> = {
  "FLEET_ADMINISTRATOR": {
    concept: "Fleet Administrator",
    definition: "The top-level fleet manager holding comprehensive administrative authority across all vehicles, drivers, trips, maintenance contracts, and system settings.",
    applicableRoles: ["SUPER_ADMIN", "FLEET_ADMIN"],
    rules: [
      "Can register, edit, archive, and mark vehicles as SOLD.",
      "Can grant or revoke driver authorizations and configure fleet policies.",
      "Has unconstrained visibility across all vehicles regardless of project scope."
    ],
    sourceDocument: "FleetDesk RBAC Policy § 1 (Fleet Administrator Authority)"
  },
  "FLEET_DISPATCHER": {
    concept: "Fleet Dispatcher",
    definition: "Operational controller responsible for trip coordination, driver assignment, movement pass generation, and daily run logging.",
    applicableRoles: ["FLEET_ADMIN", "FLEET_STAFF", "DISPATCHER"],
    rules: [
      "Can dispatch trips and verify opening/closing odometer readings.",
      "Requires explicit 'can_dispatch_trips' permission.",
      "Cannot modify vehicle ownership or delete maintenance records."
    ],
    sourceDocument: "FleetDesk Operating Guidelines § 3 (Trip Dispatch)"
  },
  "FLEET_WORKSHOP": {
    concept: "Fleet Workshop",
    definition: "Workshop technician and maintenance personnel responsible for logging service events, repairs, spare part replacements, and vendor invoices.",
    applicableRoles: ["FLEET_WORKSHOP"],
    rules: [
      "Can create, view, and update maintenance and repair logs.",
      "Has 'can_manage_maintenance' permission enabled.",
      "Strictly prohibited from dispatching trips or marking vehicles as sold."
    ],
    sourceDocument: "FleetDesk Operating Guidelines § 4 (Workshop Management)"
  },
  "MOVEMENT_PASS": {
    concept: "Movement Pass",
    definition: "The official digital authorization gate pass required before any Chandak fleet vehicle departs a site, warehouse, or commercial compound.",
    applicableRoles: ["FLEET_ADMIN", "FLEET_STAFF"],
    rules: [
      "A vehicle cannot exit without an approved movement pass referencing an active driver and destination.",
      "Pass is automatically invalidated once the return journey is completed and closed in the system."
    ],
    sourceDocument: "Fleet Desk Security Protocol § 2 (Movement Gate Passes)"
  },
  "VEHICLE_STATUS": {
    concept: "Vehicle Status",
    definition: "The operational state machine governing vehicle availability in the fleet.",
    applicableRoles: ["ALL_FLEET_USERS"],
    rules: [
      "IN_STOCK: Available on premises for assignment or trip dispatch.",
      "IN_TRANSIT: Actively dispatched on an authorized run with an assigned driver.",
      "MAINTENANCE: Under inspection, servicing, or body repair; strictly blocked from trip dispatch.",
      "SOLD: Decommissioned or sold out of active Chandak ownership; permanently locked from operations."
    ],
    sourceDocument: "Fleet Desk Lifecycle Specification § 1.2"
  },
  "HSRP": {
    concept: "HSRP",
    definition: "High Security Registration Plate with tamper-proof snap lock and laser-etched permanent identification number, mandatory under Indian Motor Vehicles Act.",
    applicableRoles: ["FLEET_ADMIN", "FLEET_STAFF"],
    rules: [
      "Every company vehicle must have 'has_hsrp_plate' marked true upon delivery.",
      "Vehicles without HSRP cannot be cleared for commercial interstate or highway dispatch."
    ],
    sourceDocument: "Motor Vehicles Compliance Guide § 4"
  },
  "PUC": {
    concept: "PUC",
    definition: "Pollution Under Control certificate verifying vehicular emission levels meet statutory environmental thresholds.",
    applicableRoles: ["ALL_FLEET_USERS"],
    rules: [
      "PUC validity must be tracked with 'puc_expiry_date'.",
      "Expired PUC flags a high-priority compliance warning and blocks trip dispatch."
    ],
    sourceDocument: "Fleet Compliance & Statutory Guidelines § 5"
  },
  "VEHICLE_DESK": {
    concept: "Vehicle Desk (FleetDesk)",
    definition: "Enterprise fleet management module governing company and leased vehicle inventory, trip passes, drivers, maintenance, and statutory documents.",
    applicableRoles: ["FLEET_ADMIN", "FLEET_DISPATCHER", "FLEET_WORKSHOP", "SUPER_ADMIN"],
    rules: [
      "Manages vehicle lifecycle from registration (IN_STOCK), dispatch (IN_TRANSIT), maintenance (MAINTENANCE), to disposal (SOLD).",
      "Requires authenticated Fleet Desk role or module permission under user_modules."
    ],
    sourceDocument: "FleetDesk Enterprise Operating Specification § 1"
  },
  "DRIVER": {
    concept: "Fleet Driver",
    definition: "Certified commercial or private vehicle operator assigned to transport runs and movements.",
    applicableRoles: ["FLEET_ADMIN", "FLEET_DISPATCHER"],
    rules: [
      "Driver must hold an active, non-expired driving license matching vehicle class.",
      "Driver allocation is recorded against Movement Passes and validated before dispatch."
    ],
    sourceDocument: "FleetDesk Driver Governance Policy § 2"
  }
};

export const VEHICLE_WORKFLOW_GUIDES = {
  REGISTER_VEHICLE: {
    action: "REGISTER_VEHICLE",
    title: "Vehicle Registration Workflow",
    summary: "Registering a new company or leased vehicle into Chandak FleetDesk.",
    steps: [
      "1. Navigate to Fleet Desk -> Vehicles -> 'Register Vehicle'.",
      "2. Input Registration Number (e.g. MH-02-XX-XXXX) and official Registration Date.",
      "3. Specify Make, Model, Variant, Category, and Fuel Type.",
      "4. Enter VIN / Chassis Number and Engine Number as stamped on the RC.",
      "5. Provide Insurance Vendor, Policy Number, and Expiry Date.",
      "6. Upload digital copies of RC, Insurance Policy, and PUC Certificate.",
      "7. Save record to set initial status to IN_STOCK."
    ],
    requiredFields: [
      "Registration Number (registration_number)",
      "Make & Model (make, model)",
      "VIN / Chassis Number (vin_chassis_number)",
      "Engine Number (engine_number)",
      "Insurance Policy Number & Expiry"
    ],
    applicableRule: "Fleet Policy 101: Vehicles must be registered with verified RC and insurance before assignment."
  },
  DISPATCH_TRIP: {
    action: "DISPATCH_TRIP",
    title: "Trip Dispatch Workflow",
    summary: "Dispatching an available vehicle on an authorized transport run.",
    steps: [
      "1. Locate vehicle in Vehicles list and confirm status is 'IN_STOCK'.",
      "2. Click 'Dispatch Trip' or create a new Movement Pass.",
      "3. Select authorized active Driver from dropdown.",
      "4. Enter Destination, Purpose, and Opening Odometer Reading (km).",
      "5. System validates driver license and vehicle insurance validity.",
      "6. Confirm dispatch to transition vehicle status to 'IN_TRANSIT'."
    ],
    requiredFields: [
      "Vehicle ID",
      "Assigned Driver ID",
      "Destination",
      "Opening Odometer Reading"
    ],
    applicableRule: "Movement Gate Rule: Trips cannot be dispatched if vehicle is in MAINTENANCE or has expired PUC."
  },
  LOG_MAINTENANCE: {
    action: "LOG_MAINTENANCE",
    title: "Maintenance & Service Logging Workflow",
    summary: "Logging scheduled servicing, repairs, or spare parts replacement.",
    steps: [
      "1. Select vehicle and open the 'Maintenance' tab.",
      "2. Click 'Log Service Entry'.",
      "3. Select service type: Scheduled Preventive, Breakdown Repair, Tire/Battery, or Inspection.",
      "4. Enter Workshop Vendor, Invoice Number, and Service Cost breakdown.",
      "5. Upload vendor tax invoice and signed service inspection sheet.",
      "6. Record vehicle odometer reading at time of service.",
      "7. If vehicle is in workshop, status is updated to 'MAINTENANCE' until released."
    ],
    requiredFields: [
      "Vehicle ID",
      "Workshop Vendor",
      "Invoice Number",
      "Cost Amount",
      "Service Description"
    ],
    applicableRule: "Fleet Workshop Standard: All maintenance exceeding ₹5,000 must include an attached GST invoice."
  },
  ADD_DRIVER: {
    action: "ADD_DRIVER",
    title: "Driver Onboarding Workflow",
    summary: "Registering a certified driver into FleetDesk for authorized vehicle operation.",
    steps: [
      "1. Open Fleet Desk -> Drivers tab -> 'Add Driver'.",
      "2. Enter Driver Full Name, Primary Mobile Number, and Residential Address.",
      "3. Provide Driving License Number, License Class, and Expiry Date.",
      "4. Upload clear scans of Driving License and Medical Fitness Certificate.",
      "5. Confirm active employment status and save profile."
    ],
    requiredFields: [
      "Driver Name",
      "Mobile Contact",
      "Driving License Number",
      "License Expiry Date"
    ],
    applicableRule: "Statutory Rule: Unlicensed drivers or drivers with expired licenses cannot be assigned to trips."
  },
  SELL_VEHICLE: {
    action: "SELL_VEHICLE",
    title: "Vehicle Decommission & Sale Workflow",
    summary: "Decommissioning or transferring ownership of an asset out of active Chandak ownership.",
    steps: [
      "1. Verify target vehicle is in premises with status 'IN_STOCK'.",
      "2. Select 'Sell / Decommission Vehicle' action.",
      "3. Record Buyer Name, Contact, Sale Date, and Sale Amount (₹).",
      "4. Upload buyer acknowledgment and RTO Form 29/30 transfer forms.",
      "5. Confirm transaction to permanently transition vehicle status to 'SOLD'."
    ],
    requiredFields: [
      "Sale Price / Amount",
      "Sale Date",
      "Buyer Details",
      "Transfer Documentation"
    ],
    applicableRule: "Asset Disposal Policy: Sold vehicles are permanently locked from dispatch and maintenance logging."
  }
};

export function explainVehicleConcept(concept: string): VehicleConceptDefinition | null {
  const normalized = concept.trim().toUpperCase().replace(/[\s-]/g, "_");
  const matches: VehicleConceptDefinition[] = [];

  for (const [key, val] of Object.entries(VEHICLE_CONCEPTS)) {
    if (normalized.includes(key) || concept.toUpperCase().includes(val.concept.toUpperCase()) || key.includes(normalized)) {
      if (!matches.some(m => m.concept === val.concept)) {
        matches.push(val);
      }
    }
  }

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  return {
    concept: matches.map(m => m.concept).join(" & "),
    definition: matches.map(m => `**${m.concept}:** ${m.definition}`).join("\n\n"),
    applicableRoles: Array.from(new Set(matches.flatMap(m => m.applicableRoles))),
    rules: matches.flatMap(m => m.rules.map(r => `[${m.concept}] ${r}`)),
    sourceDocument: matches.map(m => m.sourceDocument).join(" | ")
  };
}

export function guideVehicleWorkflow(action: string) {
  const normalized = action.trim().toUpperCase().replace(/[\s-]/g, "_");

  if (normalized.includes("DRIVER")) {
    return VEHICLE_WORKFLOW_GUIDES.ADD_DRIVER;
  }

  if (
    normalized.includes("DISPATCH") ||
    normalized.includes("TRIP") ||
    normalized.includes("PASS") ||
    normalized.includes("MOVEMENT")
  ) {
    return VEHICLE_WORKFLOW_GUIDES.DISPATCH_TRIP;
  }

  if (
    normalized.includes("MAINTENANCE") ||
    normalized.includes("SERVICE") ||
    normalized.includes("REPAIR") ||
    normalized.includes("WORKSHOP")
  ) {
    return VEHICLE_WORKFLOW_GUIDES.LOG_MAINTENANCE;
  }

  if (
    normalized.includes("SELL") ||
    normalized.includes("SALE") ||
    normalized.includes("DECOMMISSION") ||
    normalized.includes("DISPOSE")
  ) {
    return VEHICLE_WORKFLOW_GUIDES.SELL_VEHICLE;
  }

  // Any variation of adding, registering, creating, onboarding, or inserting a vehicle
  // OR general question about vehicle without matching dispatch/maintenance/sell
  return VEHICLE_WORKFLOW_GUIDES.REGISTER_VEHICLE;
}
