/**
 * Chandak AI Copilot — Core Domain Types
 */

export type CopilotRole = "system" | "user" | "assistant" | "tool";

export interface CopilotMessage {
  id?: string;
  role: CopilotRole;
  content: string;
  toolCalls?: CopilotToolCall[];
  actionPreview?: CopilotActionPreview;
  createdAt?: string;
}

export interface CopilotToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

export interface CopilotActionPreview {
  proposalId: string;
  actionType: string;
  targetEntityId: string;
  targetEntityType: string;
  previewTitle: string;
  currentValue?: any;
  proposedValue?: any;
  status: "PENDING_CONFIRMATION" | "EXECUTING" | "EXECUTED" | "EXPIRED" | "CANCELLED" | "REJECTED_UNAUTHORIZED" | "REJECTED_CONFLICT" | "FAILED";
  expiresAt: string;
  requiresExplicitConfirmation: boolean;
}

export interface ToolExecutionContext {
  userId: string;
  userEmail: string;
  moduleCode: "TASK_WORKFLOW" | "VEHICLE_DESK" | "DESIGN_TRACKING" | "GENERAL";
  contextPath?: string;
}

export interface DiagnosticResult {
  isBlocked: boolean;
  blockerType?: "PERMISSION_DENIED" | "PREREQUISITE_MISSING" | "VALIDATION_FAILED" | "STATUS_LOCKED";
  verifiedFacts: string[];
  workingHypotheses: string[];
  applicableRule?: string;
  recommendedSafeAction: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  execute: (args: any, context: ToolExecutionContext) => Promise<any>;
}
