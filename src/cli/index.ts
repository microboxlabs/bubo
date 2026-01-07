#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';

// Load environment variables
config();

const program = new Command();

program
  .name('bubo')
  .description('Enterprise AI coding agent with deep GitHub integration')
  .version('0.1.0');

program
  .command('run')
  .description('Run the Bubo agent on a task')
  .option('-i, --issue <number>', 'Issue number to work on')
  .option('-p, --project <name>', 'GitHub Project to fetch tasks from')
  .option('-n, --max-iterations <number>', 'Maximum iterations', '10')
  .option('--dry-run', 'Plan without executing changes')
  .action(async (options) => {
    console.log('🦉 Bubo Agent Starting...');
    console.log('Options:', options);
    // TODO: Implement agent run logic
    console.log('Agent run not yet implemented');
  });

program
  .command('plan')
  .description('Plan work without executing (dry run)')
  .option('-i, --issue <number>', 'Issue number to analyze')
  .action(async (options) => {
    console.log('🦉 Bubo Planning Mode...');
    console.log('Options:', options);
    // TODO: Implement planning logic
    console.log('Planning not yet implemented');
  });

program
  .command('status')
  .description('Check the status of Bubo and current tasks')
  .action(async () => {
    console.log('🦉 Bubo Status');
    console.log('─'.repeat(40));
    console.log('Version: 0.1.0');
    console.log('GitHub Token:', process.env['GITHUB_TOKEN'] ? '✓ Set' : '✗ Not set');
    console.log('Anthropic Key:', process.env['ANTHROPIC_API_KEY'] ? '✓ Set' : '✗ Not set');
    // TODO: Implement full status check
  });

program.parse();

