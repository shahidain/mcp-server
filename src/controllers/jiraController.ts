import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { JiraService } from '../services/jiraService.js';

export function registerJiraTools(server: McpServer) {

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

  server.tool(
    'search-jira-issues',
    'Run a custom Jira query to search for issues',
    {
      query: z.string().describe('The search query string to filter Jira issues')
    },
    async ({ query }) => {
      try {
        const jiraResponse = await JiraService.searchIssues(query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(jiraResponse, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error doing Jira query: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}