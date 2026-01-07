import { graphql } from '@octokit/graphql';
import type { TaskContext } from '../../types/agent.js';
import type { GithubConfig } from '../config/schema.js';

/**
 * GitHubProjects - Handles GitHub Projects (v2) API interactions
 */
export class GitHubProjects {
  private readonly graphqlWithAuth: typeof graphql;
  private readonly owner: string;

  constructor(config: GithubConfig) {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });

    this.owner = config.owner;
  }

  /**
   * Get a project by number
   */
  async getProjectByNumber(projectNumber: number): Promise<ProjectInfo | null> {
    const query = `
      query($owner: String!, $projectNumber: Int!) {
        organization(login: $owner) {
          projectV2(number: $projectNumber) {
            id
            title
            number
          }
        }
      }
    `;

    interface ProjectResponse {
      organization: {
        projectV2: {
          id: string;
          title: string;
          number: number;
        } | null;
      };
    }

    try {
      const response = await this.graphqlWithAuth<ProjectResponse>(query, {
        owner: this.owner,
        projectNumber,
      });

      return response.organization.projectV2;
    } catch {
      return null;
    }
  }

  /**
   * Get items from a project in a specific status/column
   */
  async getItemsInColumn(
    projectNumber: number,
    columnName: string
  ): Promise<TaskContext[]> {
    const query = `
      query($owner: String!, $projectNumber: Int!) {
        organization(login: $owner) {
          projectV2(number: $projectNumber) {
            items(first: 50) {
              nodes {
                id
                fieldValueByName(name: "Status") {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                  }
                }
                content {
                  ... on Issue {
                    number
                    title
                    body
                    url
                    labels(first: 20) {
                      nodes {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    interface ProjectItemsResponse {
      organization: {
        projectV2: {
          items: {
            nodes: Array<{
              id: string;
              fieldValueByName: {
                name: string;
              } | null;
              content: {
                number: number;
                title: string;
                body: string;
                url: string;
                labels: {
                  nodes: Array<{ name: string }>;
                };
              } | null;
            }>;
          };
        } | null;
      };
    }

    try {
      const response = await this.graphqlWithAuth<ProjectItemsResponse>(query, {
        owner: this.owner,
        projectNumber,
      });

      const items = response.organization.projectV2?.items.nodes ?? [];

      return items
        .filter((item) => {
          // Filter by column/status name
          const status = item.fieldValueByName?.name;
          return status === columnName && item.content;
        })
        .map((item): TaskContext => {
          const result: TaskContext = {
            id: `project-item-${item.id}`,
            type: 'project-item',
            title: item.content?.title ?? '',
            body: item.content?.body ?? '',
            labels: item.content?.labels.nodes.map((l) => l.name) ?? [],
            projectItemId: item.id,
          };
          if (item.content?.number !== undefined) {
            result.number = item.content.number;
          }
          if (item.content?.url !== undefined) {
            result.url = item.content.url;
          }
          return result;
        });
    } catch (error) {
      console.error('Failed to fetch project items:', error);
      return [];
    }
  }

  /**
   * Move an item to a different column/status
   */
  async moveItemToColumn(
    projectNumber: number,
    itemId: string,
    columnName: string
  ): Promise<void> {
    // First, get the project and field info
    const project = await this.getProjectByNumber(projectNumber);
    if (!project) {
      console.error(`Project #${projectNumber} not found`);
      return;
    }

    const statusField = await this.getStatusField(project.id);
    if (!statusField) {
      console.error('Status field not found in project');
      return;
    }

    const optionId = statusField.options.find((o) => o.name === columnName)?.id;
    if (!optionId) {
      console.error(`Column "${columnName}" not found in project`);
      return;
    }

    const mutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { singleSelectOptionId: $optionId }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `;

    await this.graphqlWithAuth(mutation, {
      projectId: project.id,
      itemId,
      fieldId: statusField.id,
      optionId,
    });

    console.log(`Moved item ${itemId} to "${columnName}"`);
  }

  /**
   * Get the Status field and its options from a project
   */
  private async getStatusField(projectId: string): Promise<StatusField | null> {
    const query = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            field(name: "Status") {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;

    interface StatusFieldResponse {
      node: {
        field: {
          id: string;
          name: string;
          options: Array<{ id: string; name: string }>;
        } | null;
      };
    }

    try {
      const response = await this.graphqlWithAuth<StatusFieldResponse>(query, {
        projectId,
      });

      return response.node.field;
    } catch {
      return null;
    }
  }
}

interface ProjectInfo {
  id: string;
  title: string;
  number: number;
}

interface StatusField {
  id: string;
  name: string;
  options: Array<{ id: string; name: string }>;
}
