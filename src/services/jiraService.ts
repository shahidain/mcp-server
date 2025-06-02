import dotenv from "dotenv";
import axios, {AxiosInstance } from "axios";
import { JiraIssue, JQLResponse, JiraIssueCreateRequest } from "../models/jira.js";

// Ensure environment variables are loaded
dotenv.config();

// Initialize JIRA API URL and credentials from environment variables
const JIRA_API_URL = process.env.JIRA_API_URL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_USERNAME = process.env.JIRA_USERNAME || "shahidain@gmail.com"; // Default or from env

// Log configuration status at startup
if (!JIRA_API_TOKEN) {
  console.warn('WARNING: JIRA_API_TOKEN not found in environment variables. JIRA API calls may fail without authentication.');
} else if (!JIRA_USERNAME) {
  console.warn('WARNING: JIRA_USERNAME not found in environment variables. Using default username for authentication.');
} else {
  console.log(`JIRA API initialized with URL: ${JIRA_API_URL}`);
}

const createJiraClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: JIRA_API_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  client.interceptors.request.use(
    (config) => {
      if (JIRA_API_TOKEN && JIRA_USERNAME) {
        const authToken = Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64');
        config.headers.Authorization = `Basic ${authToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return client;
};

const jiraClient = createJiraClient();

export class JiraService {

  /**
   * Fetches a specific issue by its ID from Jira.
   * @param id - The ID of the issue to fetch.
   */  
  static async getIssueById(id: string): Promise<JiraIssue | undefined> {
    try {
      const response = await jiraClient.get<JiraIssue>(`issue/${id}`);
      return response.data;
    } catch (error) {
      await handleJiraError(error);
    }
  }

  /**
   * Searches for issues in Jira based on a query string.
   * @param query - The search query string.
   */
  static async searchIssues(query: string): Promise<JQLResponse|undefined> {
    try {
      const response = await jiraClient.get<JQLResponse>(`search?jql=${query}`);
      return response.data;
    } catch (error) {
      await handleJiraError(error);
    }
  }

  /**
   * Creates a new issue in Jira.
   * @param issueData - The data for the new issue to be created.
   */
  static async createIssue(project: string, summary: string, issuetype: string, description?: string): Promise<JiraIssue | undefined> {
    const issueData: JiraIssueCreateRequest = {
      fields: {
        project: {
          key: project
        },
        summary: summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description || ''
                }
              ]
            }
          ]
        },
        issuetype: {
          name: issuetype
        }
      }
    };
    try {
      const response = await jiraClient.post<JiraIssue>('issue', issueData);
      return response.data;
    } catch (error) {
      await handleJiraError(error);
    }
  }

  /**
   * Creates a sub-task for a given issue in Jira.
   * @param project - The project key where the sub-task will be created.
   * @param parentKey - The key of the parent issue.
   * @param summary - The summary of the sub-task.
   * @param description - Optional description for the sub-task.
   */
  static async createSubTask(project: string, parentKey: string, summary: string, description?: string): Promise<JiraIssue | undefined> {
    const issueData: JiraIssueCreateRequest = {
      fields: {
        project: {
          key: project
        },
        summary: summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description || ''
                }
              ]
            }
          ]
        },
        issuetype: {
          name: 'Sub-task'
        },
        parent: {
          key: parentKey
        }
      }
    };
    try {
      const response = await jiraClient.post<JiraIssue>('issue', issueData);
      return response.data;
    } catch (error) {
      await handleJiraError(error);
    }
  }
};



const handleJiraError = async (error: any) => {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    const errorData = error.response.data;
    if (status === 400) {
      const errorMessage = errorData?.errorMessages?.[0];
      const errors =  convertObjectToPlainText(errorData?.errors);
      throw new Error(`**Jira Error —** ${errorMessage || errors}`);
    }
    const errorMessage = errorData?.errorMessages?.[0] || errorData?.message || `HTTP ${status}: ${error.response.statusText}`;
    console.error(`Jira API Error (${status}):`, errorMessage);
    throw new Error(errorMessage);
  }
  throw new Error(`Failed to search Jira issues: ${error instanceof Error ? error.message : String(error)}`);
};

const convertObjectToPlainText = (obj: any): string => {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }
  
  return Object.entries(obj)
    .map(([key, value]) => `${key}: ${convertObjectToPlainText(value)}`)
    .join('\n');
};
