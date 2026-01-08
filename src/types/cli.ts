/**
 * CLI command options
 */

export interface RunOptions {
  issue?: number;
  project?: string;
  maxIterations?: number;
  dryRun?: boolean;
}

export interface PlanOptions {
  issue?: number;
}

export interface StatusOptions {
  verbose?: boolean;
}
