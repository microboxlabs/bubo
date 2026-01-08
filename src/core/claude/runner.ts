import { spawn } from 'node:child_process';
import type { TaskContext } from '../../types/agent.js';

/**
 * Get the Claude CLI executable path from environment or use default.
 * Set CLAUDE_PATH environment variable to an absolute path to mitigate
 * PATH manipulation attacks (CWE-426, CWE-427).
 * Note: When CLAUDE_PATH is not set, the fallback 'claude' relies on PATH resolution.
 */
function getClaudePath(): string {
  return process.env['CLAUDE_PATH'] ?? 'claude';
}

/**
 * ClaudeCodeRunner - Executes Claude Code for AI-powered coding
 */
export class ClaudeCodeRunner {
  /**
   * Execute a Claude Code session for the given task
   */
  async execute(options: {
    task: TaskContext;
    iteration: number;
    dryRun: boolean;
  }): Promise<ExecutionResult> {
    const { task, iteration, dryRun } = options;

    console.log(`🤖 Executing Claude Code (iteration ${iteration})`);
    console.log(`   Task: ${task.title}`);

    if (dryRun) {
      console.log('   [DRY RUN] Would execute Claude Code here');
      return {
        status: 'complete',
        message: 'Dry run completed',
        committed: false,
      };
    }

    const prompt = this.buildPrompt(task, iteration);

    try {
      const output = await this.runClaudeCode(prompt);
      return this.parseOutput(output);
    } catch (error) {
      console.error('Claude Code execution failed:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        committed: false,
      };
    }
  }

  /**
   * Build the prompt for Claude Code
   */
  private buildPrompt(task: TaskContext, iteration: number): string {
    return `
You are working on the following task:

**Title:** ${task.title}

**Description:**
${task.body}

**Iteration:** ${iteration}

**Instructions:**
1. Analyze the task and implement the required changes
2. Ensure all tests pass
3. Ensure TypeScript compiles without errors
4. Commit your changes with a descriptive message

**Stop Condition:**
If the task is complete and there is no further work to be done, respond with:
<promise>COMPLETE</promise>

If you encounter a blocker that requires human intervention, respond with:
<promise>BLOCKED: [reason]</promise>

Otherwise, continue working on the task.
`.trim();
  }

  /**
   * Execute Claude Code CLI
   */
  private async runClaudeCode(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const claudePath = getClaudePath();
      const child = spawn(claudePath, ['--print', prompt], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Claude Code exited with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse Claude Code output to determine status
   */
  private parseOutput(output: string): ExecutionResult {
    if (output.includes('<promise>COMPLETE</promise>')) {
      return {
        status: 'complete',
        message: 'Task completed successfully',
        committed: true,
      };
    }

    // Use indexOf-based parsing instead of regex to avoid backtracking DoS (CWE-1333)
    const blockedReason = this.extractBlockedReason(output);
    if (blockedReason !== null) {
      return {
        status: 'blocked',
        message: blockedReason || 'Unknown blocker',
        committed: false,
      };
    }

    return {
      status: 'in-progress',
      message: 'Continuing work on task',
      committed: true,
    };
  }

  /**
   * Extract blocked reason using linear-time string parsing.
   * Avoids regex backtracking vulnerability with overlapping patterns.
   */
  private extractBlockedReason(output: string): string | null {
    const startTag = '<promise>BLOCKED:';
    const endTag = '</promise>';

    const startIdx = output.indexOf(startTag);
    if (startIdx === -1) {
      return null;
    }

    const contentStart = startIdx + startTag.length;
    const endIdx = output.indexOf(endTag, contentStart);
    if (endIdx === -1) {
      return null;
    }

    return output.slice(contentStart, endIdx).trim();
  }
}

interface ExecutionResult {
  status: 'complete' | 'in-progress' | 'blocked' | 'error';
  message: string;
  committed: boolean;
}
