import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { validateConfig, safeValidateConfig, type BuboConfig } from './schema.js';
import { withDefaults } from './defaults.js';

/**
 * Configuration file paths (in order of precedence)
 */
const CONFIG_PATHS = [
  '.bubo/workflow.yml',
  '.bubo/workflow.yaml',
  '.bubo/config.yml',
  '.bubo/config.yaml',
  'bubo.yml',
  'bubo.yaml',
];

/**
 * Error thrown when configuration loading fails
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly details?: string[]
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Find the configuration file in the repository
 */
export function findConfigFile(repoRoot: string): string | null {
  for (const configPath of CONFIG_PATHS) {
    const fullPath = join(repoRoot, configPath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Load configuration from environment variables
 */
function loadFromEnv(): Partial<BuboConfig> {
  const config: Partial<BuboConfig> = {
    github: {
      owner: process.env['GITHUB_OWNER'] ?? '',
      repo: process.env['GITHUB_REPO'] ?? '',
    },
  };

  const projectNumber = process.env['BUBO_PROJECT_NUMBER'];
  if (projectNumber && config.github) {
    config.github.project = parseInt(projectNumber, 10);
  }

  const maxIterations = process.env['BUBO_MAX_ITERATIONS'];
  if (maxIterations) {
    config.agent = {
      ...config.agent,
      max_iterations: parseInt(maxIterations, 10),
    };
  }

  const dryRun = process.env['BUBO_DRY_RUN'];
  if (dryRun) {
    config.agent = {
      ...config.agent,
      dry_run: dryRun === 'true',
    };
  }

  return config;
}

/**
 * Load and parse a YAML configuration file
 */
async function loadYamlFile(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, 'utf-8');
  return parseYaml(content);
}

/**
 * Merge configurations with proper precedence:
 * 1. File configuration (base)
 * 2. Environment variables (override)
 */
function mergeConfigs(
  fileConfig: Partial<BuboConfig>,
  envConfig: Partial<BuboConfig>
): Partial<BuboConfig> {
  return {
    ...fileConfig,
    github: {
      ...fileConfig.github,
      owner: envConfig.github?.owner || fileConfig.github?.owner || '',
      repo: envConfig.github?.repo || fileConfig.github?.repo || '',
      project: envConfig.github?.project ?? fileConfig.github?.project,
    },
    agent: {
      ...fileConfig.agent,
      ...envConfig.agent,
    },
  };
}

/**
 * Load configuration from file and environment
 */
export async function loadConfig(repoRoot: string): Promise<BuboConfig> {
  const envConfig = loadFromEnv();
  const configFile = findConfigFile(repoRoot);

  let fileConfig: Partial<BuboConfig> = {};

  if (configFile) {
    try {
      const rawConfig = await loadYamlFile(configFile);
      fileConfig = rawConfig as Partial<BuboConfig>;
    } catch (error) {
      throw new ConfigError(
        `Failed to parse configuration file: ${configFile}`,
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  const mergedConfig = mergeConfigs(fileConfig, envConfig);
  const configWithDefaults = withDefaults(mergedConfig);

  const result = safeValidateConfig(configWithDefaults);

  if (!result.success) {
    const errors = result.errors.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    );
    throw new ConfigError('Invalid configuration', errors);
  }

  return result.data;
}

/**
 * Load configuration or return null if not found/invalid
 */
export async function tryLoadConfig(repoRoot: string): Promise<BuboConfig | null> {
  try {
    return await loadConfig(repoRoot);
  } catch {
    return null;
  }
}

/**
 * Validate a configuration file without loading environment
 */
export async function validateConfigFile(filePath: string): Promise<{
  valid: boolean;
  config?: BuboConfig;
  errors?: string[];
}> {
  try {
    const rawConfig = await loadYamlFile(filePath);
    const configWithDefaults = withDefaults(rawConfig as Partial<BuboConfig>);
    const config = validateConfig(configWithDefaults);
    return { valid: true, config };
  } catch (error) {
    if (error instanceof Error && 'errors' in error) {
      const zodError = error as { errors: Array<{ path: string[]; message: string }> };
      return {
        valid: false,
        errors: zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
