import type { RunOptions } from '../../types/cli.js';
import { BuboAgent } from '../../core/agent.js';

export async function runCommand(options: RunOptions): Promise<void> {
  const agent = new BuboAgent({
    maxIterations: options.maxIterations ?? 10,
    dryRun: options.dryRun ?? false,
  });

  if (options.issue) {
    await agent.runOnIssue(options.issue);
  } else if (options.project) {
    await agent.runOnProject(options.project);
  } else {
    throw new Error('Either --issue or --project must be specified');
  }
}

