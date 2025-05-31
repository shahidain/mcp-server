import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { JiraService } from '../services/jiraService.js';

export function registerJiraTools(server: McpServer) {
  server.tool(
    'get-jira-issues',
    'Get a list of Jira issues with optional pagination',
    {
      limit: z.number().min(1).max(100).optional().describe('Maximum number of issues to return (1-100)'),
      skip: z.number().min(0).optional().describe('Number of issues to skip for pagination')
    },
    async ({ limit, skip }) => {
      try {
        const issues = await JiraService.getPaginatedIssues(skip || 0, limit || 10);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issues, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching Jira issues: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  server.tool(
    'get-jira-issue-by-id',
    'Get detailed information about a specific Jira issue by its ID',
    {
      id: z.string().describe('The Jira issue ID to fetch')
    },
    async ({ id }) => {
      try {
        const issue = await JiraService.getIssueById(id);
        
        if (!issue) {
          return {
            content: [
              {
                type: 'text',
                text: `No Jira issue found with ID ${id}`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching Jira issue: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}