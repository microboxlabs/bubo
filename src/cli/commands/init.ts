import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
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

  // Determine owner and repo
  const owner = options.owner ?? process.env['GITHUB_OWNER'] ?? '';
  const repo = options.repo ?? process.env['GITHUB_REPO'] ?? '';

  if (!owner || !repo) {
    console.log('⚠️  GitHub owner and repo are required');
    console.log('   Set GITHUB_OWNER and GITHUB_REPO environment variables');
    console.log('   Or use: bubo init --owner <owner> --repo <repo>');
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

  console.log('✅ Created .bubo/workflow.yml');
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
