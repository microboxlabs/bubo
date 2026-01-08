import type { TaskContext, TaskStatus } from '../../types/agent.js';
import type { BuboConfig } from '../config/schema.js';
import { GitHubClient } from '../github/client.js';
import { GitHubProjects } from '../github/projects.js';

/**
 * WorkflowEngine - Manages the kanban workflow and task transitions
 *
 * Uses configuration to adapt to any GitHub workflow structure.
 */
export class WorkflowEngine {
  private readonly config: BuboConfig;
  private readonly github: GitHubClient;
  private readonly projects: GitHubProjects;

  constructor(config: BuboConfig) {
    this.config = config;
    this.github = new GitHubClient(config.github);
    this.projects = new GitHubProjects(config.github);
  }

  /**
   * Get the label for a given status from configuration
   */
  private getStatusLabel(status: TaskStatus): string {
    const labels = this.config.workflow.labels;
    switch (status) {
      case 'in-progress':
        return labels.in_progress;
      case 'blocked':
        return labels.blocked;
      case 'done':
        return labels.complete;
      case 'ready':
        return this.config.workflow.triggers.pickup.labels[0] ?? 'bubo:ready';
    }
  }

  /**
   * Get all configured status labels
   */
  private getAllStatusLabels(): string[] {
    const labels = this.config.workflow.labels;
    return [
      labels.in_progress,
      labels.blocked,
      labels.complete,
      ...this.config.workflow.triggers.pickup.labels,
    ];
  }

  /**
   * Check if a task matches the pickup trigger conditions
   */
  matchesTrigger(task: TaskContext): boolean {
    const trigger = this.config.workflow.triggers.pickup;

    // Check if task has ALL required labels
    const hasRequiredLabels = trigger.labels.every((label) =>
      task.labels.includes(label)
    );

    if (!hasRequiredLabels) {
      return false;
    }

    // Check if task has ANY excluded labels
    if (trigger.exclude_labels) {
      const hasExcludedLabel = trigger.exclude_labels.some((label) =>
        task.labels.includes(label)
      );
      if (hasExcludedLabel) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the next available task from a project that matches trigger conditions
   */
  async getNextTask(projectNumber?: number): Promise<TaskContext | null> {
    const projectNum = projectNumber ?? this.config.github.project;

    if (!projectNum) {
      console.log('No project number configured');
      return null;
    }

    const readyColumn = this.config.workflow.columns.ready;
    const items = await this.projects.getItemsInColumn(projectNum, readyColumn);

    // Find first task that matches trigger conditions
    for (const task of items) {
      if (this.matchesTrigger(task)) {
        return task;
      }
    }

    return null;
  }

  /**
   * Update the status of a task (labels and project column)
   */
  async updateTaskStatus(task: TaskContext, status: TaskStatus): Promise<void> {
    console.log(`📋 Updating task ${task.id} status to: ${status}`);

    if (task.type === 'issue' && task.number) {
      await this.updateIssueLabels(task.number, status);
    }

    // Update project column if task has project info
    if (task.projectItemId && this.config.github.project) {
      const targetColumn = this.getColumnForStatus(status);
      if (targetColumn) {
        await this.projects.moveItemToColumn(
          this.config.github.project,
          task.projectItemId,
          targetColumn
        );
      }
    }
  }

  /**
   * Get the project column name for a given status
   */
  private getColumnForStatus(status: TaskStatus): string | null {
    const columns = this.config.workflow.columns;
    switch (status) {
      case 'ready':
        return columns.ready;
      case 'in-progress':
        return columns.in_progress;
      case 'done':
        return columns.done;
      case 'blocked':
        // Blocked items stay in progress but with a label
        return columns.in_progress;
      default:
        return null;
    }
  }

  /**
   * Update issue labels based on status
   */
  private async updateIssueLabels(
    issueNumber: number,
    status: TaskStatus
  ): Promise<void> {
    // Remove all bubo status labels
    for (const label of this.getAllStatusLabels()) {
      await this.github.removeLabel(issueNumber, label);
    }

    // Add the new status label
    const newLabel = this.getStatusLabel(status);
    await this.github.addLabel(issueNumber, newLabel);
  }

  /**
   * Create a branch name for a task
   */
  createBranchName(task: TaskContext): string {
    const prefix = this.config.agent?.branch_prefix ?? 'bubo/';
    const sanitized = task.title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/(?:^-|-$)/g, '')
      .slice(0, 50);

    return `${prefix}${task.type}-${task.number ?? 'task'}-${sanitized}`;
  }

  /**
   * Create a commit message with configured prefix
   */
  createCommitMessage(message: string): string {
    const prefix = this.config.agent?.commit_prefix ?? '[bubo]';
    return `${prefix} ${message}`;
  }

  /**
   * Get the workflow configuration summary
   */
  getWorkflowSummary(): string {
    const { columns, triggers, labels } = this.config.workflow;
    return `
Workflow Configuration:
  Columns:
    Ready: ${columns.ready}
    In Progress: ${columns.in_progress}
    Done: ${columns.done}
  
  Pickup Trigger:
    Column: ${triggers.pickup.column}
    Labels: ${triggers.pickup.labels.join(', ')}
    ${triggers.pickup.exclude_labels ? `Exclude: ${triggers.pickup.exclude_labels.join(', ')}` : ''}
  
  Status Labels:
    In Progress: ${labels.in_progress}
    Blocked: ${labels.blocked}
    Complete: ${labels.complete}
`.trim();
  }
}
