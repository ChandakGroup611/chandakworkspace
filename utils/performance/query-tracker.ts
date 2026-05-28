import { PostgrestBuilder, PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { getBudgetForRoute } from './budget-registry';

export interface QueryMetrics {
  id: string;
  queryType: 'select' | 'rpc' | 'insert' | 'update' | 'delete';
  tableOrFunction: string;
  durationMs: number;
  rowsReturned: number;
  payloadBytes: number;
  route: string;
  timestamp: number;
  duplicateCount: number;
  isDuplicate: boolean;
  severity: 'normal' | 'warning' | 'slow' | 'critical';
}

class QueryTrackerStore {
  private metrics: QueryMetrics[] = [];
  private queryHashes: Record<string, { count: number; timestamps: number[] }> = {};
  
  private isProduction = process.env.NODE_ENV === 'production';

  public addMetric(metric: QueryMetrics) {
    this.metrics.unshift(metric);
    // Keep max 500 metrics in memory to avoid leaks
    if (this.metrics.length > 500) {
      this.metrics.pop();
    }

    if (!this.isProduction && metric.severity !== 'normal') {
      console.warn(`[QueryTracker] ${metric.severity.toUpperCase()} QUERY on ${metric.tableOrFunction}: ${metric.durationMs.toFixed(1)}ms`);
    }
  }

  public getMetrics() {
    return this.metrics;
  }

  public checkDuplicate(hash: string, route: string): { isDuplicate: boolean; count: number } {
    const now = Date.now();
    const fullHash = `${hash}::${route}`;
    
    if (!this.queryHashes[fullHash]) {
      this.queryHashes[fullHash] = { count: 1, timestamps: [now] };
      return { isDuplicate: false, count: 1 };
    }

    const entry = this.queryHashes[fullHash];
    entry.count += 1;
    entry.timestamps.push(now);

    // Keep only timestamps from the last 10 seconds
    entry.timestamps = entry.timestamps.filter(t => now - t <= 10000);

    // Flag: 5 identical requests within 10s
    const isDuplicate = entry.timestamps.length >= 5;

    if (isDuplicate && !this.isProduction) {
      // Async console storm prevention (batch logging)
      setTimeout(() => {
        console.error(`[QueryGovernance] CRITICAL: Duplicate Fetch Loop Detected on Route '${route}'. Hash ${hash} called ${entry.timestamps.length} times in 10s.`);
      }, 0);
    }

    return { isDuplicate, count: entry.timestamps.length };
  }

  public clear() {
    this.metrics = [];
    this.queryHashes = {};
  }
}

export const queryStore = new QueryTrackerStore();

// ------------------------------------------------------------------
// SOFT GOVERNANCE: Query Budgets
// ------------------------------------------------------------------
class QueryBudgetManagerStore {
  private routeCounts: Record<string, number> = {};
  private violations: { route: string, count: number, budget: number, timestamp: number }[] = [];

  public registerQuery(route: string) {
    if (!this.routeCounts[route]) this.routeCounts[route] = 0;
    this.routeCounts[route]++;

    const budgetConfig = getBudgetForRoute(route);
    const budget = budgetConfig.maxQueries;
    
    if (budget && this.routeCounts[route] > budget) {
      this.violations.unshift({
        route,
        count: this.routeCounts[route],
        budget,
        timestamp: Date.now()
      });
      // SOFT GOVERNANCE: Warn only, no runtime exceptions (deferred execution to not block UI)
      if (process.env.NODE_ENV !== 'production') {
        setTimeout(() => {
          console.warn(`[QueryGovernance] WARNING: Route '${route}' exceeded query budget (${this.routeCounts[route]}/${budget}).`);
        }, 0);
      }
    }
  }
  
  public getViolations() {
    return this.violations;
  }
}
export const budgetManager = new QueryBudgetManagerStore();

export async function trackedQuery<T>(
  queryBuilder: any, // Supabase PostgrestBuilder
  route: string = 'unknown'
): Promise<{ data: T | null; error: any }> {
  const startTime = performance.now();
  
  // Extract info if possible
  const url = (queryBuilder as any).url?.toString() || 'unknown';
  const method = (queryBuilder as any).method || 'GET';
  const table = url.split('/').pop()?.split('?')[0] || 'unknown';
  
  // Create a naive hash for duplicate detection
  const hash = `${method}:${url}`;
  const dupCheck = queryStore.checkDuplicate(hash, route);

  const result = await queryBuilder;
  const durationMs = performance.now() - startTime;

  let rowsReturned = 0;
  let payloadBytes = 0;

  if (result.data) {
    if (Array.isArray(result.data)) {
      rowsReturned = result.data.length;
    } else {
      rowsReturned = 1; // single object
    }
    try {
      const str = JSON.stringify(result.data);
      payloadBytes = new Blob([str]).size;
    } catch (e) {
      // Ignore circular or parsing errors
    }
  }

  let severity: QueryMetrics['severity'] = 'normal';
  if (durationMs > 500) severity = 'critical';
  else if (durationMs > 250) severity = 'slow';
  else if (durationMs > 100) severity = 'warning';

  if (route !== 'unknown') {
    budgetManager.registerQuery(route);
  }

  queryStore.addMetric({
    id: Math.random().toString(36).substring(7),
    queryType: method === 'GET' ? 'select' : 'update', // simplified
    tableOrFunction: table,
    durationMs,
    rowsReturned,
    payloadBytes,
    route,
    timestamp: Date.now(),
    duplicateCount: dupCheck.count,
    isDuplicate: dupCheck.isDuplicate,
    severity,
  });

  return result;
}

export async function trackedRpc<T>(
  rpcPromise: Promise<{ data: T | null; error: any }>,
  functionName: string,
  route: string = 'unknown'
): Promise<{ data: T | null; error: any }> {
  const startTime = performance.now();
  
  const hash = `RPC:${functionName}`;
  const dupCheck = queryStore.checkDuplicate(hash, route);

  const result = await rpcPromise;
  const durationMs = performance.now() - startTime;

  let rowsReturned = 0;
  let payloadBytes = 0;

  if (result.data) {
    if (Array.isArray(result.data)) {
      rowsReturned = result.data.length;
    } else {
      rowsReturned = 1;
    }
    try {
      const str = JSON.stringify(result.data);
      payloadBytes = new Blob([str]).size;
    } catch (e) {}
  }

  let severity: QueryMetrics['severity'] = 'normal';
  if (durationMs > 500) severity = 'critical';
  else if (durationMs > 250) severity = 'slow';
  else if (durationMs > 100) severity = 'warning';

  if (route !== 'unknown') {
    budgetManager.registerQuery(route);
  }

  queryStore.addMetric({
    id: Math.random().toString(36).substring(7),
    queryType: 'rpc',
    tableOrFunction: functionName,
    durationMs,
    rowsReturned,
    payloadBytes,
    route,
    timestamp: Date.now(),
    duplicateCount: dupCheck.count,
    isDuplicate: dupCheck.isDuplicate,
    severity,
  });

  return result;
}
