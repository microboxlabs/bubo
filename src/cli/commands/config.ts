import { loadConfig, findConfigFile, ConfigError } from '../../core/config/loader.js';
import { GitHubClient } from '../../core/github/client.js';
import { WorkflowEngine } from '../../core/workflow/engine.js';

interface ValidateOptions {
  verbose?: boolean;
}

/**
 * Validate the Bubo configuration
 */
export async function validateCommand(options: ValidateOptions): Promise<void> {
  const repoRoot = process.cwd();

  console.log('🔍 Validating Bubo configuration...\n');

  // Check for config file
  const configFile = findConfigFile(repoRoot);
  if (!configFile) {
    console.log('❌ No configuration file found');
    console.log('   Run `bubo init` to create one');
    process.exitCode = 1;
    return;
  }

  console.log(`📄 Found: ${configFile.replace(repoRoot, '.')}`);

  // Load and validate config
  let config;
  try {
    config = await loadConfig(repoRoot);
    console.log('✅ Configuration is valid\n');
  } catch (error) {
    if (error instanceof ConfigError) {
      console.log('❌ Configuration errors:');
      error.details?.forEach((detail) => console.log(`   - ${detail}`));
    } else {
      console.log('❌ Failed to load configuration:', error);
    }
    process.exitCode = 1;
    return;
  }

  if (options.verbose) {
    const workflow = new WorkflowEngine(config);
    console.log(workflow.getWorkflowSummary());
    console.log('');
  }

  // Validate GitHub access
  console.log('🔗 Checking GitHub access...');

  if (!process.env['GITHUB_TOKEN']) {
    console.log('⚠️  GITHUB_TOKEN not set - skipping GitHub validation');
    return;
  }

  try {
    const github = new GitHubClient(config.github);

    // Check if required labels exist
    console.log('\n📋 Checking labels...');
    const requiredLabels = [
      ...config.workflow.triggers.pickup.labels,
      config.workflow.labels.in_progress,
      config.workflow.labels.blocked,
      config.workflow.labels.complete,
    ];

    let missingLabels = 0;
    for (const label of requiredLabels) {
      const exists = await github.labelExists(label);
      if (exists) {
        console.log(`   ✅ ${label}`);
      } else {
        console.log(`   ❌ ${label} (missing)`);
        missingLabels++;
      }
    }

    if (missingLabels > 0) {
      console.log(`\n⚠️  ${missingLabels} label(s) not found in repository`);
      console.log('   Create them or run `bubo setup-labels` to create automatically');
    } else {
      console.log('\n✅ All required labels exist');
    }

  } catch (error) {
    console.log('❌ Failed to connect to GitHub:', error);
    process.exitCode = 1;
  }
}

/**
 * Show the current configuration
 */
export async function showCommand(): Promise<void> {
  const repoRoot = process.cwd();

  try {
    const config = await loadConfig(repoRoot);
    const workflow = new WorkflowEngine(config);

    console.log('🦉 Bubo Configuration\n');
    console.log(`GitHub: ${config.github.owner}/${config.github.repo}`);
    if (config.github.project) {
      console.log(`Project: #${config.github.project}`);
    }
    console.log('');
    console.log(workflow.getWorkflowSummary());
    console.log('');
    console.log('Agent Settings:');
    console.log(`  Max Iterations: ${config.agent?.max_iterations ?? 10}`);
    console.log(`  Branch Prefix: ${config.agent?.branch_prefix ?? 'bubo/'}`);
    console.log(`  Commit Prefix: ${config.agent?.commit_prefix ?? '[bubo]'}`);
    console.log(`  Dry Run: ${config.agent?.dry_run ?? false}`);

  } catch (error) {
    if (error instanceof ConfigError) {
      console.log('❌ Configuration error:', error.message);
      error.details?.forEach((detail) => console.log(`   - ${detail}`));
    } else {
      console.log('❌ No valid configuration found');
      console.log('   Run `bubo init` to create one');
    }
    process.exitCode = 1;
  }
}

/**
 * Create required labels in the GitHub repository
 */
export async function setupLabelsCommand(): Promise<void> {
  const repoRoot = process.cwd();

  if (!process.env['GITHUB_TOKEN']) {
    console.log('❌ GITHUB_TOKEN is required');
    process.exitCode = 1;
    return;
  }

  try {
    const config = await loadConfig(repoRoot);
    const github = new GitHubClient(config.github);

    console.log('🏷️  Creating labels...\n');

    const labels = [
      {
        name: config.workflow.triggers.pickup.labels[0] ?? 'bubo:ready',
        color: '0E8A16',
        description: 'Ready for Bubo to pick up',
      },
      {
        name: config.workflow.labels.in_progress,
        color: '1D76DB',
        description: 'Bubo is working on this',
      },
      {
        name: config.workflow.labels.blocked,
        color: 'D93F0B',
        description: 'Bubo needs human intervention',
      },
      {
        name: config.workflow.labels.complete,
        color: '6F42C1',
        description: 'Bubo has completed this task',
      },
    ];

    for (const label of labels) {
      try {
        await github.ensureLabel(label.name, label.color, label.description);
        console.log(`   ✅ ${label.name}`);
      } catch (error) {
        console.log(`   ❌ ${label.name}: ${error}`);
      }
    }

    console.log('\n✅ Labels setup complete');

  } catch (error) {
    console.log('❌ Failed to setup labels:', error);
    process.exitCode = 1;
  }
}
