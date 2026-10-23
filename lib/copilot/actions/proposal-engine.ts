/**
 * Chandak AI Copilot — Phase 4: Action Proposal Engine & CAS Mutation Execution
 * Enforces explicit preview, user confirmation, cryptographic HMAC signing,
 * atomic Compare-And-Swap (CAS), and TOCTOU precondition validation.
 */

import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { canAccessTask, hasPermission } from "@/lib/permissions";

// ============================================================================
// Types
// ============================================================================
export interface ActionProposalParams {
  conversationId: string;
  userId: string;
  userEmail: string;
  actionType: "UPDATE_TASK_STATUS" | "TRANSFER_TASK_OWNERSHIP" | "CREATE_TASK";
  targetEntityType: "task" | "vehicle" | "design_project";
  targetEntityId: string;
  payload: Record<string, any>;
  previewData: Record<string, any>;
}

export interface ProposalExecutionResult {
  success: boolean;
  proposalId: string;
  status: string;
  message: string;
  errorCode?: string;
  auditLogId?: string;
}

// ============================================================================
// Signature & State Hash Helpers
// ============================================================================
function getSigningSecret(): string {
  return (
    process.env.COPILOT_ACTION_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "chandak-copilot-signing-secret-v1"
  );
}

export function computeProposalSignature(params: {
  id: string;
  userId: string;
  actionType: string;
  targetEntityId: string;
  currentStateHash: string;
  expiresAt: string | number;
}): string {
  const secret = getSigningSecret();
  const expiresEpoch = typeof params.expiresAt === "number"
    ? Math.floor(params.expiresAt / 1000)
    : Math.floor(new Date(params.expiresAt).getTime() / 1000);

  const canonicalString = `${params.id}:${params.userId}:${params.actionType}:${params.targetEntityId}:${params.currentStateHash}:${expiresEpoch}`;
  return crypto.createHmac("sha256", secret).update(canonicalString).digest("hex");
}

export function verifyProposalSignature(proposal: {
  id: string;
  user_id: string;
  action_type: string;
  target_entity_id: string;
  current_state_hash: string;
  expires_at: string;
  signature: string;
}): boolean {
  const expectedSignature = computeProposalSignature({
    id: proposal.id,
    userId: proposal.user_id,
    actionType: proposal.action_type,
    targetEntityId: proposal.target_entity_id,
    currentStateHash: proposal.current_state_hash,
    expiresAt: proposal.expires_at
  });

  const sigBuffer = Buffer.from(proposal.signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

export async function computeEntityStateHash(
  entityType: string,
  entityId: string
): Promise<string | null> {
  if (entityType === "task") {
    const { data: task } = await supabaseAdmin
      .from("tasks")
      .select("id, status_id, updated_at")
      .eq("id", entityId)
      .maybeSingle();

    if (!task) return null;
    const payload = `${task.id}:${task.status_id}:${task.updated_at}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  if (entityType === "vehicle") {
    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("id, status, updated_at")
      .eq("id", entityId)
      .maybeSingle();

    if (!vehicle) return null;
    const payload = `${vehicle.id}:${vehicle.status}:${vehicle.updated_at}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  return null;
}

// ============================================================================
// 1. Create Action Proposal (Server-Controlled Staging)
// ============================================================================
export async function createActionProposal(params: ActionProposalParams) {
  // Step 1: Compute Precondition State Hash
  const currentStateHash = await computeEntityStateHash(
    params.targetEntityType,
    params.targetEntityId
  );

  if (!currentStateHash) {
    throw new Error(
      `Cannot create proposal: Target entity '${params.targetEntityId}' does not exist or has been deleted.`
    );
  }

  const proposalId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();
  // Expiry is 5 minutes from creation
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Step 2: Compute Cryptographic HMAC Signature
  const signature = computeProposalSignature({
    id: proposalId,
    userId: params.userId,
    actionType: params.actionType,
    targetEntityId: params.targetEntityId,
    currentStateHash,
    expiresAt
  });

  const sanitizedPayload = {
    ...params.payload,
    _preview: params.previewData
  };

  // Step 3: Persist Proposal via supabaseAdmin (Server Controlled)
  const { data: proposal, error } = await supabaseAdmin
    .from("copilot_action_proposals")
    .insert({
      id: proposalId,
      user_id: params.userId,
      conversation_id: params.conversationId,
      action_type: params.actionType,
      target_entity_type: params.targetEntityType,
      target_entity_id: params.targetEntityId,
      sanitized_payload: sanitizedPayload,
      current_state_hash: currentStateHash,
      expires_at: expiresAt,
      idempotency_key: idempotencyKey,
      signature: signature,
      status: "PENDING_CONFIRMATION"
    })
    .select()
    .single();

  if (error || !proposal) {
    console.error("Failed to insert copilot_action_proposals:", error);
    throw new Error(`Failed to create action proposal: ${error?.message || "Unknown error"}`);
  }

  return {
    proposalId: proposal.id,
    actionType: proposal.action_type,
    targetEntityId: proposal.target_entity_id,
    targetEntityType: proposal.target_entity_type,
    previewData: params.previewData,
    status: proposal.status,
    expiresAt: proposal.expires_at,
    requiresExplicitConfirmation: true
  };
}

// ============================================================================
// 2. Execute Action Proposal (Atomic CAS Mutation with Re-validation)
// ============================================================================
export async function executeActionProposal(
  proposalId: string,
  userId: string,
  userEmail: string
): Promise<ProposalExecutionResult> {
  // --------------------------------------------------------------------------
  // STEP 1: Fetch Existing Proposal
  // --------------------------------------------------------------------------
  const { data: proposal, error: fetchErr } = await supabaseAdmin
    .from("copilot_action_proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();

  if (fetchErr || !proposal) {
    return {
      success: false,
      proposalId,
      status: "NOT_FOUND",
      errorCode: "PROPOSAL_NOT_FOUND",
      message: "The requested action proposal does not exist."
    };
  }

  // --------------------------------------------------------------------------
  // STEP 2: Strict Ownership Check
  // --------------------------------------------------------------------------
  if (proposal.user_id !== userId) {
    return {
      success: false,
      proposalId,
      status: "REJECTED_UNAUTHORIZED",
      errorCode: "USER_MISMATCH",
      message: "Unauthorized: You can only execute action proposals created for your account."
    };
  }

  // --------------------------------------------------------------------------
  // STEP 3: Cryptographic HMAC Signature Verification
  // --------------------------------------------------------------------------
  const isSignatureValid = verifyProposalSignature(proposal);
  if (!isSignatureValid) {
    await logActionAudit({
      proposalId: proposal.id,
      conversationId: proposal.conversation_id,
      userId,
      userEmail,
      actionType: proposal.action_type,
      targetEntityType: proposal.target_entity_type,
      targetEntityId: proposal.target_entity_id,
      executionStatus: "REJECTED",
      errorMessage: "Cryptographic signature mismatch: Proposal payload or parameters were tampered with."
    });

    return {
      success: false,
      proposalId,
      status: "REJECTED_TAMPERED",
      errorCode: "SIGNATURE_INVALID",
      message: "Proposal integrity validation failed. Operation aborted."
    };
  }

  // --------------------------------------------------------------------------
  // STEP 4: Expiry Check
  // --------------------------------------------------------------------------
  if (new Date(proposal.expires_at).getTime() < Date.now()) {
    await supabaseAdmin
      .from("copilot_action_proposals")
      .update({ status: "EXPIRED" })
      .eq("id", proposalId);

    return {
      success: false,
      proposalId,
      status: "EXPIRED",
      errorCode: "PROPOSAL_EXPIRED",
      message: "This action proposal has expired (5-minute window exceeded). Please request a fresh preview."
    };
  }

  // --------------------------------------------------------------------------
  // STEP 5: Atomic Compare-And-Swap (CAS) Claim
  // --------------------------------------------------------------------------
  const { data: claimedRows, error: claimErr } = await supabaseAdmin
    .from("copilot_action_proposals")
    .update({ status: "EXECUTING" })
    .eq("id", proposalId)
    .eq("user_id", userId)
    .eq("status", "PENDING_CONFIRMATION")
    .gt("expires_at", new Date().toISOString())
    .select();

  if (claimErr || !claimedRows || claimedRows.length === 0) {
    // Check if proposal is stuck in EXECUTING for > 60 seconds (Recovery)
    if (proposal.status === "EXECUTING") {
      const proposalAgeMs = Date.now() - new Date(proposal.created_at).getTime();
      if (proposalAgeMs > 60000) {
        await supabaseAdmin
          .from("copilot_action_proposals")
          .update({ status: "FAILED_CRASH" })
          .eq("id", proposalId);

        return {
          success: false,
          proposalId,
          status: "FAILED_CRASH",
          errorCode: "CRASH_RECOVERED",
          message: "A previous execution attempt stalled. The proposal has been safely marked as FAILED_CRASH."
        };
      }
    }

    return {
      success: false,
      proposalId,
      status: proposal.status,
      errorCode: "CONCURRENT_CONFLICT",
      message: `Cannot execute: Proposal is in '${proposal.status}' state and cannot be claimed.`
    };
  }

  // --------------------------------------------------------------------------
  // STEP 6: TOCTOU Live State Check (Precondition Verification)
  // --------------------------------------------------------------------------
  const liveStateHash = await computeEntityStateHash(
    proposal.target_entity_type,
    proposal.target_entity_id
  );

  if (liveStateHash !== proposal.current_state_hash) {
    await supabaseAdmin
      .from("copilot_action_proposals")
      .update({ status: "REJECTED_CONFLICT" })
      .eq("id", proposalId);

    await logActionAudit({
      proposalId: proposal.id,
      conversationId: proposal.conversation_id,
      userId,
      userEmail,
      actionType: proposal.action_type,
      targetEntityType: proposal.target_entity_type,
      targetEntityId: proposal.target_entity_id,
      executionStatus: "REJECTED",
      errorMessage: "Precondition failed: Target entity state changed concurrently after proposal creation."
    });

    return {
      success: false,
      proposalId,
      status: "REJECTED_CONFLICT",
      errorCode: "STATE_CHANGED_CONCURRENTLY",
      message: "The task was modified by another user while this proposal was pending. Operation aborted for data integrity."
    };
  }

  // --------------------------------------------------------------------------
  // STEP 7: RBAC & Ownership Re-validation
  // --------------------------------------------------------------------------
  if (proposal.action_type === "UPDATE_TASK_STATUS") {
    const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");
    const allowed = await canAccessTask(userId, proposal.target_entity_id);

    if (!allowed && !isSuperAdmin) {
      await supabaseAdmin
        .from("copilot_action_proposals")
        .update({ status: "REJECTED_UNAUTHORIZED" })
        .eq("id", proposalId);

      await logActionAudit({
        proposalId: proposal.id,
        conversationId: proposal.conversation_id,
        userId,
        userEmail,
        actionType: proposal.action_type,
        targetEntityType: proposal.target_entity_type,
        targetEntityId: proposal.target_entity_id,
        executionStatus: "REJECTED",
        errorMessage: "Re-authorization failed: User lacks workspace or task access permissions."
      });

      return {
        success: false,
        proposalId,
        status: "REJECTED_UNAUTHORIZED",
        errorCode: "PERMISSION_DENIED",
        message: "Permission check failed: You are no longer authorized to mutate this task."
      };
    }
  }

  // --------------------------------------------------------------------------
  // STEP 8: Execution of Verified Business Logic
  // --------------------------------------------------------------------------
  try {
    const payload = proposal.sanitized_payload || {};

    if (proposal.action_type === "UPDATE_TASK_STATUS") {
      const { newStatusId, remark } = payload;
      const nowIso = new Date().toISOString();

      // Update task record
      const { error: updateErr } = await supabaseAdmin
        .from("tasks")
        .update({
          status_id: newStatusId,
          updated_at: nowIso
        })
        .eq("id", proposal.target_entity_id);

      if (updateErr) {
        throw new Error(`Database task update failed: ${updateErr.message}`);
      }

      // Record in task_activity_logs
      await supabaseAdmin.from("task_activity_logs").insert({
        task_id: proposal.target_entity_id,
        actor_id: userId,
        action: "STATUS_CHANGE",
        new_state: {
          status_id: newStatusId,
          source: "CHANDAK_AI_COPILOT",
          proposal_id: proposal.id,
          remark: remark || "Executed via Chandak Copilot"
        }
      });

      // Record comment if remark is provided
      if (remark && remark.trim().length > 0) {
        await supabaseAdmin.from("task_comments").insert({
          task_id: proposal.target_entity_id,
          author_id: userId,
          content: `[Copilot Action] ${remark.trim()}`
        });
      }
    } else {
      throw new Error(`Unsupported action type: '${proposal.action_type}'`);
    }

    // ------------------------------------------------------------------------
    // STEP 9: Final Success Finalization & Immutable Audit Log
    // ------------------------------------------------------------------------
    const executedAt = new Date().toISOString();

    await supabaseAdmin
      .from("copilot_action_proposals")
      .update({
        status: "EXECUTED",
        executed_at: executedAt
      })
      .eq("id", proposalId);

    const auditLogId = await logActionAudit({
      proposalId: proposal.id,
      conversationId: proposal.conversation_id,
      userId,
      userEmail,
      actionType: proposal.action_type,
      targetEntityType: proposal.target_entity_type,
      targetEntityId: proposal.target_entity_id,
      executionStatus: "SUCCESS",
      resultSummary: {
        executedAt,
        actionType: proposal.action_type,
        targetEntityId: proposal.target_entity_id,
        payload: proposal.sanitized_payload
      }
    });

    return {
      success: true,
      proposalId,
      status: "EXECUTED",
      message: "Action executed successfully.",
      auditLogId
    };
  } catch (executionErr: any) {
    console.error("Copilot Action Execution Error:", executionErr);

    await supabaseAdmin
      .from("copilot_action_proposals")
      .update({ status: "FAILED" })
      .eq("id", proposalId);

    await logActionAudit({
      proposalId: proposal.id,
      conversationId: proposal.conversation_id,
      userId,
      userEmail,
      actionType: proposal.action_type,
      targetEntityType: proposal.target_entity_type,
      targetEntityId: proposal.target_entity_id,
      executionStatus: "FAILED",
      errorMessage: executionErr?.message || "Execution exception occurred."
    });

    return {
      success: false,
      proposalId,
      status: "FAILED",
      errorCode: "EXECUTION_EXCEPTION",
      message: executionErr?.message || "Failed to execute approved action."
    };
  }
}

// ============================================================================
// Helper: Compliance Audit Logger
// ============================================================================
async function logActionAudit(params: {
  proposalId: string;
  conversationId: string;
  userId: string;
  userEmail: string;
  actionType: string;
  targetEntityType: string;
  targetEntityId: string;
  executionStatus: "SUCCESS" | "FAILED" | "REJECTED";
  resultSummary?: Record<string, any>;
  errorMessage?: string;
}): Promise<string | undefined> {
  const { data, error } = await supabaseAdmin
    .from("copilot_action_logs")
    .insert({
      proposal_id: params.proposalId,
      conversation_id: params.conversationId,
      user_id: params.userId,
      user_email_snapshot: params.userEmail,
      action_type: params.actionType,
      target_entity_type: params.targetEntityType,
      target_entity_id: params.targetEntityId,
      execution_status: params.executionStatus,
      result_summary: params.resultSummary || null,
      error_message: params.errorMessage || null
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to insert copilot_action_logs:", error);
  }

  return data?.id;
}
