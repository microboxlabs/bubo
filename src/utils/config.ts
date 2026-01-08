import { z } from 'zod';

/**
 * Environment configuration schema
 */
const envSchema = z.object({
  // Required
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),

  // Optional with defaults
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Bubo configuration
  BUBO_MAX_ITERATIONS: z.coerce.number().default(10),
  BUBO_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  BUBO_DRY_RUN: z.coerce.boolean().default(false),

  // Project configuration
  BUBO_PROJECT_NUMBER: z.coerce.number().optional(),
  BUBO_READY_COLUMN: z.string().default('Ready'),
  BUBO_IN_PROGRESS_COLUMN: z.string().default('In Progress'),
  BUBO_DONE_COLUMN: z.string().default('Done'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Load and validate environment configuration
 */
export function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Configuration errors:\n${errors}`);
  }

  return result.data;
}

/**
 * Get configuration or throw if invalid
 */
let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}
