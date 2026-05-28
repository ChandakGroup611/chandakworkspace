import { getBudgetForRoute } from "./budget-registry";

// Staged Degradation Levels
export enum DegradationStage {
  STAGE_0_NORMAL = 0,
  STAGE_1_MILD = 1,      // Disable typing, presence, analytics auto-refresh
  STAGE_2_MODERATE = 2,  // Throttled polling (5s -> 30s)
  STAGE_3_SEVERE = 3,    // Pause live updates, heatmaps, activity streams
  STAGE_4_CRITICAL = 4,  // Force manual refresh only
}

export interface GovernanceMetrics {
  hydrationScore: number;
  queryLatencyScore: number;
  websocketHealthScore: number;
  memoryPressureScore: number;
  payloadSizeScore: number;
  rerenderStormScore: number;
  totalEnterpriseScore: number;
  currentStage: DegradationStage;
  activeRoute: string;
}

class PerformanceGovernanceEngine {
  private activeRoute: string = 'Global';
  private currentStage: DegradationStage = DegradationStage.STAGE_0_NORMAL;
  
  private metrics: GovernanceMetrics = {
    hydrationScore: 100,
    queryLatencyScore: 100,
    websocketHealthScore: 100,
    memoryPressureScore: 100,
    payloadSizeScore: 100,
    rerenderStormScore: 100,
    totalEnterpriseScore: 100,
    currentStage: DegradationStage.STAGE_0_NORMAL,
    activeRoute: 'Global'
  };

  private listeners: Set<(stage: DegradationStage) => void> = new Set();
  private isProcessing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Bind to window for passive singleton access globally
      (window as any).__PERF_METRICS__ = this;

      // Start passive idle tracking
      this.scheduleIdleEvaluation();
    }
  }

  public subscribeToStageChanges(callback: (stage: DegradationStage) => void) {
    this.listeners.add(callback);
    callback(this.currentStage); // Initial sync
    return () => this.listeners.delete(callback);
  }

  public getMetrics(): GovernanceMetrics {
    return { ...this.metrics };
  }

  public setRoute(route: string) {
    this.activeRoute = route;
    this.metrics.activeRoute = route;
    this.triggerIdleEvaluation();
  }

  // Exposed for trackers to push passive events
  public reportQuery(latencyMs: number, payloadKB: number) {
    // We don't act synchronously. We just store the data and process on idle.
    this.triggerIdleEvaluation();
  }

  public triggerIdleEvaluation() {
    if (this.isProcessing || typeof window === 'undefined') return;
    this.isProcessing = true;
    this.scheduleIdleEvaluation();
  }

  private scheduleIdleEvaluation() {
    if (typeof window === 'undefined') return;
    
    const evaluate = () => {
      this.evaluateEnterpriseScore();
      this.isProcessing = false;
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(evaluate, { timeout: 2000 });
    } else {
      setTimeout(evaluate, 1000); // Fallback
    }
  }

  private evaluateEnterpriseScore() {
    // 1. Gather raw data from other passive trackers (hydration, query, memory, ws)
    const budget = getBudgetForRoute(this.activeRoute);
    
    // In a real implementation, we read from hydrationStore, queryStore, etc. here passively.
    // For now, we mock reading the scores for demonstration.
    // This function runs on idle, so it doesn't block the UI thread.

    // 2. Weight logic
    // Hydration: 25%
    // Query Latency: 25%
    // Websocket Health: 15%
    // Memory Pressure: 10%
    // Payload Size: 15%
    // Rerender Storms: 10%

    // Calculate total score... (mocked logic for safety)
    const totalScore = (
      (this.metrics.hydrationScore * 0.25) +
      (this.metrics.queryLatencyScore * 0.25) +
      (this.metrics.websocketHealthScore * 0.15) +
      (this.metrics.memoryPressureScore * 0.10) +
      (this.metrics.payloadSizeScore * 0.15) +
      (this.metrics.rerenderStormScore * 0.10)
    );

    this.metrics.totalEnterpriseScore = totalScore;

    // 3. Stage Escallation
    let newStage = DegradationStage.STAGE_0_NORMAL;
    if (totalScore < 60) newStage = DegradationStage.STAGE_4_CRITICAL;
    else if (totalScore < 70) newStage = DegradationStage.STAGE_3_SEVERE;
    else if (totalScore < 85) newStage = DegradationStage.STAGE_2_MODERATE;
    else if (totalScore < 92) newStage = DegradationStage.STAGE_1_MILD;

    if (newStage !== this.currentStage) {
      this.currentStage = newStage;
      this.metrics.currentStage = newStage;
      this.notifyListeners();
    }
    
    // Schedule next loop conditionally or let it be event-driven
    // We rely on passive events (route change, new query, etc) to re-trigger
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentStage));
  }
}

// Export singleton
export const performanceGovernor = new PerformanceGovernanceEngine();
