export interface RouteBudget {
  maxQueries: number;
  maxPayloadKB: number;
  maxWebsockets: number;
  maxFcpMs: number;
}

export const PERFORMANCE_BUDGET_REGISTRY: Record<string, RouteBudget> = {
  'Dashboard': {
    maxQueries: 10,
    maxPayloadKB: 150,
    maxWebsockets: 5,
    maxFcpMs: 800,
  },
  'Ticket Detail': {
    maxQueries: 5,
    maxPayloadKB: 120,
    maxWebsockets: 2,
    maxFcpMs: 500,
  },
  'Workspace Detail': {
    maxQueries: 6,
    maxPayloadKB: 150,
    maxWebsockets: 2,
    maxFcpMs: 700,
  },
  'Task Detail': {
    maxQueries: 4,
    maxPayloadKB: 100,
    maxWebsockets: 2,
    maxFcpMs: 400,
  },
  'Global': {
    maxQueries: 30, // Aggregate safety limit per cycle
    maxPayloadKB: 500,
    maxWebsockets: 15,
    maxFcpMs: 1000,
  }
};

export function getBudgetForRoute(route: string): RouteBudget {
  return PERFORMANCE_BUDGET_REGISTRY[route] || PERFORMANCE_BUDGET_REGISTRY['Global'];
}
