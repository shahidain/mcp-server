import dotenv from "dotenv";
import axios from "axios";
import { JiraIssue, JQLResponse } from "../models/jira.js";

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

export class JiraService {

  /**
   * Fetches a specific issue by its ID from Jira.
   * @param id - The ID of the issue to fetch.
   */  
  static async getIssueById(id: string): Promise<JiraIssue | string> {
    const url = `${JIRA_API_URL}issue/${id}`;
    
    const headers = JIRA_API_TOKEN && JIRA_USERNAME ? {
      Authorization: `Basic ${Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/json'
    } : {};
    
    const response = await axios.get<JiraIssue>(url, { headers });
    return response.data;
  }

  /**
   * Searches for issues in Jira based on a query string.
   * @param query - The search query string.
   */
  static async searchIssues(query: string): Promise<JQLResponse> {
    const url = `${JIRA_API_URL}search?jql=${query}`;
    
    const headers = JIRA_API_TOKEN && JIRA_USERNAME ? {
      Authorization: `Basic ${Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/json'
    } : {};
    
    const response = await axios.get<JQLResponse>(url, { headers });
    return response.data;
  }
}