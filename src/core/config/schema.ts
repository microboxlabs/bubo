import { z } from 'zod';

/**
 * Schema for GitHub configuration
 */
export const githubConfigSchema = z.object({
  owner: z.string().min(1, 'GitHub owner is required'),
  repo: z.string().min(1, 'GitHub repo is required'),
  project: z.number().optional(),
});

/**
 * Schema for workflow columns mapping
 */
export const columnsConfigSchema = z.object({
  backlog: z.string().optional(),
  ready: z.string().min(1, 'Ready column name is required'),
  in_progress: z.string().min(1, 'In Progress column name is required'),
  review: z.string().optional(),
  done: z.string().min(1, 'Done column name is required'),
});

/**
 * Schema for pickup trigger conditions
 */
export const pickupTriggerSchema = z.object({
  column: z.string().min(1, 'Trigger column is required'),
  labels: z.array(z.string()).min(1, 'At least one trigger label is required'),
  exclude_labels: z.array(z.string()).optional(),
});

/**
 * Schema for triggers configuration
 */
export const triggersConfigSchema = z.object({
  pickup: pickupTriggerSchema,
});

/**
 * Schema for status labels
 */
export const labelsConfigSchema = z.object({
  in_progress: z.string().min(1, 'In progress label is required'),
  blocked: z.string().min(1, 'Blocked label is required'),
  complete: z.string().min(1, 'Complete label is required'),
});

/**
 * Schema for workflow configuration
 */
export const workflowConfigSchema = z.object({
  columns: columnsConfigSchema,
  triggers: triggersConfigSchema,
  labels: labelsConfigSchema,
});

/**
 * Schema for agent behavior configuration
 */
export const agentConfigSchema = z.object({
  max_iterations: z.number().min(1).max(100).optional(),
  branch_prefix: z.string().optional(),
  commit_prefix: z.string().optional(),
  dry_run: z.boolean().optional(),
});

/**
 * Root configuration schema
 */
export const buboConfigSchema = z.object({
  version: z.literal(1),
  github: githubConfigSchema,
  workflow: workflowConfigSchema,
  agent: agentConfigSchema.optional(),
});

/**
 * Type definitions derived from schemas
 */
export type GithubConfig = z.infer<typeof githubConfigSchema>;
export type ColumnsConfig = z.infer<typeof columnsConfigSchema>;
export type PickupTrigger = z.infer<typeof pickupTriggerSchema>;
export type TriggersConfig = z.infer<typeof triggersConfigSchema>;
export type LabelsConfig = z.infer<typeof labelsConfigSchema>;
export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;
export type AgentConfig = z.infer<typeof agentConfigSchema>;
export type BuboConfig = z.infer<typeof buboConfigSchema>;

/**
 * Validate a configuration object
 */
export function validateConfig(config: unknown): BuboConfig {
  return buboConfigSchema.parse(config);
}

/**
 * Safely validate a configuration object, returning errors instead of throwing
 */
export function safeValidateConfig(config: unknown): {
  success: true;
  data: BuboConfig;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = buboConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
