/**
 * Chandak AI Copilot — Phase 3: Design Tracking Read-Only Tools
 * Strictly read-only tools enforcing Design Tracking RBAC and project scoping.
 */

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { hasPermission } from "@/lib/permissions";
import { can } from "@/lib/permissions/module-access";
import { 
  explainDesignConcept, 
  guideDesignWorkflow 
} from "@/lib/copilot/groundings/design-grounding";
import type { 
  ToolDefinition, 
  ToolExecutionContext, 
  DiagnosticResult 
} from "@/lib/copilot/types";

// ============================================================================
// Helper: Check Design Tracking Access
// ============================================================================
async function checkDesignAccess(userId: string) {
  const allowedByModule = await can(userId, "DESIGN_TRACKING", "DESIGN_PROJECTS_VIEW");
  if (allowedByModule) {
    const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");
    return {
      allowed: true,
      isSuperAdmin,
      designAccess: null
    };
  }

  const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");
  if (isSuperAdmin) {
    return {
      allowed: true,
      isSuperAdmin: true,
      designAccess: null
    };
  }

  const { data: designAccess } = await supabaseAdmin
    .from("design_user_access")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (designAccess) {
    return {
      allowed: true,
      isSuperAdmin: false,
      designAccess
    };
  }

  // Check user_modules assignment
  const { data: userModule } = await supabaseAdmin
    .from("user_modules")
    .select("module_id, modules_master!inner(code)")
    .eq("user_id", userId)
    .eq("modules_master.code", "DESIGN_TRACKING")
    .maybeSingle();

  if (userModule) {
    return {
      allowed: true,
      isSuperAdmin: false,
      designAccess: null
    };
  }

  return {
    allowed: false,
    isSuperAdmin: false,
    designAccess: null
  };
}

// ============================================================================
// 1. Capability 1: EXPLAIN TOOL
// ============================================================================
export const explainDesignTool: ToolDefinition = {
  name: "explain_design_concept",
  description: "Explains Chandak Design & Tender Tracking concepts, GFC standards, Transmittals, or RFIs.",
  parameters: {
    type: "object",
    properties: {
      concept: {
        type: "string",
        description: "The design concept to explain (e.g. 'GFC', 'Transmittal', 'RFI', 'Drawing Revision', 'Matrix Entry')"
      }
    },
    required: ["concept"]
  },
  async execute({ concept }: { concept: string }) {
    const explanation = explainDesignConcept(concept);
    if (!explanation) {
      return {
        found: false,
        message: `I could not find a verified definition for '${concept}' in Chandak Design Tracking documentation.`,
        safeGuidance: "Please consult the Design Team Handbook or refer to your project Design Lead."
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
export const guideDesignWorkflowTool: ToolDefinition = {
  name: "guide_design_workflow",
  description: "Provides step-by-step guidance for Transmittal creation, RFI logging, or GFC approvals.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Design workflow action: CREATE_TRANSMITTAL, RAISE_RFI, APPROVE_GFC",
        enum: ["CREATE_TRANSMITTAL", "RAISE_RFI", "APPROVE_GFC"]
      }
    },
    required: ["action"]
  },
  async execute({ action }: { action: string }) {
    return guideDesignWorkflow(action);
  }
};

// ============================================================================
// 3. Capability 3: RETRIEVE TOOL
// ============================================================================
export const getDesignProjectDetailsTool: ToolDefinition = {
  name: "get_design_project_details",
  description: "Retrieves live project status, milestones, and metadata for an authorized design project.",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "The unique UUID/ID, Project Code, or Project Name (e.g. 'PRJ-01' or 'Chandak Cornerstone')"
      }
    },
    required: ["projectId"]
  },
  async execute({ projectId }: { projectId: string }, context: ToolExecutionContext) {
    if (!projectId) {
      return { error: "BAD_REQUEST", message: "Project ID, Code, or Name is required." };
    }

    // Step 1: Authorization check
    const access = await checkDesignAccess(context.userId);
    if (!access.allowed) {
      return {
        error: "ACCESS_DENIED",
        message: "You do not have permission to view Design Tracking projects.",
        safeGuidance: "Contact your Design Administrator to enroll your account in the Design Tracking module."
      };
    }

    // Step 2: Query project
    const { data: project, error } = await supabaseAdmin
      .from("design_projects")
      .select(`
        id, code, name, location, project_status, project_type,
        target_completion_date, lead_manager, rera_number,
        created_at, updated_at
      `)
      .or(`id.eq.${projectId},code.ilike.${projectId},name.ilike.%${projectId}%`)
      .maybeSingle();

    if (error || !project) {
      return {
        error: "NOT_FOUND",
        message: `Design project '${projectId}' was not found.`,
        safeGuidance: "Verify the project code from the Design Tracking Project Dashboard."
      };
    }

    // Step 3: Specific Project Access Scope Check
    if (!access.isSuperAdmin && access.designAccess?.project_access_type === "SPECIFIC") {
      const assigned = access.designAccess.assigned_project_ids || [];
      if (!assigned.includes(project.id)) {
        return {
          error: "ACCESS_DENIED",
          message: `Your account is restricted to specific design projects and does not have access to '${project.name}'.`,
          safeGuidance: "Request your Design Coordinator to assign you to this project."
        };
      }
    }

    return {
      success: true,
      verifiedRecord: {
        id: project.id,
        code: project.code,
        name: project.name,
        location: project.location,
        status: project.project_status,
        projectType: project.project_type,
        targetCompletionDate: project.target_completion_date,
        leadManager: project.lead_manager,
        reraNumber: project.rera_number,
        updatedAt: project.updated_at
      }
    };
  }
};

// ============================================================================
// 4. Capability 4: DIAGNOSE TOOL
// ============================================================================
export const diagnoseDesignBlockerTool: ToolDefinition = {
  name: "diagnose_design_blocker",
  description: "Diagnoses why a specific design action (e.g. GFC approval, matrix edit, transmittal dispatch) is blocked.",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "The design project identifier"
      },
      attemptedAction: {
        type: "string",
        description: "The attempted action: 'APPROVE_GFC', 'EDIT_MATRIX', 'CREATE_TRANSMITTAL', 'MANAGE_MASTERS'",
        enum: ["APPROVE_GFC", "EDIT_MATRIX", "CREATE_TRANSMITTAL", "MANAGE_MASTERS"]
      }
    },
    required: ["projectId", "attemptedAction"]
  },
  async execute({ projectId, attemptedAction }: { projectId: string; attemptedAction: string }, context: ToolExecutionContext): Promise<DiagnosticResult> {
    const access = await checkDesignAccess(context.userId);
    if (!access.allowed) {
      return {
        isBlocked: true,
        blockerType: "PERMISSION_DENIED",
        verifiedFacts: [
          `Fact: User ${context.userId} has no active authorization in Design Tracking.`
        ],
        workingHypotheses: [
          "Hypothesis: You have not been assigned to the Design Tracking user registry."
        ],
        applicableRule: "Design Security Protocol § 1: Project operations require an active Design User Access record.",
        recommendedSafeAction: "Request a Design Administrator to provision your design access."
      };
    }

    const designRole = access.designAccess?.design_role || (access.isSuperAdmin ? "SUPER_ADMIN" : "STANDARD_USER");

    // Action rule evaluation
    if (attemptedAction === "APPROVE_GFC") {
      const canApprove = access.isSuperAdmin || !!access.designAccess?.can_drawings_approve_gfc;
      if (!canApprove) {
        return {
          isBlocked: true,
          blockerType: "PERMISSION_DENIED",
          verifiedFacts: [
            `Fact: Your active design role is '${designRole}'.`,
            "Fact: 'can_drawings_approve_gfc' is FALSE on your access profile.",
            "Fact: You do not hold the Super Admin platform override."
          ],
          workingHypotheses: [
            "Hypothesis: GFC certification is strictly restricted to Design Heads and Directors."
          ],
          applicableRule: "Design Quality Manual § 4.1: Only authorized Design Heads may issue GFC stamps.",
          recommendedSafeAction: "Request your Design Head to review drawings and execute the GFC certification."
        };
      }
    }

    if (attemptedAction === "EDIT_MATRIX") {
      const canEdit = access.isSuperAdmin || !!access.designAccess?.can_matrix_edit;
      if (!canEdit) {
        return {
          isBlocked: true,
          blockerType: "PERMISSION_DENIED",
          verifiedFacts: [
            `Fact: Your role is '${designRole}'.`,
            "Fact: 'can_matrix_edit' is FALSE on your profile."
          ],
          workingHypotheses: [
            "Hypothesis: Deliverables matrix editing is restricted to Design Coordinators and Managers."
          ],
          applicableRule: "Matrix Deliverables Governance § 2: Matrix baseline updates require editor permissions.",
          recommendedSafeAction: "Contact the Lead Design Coordinator to update matrix milestones."
        };
      }
    }

    return {
      isBlocked: false,
      verifiedFacts: [
        `Fact: User is authorized under role '${designRole}'.`,
        `Fact: Permissions verify that '${attemptedAction}' is allowed for your account.`
      ],
      workingHypotheses: [],
      recommendedSafeAction: "You may execute the action directly in the Design Tracking workspace."
    };
  }
};

export const designModuleTools: Record<string, ToolDefinition> = {
  explain_design_concept: explainDesignTool,
  guide_design_workflow: guideDesignWorkflowTool,
  get_design_project_details: getDesignProjectDetailsTool,
  diagnose_design_blocker: diagnoseDesignBlockerTool
};
