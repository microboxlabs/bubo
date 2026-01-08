#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { loadConfig, ConfigError } from '../core/config/loader.js';
import { BuboAgent } from '../core/agent.js';
import { initCommand } from './commands/init.js';
import { validateCommand, showCommand, setupLabelsCommand } from './commands/config.js';

// Load environment variables
config();

const program = new Command();

program
  .name('bubo')
  .description('Production-ready AI coding agent with deep GitHub integration')
  .version('0.1.0');

// Init command
program
  .command('init')
  .description('Initialize Bubo configuration in the current repository')
  .option('-o, --owner <owner>', 'GitHub organization or username (env: GITHUB_OWNER)')
  .option(
    '-r, --repo <repo>',
    'Repository name where issues are created, without owner prefix (env: GITHUB_REPO)'
  )
  .option(
    '-p, --project <number>',
    'GitHub Project number for workflow automation (optional)',
    parseInt
  )
  .option('-f, --force', 'Overwrite existing .bubo/workflow.yml configuration')
  .addHelpText(
    'after',
    `
Examples:
  $ bubo init --owner acme-inc --repo acme-app
  $ bubo init --project 123                        # Uses env vars for owner/repo
  $ bubo init --force                              # Regenerate configuration
  $ bubo init                                      # Auto-detect from git remote
  $ bubo init --owner acme-inc --repo acme-app --project 123 --force
`
  )
  .action(initCommand);

// Run command
program
  .command('run')
  .description('Run the Bubo agent on a task')
  .option('-i, --issue <number>', 'Issue number to work on', parseInt)
  .option('--dry-run', 'Plan without executing changes')
  .action(async (options) => {
    console.log('🦉 Bubo Agent Starting...\n');

    try {
      const buboConfig = await loadConfig(process.cwd());

      // Override dry_run if specified
      if (options.dryRun) {
        buboConfig.agent = { ...buboConfig.agent, dry_run: true };
      }

      const agent = new BuboAgent(buboConfig);

      let result;
      if (options.issue) {
        result = await agent.runOnIssue(options.issue);
      } else if (buboConfig.github.project) {
        result = await agent.runOnNextTask();
      } else {
        result = await agent.runOnLabeledIssues();
      }

      console.log('\n📊 Result:', result);

      if (result.status === 'error' || result.status === 'blocked') {
        process.exitCode = 1;
      }
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error('❌ Configuration error:', error.message);
        error.details?.forEach((d) => console.error(`   - ${d}`));
      } else {
        console.error('❌ Error:', error);
      }
      process.exitCode = 1;
    }
  });

// Config commands
const configCmd = program.command('config').description('Manage Bubo configuration');

configCmd
  .command('validate')
  .description('Validate the Bubo configuration')
  .option('-v, --verbose', 'Show detailed configuration')
  .action(validateCommand);

configCmd
  .command('show')
  .description('Show the current configuration')
  .action(showCommand);

configCmd
  .command('setup-labels')
  .description('Create required labels in the GitHub repository')
  .action(setupLabelsCommand);

// Status command
program
  .command('status')
  .description('Check the status of Bubo and current tasks')
  .action(async () => {
    console.log('🦉 Bubo Status');
    console.log('─'.repeat(40));
    console.log('Version: 0.1.0');
    console.log('');

    // Environment check
    console.log('Environment:');
    console.log(`  GITHUB_TOKEN: ${process.env['GITHUB_TOKEN'] ? '✓ Set' : '✗ Not set'}`);
    console.log(`  GITHUB_OWNER: ${process.env['GITHUB_OWNER'] ?? '(not set)'}`);
    console.log(`  GITHUB_REPO: ${process.env['GITHUB_REPO'] ?? '(not set)'}`);
    console.log('');

    // Configuration check
    try {
      const buboConfig = await loadConfig(process.cwd());
      console.log('Configuration: ✓ Valid');
      console.log(`  Repository: ${buboConfig.github.owner}/${buboConfig.github.repo}`);
      if (buboConfig.github.project) {
        console.log(`  Project: #${buboConfig.github.project}`);
      }
      console.log(
        `  Trigger labels: ${buboConfig.workflow.triggers.pickup.labels.join(', ')}`
      );
    } catch {
      console.log('Configuration: ✗ Not found or invalid');
      console.log('  Run `bubo init` to create configuration');
    }
  });

program.parse();
