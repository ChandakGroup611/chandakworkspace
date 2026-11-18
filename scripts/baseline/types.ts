export interface TestCaseContext {
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
  status: "PASS" | "FAIL";
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
  run: (ctx: TestCaseContext) => Promise<{
    pass: boolean;
    notes: string;
    errorTrace?: string;
    codePath?: string;
    screenshotPath?: string;
  }>;
}
