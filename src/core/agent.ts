import type { AgentConfig, AgentResult, TaskContext } from '../types/agent.js';
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
  private readonly config: AgentConfig;
  private readonly github: GitHubClient;
  private readonly claude: ClaudeCodeRunner;
  private readonly workflow: WorkflowEngine;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      maxIterations: config.maxIterations ?? 10,
      dryRun: config.dryRun ?? false,
      logLevel: config.logLevel ?? 'info',
    };

    this.github = new GitHubClient();
    this.claude = new ClaudeCodeRunner();
    this.workflow = new WorkflowEngine();
  }

  /**
   * Run the agent on a specific GitHub issue
   */
  async runOnIssue(issueNumber: number): Promise<AgentResult> {
    console.log(`🦉 Starting agent on issue #${issueNumber}`);
    
    const task = await this.github.getIssue(issueNumber);
    return this.executeLoop(task);
  }

  /**
   * Run the agent on the next available task from a GitHub Project
   */
  async runOnProject(projectName: string): Promise<AgentResult> {
    console.log(`🦉 Fetching next task from project: ${projectName}`);
    
    const task = await this.workflow.getNextTask(projectName);
    if (!task) {
      return {
        status: 'no-work',
        message: 'No tasks available in the Ready column',
        iterations: 0,
        commits: 0,
      };
    }

    return this.executeLoop(task);
  }

  /**
   * Main agent execution loop
   */
  private async executeLoop(task: TaskContext): Promise<AgentResult> {
    let iteration = 0;
    let commits = 0;

    while (iteration < this.config.maxIterations) {
      iteration++;
      console.log(`\n📍 Iteration ${iteration}/${this.config.maxIterations}`);

      // Update task status to in-progress
      await this.workflow.updateTaskStatus(task, 'in-progress');

      // Execute coding session
      const result = await this.claude.execute({
        task,
        iteration,
        dryRun: this.config.dryRun,
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
      message: `Reached maximum of ${this.config.maxIterations} iterations`,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any
  ): Promise<void> {
    const entry = {
      timestamp: new Date().toISOString(),
      task: task.id,
      iteration,
      status: result.status,
      message: result.message,
    };

    console.log('📝 Progress:', JSON.stringify(entry, null, 2));
    // TODO: Append to progress.txt
    // TODO: Post comment to GitHub issue
  }
}

