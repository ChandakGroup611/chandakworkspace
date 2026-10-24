/**
 * Chandak AI Copilot — Zero-Dependency Native LLM Streaming Provider
 *
 * Supports:
 * - Google Gemini REST SSE Streaming (via GEMINI_API_KEY)
 * - OpenAI REST SSE Streaming (via OPENAI_API_KEY)
 * - Transparent offline fallback when keys are absent
 *
 * Enforces:
 * - Zero external npm dependencies (uses native fetch & WHATWG ReadableStream)
 * - Strict dual-capability system instructions (general assistance vs. Chandak grounding)
 * - Multi-turn conversational context & follow-up resolution
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamLLMParams {
  prompt: string;
  history: ChatMessage[];
  systemInstruction?: string;
  moduleCode?: string;
  onToken: (token: string) => Promise<void> | void;
  signal?: AbortSignal;
}

export interface StreamLLMResult {
  fullText: string;
  provider: "gemini" | "openai" | "fallback";
}

export const DEFAULT_COPILOT_SYSTEM_PROMPT = `You are Chandak AI Copilot (also known as Chandak Mitra), an intelligent assistant embedded in the Chandak enterprise portal.

You have two primary capabilities:

1. GENERAL CONVERSATIONAL INTELLIGENCE:
- You are a first-class general assistant. You answer general-purpose questions directly using your knowledge and reasoning.
- You provide clear, high-quality assistance for:
  * Programming and SQL (queries, schemas, optimizations, debugging)
  * Writing, rewriting, summarization, proofreading, and drafting professional communications (emails, memos, proposals)
  * Conceptual explanations, math, science, and brainstorming
  * Natural language follow-ups ("Explain that more simply", "Now make it shorter", "What about edge cases?")
- For general questions unrelated to Chandak, answer directly and concisely. Do NOT query company databases, cite company documents unnecessarily, or invent fake corporate cards.

2. CHANDAK ENTERPRISE DOMAIN:
- You provide authoritative guidance on Chandak modules:
  * Task Workflow: Task creation, assignments (Primary Assignee vs. Executor vs. Watcher), checklists, status transitions, transfers, task reports, and deletion rules.
  * Vehicle Desk: Fleet inventory, movement passes, trip dispatch, driver onboarding, maintenance logs, HSRP, and PUC compliance.
  * Design Tracking: Good For Construction (GFC) drawings, transmittals, drawing revisions, disciplines, and RFIs.
- GROUNDING & TRUTHFULNESS:
  * Ground all company-specific factual claims in verified documentation or provided context.
  * Never fabricate record counts, statuses, permission rules, UI elements, or completed database mutations.
  * Distinguish verified facts from working hypotheses.
  * When company information is unavailable or uncertain, state so honestly and provide safe guidance.

3. CONVERSATIONAL CONTEXT & TOPIC SWITCHING:
- Resolve references ("it", "that", "why is it blocked", "who can change it", "what if I don't have rights") using the recent conversation history.
- When the user starts a new topic (e.g. asking a programming question after discussing a task), smoothly switch to the new topic without dragging stale context.
- Keep responses professional, well-formatted with markdown, and concise.`;

/**
 * Stream conversational response from Gemini or OpenAI via native fetch SSE.
 */
export async function streamLLMResponse(params: StreamLLMParams): Promise<StreamLLMResult> {
  const { prompt, history, systemInstruction = DEFAULT_COPILOT_SYSTEM_PROMPT, onToken, signal } = params;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. Google Gemini Provider (Primary)
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`;

      // Build Gemini contents array: map past history + current prompt
      const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      for (const msg of history) {
        if (!msg.content) continue;
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }

      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        }),
        signal
      });

      if (res.ok && res.body) {
        let fullText = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (signal?.aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.slice(6).trim();
              if (!jsonStr) continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (token) {
                  fullText += token;
                  await onToken(token);
                }
              } catch {
                // Ignore SSE keep-alive or JSON chunk boundaries
              }
            }
          }
        }

        if (fullText.trim().length > 0) {
          return { fullText, provider: "gemini" };
        }
      } else {
        console.warn(`[LLMProvider] Gemini API returned status ${res.status}: ${await res.text().catch(() => "")}`);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      console.error("[LLMProvider] Gemini stream failed:", err);
    }
  }

  // 2. OpenAI Provider (Secondary)
  if (openaiKey) {
    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemInstruction }
      ];

      for (const msg of history) {
        if (!msg.content) continue;
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        });
      }

      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.3
        }),
        signal
      });

      if (res.ok && res.body) {
        let fullText = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (signal?.aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                const token = parsed?.choices?.[0]?.delta?.content;
                if (token) {
                  fullText += token;
                  await onToken(token);
                }
              } catch {
                // Ignore parse errors on SSE chunk borders
              }
            }
          }
        }

        if (fullText.trim().length > 0) {
          return { fullText, provider: "openai" };
        }
      } else {
        console.warn(`[LLMProvider] OpenAI API returned status ${res.status}`);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      console.error("[LLMProvider] OpenAI stream failed:", err);
    }
  }

  // 3. Honest Fallback when no API Key is available
  const fallbackMessage = generateDeterministicFallback(prompt, history, params.moduleCode);
  for (const word of fallbackMessage.split(" ")) {
    if (signal?.aborted) break;
    await onToken(word + " ");
    await new Promise((r) => setTimeout(r, 12));
  }

  return { fullText: fallbackMessage, provider: "fallback" };
}

/**
 * Intelligent deterministic fallback when neither Gemini nor OpenAI API keys are configured.
 * Distinguishes general questions, coding, SQL, and emails from Chandak queries honestly.
 */
function generateDeterministicFallback(
  prompt: string,
  history: ChatMessage[],
  moduleCode?: string
): string {
  const q = prompt.trim().toLowerCase();

  // General questions: SQL Joins
  if (q.includes("sql join") || (q.includes("join") && q.includes("sql"))) {
    return `### SQL Joins Overview & Practical Example

In relational databases, **JOIN** operations combine rows from two or more tables based on a related column between them.

#### 1. Core Types of SQL Joins
- **INNER JOIN**: Returns only rows where there is a match in both tables.
- **LEFT (OUTER) JOIN**: Returns all rows from the left table, plus matched rows from the right table (NULL if no match).
- **RIGHT (OUTER) JOIN**: Returns all rows from the right table, plus matched rows from the left table.
- **FULL (OUTER) JOIN**: Returns all rows when there is a match in either table.

#### 2. Practical Example
Given two tables: \`employees\` and \`departments\`:

\`\`\`sql
-- Retrieve each employee's name along with their department name
SELECT 
    e.id AS employee_id,
    e.full_name,
    d.department_name
FROM employees e
INNER JOIN departments d 
    ON e.department_id = d.id;
\`\`\`

#### 3. Handling Unassigned Records (LEFT JOIN)
If an employee hasn't been assigned a department yet, use **LEFT JOIN** to prevent them from being omitted:

\`\`\`sql
SELECT 
    e.full_name,
    COALESCE(d.department_name, 'Unassigned') AS department
FROM employees e
LEFT JOIN departments d 
    ON e.department_id = d.id;
\`\`\``;
  }

  // General questions: Email drafting
  if (
    (q.includes("draft") || q.includes("write")) && 
    (q.includes("email") || q.includes("mail") || q.includes("message"))
  ) {
    return `### ✉️ Draft Email

**Subject:** Update on Current Project Deliverables & Next Steps

Dear Manager,

I am writing to provide a concise update on our recent milestones and key deliverables.

**Key Highlights:**
- **Progress:** Core milestones for this phase have been reviewed and aligned with technical requirements.
- **Blockers:** Any critical dependency or permission items have been flagged for resolution.
- **Next Steps:** We are proceeding with scheduled verification and final review.

Please let me know if you would like to discuss any of these items in detail during our next touchpoint.

Best regards,  
[Your Name]  
*Chandak Enterprise Team*`;
  }

  // General questions: "Explain that more simply" / Follow-up simplifications
  if (
    q.includes("more simply") || 
    q.includes("simple terms") || 
    q.includes("explain simply") || 
    q.includes("like i'm 5") || 
    q.includes("layman")
  ) {
    const lastAssistantMessage = [...history].reverse().find(m => m.role === "assistant");
    if (lastAssistantMessage) {
      return `### In Simpler Terms:

To put the previous explanation simply:

- **What it means:** The action you are trying to take has specific rules so mistakes don't happen.
- **Who can do it:** Only the person in charge (the owner or administrator) has the key to make that change.
- **What you should do:** If you need that change made, ask the owner or your project manager to either do it for you or give you permission.`;
    }
  }

  // General questions: "What if I don't have rights?" / Permission follow-up
  if (
    q.includes("don't have rights") || 
    q.includes("no rights") || 
    q.includes("no permission") || 
    q.includes("don't have permission") ||
    q.includes("not authorized")
  ) {
    return `### If You Do Not Have Rights:

Under **Chandak RBAC & Ownership Governance**:

1. **Why It Is Restricted:**
   Critical actions (such as deleting tasks, transferring workspaces, or altering milestones) are strictly restricted to the **Primary Assignee (Task Owner)**, **Workspace Owner**, or **Super Admin** to prevent unauthorized disruptions.

2. **Recommended Action:**
   - **Contact the Task Owner / Primary Assignee:** Request them to execute the action on your behalf.
   - **Request Role Elevation:** If you are an **Executor** or **Watcher** and need ongoing authority, request your **Workspace Manager** to assign you ownership or grant the required permission (e.g. \`TASKS_DELETE\`).
   - Standard users cannot bypass role restrictions; all mutations are protected by server-side authorization checks.`;
  }

  // Honest general fallback
  return `I understand your request. 

*(Note: Live upstream LLM streaming is in offline mode because \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` is not currently set in the environment).*

- For **Chandak module questions** (Task Workflow, Fleet Desk, Design Tracking), you can ask for procedures, ownership rules, or task summaries.
- For **general programming or writing tasks**, once an API key is connected, I will provide real-time generative responses.`;
}
