export interface ConsumedBudget {
  folders: number;
  files: number;
  deepFiles: number;
  aiRequests: number;
  aiTokens: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remaining: ConsumedBudget;
}