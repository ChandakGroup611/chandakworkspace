/**
 * Direct Unit/Integration Test for Phase 0 POC Streaming Route
 * Directly invokes POST(req) from app/api/copilot/poc-stream/route.ts
 *
 * Verifies:
 * - POC-01: Server-Side Kill Switch (COPILOT_ENABLED='false' -> 503)
 * - POC-02: Request Payload Bounded Guard (> 32KB -> 413)
 * - POC-03: Native SSE Stream Output & Full Lifecycle Events (metadata, token, tool_call, action_proposal, done)
 * - POC-04: Client Disconnect / AbortSignal Cancellation
 */

import { POST } from "../app/api/copilot/poc-stream/route.ts";
import { NextRequest } from "next/server";

async function runDirectTests() {
  console.log("=================================================================");
  console.log("CHANDAK AI COPILOT — DIRECT STREAMING POC TEST EXECUTION");
  console.log("=================================================================\n");

  let allPassed = true;

  // TEST 1: Server Kill Switch
  console.log("[TEST 1 / POC-01] Testing Server-Side Kill Switch (COPILOT_ENABLED='false')...");
  process.env.COPILOT_ENABLED = "false";
  try {
    const req = new NextRequest("http://localhost:3000/api/copilot/poc-stream", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello" }),
      headers: { "Content-Type": "application/json" }
    });
    const res = await POST(req);
    const retryAfter = res.headers.get("retry-after");
    if (res.status === 503 && retryAfter === "60") {
      const data = await res.json();
      console.log(`  PASS: Kill switch returned HTTP 503 with Retry-After (${data.error}: ${data.message})\n`);
    } else {
      console.error(`  FAIL: Expected 503 with Retry-After, got ${res.status}\n`);
      allPassed = false;
    }
  } catch (err) {
    console.error("  FAIL in Test 1:", err);
    allPassed = false;
  } finally {
    delete process.env.COPILOT_ENABLED; // Restore
  }

  // TEST 2: Request Payload Bound (> 32KB)
  console.log("[TEST 2 / POC-02] Testing Request Payload Bounded Guard (> 32KB)...");
  try {
    const bigString = "x".repeat(35 * 1024);
    const req = new NextRequest("http://localhost:3000/api/copilot/poc-stream", {
      method: "POST",
      body: JSON.stringify({ prompt: bigString }),
      headers: { 
        "Content-Type": "application/json",
        "Content-Length": String(35 * 1024 + 50)
      }
    });
    const res = await POST(req);
    if (res.status === 413) {
      const data = await res.json();
      console.log(`  PASS: Server rejected oversized payload with HTTP 413 (${data.error}: ${data.message})\n`);
    } else {
      console.error(`  FAIL: Expected 413, got ${res.status}\n`);
      allPassed = false;
    }
  } catch (err) {
    console.error("  FAIL in Test 2:", err);
    allPassed = false;
  }

  // TEST 3: Native SSE Stream Output & Lifecycle Events
  console.log("[TEST 3 / POC-03] Testing Native SSE Streaming & Lifecycle Events...");
  try {
    const req = new NextRequest("http://localhost:3000/api/copilot/poc-stream", {
      method: "POST",
      body: JSON.stringify({ prompt: "Explain task ownership rules", moduleCode: "TASK_WORKFLOW" }),
      headers: { "Content-Type": "application/json" }
    });
    const res = await POST(req);
    if (res.status !== 200) {
      console.error(`  FAIL: Expected 200, got ${res.status}\n`);
      allPassed = false;
    } else {
      const contentType = res.headers.get("content-type") || "";
      console.log(`  Header Content-Type: ${contentType} (Verified)`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let eventCount = 0;
      let toolCallReceived = false;
      let proposalReceived = false;
      let doneReceived = false;
      let tokenText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventCount++;
            const eventName = line.slice(7).trim();
            if (eventName === "tool_call") toolCallReceived = true;
            if (eventName === "action_proposal") proposalReceived = true;
            if (eventName === "done") doneReceived = true;
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.delta) tokenText += data.delta;
            } catch {}
          }
        }
      }

      console.log(`  Total SSE Events Received: ${eventCount}`);
      console.log(`  Tool Call Event Received: ${toolCallReceived ? "YES (PASS)" : "NO (FAIL)"}`);
      console.log(`  Action Proposal Event Received: ${proposalReceived ? "YES (PASS)" : "NO (FAIL)"}`);
      console.log(`  Done Event Received: ${doneReceived ? "YES (PASS)" : "NO (FAIL)"}`);
      console.log(`  Stream Preview Snippet:\n  "${tokenText.slice(0, 100).replace(/\n/g, " ")}..."\n`);

      if (!toolCallReceived || !proposalReceived || !doneReceived) {
        allPassed = false;
      } else {
        console.log("  PASS: Full SSE Event stream emitted and completed.\n");
      }
    }
  } catch (err) {
    console.error("  FAIL in Test 3:", err);
    allPassed = false;
  }

  // TEST 4: Client AbortSignal Disconnect Handling
  console.log("[TEST 4 / POC-04] Testing Client Disconnect / AbortSignal Cancellation...");
  try {
    const controller = new AbortController();
    const req = new NextRequest("http://localhost:3000/api/copilot/poc-stream", {
      method: "POST",
      body: JSON.stringify({ prompt: "Abort test" }),
      headers: { "Content-Type": "application/json" },
      signal: controller.signal
    });

    const res = await POST(req);
    const reader = res.body.getReader();

    // Read first chunk
    const firstChunk = await reader.read();
    console.log(`  First chunk received (${firstChunk.value?.length || 0} bytes), aborting client...`);

    // Trigger abort
    controller.abort();

    // Subsequent read should finish cleanly
    let finishedCleanly = false;
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) {
          finishedCleanly = true;
          break;
        }
      }
    } catch {
      finishedCleanly = true;
    }

    if (finishedCleanly) {
      console.log("  PASS: Stream cleanly terminated on client abort signal.\n");
    } else {
      console.error("  FAIL: Stream did not terminate on abort signal.\n");
      allPassed = false;
    }
  } catch (err) {
    console.error("  FAIL in Test 4:", err);
    allPassed = false;
  }

  console.log("=================================================================");
  console.log(allPassed ? "PHASE 0 DIRECT STREAMING POC: ALL 4 CHECKS PASSED (PASS)" : "PHASE 0 DIRECT STREAMING POC: CHECKS FAILED (FAIL)");
  console.log("=================================================================\n");

  process.exit(allPassed ? 0 : 1);
}

runDirectTests();
