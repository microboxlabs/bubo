import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
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

/**
 * Get the git executable path from environment or use default.
 * Set GIT_PATH environment variable to override (e.g., for Windows or custom installations).
 * This prevents PATH manipulation attacks (CWE-426, CWE-427).
 */
function getGitPath(): string {
  return process.env['GIT_PATH'] ?? 'git';
}

/**
 * Detect GitHub owner and repo from git remote origin URL
 */
function detectGitHubRemote(): { owner: string; repo: string } | null {
  try {
    const gitPath = getGitPath();
    const remote = execSync(`${gitPath} remote get-url origin`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'], // Suppress stderr to avoid error messages
    }).trim();
    // Parse: git@github.com:owner/repo.git or https://github.com/owner/repo.git
    const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    if (match && match[1] && match[2]) {
      return { owner: match[1], repo: match[2] };
    }
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
  let owner: string;
  let repo: string;
  let ownerSource: ConfigSource;
  let repoSource: ConfigSource;

  if (options.owner) {
    owner = options.owner;
    ownerSource = 'command line';
  } else if (process.env['GITHUB_OWNER']) {
    owner = process.env['GITHUB_OWNER'];
    ownerSource = 'environment';
  } else if (detectedRemote) {
    owner = detectedRemote.owner;
    ownerSource = 'git remote';
  } else {
    owner = '';
    ownerSource = 'command line';
  }

  if (options.repo) {
    repo = options.repo;
    repoSource = 'command line';
  } else if (process.env['GITHUB_REPO']) {
    repo = process.env['GITHUB_REPO'];
    repoSource = 'environment';
  } else if (detectedRemote) {
    repo = detectedRemote.repo;
    repoSource = 'git remote';
  } else {
    repo = '';
    repoSource = 'command line';
  }

  if (!owner || !repo) {
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
    return;
  }

  // Generate configuration
  const configOptions: { owner: string; repo: string; project?: number } = {
    owner,
    repo,
  };
  if (options.project !== undefined) {
    configOptions.project = options.project;
  }
  const config = generateStarterConfig(configOptions);

  // Create directory if needed
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  // Write configuration file
  const yamlContent = generateYamlWithComments(config);
  await writeFile(configPath, yamlContent, 'utf-8');

  // Show success with source information
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
