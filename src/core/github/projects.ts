import { graphql } from '@octokit/graphql';
import type { TaskContext } from '../../types/agent.js';

/**
 * GitHubProjects - Handles GitHub Projects (v2) API interactions
 */
export class GitHubProjects {
  private readonly graphqlWithAuth: typeof graphql;
  private readonly owner: string;

  constructor() {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });

    this.owner = process.env['GITHUB_OWNER'] ?? '';
  }

  /**
   * Get a project by name
   */
  async getProject(projectName: string): Promise<ProjectInfo | null> {
    const query = `
      query($owner: String!, $projectName: String!) {
        organization(login: $owner) {
          projectsV2(first: 10, query: $projectName) {
            nodes {
              id
              title
              number
            }
          }
        }
      }
    `;

    interface ProjectsResponse {
      organization: {
        projectsV2: {
          nodes: Array<{
            id: string;
            title: string;
            number: number;
          }>;
        };
      };
    }

    const response = await this.graphqlWithAuth<ProjectsResponse>(query, {
      owner: this.owner,
      projectName,
    });

    const project = response.organization.projectsV2.nodes.find(
      (p) => p.title === projectName
    );

    return project ?? null;
  }

  /**
   * Get items from a project column
   */
  async getItemsInColumn(
    projectId: string,
    columnName: string
  ): Promise<TaskContext[]> {
    // TODO: Implement GraphQL query to fetch project items by status
    console.log(`Fetching items from column ${columnName} in project ${projectId}`);
    return [];
  }

  /**
   * Move an item to a different column
   */
  async moveItemToColumn(
    projectId: string,
    itemId: string,
    columnName: string
  ): Promise<void> {
    // TODO: Implement GraphQL mutation to update item status
    console.log(`Moving item ${itemId} to ${columnName} in project ${projectId}`);
  }
}

interface ProjectInfo {
  id: string;
  title: string;
  number: number;
}

