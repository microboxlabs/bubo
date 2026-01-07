/**
 * Agent configuration options
 */
export interface AgentConfig {
  maxIterations: number;
  dryRun: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Result of an agent execution
 */
export interface AgentResult {
  status: 'success' | 'blocked' | 'max-iterations' | 'error' | 'no-work';
  message: string;
  iterations: number;
  commits: number;
  prNumber?: number;
}

/**
 * Task status in the workflow
 */
export type TaskStatus = 'ready' | 'in-progress' | 'blocked' | 'done';

/**
 * Context for a task being worked on
 */
export interface TaskContext {
  id: string;
  type: 'issue' | 'project-item';
  number?: number;
  title: string;
  body: string;
  labels: string[];
  url?: string;
  projectId?: string;
  projectItemId?: string;
}

/**
 * Progress entry for logging
 */
export interface ProgressEntry {
  timestamp: string;
  taskId: string;
  iteration: number;
  status: string;
  message: string;
  commitSha?: string;
}

