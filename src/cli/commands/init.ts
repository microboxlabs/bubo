import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { stringify as yamlStringify } from 'yaml';
import { generateStarterConfig } from '../../core/config/defaults.js';
import type { BuboConfig } from '../../core/config/schema.js';

const CONFIG_PATH = '.bubo/workflow.yml';

interface InitOptions {
  owner?: string;
  repo?: string;
  project?: number;
  force?: boolean;
}

type ConfigSource = 'command line' | 'environment' | 'git remote';

interface ResolvedValue {
  value: string;
  source: ConfigSource;
}

/**
 * Get the git executable path from environment or use default.
 * Set GIT_PATH environment variable to override (e.g., for Windows or custom installations).
 * Note: When GIT_PATH is not set, the fallback 'git' still relies on PATH resolution.
 */
function getGitPath(): string {
  return process.env['GIT_PATH'] ?? 'git';
}

/**
 * Resolve a config value from options, environment, or git remote
 */
function resolveConfigValue(
  optionValue: string | undefined,
  envKey: string,
  remoteValue: string | undefined
): ResolvedValue {
  if (optionValue) {
    return { value: optionValue, source: 'command line' };
  }
  const envValue = process.env[envKey];
  if (envValue) {
    return { value: envValue, source: 'environment' };
  }
  if (remoteValue) {
    return { value: remoteValue, source: 'git remote' };
  }
  return { value: '', source: 'command line' };
}

/**
 * Print error message when owner/repo is missing
 */
function printMissingRepoError(detectedRemote: { owner: string; repo: string } | null): void {
  console.log('⚠️  GitHub owner and repo are required.\n');
  console.log('Options:');
  console.log('  1. Set environment variables:');
  console.log('     export GITHUB_OWNER=your-org');
  console.log('     export GITHUB_REPO=your-repo\n');
  console.log('  2. Pass as arguments:');
  console.log('     bubo init --owner your-org --repo your-repo\n');
  if (detectedRemote) {
    console.log(`  3. Detected from git remote: ${detectedRemote.owner}/${detectedRemote.repo}`);
    console.log('     This will be used automatically if no other values are provided.\n');
  } else {
    console.log('  Note: No git remote detected. Make sure you are in a git repository');
    console.log('        with a GitHub remote configured.\n');
  }
}

/**
 * Print success message after config creation
 */
function printSuccessMessage(
  owner: string,
  repo: string,
  ownerSource: ConfigSource,
  repoSource: ConfigSource,
  config: BuboConfig
): void {
  const sourceInfo = ownerSource === repoSource
    ? `(from ${ownerSource})`
    : `(owner from ${ownerSource}, repo from ${repoSource})`;

  console.log('✅ Created .bubo/workflow.yml');
  console.log(`   Repository: ${owner}/${repo} ${sourceInfo}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review and customize the configuration');
  console.log('  2. Create the required labels in your GitHub repository:');
  console.log(`     - ${config.workflow.triggers.pickup.labels.join(', ')}`);
  console.log(`     - ${config.workflow.labels.in_progress}`);
  console.log(`     - ${config.workflow.labels.blocked}`);
  console.log(`     - ${config.workflow.labels.complete}`);
  console.log('  3. Run `bubo config validate` to verify your setup');
}

/**
 * Parse a GitHub remote URL into owner and repo components.
 * Supports SSH (git@github.com:owner/repo.git), HTTPS (https://github.com/owner/repo.git),
 * and HTTPS with port (https://github.com:443/owner/repo.git).
 */
export function parseGitHubRemoteUrl(remote: string): { owner: string; repo: string } | null {
  // Match: git@github.com:owner/repo.git, https://github.com/owner/repo.git,
  // or https://github.com:443/owner/repo.git
  // - (?::\d+)? allows optional port after github.com
  // - [:/] separator (colon for SSH, slash for HTTPS)
  // - ([^/]+) captures owner (non-slash characters)
  // - ([^/]+?) captures repo (non-slash, non-greedy to handle .git suffix)
  const match = remote.match(/github\.com(?::\d+)?[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (match?.[1] && match?.[2]) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

/**
 * Detect GitHub owner and repo from git remote origin URL
 */
export function detectGitHubRemote(): { owner: string; repo: string } | null {
  try {
    const gitPath = getGitPath();
    const remote = execFileSync(gitPath, ['remote', 'get-url', 'origin'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'], // Suppress stderr to avoid error messages
    }).trim();
    return parseGitHubRemoteUrl(remote);
  } catch {
    // Not a git repo or no remote configured
  }
  return null;
}

/**
 * Initialize a Bubo configuration file in the repository
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const repoRoot = process.cwd();
  const configPath = join(repoRoot, CONFIG_PATH);

  // Check if config already exists
  if (existsSync(configPath) && !options.force) {
    console.log('⚠️  Configuration file already exists at .bubo/workflow.yml');
    console.log('   Use --force to overwrite');
    return;
  }

  // Only try to detect from git remote if owner/repo are not provided
  const detectedRemote = (options.owner && options.repo) ? null : detectGitHubRemote();

  // Determine owner and repo with source tracking
  const ownerResolved = resolveConfigValue(options.owner, 'GITHUB_OWNER', detectedRemote?.owner);
  const repoResolved = resolveConfigValue(options.repo, 'GITHUB_REPO', detectedRemote?.repo);

  if (!ownerResolved.value || !repoResolved.value) {
    printMissingRepoError(detectedRemote);
    return;
  }

  // Generate configuration
  const config = generateStarterConfig({
    owner: ownerResolved.value,
    repo: repoResolved.value,
    ...(options.project !== undefined && { project: options.project }),
  });

  // Create directory if needed
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  // Write configuration file
  const yamlContent = generateYamlWithComments(config);
  await writeFile(configPath, yamlContent, 'utf-8');

  // Show success with source information
  printSuccessMessage(ownerResolved.value, repoResolved.value, ownerResolved.source, repoResolved.source, config);
}

/**
 * Generate YAML with helpful comments
 */
function generateYamlWithComments(config: BuboConfig): string {
  const yaml = yamlStringify(config, {
    indent: 2,
    lineWidth: 0,
  });

  return `# Bubo Workflow Configuration
# Documentation: https://github.com/microboxlabs/bubo#configuration

${yaml}
# Customize the workflow to match your GitHub Project columns:
#
# workflow:
#   columns:
#     backlog: "Backlog"
#     ready: "Ready for Development"    # Where Bubo picks tasks from
#     in_progress: "In Progress"         # Where active work goes
#     review: "In Review"                # Optional review stage
#     done: "Done"                        # Completed tasks
#
#   triggers:
#     pickup:
#       column: "Ready for Development"  # Must match 'ready' column
#       labels:
#         - "bubo:ready"                 # Issues must have this label
#       exclude_labels:                  # Optional: skip issues with these
#         - "bubo:blocked"
#
#   labels:
#     in_progress: "bubo:in-progress"   # Applied when Bubo starts
#     blocked: "bubo:blocked"           # Applied when Bubo needs help
#     complete: "bubo:complete"         # Applied when finished
`;
}
