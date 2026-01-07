import type { TaskContext, TaskStatus } from '../../types/agent.js';
import { GitHubClient } from '../github/client.js';
import { GitHubProjects } from '../github/projects.js';

/**
 * WorkflowEngine - Manages the kanban workflow and task transitions
 */
export class WorkflowEngine {
  private readonly github: GitHubClient;
  private readonly projects: GitHubProjects;

  // Label mappings for status
  private readonly statusLabels: Record<TaskStatus, string> = {
    'ready': 'bubo',
    'in-progress': 'bubo:in-progress',
    'blocked': 'bubo:blocked',
    'done': 'bubo:complete',
  };

  constructor() {
    this.github = new GitHubClient();
    this.projects = new GitHubProjects();
  }

  /**
   * Get the next available task from a project
   */
  async getNextTask(projectName: string): Promise<TaskContext | null> {
    const project = await this.projects.getProject(projectName);
    if (!project) {
      console.log(`Project "${projectName}" not found`);
      return null;
    }

    const readyColumn = process.env['BUBO_READY_COLUMN'] ?? 'Ready';
    const items = await this.projects.getItemsInColumn(project.id, readyColumn);

    if (items.length === 0) {
      return null;
    }

    // Return the first available task
    return items[0] ?? null;
  }

  /**
   * Update the status of a task
   */
  async updateTaskStatus(task: TaskContext, status: TaskStatus): Promise<void> {
    console.log(`📋 Updating task ${task.id} status to: ${status}`);

    if (task.type === 'issue' && task.number) {
      // Update labels for issue-based tasks
      await this.updateIssueLabels(task.number, status);
    }

    // TODO: Update project item status if applicable
  }

  /**
   * Update issue labels based on status
   */
  private async updateIssueLabels(
    issueNumber: number,
    status: TaskStatus
  ): Promise<void> {
    // Remove all bubo status labels
    for (const label of Object.values(this.statusLabels)) {
      await this.github.removeLabel(issueNumber, label);
    }

    // Add the new status label
    const newLabel = this.statusLabels[status];
    if (newLabel) {
      await this.github.addLabel(issueNumber, newLabel);
    }
  }

  /**
   * Create a branch name for a task
   */
  createBranchName(task: TaskContext): string {
    const sanitized = task.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    return `bubo/${task.type}-${task.number ?? 'task'}-${sanitized}`;
  }
}

