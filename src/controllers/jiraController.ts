import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { JiraService } from '../services/jiraService.js';
import { JiraIssueCreateRequest } from '../models/jira.js';
import dotenv from "dotenv";

dotenv.config();

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

  server.tool(
    'create-jira-issue',
    'Create a new Jira issue with the provided data',
    {
      project: z.string().describe('The Jira project key for the new issue'),
      summary: z.string().describe('The summary of the new Jira issue'),
      issuetype: z.string().describe('The type of the issue to be created'),
      description: z.string().optional().describe('The description of the new Jira issue')
    },
    async ({ project, summary, issuetype, description }: { project: string, summary: string, issuetype: string, description?: string }) => {
      try {
        const newIssue = await JiraService.createIssue(project, summary, issuetype, description);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(newIssue, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating Jira issue: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );


  server.tool(
    'create-jira-subtask',
    'Create a sub-task for a given Jira issue',
    {
      project: z.string().describe('The Jira project key where the sub-task will be created'),
      parentId: z.string().describe('The ID of the parent Jira issue'),
      summary: z.string().describe('The summary of the sub-task'),
      description: z.string().optional().describe('The description of the sub-task')
    },
    async ({ project, parentId, summary, description }: { project: string, parentId: string, summary: string, description?: string }) => {
      try {
        const newSubTask = await JiraService.createSubTask(project, parentId, summary, description);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(newSubTask, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating Jira sub-task: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}