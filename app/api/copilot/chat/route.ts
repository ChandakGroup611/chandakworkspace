import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { taskModuleTools } from "@/lib/copilot/tools/task-tools";
import { vehicleModuleTools } from "@/lib/copilot/tools/vehicle-tools";
import { designModuleTools } from "@/lib/copilot/tools/design-tools";
import { createActionProposal } from "@/lib/copilot/actions/proposal-engine";
import type { ToolExecutionContext } from "@/lib/copilot/types";

export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 32768; // 32KB request size limit

// Helper to format SSE events
function sseChunk(event: string, data: any): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Server Kill-Switch (Active by default; soft kill-switch engaged only if explicitly set to 'false')
    const copilotEnabled = process.env.COPILOT_ENABLED !== "false";
    if (!copilotEnabled) {
      return NextResponse.json(
        { error: "SERVICE_UNAVAILABLE", message: "Chandak AI Copilot is currently offline." },
        { status: 503 }
      );
    }

    // 2. Authenticate User Session
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "You must be signed in to access Chandak Copilot." },
        { status: 401 }
      );
    }

    // 3. Payload Size Check
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "PAYLOAD_TOO_LARGE", message: "Prompt exceeds 32KB limit." },
        { status: 413 }
      );
    }

    const body = JSON.parse(rawBody);
    const { message, moduleCode = "TASK_WORKFLOW", contextPath = "" } = body;
    let { conversationId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Message is required." },
        { status: 400 }
      );
    }

    // 4. Conversation Lifecycle Management
    if (!conversationId) {
      const title = message.trim().slice(0, 45) + (message.length > 45 ? "…" : "");
      const { data: newConvo, error: convoErr } = await supabaseAdmin
        .from("copilot_conversations")
        .insert({
          user_id: user.id,
          title,
          module_code: moduleCode
        })
        .select("id")
        .single();

      if (convoErr || !newConvo) {
        throw new Error(`Failed to initialize conversation: ${convoErr?.message}`);
      }
      conversationId = newConvo.id;
    } else {
      // Validate conversation belongs to user
      const { data: existingConvo } = await supabaseAdmin
        .from("copilot_conversations")
        .select("id, user_id")
        .eq("id", conversationId)
        .maybeSingle();

      if (!existingConvo || existingConvo.user_id !== user.id) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Access denied to conversation." },
          { status: 403 }
        );
      }
    }

    // Persist User Message
    await supabaseAdmin.from("copilot_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: message.trim()
    });

    const executionContext: ToolExecutionContext = {
      userId: user.id,
      userEmail: user.email || "",
      moduleCode: moduleCode as any,
      contextPath
    };

    // 5. Native ReadableStream Response
    let isAborted = false;
    req.signal.addEventListener("abort", () => {
      isAborted = true;
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata
          controller.enqueue(sseChunk("meta", { conversationId, moduleCode }));

          const normalizedQuery = message.trim().toLowerCase();
          let fullAssistantText = "";
          let actionPreviewData: any = null;

          // Capability Detection & Execution
          // ------------------------------------------------------------------
          // CAPABILITY 5: ACTION ASSIST INTENT
          // ------------------------------------------------------------------
          const isActionIntent = (
            (normalizedQuery.includes("update") || normalizedQuery.includes("change") || normalizedQuery.includes("set")) &&
            (normalizedQuery.includes("status") || normalizedQuery.includes("state"))
          );

          const taskUuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

          if (isActionIntent && taskUuidMatch) {
            const taskId = taskUuidMatch[0];
            // Lookup status code if mentioned
            const { data: statuses } = await supabaseAdmin
              .from("status_master")
              .select("id, status_name, status_code");

            let targetStatus = (statuses || []).find(s => 
              normalizedQuery.includes(s.status_name.toLowerCase()) || 
              normalizedQuery.includes(s.status_code.toLowerCase())
            );

            // Default to Hold if not explicitly specified
            if (!targetStatus) {
              targetStatus = (statuses || []).find(s => s.status_code === "HOLD") || statuses?.[0];
            }

            if (targetStatus) {
              const proposal = await createActionProposal({
                conversationId,
                userId: user.id,
                userEmail: user.email || "",
                actionType: "UPDATE_TASK_STATUS",
                targetEntityType: "task",
                targetEntityId: taskId,
                payload: {
                  newStatusId: targetStatus.id,
                  remark: "Status updated via Chandak Copilot"
                },
                previewData: {
                  field: "Status",
                  targetStatusName: targetStatus.status_name || targetStatus.status_code,
                  taskId
                }
              });

              actionPreviewData = {
                proposalId: proposal.proposalId,
                actionType: "UPDATE_TASK_STATUS",
                targetEntityId: taskId,
                targetEntityType: "task",
                previewTitle: `Update Task Status to ${targetStatus.status_name || targetStatus.status_code}`,
                currentValue: "Current Status",
                proposedValue: targetStatus.status_name || targetStatus.status_code,
                expiresAt: proposal.expiresAt,
                status: "PENDING_CONFIRMATION",
                requiresExplicitConfirmation: true
              };

              fullAssistantText = `I have prepared an action proposal to update Task \`${taskId}\` status to **${targetStatus.status_name || targetStatus.status_code}**.\n\nPlease review the preview card below and click **Confirm & Execute** to apply the change.`;
            } else {
              fullAssistantText = `I identified the target task (\`${taskId}\`), but could not determine the requested status from your message. Please specify the desired status (e.g., HOLD, IN_PROGRESS, RESOLVED).`;
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 4: DIAGNOSE INTENT
          // ------------------------------------------------------------------
          else if (normalizedQuery.includes("why") || normalizedQuery.includes("block") || normalizedQuery.includes("cannot") || normalizedQuery.includes("can't") || normalizedQuery.includes("disabled")) {
            if (moduleCode === "VEHICLE_DESK") {
              const vehMatch = message.match(/veh-[a-z0-9]+/i) || message.match(/MH-[0-9]{2}-[A-Z]{1,2}-[0-9]{4}/i);
              const targetId = vehMatch ? vehMatch[0] : "veh-mu41ekf2";
              const diag = await vehicleModuleTools.diagnose_vehicle_blocker.execute(
                { vehicleId: targetId, attemptedAction: "DISPATCH" },
                executionContext
              );

              fullAssistantText = `### Vehicle Operation Diagnosis\n\n` +
                `**Status:** ${diag.isBlocked ? "⚠️ Blocked" : "✅ Action Permitted"}\n\n` +
                `**Verified Facts:**\n${diag.verifiedFacts.map((f: string) => `- ${f}`).join("\n")}\n\n` +
                (diag.workingHypotheses.length > 0 ? `**Working Hypotheses:**\n${diag.workingHypotheses.map((h: string) => `- ${h}`).join("\n")}\n\n` : "") +
                (diag.applicableRule ? `**Applicable Rule:**\n> ${diag.applicableRule}\n\n` : "") +
                `**Recommendation:**\n${diag.recommendedSafeAction}`;
            } else if (moduleCode === "DESIGN_TRACKING") {
              const diag = await designModuleTools.diagnose_design_blocker.execute(
                { projectId: "PRJ-01", attemptedAction: "APPROVE_GFC" },
                executionContext
              );

              fullAssistantText = `### Design Action Diagnosis\n\n` +
                `**Status:** ${diag.isBlocked ? "⚠️ Blocked" : "✅ Action Permitted"}\n\n` +
                `**Verified Facts:**\n${diag.verifiedFacts.map((f: string) => `- ${f}`).join("\n")}\n\n` +
                (diag.workingHypotheses.length > 0 ? `**Working Hypotheses:**\n${diag.workingHypotheses.map((h: string) => `- ${h}`).join("\n")}\n\n` : "") +
                (diag.applicableRule ? `**Applicable Rule:**\n> ${diag.applicableRule}\n\n` : "") +
                `**Recommendation:**\n${diag.recommendedSafeAction}`;
            } else {
              const targetId = taskUuidMatch ? taskUuidMatch[0] : "763b4433-833d-4c63-bb09-c7e456d53616";
              const diag = await taskModuleTools.diagnose_task_action_blocker.execute(
                { taskId: targetId, attemptedAction: "EDIT_SCHEDULE" },
                executionContext
              );

              fullAssistantText = `### Task Action Diagnosis\n\n` +
                `**Status:** ${diag.isBlocked ? "⚠️ Blocked" : "✅ Action Permitted"}\n\n` +
                `**Verified Facts:**\n${diag.verifiedFacts.map((f: string) => `- ${f}`).join("\n")}\n\n` +
                (diag.workingHypotheses.length > 0 ? `**Working Hypotheses:**\n${diag.workingHypotheses.map((h: string) => `- ${h}`).join("\n")}\n\n` : "") +
                (diag.applicableRule ? `**Applicable Rule:**\n> ${diag.applicableRule}\n\n` : "") +
                `**Recommendation:**\n${diag.recommendedSafeAction}`;
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 2: GUIDE WORKFLOW INTENT
          // ------------------------------------------------------------------
          else if (normalizedQuery.includes("guide") || normalizedQuery.includes("how to") || normalizedQuery.includes("how do i") || normalizedQuery.includes("steps to")) {
            if (moduleCode === "VEHICLE_DESK") {
              const guide = await vehicleModuleTools.guide_vehicle_workflow.execute({ action: "DISPATCH_TRIP" }, executionContext);
              fullAssistantText = `### ${guide.title}\n${guide.summary}\n\n**Step-by-Step Procedure:**\n${guide.steps.join("\n")}\n\n**Mandatory Required Fields:**\n${guide.requiredFields.map((f: string) => `- ${f}`).join("\n")}\n\n**Governance Rule:**\n> ${guide.applicableRule}`;
            } else if (moduleCode === "DESIGN_TRACKING") {
              const guide = await designModuleTools.guide_design_workflow.execute({ action: "CREATE_TRANSMITTAL" }, executionContext);
              fullAssistantText = `### ${guide.title}\n${guide.summary}\n\n**Step-by-Step Procedure:**\n${guide.steps.join("\n")}\n\n**Mandatory Required Fields:**\n${guide.requiredFields.map((f: string) => `- ${f}`).join("\n")}\n\n**Governance Rule:**\n> ${guide.applicableRule}`;
            } else {
              const guide = await taskModuleTools.guide_task_workflow.execute({ action: "CREATE" }, executionContext);
              fullAssistantText = `### ${guide.title}\n${guide.summary}\n\n**Step-by-Step Procedure:**\n${guide.steps.join("\n")}\n\n**Mandatory Required Fields:**\n${guide.requiredFields.map((f: string) => `- ${f}`).join("\n")}\n\n**Governance Rule:**\n> ${guide.applicableRule}`;
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 3: RETRIEVE LIVE DATA INTENT
          // ------------------------------------------------------------------
          else if (taskUuidMatch || normalizedQuery.includes("show") || normalizedQuery.includes("details") || normalizedQuery.includes("get")) {
            if (taskUuidMatch) {
              const res = await taskModuleTools.get_task_details.execute({ taskId: taskUuidMatch[0] }, executionContext);
              if (res.success && res.verifiedRecord) {
                const rec = res.verifiedRecord;
                fullAssistantText = `### Task Details: ${rec.title}\n\n` +
                  `- **ID:** \`${rec.id}\`\n` +
                  `- **Status:** \`${rec.status}\`\n` +
                  `- **Primary Assignee:** ${rec.primaryAssignee}\n` +
                  `- **Creator:** ${rec.creator}\n` +
                  `- **Your Verified Role:** ${rec.callerRoleOnTask}\n` +
                  `- **Checklists:** ${rec.completedChecklistsCount}/${rec.checklistsCount} completed\n` +
                  `- **Due Date:** ${rec.dueDate || "Not set"}`;
              } else {
                fullAssistantText = `⚠️ **${res.error}:** ${res.message}\n\n*${res.safeGuidance || ""}*`;
              }
            } else {
              fullAssistantText = "Please provide the unique Task UUID or Vehicle Registration Number you wish to retrieve.";
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 1: EXPLAIN INTENT (DEFAULT)
          // ------------------------------------------------------------------
          else {
            let explanation: any = null;
            if (moduleCode === "VEHICLE_DESK") {
              explanation = await vehicleModuleTools.explain_vehicle_concept.execute({ concept: message }, executionContext);
            } else if (moduleCode === "DESIGN_TRACKING") {
              explanation = await designModuleTools.explain_design_concept.execute({ concept: message }, executionContext);
            } else {
              explanation = await taskModuleTools.explain_task_concept.execute({ concept: message }, executionContext);
            }

            if (explanation.found) {
              fullAssistantText = `### ${explanation.concept}\n\n${explanation.definition}\n\n` +
                `**Applicable Roles:**\n${explanation.applicableRoles.map((r: string) => `- ${r}`).join("\n")}\n\n` +
                `**Key Rules:**\n${explanation.rules.map((r: string) => `- ${r}`).join("\n")}\n\n` +
                `*Source: ${explanation.sourceDocument}*`;
            } else {
              fullAssistantText = explanation.message + "\n\n" + (explanation.safeGuidance || "");
            }
          }

          // Stream Text in realistic, immediate tokens
          const words = fullAssistantText.split(" ");
          for (let i = 0; i < words.length; i++) {
            if (isAborted) break;
            const token = words[i] + (i < words.length - 1 ? " " : "");
            controller.enqueue(sseChunk("token", { token }));
            // Yield smoothly
            if (i % 3 === 0) {
              await new Promise(r => setTimeout(r, 15));
            }
          }

          // Send Action Preview Event if created
          if (actionPreviewData && !isAborted) {
            controller.enqueue(sseChunk("action_preview", actionPreviewData));
          }

          // Send Done Event
          if (!isAborted) {
            controller.enqueue(sseChunk("done", { status: "complete" }));
          }

          // Persist Assistant Message in Database
          await supabaseAdmin.from("copilot_messages").insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: fullAssistantText,
            action_preview: actionPreviewData || null
          });

          controller.close();
        } catch (err: any) {
          console.error("Stream Execution Error:", err);
          controller.enqueue(sseChunk("error", { message: err?.message || "Internal streaming error." }));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (err: any) {
    console.error("Chat Route Error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err?.message || "Failed to process chat request." },
      { status: 500 }
    );
  }
}
