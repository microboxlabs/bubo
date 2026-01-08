import type { AgentResult, TaskContext } from '../types/agent.js';
import type { BuboConfig } from './config/schema.js';
import { GitHubClient } from './github/client.js';
import { ClaudeCodeRunner } from './claude/runner.js';
import { WorkflowEngine } from './workflow/engine.js';

/**
 * BuboAgent - The main orchestrator for AI-powered coding sessions
 *
 * Implements an iterative agent loop:
 * 1. Fetch task from GitHub (Issue or Project item)
 * 2. Execute coding session with Claude Code
 * 3. Validate changes (tests, types, lint)
 * 4. Commit and push changes
 * 5. Update task status
 * 6. Repeat until complete or max iterations reached
 */
export class BuboAgent {
  private readonly config: BuboConfig;
  private readonly github: GitHubClient;
  private readonly claude: ClaudeCodeRunner;
  private readonly workflow: WorkflowEngine;

  constructor(config: BuboConfig) {
    this.config = config;
    this.github = new GitHubClient(config.github);
    this.claude = new ClaudeCodeRunner();
    this.workflow = new WorkflowEngine(config);
  }

  /**
   * Get the maximum iterations from config
   */
  private get maxIterations(): number {
    return this.config.agent?.max_iterations ?? 10;
  }

  /**
   * Check if dry run mode is enabled
   */
  private get dryRun(): boolean {
    return this.config.agent?.dry_run ?? false;
  }

  /**
   * Run the agent on a specific GitHub issue
   */
  async runOnIssue(issueNumber: number): Promise<AgentResult> {
    console.log(`🦉 Starting agent on issue #${issueNumber}`);

    const task = await this.github.getIssue(issueNumber);

    // Check if task matches trigger conditions
    if (!this.workflow.matchesTrigger(task)) {
      console.log('⚠️ Issue does not match trigger conditions');
      console.log(
        `   Required labels: ${this.config.workflow.triggers.pickup.labels.join(', ')}`
      );
      console.log(`   Issue labels: ${task.labels.join(', ')}`);
      return {
        status: 'error',
        message: 'Issue does not have the required labels to be picked up by Bubo',
        iterations: 0,
        commits: 0,
      };
    }

    return this.executeLoop(task);
  }

  /**
   * Run the agent on the next available task from the configured project
   */
  async runOnNextTask(): Promise<AgentResult> {
    console.log('🦉 Fetching next task from project...');
    console.log(this.workflow.getWorkflowSummary());

    const task = await this.workflow.getNextTask();
    if (!task) {
      return {
        status: 'no-work',
        message: 'No tasks available that match trigger conditions',
        iterations: 0,
        commits: 0,
      };
    }

    console.log(`📋 Found task: ${task.title}`);
    return this.executeLoop(task);
  }

  /**
   * Run agent on issues matching the trigger labels (without project board)
   */
  async runOnLabeledIssues(): Promise<AgentResult> {
    const triggerLabels = this.config.workflow.triggers.pickup.labels;
    console.log(`🦉 Finding issues with labels: ${triggerLabels.join(', ')}`);

    const issues = await this.github.listIssuesWithLabels(triggerLabels);

    // Filter by exclude labels
    const excludeLabels = this.config.workflow.triggers.pickup.exclude_labels ?? [];
    const eligibleIssues = issues.filter(
      (issue) => !excludeLabels.some((label) => issue.labels.includes(label))
    );

    if (eligibleIssues.length === 0) {
      return {
        status: 'no-work',
        message: 'No issues found with trigger labels',
        iterations: 0,
        commits: 0,
      };
    }

    // Take the first (oldest) issue
    const task = eligibleIssues[0];
    if (!task) {
      return {
        status: 'no-work',
        message: 'No eligible issues found',
        iterations: 0,
        commits: 0,
      };
    }

    console.log(`📋 Found issue #${task.number}: ${task.title}`);
    return this.executeLoop(task);
  }

  /**
   * Main agent execution loop
   */
  private async executeLoop(task: TaskContext): Promise<AgentResult> {
    let iteration = 0;
    let commits = 0;

    while (iteration < this.maxIterations) {
      iteration++;
      console.log(`\n📍 Iteration ${iteration}/${this.maxIterations}`);

      // Update task status to in-progress
      await this.workflow.updateTaskStatus(task, 'in-progress');

      // Execute coding session
      const result = await this.claude.execute({
        task,
        iteration,
        dryRun: this.dryRun,
      });

      if (result.status === 'complete') {
        console.log('✅ Task completed!');
        await this.workflow.updateTaskStatus(task, 'done');
        return {
          status: 'success',
          message: 'Task completed successfully',
          iterations: iteration,
          commits: commits + (result.committed ? 1 : 0),
        };
      }

      if (result.status === 'blocked') {
        console.log('🚫 Task blocked, needs human intervention');
        await this.workflow.updateTaskStatus(task, 'blocked');
        return {
          status: 'blocked',
          message: result.message ?? 'Task requires human intervention',
          iterations: iteration,
          commits,
        };
      }

      if (result.committed) {
        commits++;
      }

      // Log progress
      await this.logProgress(task, iteration, result);
    }

    console.log('⚠️ Max iterations reached');
    return {
      status: 'max-iterations',
      message: `Reached maximum of ${this.maxIterations} iterations`,
      iterations: iteration,
      commits,
    };
  }

  /**
   * Log progress to progress.txt and GitHub
   */
  private async logProgress(
    task: TaskContext,
    iteration: number,
    result: { status: string; message?: string }
  ): Promise<void> {
    const entry = {
      timestamp: new Date().toISOString(),
      task: task.id,
      iteration,
      status: result.status,
      message: result.message,
    };

    console.log('📝 Progress:', JSON.stringify(entry, null, 2));

    // Post progress to GitHub issue
    if (task.type === 'issue' && task.number) {
      const comment =
        `🦉 **Bubo Progress Update**\n\n` +
        `- Iteration: ${iteration}/${this.maxIterations}\n` +
        `- Status: ${result.status}\n` +
        `- Message: ${result.message ?? 'Working on task...'}`;

      try {
        await this.github.postComment(task.number, comment);
      } catch (error) {
        console.warn('Failed to post progress comment:', error);
      }
    }
  }
}
