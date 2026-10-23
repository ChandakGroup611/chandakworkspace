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

          // Dynamically detect module context if query explicitly targets another domain
          let effectiveModule = moduleCode;
          const vRegex = /\b(vehicle|vehicles|car|cars|fleet|trip|trips|hsrp|puc|odometer|chassis|engine number|rc|driver|drivers|movement pass|dispatch)\b/i;
          const dRegex = /\b(drawing|drawings|transmittal|transmittals|gfc|architect|architects|consultant|consultants|discipline|disciplines|revision|revisions|rfi|rfis)\b/i;
          const tRegex = /\b(task|tasks|subtask|subtasks|assignee|assignees|executor|executors|watcher|watchers|workspace|workspaces|checklist|checklists)\b/i;

          if (vRegex.test(message)) {
            effectiveModule = "VEHICLE_DESK";
          } else if (dRegex.test(message)) {
            effectiveModule = "DESIGN_TRACKING";
          } else if (tRegex.test(message)) {
            effectiveModule = "TASK_WORKFLOW";
          }

          // Entity pattern matchers
          const taskUuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          const vehMatch = message.match(/veh-[a-z0-9]+/i) || message.match(/MH-[0-9]{2}-[A-Z]{1,2}-[0-9]{4}/i);
          const dwgMatch = message.match(/DWG-[a-z0-9-]+/i) || message.match(/PRJ-[a-z0-9-]+/i);

          // Capability Detection & Execution
          // ------------------------------------------------------------------
          // CAPABILITY 5: ACTION ASSIST INTENT
          // ------------------------------------------------------------------
          const isActionIntent = (
            (normalizedQuery.includes("update") || normalizedQuery.includes("change") || normalizedQuery.includes("set") || normalizedQuery.includes("mark")) &&
            (normalizedQuery.includes("status") || normalizedQuery.includes("state") || normalizedQuery.includes("hold") || normalizedQuery.includes("progress"))
          );

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
          else if (
            normalizedQuery.includes("why") || 
            normalizedQuery.includes("block") || 
            normalizedQuery.includes("cannot") || 
            normalizedQuery.includes("can't") || 
            normalizedQuery.includes("disabled") ||
            normalizedQuery.includes("unable") ||
            normalizedQuery.includes("denied")
          ) {
            if (effectiveModule === "VEHICLE_DESK") {
              let targetId = vehMatch ? vehMatch[0] : null;
              if (!targetId) {
                const { data: firstVeh } = await supabaseAdmin
                  .from("vehicles")
                  .select("id, registration_number")
                  .limit(1)
                  .maybeSingle();
                targetId = firstVeh ? firstVeh.id : "veh-mu41ekf2";
              }

              let attemptedAction = "DISPATCH";
              if (normalizedQuery.includes("sold") || normalizedQuery.includes("sell")) {
                attemptedAction = "MARK_SOLD";
              } else if (normalizedQuery.includes("delete") || normalizedQuery.includes("remove")) {
                attemptedAction = "DELETE";
              } else if (normalizedQuery.includes("maintain") || normalizedQuery.includes("repair") || normalizedQuery.includes("service")) {
                attemptedAction = "LOG_MAINTENANCE";
              }

              const diag = await vehicleModuleTools.diagnose_vehicle_blocker.execute(
                { vehicleId: targetId, attemptedAction },
                executionContext
              );

              fullAssistantText = `### Vehicle Operation Diagnosis\n\n` +
                `**Status:** ${diag.isBlocked ? "⚠️ Blocked" : "✅ Action Permitted"}\n\n` +
                `**Verified Facts:**\n${diag.verifiedFacts.map((f: string) => `- ${f}`).join("\n")}\n\n` +
                (diag.workingHypotheses.length > 0 ? `**Working Hypotheses:**\n${diag.workingHypotheses.map((h: string) => `- ${h}`).join("\n")}\n\n` : "") +
                (diag.applicableRule ? `**Applicable Rule:**\n> ${diag.applicableRule}\n\n` : "") +
                `**Recommendation:**\n${diag.recommendedSafeAction}`;
            } else if (effectiveModule === "DESIGN_TRACKING") {
              let attemptedAction = "APPROVE_GFC";
              if (normalizedQuery.includes("matrix") || normalizedQuery.includes("edit")) {
                attemptedAction = "EDIT_MATRIX";
              } else if (normalizedQuery.includes("transmittal") || normalizedQuery.includes("send")) {
                attemptedAction = "CREATE_TRANSMITTAL";
              } else if (normalizedQuery.includes("master")) {
                attemptedAction = "MANAGE_MASTERS";
              }

              const diag = await designModuleTools.diagnose_design_blocker.execute(
                { projectId: "PRJ-01", attemptedAction },
                executionContext
              );

              fullAssistantText = `### Design Action Diagnosis\n\n` +
                `**Status:** ${diag.isBlocked ? "⚠️ Blocked" : "✅ Action Permitted"}\n\n` +
                `**Verified Facts:**\n${diag.verifiedFacts.map((f: string) => `- ${f}`).join("\n")}\n\n` +
                (diag.workingHypotheses.length > 0 ? `**Working Hypotheses:**\n${diag.workingHypotheses.map((h: string) => `- ${h}`).join("\n")}\n\n` : "") +
                (diag.applicableRule ? `**Applicable Rule:**\n> ${diag.applicableRule}\n\n` : "") +
                `**Recommendation:**\n${diag.recommendedSafeAction}`;
            } else {
              let targetId = taskUuidMatch ? taskUuidMatch[0] : null;
              if (!targetId) {
                const { data: firstTask } = await supabaseAdmin
                  .from("tasks")
                  .select("id")
                  .limit(1)
                  .maybeSingle();
                targetId = firstTask ? firstTask.id : "763b4433-833d-4c63-bb09-c7e456d53616";
              }

              let attemptedAction = "EDIT_SCHEDULE";
              if (normalizedQuery.includes("resolve") || normalizedQuery.includes("complete") || normalizedQuery.includes("close")) {
                attemptedAction = "RESOLVE";
              } else if (normalizedQuery.includes("reassign") || normalizedQuery.includes("assignee")) {
                attemptedAction = "REASSIGN";
              } else if (normalizedQuery.includes("delete") || normalizedQuery.includes("remove")) {
                attemptedAction = "DELETE";
              } else if (normalizedQuery.includes("transfer")) {
                attemptedAction = "TRANSFER";
              }

              const diag = await taskModuleTools.diagnose_task_action_blocker.execute(
                { taskId: targetId, attemptedAction },
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
          else if (
            normalizedQuery.includes("guide") || 
            normalizedQuery.includes("how to") || 
            normalizedQuery.includes("how do i") || 
            normalizedQuery.includes("steps to") ||
            normalizedQuery.includes("how can i") ||
            normalizedQuery.includes("procedure to") ||
            normalizedQuery.includes("how do we") ||
            normalizedQuery.includes("step by step") ||
            normalizedQuery.includes("where to") ||
            normalizedQuery.includes("where can i") ||
            normalizedQuery.includes("where do i") ||
            normalizedQuery.includes("where is") ||
            normalizedQuery.includes("where are") ||
            normalizedQuery.includes("where check") ||
            normalizedQuery.includes("report") ||
            normalizedQuery.includes("analytics") ||
            normalizedQuery.includes("export") ||
            normalizedQuery.includes("add") || 
            normalizedQuery.includes("register") || 
            normalizedQuery.includes("create") || 
            normalizedQuery.includes("new") ||
            normalizedQuery.includes("onboard") ||
            normalizedQuery.includes("dispatch") ||
            normalizedQuery.includes("service") ||
            normalizedQuery.includes("transmittal") ||
            normalizedQuery.includes("drawing")
          ) {
            if (effectiveModule === "VEHICLE_DESK") {
              const guide = await vehicleModuleTools.guide_vehicle_workflow.execute({ action: message }, executionContext);
              fullAssistantText = `### ${guide.title}\n${guide.summary}\n\n**Step-by-Step Procedure:**\n${guide.steps.join("\n")}\n\n**Mandatory Required Fields:**\n${guide.requiredFields.map((f: string) => `- ${f}`).join("\n")}\n\n**Governance Rule:**\n> ${guide.applicableRule}`;
            } else if (effectiveModule === "DESIGN_TRACKING") {
              const guide = await designModuleTools.guide_design_workflow.execute({ action: message }, executionContext);
              fullAssistantText = `### ${guide.title}\n${guide.summary}\n\n**Step-by-Step Procedure:**\n${guide.steps.join("\n")}\n\n**Mandatory Required Fields:**\n${guide.requiredFields.map((f: string) => `- ${f}`).join("\n")}\n\n**Governance Rule:**\n> ${guide.applicableRule}`;
            } else {
              const guide = await taskModuleTools.guide_task_workflow.execute({ action: message }, executionContext);
              fullAssistantText = `### ${guide.title || guide.workflow}\n${guide.summary ? `${guide.summary}\n\n` : ""}**Step-by-Step Procedure:**\n${guide.steps.join("\n")}\n\n**Mandatory Required Fields:**\n${guide.requiredFields.map((f: string) => `- ${f}`).join("\n")}\n\n**Governance Rule:**\n> ${guide.applicableRule || guide.sourceDocument}`;
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 3: RETRIEVE LIVE DATA INTENT
          // ------------------------------------------------------------------
          else if (
            taskUuidMatch || 
            vehMatch || 
            dwgMatch || 
            normalizedQuery.includes("show") || 
            normalizedQuery.includes("details") || 
            normalizedQuery.includes("get") || 
            normalizedQuery.includes("fetch") || 
            normalizedQuery.includes("lookup")
          ) {
            if (vehMatch) {
              const res = await vehicleModuleTools.get_vehicle_details.execute({ vehicleId: vehMatch[0] }, executionContext);
              if (res.success && res.verifiedRecord) {
                const rec = res.verifiedRecord;
                fullAssistantText = `### Vehicle Details: ${rec.registrationNumber} (${rec.make} ${rec.model} ${rec.variant || ""})\n\n` +
                  `- **ID:** \`${rec.id}\`\n` +
                  `- **Status:** \`${rec.status}\`\n` +
                  `- **Category:** ${rec.category || "General"}\n` +
                  `- **VIN / Chassis:** \`${rec.vinChassisNumber || "N/A"}\`\n` +
                  `- **Engine Number:** \`${rec.engineNumber || "N/A"}\`\n` +
                  `- **Odometer:** ${rec.odometerKm || 0} km\n` +
                  `- **Insurance Policy:** ${rec.insurancePolicyNumber || "N/A"} (Expiry: ${rec.insuranceExpiryDate || "N/A"})\n` +
                  `- **PUC Expiry:** ${rec.pucExpiryDate || "N/A"}`;
              } else {
                fullAssistantText = `⚠️ **${res.error}:** ${res.message}\n\n*${res.safeGuidance || ""}*`;
              }
            } else if (taskUuidMatch) {
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
            } else if (dwgMatch) {
              const res = await designModuleTools.get_drawing_details.execute({ drawingId: dwgMatch[0] }, executionContext);
              if (res.success && res.verifiedRecord) {
                const rec = res.verifiedRecord;
                fullAssistantText = `### Drawing Details: ${rec.drawingNumber}\n\n` +
                  `- **Title:** ${rec.title}\n` +
                  `- **Revision:** \`${rec.currentRevision}\`\n` +
                  `- **Status:** \`${rec.approvalStatus}\`\n` +
                  `- **Discipline:** ${rec.discipline}\n` +
                  `- **Consultant:** ${rec.consultantName || "Internal"}`;
              } else {
                fullAssistantText = `⚠️ **${res.error}:** ${res.message}\n\n*${res.safeGuidance || ""}*`;
              }
            } else {
              fullAssistantText = "Please specify a unique Task UUID, Vehicle Registration Number (e.g. MH-02-EE-8522), or Drawing ID to retrieve live details.";
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 1: EXPLAIN INTENT (DEFAULT)
          // ------------------------------------------------------------------
          else {
            let explanation: any = null;
            if (effectiveModule === "VEHICLE_DESK") {
              explanation = await vehicleModuleTools.explain_vehicle_concept.execute({ concept: message }, executionContext);
            } else if (effectiveModule === "DESIGN_TRACKING") {
              explanation = await designModuleTools.explain_design_concept.execute({ concept: message }, executionContext);
            } else {
              explanation = await taskModuleTools.explain_task_concept.execute({ concept: message }, executionContext);
            }

            if (explanation && explanation.found) {
              fullAssistantText = `### ${explanation.concept || explanation.topic}\n\n${explanation.definition}\n\n` +
                (explanation.applicableRoles ? `**Applicable Roles:**\n${explanation.applicableRoles.map((r: string) => `- ${r}`).join("\n")}\n\n` : "") +
                (explanation.rules || explanation.keyRules ? `**Key Rules:**\n${(explanation.rules || explanation.keyRules).map((r: string) => `- ${r}`).join("\n")}\n\n` : "") +
                `*Source: ${explanation.sourceDocument}*`;
            } else {
              // Cross-module fallback if not found in current module
              let fallbackExp: any = null;
              if (effectiveModule !== "VEHICLE_DESK") {
                const tryVeh = await vehicleModuleTools.explain_vehicle_concept.execute({ concept: message }, executionContext);
                if (tryVeh && tryVeh.found) fallbackExp = tryVeh;
              }
              if (!fallbackExp && effectiveModule !== "TASK_WORKFLOW") {
                const tryTsk = await taskModuleTools.explain_task_concept.execute({ concept: message }, executionContext);
                if (tryTsk && tryTsk.found) fallbackExp = tryTsk;
              }
              if (!fallbackExp && effectiveModule !== "DESIGN_TRACKING") {
                const tryDsg = await designModuleTools.explain_design_concept.execute({ concept: message }, executionContext);
                if (tryDsg && tryDsg.found) fallbackExp = tryDsg;
              }

              if (fallbackExp) {
                fullAssistantText = `### ${fallbackExp.concept || fallbackExp.topic}\n\n${fallbackExp.definition}\n\n` +
                  (fallbackExp.applicableRoles ? `**Applicable Roles:**\n${fallbackExp.applicableRoles.map((r: string) => `- ${r}`).join("\n")}\n\n` : "") +
                  (fallbackExp.rules || fallbackExp.keyRules ? `**Key Rules:**\n${(fallbackExp.rules || fallbackExp.keyRules).map((r: string) => `- ${r}`).join("\n")}\n\n` : "") +
                  `*Source: ${fallbackExp.sourceDocument}*`;
              } else {
                fullAssistantText = (explanation && explanation.message) ? (explanation.message + "\n\n" + (explanation.safeGuidance || "")) : `I could not find verified documentation for '${message}'. Please check your spelling or refer to the module user manual.`;
              }
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
