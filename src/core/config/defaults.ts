import type { BuboConfig, WorkflowConfig, AgentConfig } from './schema.js';

/**
 * Default workflow configuration
 */
export const defaultWorkflow: WorkflowConfig = {
  columns: {
    backlog: 'Backlog',
    ready: 'Ready for Development',
    in_progress: 'In Progress',
    review: 'In Review',
    done: 'Done',
  },
  triggers: {
    pickup: {
      column: 'Ready for Development',
      labels: ['bubo:ready'],
      exclude_labels: ['bubo:blocked', 'bubo:in-progress'],
    },
  },
  labels: {
    in_progress: 'bubo:in-progress',
    blocked: 'bubo:blocked',
    complete: 'bubo:complete',
  },
};

/**
 * Default agent configuration
 */
export const defaultAgent: Required<AgentConfig> = {
  max_iterations: 10,
  branch_prefix: 'bubo/',
  commit_prefix: '[bubo]',
  dry_run: false,
};

/**
 * Create a complete configuration with defaults filled in
 */
export function withDefaults(partial: Partial<BuboConfig>): BuboConfig {
  return {
    version: 1,
    github: {
      owner: partial.github?.owner ?? '',
      repo: partial.github?.repo ?? '',
      project: partial.github?.project,
    },
    workflow: {
      columns: {
        ...defaultWorkflow.columns,
        ...partial.workflow?.columns,
      },
      triggers: {
        pickup: {
          ...defaultWorkflow.triggers.pickup,
          ...partial.workflow?.triggers?.pickup,
        },
      },
      labels: {
        ...defaultWorkflow.labels,
        ...partial.workflow?.labels,
      },
    },
    agent: {
      ...defaultAgent,
      ...partial.agent,
    },
  };
}

/**
 * Generate a starter configuration for a new project
 */
export function generateStarterConfig(options: {
  owner: string;
  repo: string;
  project?: number;
}): BuboConfig {
  return withDefaults({
    github: {
      owner: options.owner,
      repo: options.repo,
      project: options.project,
    },
  });
}
