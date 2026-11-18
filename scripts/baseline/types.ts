import { SupabaseClient } from "@supabase/supabase-js";

export interface TestCaseContext {
  client: SupabaseClient;
  supabaseAdmin: SupabaseClient; // alias for test client
  users: Record<string, string>; // email -> id
  fixedEntities: {
    workspaceId: string;
    taskId: string;
    subtaskId: string;
    ticketId: string;
    reqId: string;
  };
  siteUrl: string;
}

export interface TestCaseResult {
  tcId: string;
  module: string;
  screen: string;
  description: string;
  role: string;
  type: string;
  status: "PASS" | "FAIL" | "MANUAL" | "NOT_AUTOMATED";
  durationMs: number;
  notes: string;
  errorTrace?: string;
  codePath?: string;
  screenshotPath?: string;
}

export interface TestCaseRunner {
  tcId: string;
  module: string;
  screen: string;
  description: string;
  role: string;
  type: string;
  suite?: "readonly" | "sandbox";
  run: (ctx: TestCaseContext) => Promise<{
    pass: boolean;
    notes: string;
    status?: "PASS" | "FAIL" | "MANUAL" | "NOT_AUTOMATED";
    errorTrace?: string;
    codePath?: string;
    screenshotPath?: string;
  }>;
}
