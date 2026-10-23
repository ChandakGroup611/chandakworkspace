/**
 * Chandak AI Copilot — Phase 3: Vehicle Desk Read-Only Tools
 * Strictly read-only tools enforcing Fleet Desk RBAC and vehicle state rules.
 */

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { hasPermission } from "@/lib/permissions";
import { 
  explainVehicleConcept, 
  guideVehicleWorkflow 
} from "@/lib/copilot/groundings/vehicle-grounding";
import type { 
  ToolDefinition, 
  ToolExecutionContext, 
  DiagnosticResult 
} from "@/lib/copilot/types";

// ============================================================================
// Helper: Check Fleet Desk Access
// ============================================================================
async function checkFleetAccess(userId: string) {
  const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");
  if (isSuperAdmin) {
    return {
      allowed: true,
      isSuperAdmin: true,
      fleetAccess: null
    };
  }

  const { data: fleetAccess } = await supabaseAdmin
    .from("fleet_user_access")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fleetAccess) {
    return {
      allowed: true,
      isSuperAdmin: false,
      fleetAccess
    };
  }

  // Check user_modules assignment
  const { data: userModule } = await supabaseAdmin
    .from("user_modules")
    .select("module_id, modules_master!inner(code)")
    .eq("user_id", userId)
    .eq("modules_master.code", "VEHICLE_DESK")
    .maybeSingle();

  if (userModule) {
    return {
      allowed: true,
      isSuperAdmin: false,
      fleetAccess: null
    };
  }

  return {
    allowed: false,
    isSuperAdmin: false,
    fleetAccess: null
  };
}

// ============================================================================
// 1. Capability 1: EXPLAIN TOOL
// ============================================================================
export const explainVehicleTool: ToolDefinition = {
  name: "explain_vehicle_concept",
  description: "Explains Chandak Fleet Desk concepts, roles, vehicle statuses, or transport compliance rules.",
  parameters: {
    type: "object",
    properties: {
      concept: {
        type: "string",
        description: "The vehicle or fleet concept (e.g. 'Movement Pass', 'Fleet Workshop', 'Vehicle Status', 'HSRP', 'PUC')"
      }
    },
    required: ["concept"]
  },
  async execute({ concept }: { concept: string }) {
    const explanation = explainVehicleConcept(concept);
    if (!explanation) {
      return {
        found: false,
        message: `I could not find a verified definition for '${concept}' in Chandak FleetDesk documentation.`,
        safeGuidance: "Please refer to the Chandak Transport & Fleet Operations manual."
      };
    }
    return {
      found: true,
      ...explanation
    };
  }
};

// ============================================================================
// 2. Capability 2: GUIDE TOOL
// ============================================================================
export const guideVehicleWorkflowTool: ToolDefinition = {
  name: "guide_vehicle_workflow",
  description: "Provides step-by-step guidance for vehicle registration, trip dispatch, or maintenance logging.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Fleet workflow action: REGISTER_VEHICLE, DISPATCH_TRIP, LOG_MAINTENANCE",
        enum: ["REGISTER_VEHICLE", "DISPATCH_TRIP", "LOG_MAINTENANCE"]
      }
    },
    required: ["action"]
  },
  async execute({ action }: { action: string }) {
    return guideVehicleWorkflow(action);
  }
};

// ============================================================================
// 3. Capability 3: RETRIEVE TOOL
// ============================================================================
export const getVehicleDetailsTool: ToolDefinition = {
  name: "get_vehicle_details",
  description: "Retrieves live registration, specifications, and compliance data for an authorized vehicle.",
  parameters: {
    type: "object",
    properties: {
      vehicleId: {
        type: "string",
        description: "The unique UUID/ID or Registration Number of the vehicle (e.g. 'veh-mu41ekf2' or 'MH-02-EE-8522')"
      }
    },
    required: ["vehicleId"]
  },
  async execute({ vehicleId }: { vehicleId: string }, context: ToolExecutionContext) {
    if (!vehicleId) {
      return { error: "BAD_REQUEST", message: "Vehicle ID or Registration Number is required." };
    }

    // Authorization check
    const access = await checkFleetAccess(context.userId);
    if (!access.allowed) {
      return {
        error: "ACCESS_DENIED",
        message: "You do not have permission to view Fleet Desk vehicles.",
        safeGuidance: "Contact your Fleet Administrator or System Admin to assign Vehicle Desk access."
      };
    }

    // Query vehicle
    let query = supabaseAdmin
      .from("vehicles")
      .select(`
        id, registration_number, registration_date, make, model, variant, category,
        vin_chassis_number, engine_number, status, odometer_km, paint_color,
        insurance_policy_number, insurance_expiry_date, puc_expiry_date,
        created_at, updated_at
      `);

    if (vehicleId.startsWith("veh-") || vehicleId.includes("-")) {
      query = query.or(`id.eq.${vehicleId},registration_number.ilike.${vehicleId}`);
    } else {
      query = query.eq("registration_number", vehicleId);
    }

    const { data: vehicle, error } = await query.maybeSingle();

    if (error || !vehicle) {
      return {
        error: "NOT_FOUND",
        message: `Vehicle '${vehicleId}' was not found in the fleet registry.`,
        safeGuidance: "Verify the registration number from the Fleet Desk inventory."
      };
    }

    // Specific vehicle scope restriction
    if (!access.isSuperAdmin && access.fleetAccess?.scope_type === "SPECIFIC") {
      const assigned = access.fleetAccess.assigned_vehicle_ids || [];
      if (!assigned.includes(vehicle.id)) {
        return {
          error: "ACCESS_DENIED",
          message: `Your fleet role is restricted to specific vehicles and does not include '${vehicle.registration_number}'.`,
          safeGuidance: "Request your Fleet Lead to grant you access to this vehicle."
        };
      }
    }

    return {
      success: true,
      verifiedRecord: {
        id: vehicle.id,
        registrationNumber: vehicle.registration_number,
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant,
        category: vehicle.category,
        vinChassisNumber: vehicle.vin_chassis_number,
        engineNumber: vehicle.engine_number,
        status: vehicle.status,
        odometerKm: vehicle.odometer_km,
        paintColor: vehicle.paint_color,
        insurancePolicyNumber: vehicle.insurance_policy_number,
        insuranceExpiryDate: vehicle.insurance_expiry_date,
        pucExpiryDate: vehicle.puc_expiry_date,
        updatedAt: vehicle.updated_at
      }
    };
  }
};

// ============================================================================
// 4. Capability 4: DIAGNOSE TOOL
// ============================================================================
export const diagnoseVehicleBlockerTool: ToolDefinition = {
  name: "diagnose_vehicle_blocker",
  description: "Diagnoses why a specific vehicle action (e.g. dispatch trip, mark sold, delete) is blocked.",
  parameters: {
    type: "object",
    properties: {
      vehicleId: {
        type: "string",
        description: "The vehicle identifier"
      },
      attemptedAction: {
        type: "string",
        description: "The action attempted: 'DISPATCH', 'MARK_SOLD', 'DELETE', 'LOG_MAINTENANCE'",
        enum: ["DISPATCH", "MARK_SOLD", "DELETE", "LOG_MAINTENANCE"]
      }
    },
    required: ["vehicleId", "attemptedAction"]
  },
  async execute({ vehicleId, attemptedAction }: { vehicleId: string; attemptedAction: string }, context: ToolExecutionContext): Promise<DiagnosticResult> {
    const access = await checkFleetAccess(context.userId);
    if (!access.allowed) {
      return {
        isBlocked: true,
        blockerType: "PERMISSION_DENIED",
        verifiedFacts: [
          `Fact: User ${context.userId} has no active enrollment in the VEHICLE_DESK module.`
        ],
        workingHypotheses: [
          "Hypothesis: You have not been assigned a Fleet Desk role in IAM."
        ],
        applicableRule: "Fleet Security Policy: Vehicle operations require an active Fleet User Access record.",
        recommendedSafeAction: "Request a Fleet Administrator or IT Admin to assign you Fleet Desk module access."
      };
    }

    // Retrieve vehicle
    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("id, registration_number, status, puc_expiry_date, insurance_expiry_date")
      .or(`id.eq.${vehicleId},registration_number.ilike.${vehicleId}`)
      .maybeSingle();

    if (!vehicle) {
      return {
        isBlocked: true,
        verifiedFacts: [`Fact: Vehicle '${vehicleId}' does not exist in the fleet registry.`],
        workingHypotheses: ["Hypothesis: The vehicle record may have been purged or archived."],
        recommendedSafeAction: "Check the registration number in the Fleet Desk overview."
      };
    }

    const fleetRole = access.fleetAccess?.fleetRole || (access.isSuperAdmin ? "SUPER_ADMIN" : "STANDARD_USER");

    // Diagnostic rules
    if (attemptedAction === "DISPATCH") {
      // Check 1: User permission
      if (!access.isSuperAdmin && !access.fleetAccess?.can_dispatch_trips) {
        return {
          isBlocked: true,
          blockerType: "PERMISSION_DENIED",
          verifiedFacts: [
            `Fact: Your active fleet role is '${fleetRole}'.`,
            "Fact: 'can_dispatch_trips' permission is FALSE on your fleet access profile.",
            "Fact: You do not hold the Super Admin override role."
          ],
          workingHypotheses: [
            "Hypothesis: Your role is designated for maintenance or asset recording rather than daily transport dispatch."
          ],
          applicableRule: "Fleet Desk Operating Protocol § 3: Only users with 'can_dispatch_trips' may issue Movement Passes.",
          recommendedSafeAction: "Request your Fleet Lead or Dispatch Supervisor to dispatch this vehicle."
        };
      }

      // Check 2: Vehicle operational status
      if (vehicle.status !== "IN_STOCK") {
        return {
          isBlocked: true,
          blockerType: "STATUS_LOCKED",
          verifiedFacts: [
            `Fact: Vehicle '${vehicle.registration_number}' current status is '${vehicle.status}'.`,
            "Fact: Only vehicles with status 'IN_STOCK' are eligible for trip dispatch."
          ],
          workingHypotheses: [
            vehicle.status === "MAINTENANCE" 
              ? "Hypothesis: The vehicle is currently undergoing workshop repairs and cannot safely be operated."
              : vehicle.status === "IN_TRANSIT"
              ? "Hypothesis: The vehicle is already on an active run with an existing movement pass."
              : "Hypothesis: The vehicle has been decommissioned or sold."
          ],
          applicableRule: "Fleet Safety Standard § 1.2: Vehicles in MAINTENANCE or IN_TRANSIT cannot be double-dispatched.",
          recommendedSafeAction: vehicle.status === "MAINTENANCE"
            ? "Wait for the workshop technician to log the release inspection before dispatching."
            : "Verify active runs in the Fleet Desk Movement Log."
        };
      }
    }

    if (attemptedAction === "MARK_SOLD" || attemptedAction === "DELETE") {
      if (!access.isSuperAdmin && fleetRole !== "FLEET_ADMIN") {
        return {
          isBlocked: true,
          blockerType: "PERMISSION_DENIED",
          verifiedFacts: [
            `Fact: Your role is '${fleetRole}'.`,
            "Fact: Asset decommissioning and deletion requires 'FLEET_ADMIN' or 'SUPER_ADMIN'."
          ],
          workingHypotheses: [
            "Hypothesis: Standard staff members cannot alter capital asset ownership records."
          ],
          applicableRule: "Asset Governance Policy: Vehicle disposal requires Fleet Administrator authorization.",
          recommendedSafeAction: "Submit an asset disposal request to the Fleet Administrator."
        };
      }
    }

    return {
      isBlocked: false,
      verifiedFacts: [
        `Fact: User is authorized under role '${fleetRole}'.`,
        `Fact: Vehicle '${vehicle.registration_number}' is in a valid state for '${attemptedAction}'.`
      ],
      workingHypotheses: [],
      recommendedSafeAction: "You may proceed with the operation in the Fleet Desk portal."
    };
  }
};

export const vehicleModuleTools: Record<string, ToolDefinition> = {
  explain_vehicle_concept: explainVehicleTool,
  guide_vehicle_workflow: guideVehicleWorkflowTool,
  get_vehicle_details: getVehicleDetailsTool,
  diagnose_vehicle_blocker: diagnoseVehicleBlockerTool
};
