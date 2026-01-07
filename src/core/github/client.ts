import { Octokit } from '@octokit/rest';
import type { TaskContext } from '../../types/agent.js';
import type { GithubConfig } from '../config/schema.js';

/**
 * GitHubClient - Handles all GitHub API interactions
 */
export class GitHubClient {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor(config: GithubConfig) {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    this.octokit = new Octokit({ auth: token });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  /**
   * Fetch an issue by number and convert to TaskContext
   */
  async getIssue(issueNumber: number): Promise<TaskContext> {
    const { data: issue } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    });

    return {
      id: `issue-${issue.number}`,
      type: 'issue',
      number: issue.number,
      title: issue.title,
      body: issue.body ?? '',
      labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
      url: issue.html_url,
    };
  }

  /**
   * List issues with specific labels
   */
  async listIssuesWithLabels(labels: string[]): Promise<TaskContext[]> {
    const { data: issues } = await this.octokit.issues.listForRepo({
      owner: this.owner,
      repo: this.repo,
      labels: labels.join(','),
      state: 'open',
      sort: 'created',
      direction: 'asc',
    });

    return issues
      .filter((issue) => !issue.pull_request) // Exclude PRs
      .map((issue) => ({
        id: `issue-${issue.number}`,
        type: 'issue' as const,
        number: issue.number,
        title: issue.title,
        body: issue.body ?? '',
        labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
        url: issue.html_url,
      }));
  }

  /**
   * Add a label to an issue
   */
  async addLabel(issueNumber: number, label: string): Promise<void> {
    await this.octokit.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels: [label],
    });
  }

  /**
   * Remove a label from an issue
   */
  async removeLabel(issueNumber: number, label: string): Promise<void> {
    try {
      await this.octokit.issues.removeLabel({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        name: label,
      });
    } catch {
      // Label might not exist, ignore
    }
  }

  /**
   * Post a comment on an issue
   */
  async postComment(issueNumber: number, body: string): Promise<void> {
    await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body,
    });
  }

  /**
   * Create a pull request
   */
  async createPullRequest(options: {
    title: string;
    body: string;
    head: string;
    base: string;
    issue?: number;
  }): Promise<number> {
    const { data: pr } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
    });

    // Link PR to issue if provided
    if (options.issue) {
      await this.postComment(
        options.issue,
        `🦉 Bubo created PR #${pr.number} to address this issue.`
      );
    }

    return pr.number;
  }

  /**
   * Check if a label exists in the repository
   */
  async labelExists(labelName: string): Promise<boolean> {
    try {
      await this.octokit.issues.getLabel({
        owner: this.owner,
        repo: this.repo,
        name: labelName,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a label if it doesn't exist
   */
  async ensureLabel(
    labelName: string,
    color: string,
    description: string
  ): Promise<void> {
    const exists = await this.labelExists(labelName);
    if (!exists) {
      await this.octokit.issues.createLabel({
        owner: this.owner,
        repo: this.repo,
        name: labelName,
        color,
        description,
      });
    }
  }
}
