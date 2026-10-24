import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { taskModuleTools } from "@/lib/copilot/tools/task-tools";
import { vehicleModuleTools } from "@/lib/copilot/tools/vehicle-tools";
import { designModuleTools } from "@/lib/copilot/tools/design-tools";
import { createActionProposal } from "@/lib/copilot/actions/proposal-engine";
import { streamLLMResponse, type ChatMessage } from "@/lib/copilot/llm-provider";
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

    // 4.1 Fetch recent conversation history in chronological order (earliest to latest)
    const { data: recentMessagesDesc } = await supabaseAdmin
      .from("copilot_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const pastMessages: ChatMessage[] = (recentMessagesDesc || []).reverse().map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content || ""
    }));

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

          const emitToken = (token: string) => {
            if (isAborted) return;
            fullAssistantText += token;
            controller.enqueue(sseChunk("token", { token }));
          };

          const streamWords = async (text: string) => {
            const words = text.split(" ");
            for (let i = 0; i < words.length; i++) {
              if (isAborted) break;
              const token = words[i] + (i < words.length - 1 ? " " : "");
              emitToken(token);
              if (i % 3 === 0) {
                await new Promise((r) => setTimeout(r, 12));
              }
            }
          };

          // Detect domain keywords
          const vRegex = /\b(vehicle|vehicles|car|cars|fleet|trip|trips|hsrp|puc|odometer|chassis|engine number|rc|driver|drivers|movement pass|dispatch)\b/i;
          const dRegex = /\b(drawing|drawings|transmittal|transmittals|gfc|architect|architects|consultant|consultants|discipline|disciplines|revision|revisions|rfi|rfis)\b/i;
          const tRegex = /\b(task|tasks|subtask|subtasks|assignee|assignees|executor|executors|watcher|watchers|workspace|workspaces|checklist|checklists)\b/i;

          let effectiveModule = moduleCode;
          if (vRegex.test(message)) {
            effectiveModule = "VEHICLE_DESK";
          } else if (dRegex.test(message)) {
            effectiveModule = "DESIGN_TRACKING";
          } else if (tRegex.test(message)) {
            effectiveModule = "TASK_WORKFLOW";
          }

          // Entity pattern matchers
          let taskUuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          let vehMatch = message.match(/veh-[a-z0-9]+/i) || message.match(/MH-[0-9]{2}-[A-Z]{1,2}-[0-9]{4}/i);
          let dwgMatch = message.match(/DWG-[a-z0-9-]+/i) || message.match(/PRJ-[a-z0-9-]+/i);

          // Contextual Pronoun & Follow-Up Resolution from Conversation History
          if (!taskUuidMatch && !vehMatch && !dwgMatch && pastMessages.length > 0) {
            const isEntityFollowUp = /\b(it|its|this|that|the vehicle|the car|that vehicle|the task|that task|the drawing|same task|same vehicle)\b/i.test(normalizedQuery);
            if (isEntityFollowUp) {
              for (let i = pastMessages.length - 1; i >= 0; i--) {
                const prevContent = pastMessages[i].content;
                if (!vehMatch) {
                  const m = prevContent.match(/veh-[a-z0-9]+/i) || prevContent.match(/MH-[0-9]{2}-[A-Z]{1,2}-[0-9]{4}/i);
                  if (m) {
                    vehMatch = m;
                    effectiveModule = "VEHICLE_DESK";
                    break;
                  }
                }
                if (!taskUuidMatch) {
                  const m = prevContent.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                  if (m) {
                    taskUuidMatch = m;
                    effectiveModule = "TASK_WORKFLOW";
                    break;
                  }
                }
                if (!dwgMatch) {
                  const m = prevContent.match(/DWG-[a-z0-9-]+/i) || prevContent.match(/PRJ-[a-z0-9-]+/i);
                  if (m) {
                    dwgMatch = m;
                    effectiveModule = "DESIGN_TRACKING";
                    break;
                  }
                }
              }
            }
          }

          // ------------------------------------------------------------------
          // CAPABILITY 5: ACTION ASSIST INTENT (Proposal with Confirmation Card)
          // ------------------------------------------------------------------
          const isActionIntent = (
            (normalizedQuery.includes("update") || normalizedQuery.includes("change") || normalizedQuery.includes("set") || normalizedQuery.includes("mark")) &&
            (normalizedQuery.includes("status") || normalizedQuery.includes("state") || normalizedQuery.includes("hold") || normalizedQuery.includes("progress"))
          );

          if (isActionIntent && taskUuidMatch) {
            const taskId = taskUuidMatch[0];
            const { data: statuses } = await supabaseAdmin
              .from("status_master")
              .select("id, status_name, status_code");

            let targetStatus = (statuses || []).find((s) =>
              normalizedQuery.includes(s.status_name.toLowerCase()) ||
              normalizedQuery.includes(s.status_code.toLowerCase())
            );

            if (!targetStatus) {
              targetStatus = (statuses || []).find((s) => s.status_code === "HOLD") || statuses?.[0];
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

              const proposalText = `I have prepared an action proposal to update Task \`${taskId}\` status to **${targetStatus.status_name || targetStatus.status_code}**.\n\nPlease review the preview card below and click **Confirm & Execute** to apply the change.`;
              await streamWords(proposalText);
            } else {
              const statusPromptText = `I identified the target task (\`${taskId}\`), but could not determine the requested status from your message. Please specify the desired status (e.g., HOLD, IN_PROGRESS, RESOLVED).`;
              await streamWords(statusPromptText);
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 6: SUMMARY & AGGREGATION INTENT (Live Workload Counts)
          // ------------------------------------------------------------------
          else if (
            normalizedQuery.includes("how many") ||
            normalizedQuery.includes("count of") ||
            normalizedQuery.includes("total task") ||
            normalizedQuery.includes("total vehicle") ||
            normalizedQuery.includes("task summary") ||
            normalizedQuery.includes("summary of task") ||
            normalizedQuery.includes("fleet summary") ||
            normalizedQuery.includes("work status") ||
            normalizedQuery.includes("overall work") ||
            normalizedQuery.includes("my workload") ||
            normalizedQuery.includes("team workload") ||
            (normalizedQuery.includes("summary") && (normalizedQuery.includes("task") || normalizedQuery.includes("work") || normalizedQuery.includes("vehicle") || normalizedQuery.includes("fleet"))) ||
            (normalizedQuery.includes("pending") && normalizedQuery.includes("task"))
          ) {
            if (effectiveModule === "VEHICLE_DESK" || vRegex.test(message)) {
              const res = await vehicleModuleTools.get_fleet_summary.execute({}, executionContext);
              if (res.success) {
                const text = `### 🚗 Fleet Desk Summary & Status Breakdown\n\n` +
                  `- **Total Fleet Vehicles:** **${res.totalVehicles}**\n` +
                  `- **In Stock (Available):** ${res.statusCounts.IN_STOCK || 0}\n` +
                  `- **In Transit (Active Trips):** ${res.statusCounts.IN_TRANSIT || 0}\n` +
                  `- **Maintenance / Workshop:** ${res.statusCounts.MAINTENANCE || 0}\n` +
                  `- **Decommissioned / Sold:** ${res.statusCounts.SOLD || 0}\n\n` +
                  (res.sampleVehicles && res.sampleVehicles.length > 0 ?
                    `**Fleet Inventory (Sample):**\n` +
                    res.sampleVehicles.map((v: any) => `- **${v.registrationNumber}** — ${v.name || "Fleet Vehicle"} (\`${v.status}\` | ${v.category} | ${v.odometerKm} km)`).join("\n") +
                    `\n\n*View and manage movement passes in the Fleet Desk portal.*` : "");
                await streamWords(text);
              } else {
                await streamWords(`⚠️ **${res.error}:** ${res.message}\n\n*${res.safeGuidance || ""}*`);
              }
            } else {
              const res = await taskModuleTools.get_user_task_summary.execute({}, executionContext);
              if (res.success && res.summary) {
                const s = res.summary;
                const breakdownEntries = Object.entries(s.statusBreakdown || {});
                const breakdownText = breakdownEntries.length > 0
                  ? breakdownEntries.map(([st, cnt]) => `- **${st}:** ${cnt}`).join("\n")
                  : "- None";

                const text = `### 📋 Workspace Tasks & Work Status Summary\n\n` +
                  `**Key Metrics:**\n` +
                  `- **Total Tasks in Scope:** **${s.totalTasks}**\n` +
                  `- **Active / Pending Tasks:** **${s.activeTasks}**\n` +
                  `- **Completed / Closed Tasks:** **${s.completedTasks}**\n` +
                  `- **Overdue Deliverables:** **${s.overdueTasks}**\n\n` +
                  `**Status Breakdown:**\n${breakdownText}\n\n` +
                  (s.sampleOverdue && s.sampleOverdue.length > 0 ?
                    `⚠️ **Top Overdue Tasks:**\n` +
                    s.sampleOverdue.map((t: any) => `- \`${t.id.slice(0, 8)}\` **${t.subject}** (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "Overdue"} | *${t.status}*)`).join("\n") + "\n\n" : "") +
                  (s.sampleActive && s.sampleActive.length > 0 ?
                    `📌 **Active Tasks In Flight:**\n` +
                    s.sampleActive.map((t: any) => `- \`${t.id.slice(0, 8)}\` **${t.subject}** (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "Not set"} | *${t.status}*)`).join("\n") + "\n\n" : "") +
                  `*To inspect full task boards or export Excel/PDF reports, open [Workspace Reports](/workspaces/reports).*`;
                await streamWords(text);
              } else {
                await streamWords(`⚠️ **${res.error}:** ${res.message}`);
              }
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 4: DIAGNOSE INTENT (Explicit Blocker Evaluation)
          // ------------------------------------------------------------------
          else if (
            (normalizedQuery.includes("why") || 
             normalizedQuery.includes("block") || 
             normalizedQuery.includes("cannot") || 
             normalizedQuery.includes("can't") || 
             normalizedQuery.includes("disabled") ||
             normalizedQuery.includes("unable") ||
             normalizedQuery.includes("denied")) &&
            (taskUuidMatch || vehMatch || dwgMatch || tRegex.test(message) || vRegex.test(message) || dRegex.test(message))
          ) {
            if (effectiveModule === "VEHICLE_DESK" || vehMatch) {
              const targetId = vehMatch ? vehMatch[0] : "";
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

              const text = `### Vehicle Operation Diagnosis\n\n` +
                `**Status:** ${diag.isBlocked ? "⚠️ Blocked" : "✅ Action Permitted"}\n\n` +
                `**Verified Facts:**\n${diag.verifiedFacts.map((f: string) => `- ${f}`).join("\n")}\n\n` +
                (diag.workingHypotheses.length > 0 ? `**Working Hypotheses:**\n${diag.workingHypotheses.map((h: string) => `- ${h}`).join("\n")}\n\n` : "") +
                (diag.applicableRule ? `**Applicable Rule:**\n> ${diag.applicableRule}\n\n` : "") +
                `**Recommendation:**\n${diag.recommendedSafeAction}`;
              await streamWords(text);
            } else if (effectiveModule === "DESIGN_TRACKING" || dwgMatch) {
              let attemptedAction = "APPROVE_GFC";
              if (normalizedQuery.includes("matrix") || normalizedQuery.includes("edit")) {
                attemptedAction = "EDIT_MATRIX";
              } else if (normalizedQuery.includes("transmittal") || normalizedQuery.includes("send")) {
                attemptedAction = "CREATE_TRANSMITTAL";
              } else if (normalizedQuery.includes("master")) {
                attemptedAction = "MANAGE_MASTERS";
              }

              const diag = await designModuleTools.diagnose_design_blocker.execute(
                { projectId: dwgMatch ? dwgMatch[0] : "PRJ-01", attemptedAction },
                executionContext
              );

              const text = `### Design Action Diagnosis\n\n` +
                `**Status:** ${diag.isBlocked ? "⚠️ Blocked" : "✅ Action Permitted"}\n\n` +
                `**Verified Facts:**\n${diag.verifiedFacts.map((f: string) => `- ${f}`).join("\n")}\n\n` +
                (diag.workingHypotheses.length > 0 ? `**Working Hypotheses:**\n${diag.workingHypotheses.map((h: string) => `- ${h}`).join("\n")}\n\n` : "") +
                (diag.applicableRule ? `**Applicable Rule:**\n> ${diag.applicableRule}\n\n` : "") +
                `**Recommendation:**\n${diag.recommendedSafeAction}`;
              await streamWords(text);
            } else {
              const targetId = taskUuidMatch ? taskUuidMatch[0] : "";
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

              const text = `### Task Action Diagnosis\n\n` +
                `**Status:** ${diag.isBlocked ? "⚠️ Blocked" : "✅ Action Permitted"}\n\n` +
                `**Verified Facts:**\n${diag.verifiedFacts.map((f: string) => `- ${f}`).join("\n")}\n\n` +
                (diag.workingHypotheses.length > 0 ? `**Working Hypotheses:**\n${diag.workingHypotheses.map((h: string) => `- ${h}`).join("\n")}\n\n` : "") +
                (diag.applicableRule ? `**Applicable Rule:**\n> ${diag.applicableRule}\n\n` : "") +
                `**Recommendation:**\n${diag.recommendedSafeAction}`;
              await streamWords(text);
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 2: GUIDE WORKFLOW INTENT (Step-by-step procedures)
          // ------------------------------------------------------------------
          else if (
            (normalizedQuery.includes("guide") || 
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
             normalizedQuery.includes("where check")) &&
            (tRegex.test(message) || vRegex.test(message) || dRegex.test(message) || normalizedQuery.includes("delete") || normalizedQuery.includes("status") || normalizedQuery.includes("report"))
          ) {
            let guideResult: any = null;

            if (effectiveModule === "VEHICLE_DESK" || vRegex.test(message)) {
              guideResult = await vehicleModuleTools.guide_vehicle_workflow.execute({ action: message }, executionContext);
            } else if (effectiveModule === "DESIGN_TRACKING" || dRegex.test(message)) {
              guideResult = await designModuleTools.guide_design_workflow.execute({ action: message }, executionContext);
            } else {
              guideResult = await taskModuleTools.guide_task_workflow.execute({ action: message }, executionContext);
            }

            if (guideResult && guideResult.steps && guideResult.steps.length > 0) {
              const text = `### ${guideResult.title || guideResult.workflow}\n${guideResult.summary ? `${guideResult.summary}\n\n` : ""}` +
                `**Step-by-Step Procedure:**\n${guideResult.steps.join("\n")}\n\n` +
                (guideResult.requiredFields ? `**Mandatory Required Fields:**\n${guideResult.requiredFields.map((f: string) => `- ${f}`).join("\n")}\n\n` : "") +
                `**Governance Rule:**\n> ${guideResult.applicableRule || guideResult.sourceDocument}`;
              await streamWords(text);
            } else {
              // Not matched by deterministic workflow guide -> route to conversational intelligence
              await streamLLMResponse({
                prompt: message.trim(),
                history: pastMessages,
                moduleCode: effectiveModule,
                onToken: emitToken,
                signal: req.signal
              });
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 3: RETRIEVE LIVE DATA INTENT (Exact IDs or Task Search)
          // ------------------------------------------------------------------
          else if (
            taskUuidMatch || 
            vehMatch || 
            dwgMatch || 
            ((normalizedQuery.startsWith("show my") || normalizedQuery.startsWith("show task") || normalizedQuery.startsWith("find task")) && tRegex.test(message))
          ) {
            if (effectiveModule === "TASK_WORKFLOW" && (taskUuidMatch || tRegex.test(message))) {
              if (taskUuidMatch) {
                const res = await taskModuleTools.get_task_details.execute({ taskId: taskUuidMatch[0] }, executionContext);
                if (res.success && res.verifiedRecord) {
                  const rec = res.verifiedRecord;
                  const text = `### Task Details: ${rec.title}\n\n` +
                    `- **ID:** \`${rec.id}\`\n` +
                    `- **Status:** \`${rec.status}\`\n` +
                    `- **Primary Assignee:** ${rec.primaryAssignee}\n` +
                    `- **Creator:** ${rec.creator}\n` +
                    `- **Your Verified Role:** ${rec.callerRoleOnTask}\n` +
                    `- **Checklists:** ${rec.completedChecklistsCount}/${rec.checklistsCount} completed\n` +
                    `- **Due Date:** ${rec.dueDate || "Not set"}`;
                  await streamWords(text);
                } else {
                  await streamWords(`⚠️ **${res.error}:** ${res.message}\n\n*${res.safeGuidance || ""}*`);
                }
              } else {
                const cleanSearchTerm = message
                  .replace(/\b(show|get|find|fetch|lookup|search|details|of|for|my|the|task|tasks|please|me|all)\b/gi, "")
                  .trim();

                if (cleanSearchTerm.length >= 2) {
                  const { data: matchedTasks } = await supabaseAdmin
                    .from("tasks")
                    .select(`
                      id, subject, task_code, status_id, start_date, end_date, assigned_to,
                      status:status_master(status_name, status_code, is_closed)
                    `)
                    .ilike("subject", `%${cleanSearchTerm}%`)
                    .eq("is_deleted", false)
                    .limit(10);

                  if (matchedTasks && matchedTasks.length > 0) {
                    if (matchedTasks.length === 1) {
                      const res = await taskModuleTools.get_task_details.execute({ taskId: matchedTasks[0].id }, executionContext);
                      if (res.success && res.verifiedRecord) {
                        const rec = res.verifiedRecord;
                        const text = `### Task Details: ${rec.title}\n\n` +
                          `- **ID:** \`${rec.id}\`\n` +
                          `- **Status:** \`${rec.status}\`\n` +
                          `- **Primary Assignee:** ${rec.primaryAssignee}\n` +
                          `- **Creator:** ${rec.creator}\n` +
                          `- **Your Verified Role:** ${rec.callerRoleOnTask}\n` +
                          `- **Checklists:** ${rec.completedChecklistsCount}/${rec.checklistsCount} completed\n` +
                          `- **Due Date:** ${rec.dueDate || "Not set"}`;
                        await streamWords(text);
                      } else {
                        await streamWords(`⚠️ **${res.error}:** ${res.message}`);
                      }
                    } else {
                      const text = `### 📋 Tasks Matching "${cleanSearchTerm}"\n\n` +
                        `Found **${matchedTasks.length}** matching task(s) in your workspace:\n\n` +
                        matchedTasks.map((t: any, idx: number) => {
                          const stName = (t.status as any)?.status_name || (t.status as any)?.status_code || "Unknown";
                          const due = t.end_date ? new Date(t.end_date).toLocaleDateString() : "Not set";
                          return `${idx + 1}. **${t.subject || "Untitled Task"}** (Status: \`${stName}\` | Due: ${due})\n   - Task ID: \`${t.id}\``;
                        }).join("\n\n") +
                        `\n\n*To view full details or checklists for any task, reply with its Task ID or open [Workspace Tasks](/workspaces/tasks).*`;
                      await streamWords(text);
                    }
                  } else {
                    await streamWords(`No tasks found matching "${cleanSearchTerm}" in your accessible workspaces. Please check your spelling or verify from the [Workspace Tasks](/workspaces/tasks) board.`);
                  }
                } else {
                  const res = await taskModuleTools.get_user_task_summary.execute({}, executionContext);
                  if (res.success && res.summary) {
                    const s = res.summary;
                    const text = `### 📋 Your Active Tasks Summary\n\n` +
                      `- **Total Tasks in Scope:** **${s.totalTasks}**\n` +
                      `- **Active / Pending:** **${s.activeTasks}**\n` +
                      `- **Completed / Closed:** **${s.completedTasks}**\n` +
                      `- **Overdue Deliverables:** **${s.overdueTasks}**\n\n` +
                      (s.sampleActive && s.sampleActive.length > 0 ?
                        `📌 **Current Tasks:**\n` +
                        s.sampleActive.map((t: any) => `- \`${t.id.slice(0, 8)}\` **${t.subject}** (*${t.status}*)`).join("\n") + "\n\n" : "") +
                      `*To search for a specific task, specify a keyword (e.g. 'show my sfdc task') or Task ID.*`;
                    await streamWords(text);
                  } else {
                    await streamWords("Please provide a Task ID (e.g. TSK-102 or UUID) or a task subject keyword (e.g. SFDC) to retrieve task details.");
                  }
                }
              }
            } else if (effectiveModule === "VEHICLE_DESK" && (vehMatch || vRegex.test(message))) {
              if (vehMatch) {
                const res = await vehicleModuleTools.get_vehicle_details.execute({ vehicleId: vehMatch[0] }, executionContext);
                if (res.success && res.verifiedRecord) {
                  const rec = res.verifiedRecord;
                  const text = `### Vehicle Details: ${rec.registrationNumber} (${rec.make} ${rec.model} ${rec.variant || ""})\n\n` +
                    `- **ID:** \`${rec.id}\`\n` +
                    `- **Status:** \`${rec.status}\`\n` +
                    `- **Category:** ${rec.category || "General"}\n` +
                    `- **VIN / Chassis:** \`${rec.vinChassisNumber || "N/A"}\`\n` +
                    `- **Engine Number:** \`${rec.engineNumber || "N/A"}\`\n` +
                    `- **Odometer:** ${rec.odometerKm || 0} km\n` +
                    `- **Insurance Policy:** ${rec.insurancePolicyNumber || "N/A"} (Expiry: ${rec.insuranceExpiryDate || "N/A"})\n` +
                    `- **PUC Expiry:** ${rec.pucExpiryDate || "N/A"}`;
                  await streamWords(text);
                } else {
                  await streamWords(`⚠️ **${res.error}:** ${res.message}\n\n*${res.safeGuidance || ""}*`);
                }
              } else {
                await streamWords("Please specify a Vehicle Registration Number (e.g. MH-02-EE-8522) to retrieve live fleet details.");
              }
            } else if (effectiveModule === "DESIGN_TRACKING" && (dwgMatch || dRegex.test(message))) {
              if (dwgMatch) {
                const res = await designModuleTools.get_drawing_details.execute({ drawingId: dwgMatch[0] }, executionContext);
                if (res.success && res.verifiedRecord) {
                  const rec = res.verifiedRecord;
                  const text = `### Drawing Details: ${rec.drawingNumber}\n\n` +
                    `- **Title:** ${rec.title}\n` +
                    `- **Revision:** \`${rec.currentRevision}\`\n` +
                    `- **Status:** \`${rec.approvalStatus}\`\n` +
                    `- **Discipline:** ${rec.discipline}\n` +
                    `- **Consultant:** ${rec.consultantName || "Internal"}`;
                  await streamWords(text);
                } else {
                  await streamWords(`⚠️ **${res.error}:** ${res.message}\n\n*${res.safeGuidance || ""}*`);
                }
              } else {
                await streamWords("Please specify a Drawing Number (e.g. DWG-001) or Transmittal ID to retrieve design details.");
              }
            } else {
              await streamWords("Please specify a Task ID or keyword to look up live records in your current module.");
            }
          }
          // ------------------------------------------------------------------
          // CAPABILITY 1: GROUNDED CONCEPT EXPLANATION FAST-PATH
          // (Only when explicitly asking for specific Chandak terminology)
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
              const text = `### ${explanation.concept || explanation.topic}\n\n${explanation.definition}\n\n` +
                (explanation.applicableRoles ? `**Applicable Roles:**\n${explanation.applicableRoles.map((r: string) => `- ${r}`).join("\n")}\n\n` : "") +
                (explanation.rules || explanation.keyRules ? `**Key Rules:**\n${(explanation.rules || explanation.keyRules).map((r: string) => `- ${r}`).join("\n")}\n\n` : "") +
                `*Source: ${explanation.sourceDocument}*`;
              await streamWords(text);
            } else {
              // ------------------------------------------------------------------
              // FIRST-CLASS CONVERSATIONAL INTELLIGENCE & NATURAL LANGUAGE ROUTE
              // Handles general knowledge, programming, SQL, writing, rewriting,
              // brainstorming, and multi-turn contextual follow-ups.
              // ------------------------------------------------------------------
              await streamLLMResponse({
                prompt: message.trim(),
                history: pastMessages,
                moduleCode: effectiveModule,
                onToken: emitToken,
                signal: req.signal
              });
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
          if (fullAssistantText.trim().length > 0) {
            await supabaseAdmin.from("copilot_messages").insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: "assistant",
              content: fullAssistantText,
              action_preview: actionPreviewData || null
            });
          }

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
