import { JiraIssueSearchResponse, JQLResponse } from "../models/jira.js";

export enum DataFormat {
  MarkdownTable = 'markdown-table',
  MarkdownText = 'markdown-text',
  PieChart = 'pie',
  BarChart = 'bar',
  LineChart = 'line',
  ScatteredChart = 'scatter',
};

export function GetJiraIssueSearchResponse(jqlResponse: JQLResponse | undefined): JiraIssueSearchResponse[] {
  if (!jqlResponse) {
    return [];
  };

  return jqlResponse.issues.map(issue => ({
    key: issue.key,
    fixVersions: issue.fields.fixVersions?.map(v => v.name) || [],
    type: issue.fields.issuetype.name,
    sprint: issue.fields.customfield_10020 && issue.fields.customfield_10020[0]
  ? `${issue.fields.customfield_10020[0]?.name} - ${issue.fields.customfield_10020[0]?.state || '-'}`
  : '',
    assignee: issue.fields.assignee?.displayName || '',
    status: issue.fields.status.name,
    storyPoints: issue.fields.customfield_10016 || '-',
    created: new Date(issue.fields.created),
    updated: issue.fields.updated ? new Date(issue.fields.updated) : undefined,
    summary: issue.fields.summary || '',
    parent: `${issue.fields.parent?.key || ''}  ${issue.fields.parent?.fields.issuetype.name || ''}`,
    flagged: issue.fields.customfield_10021 && issue.fields.customfield_10021[0]?.value || '',
    subtasks: issue.fields.subtasks ? issue.fields.subtasks.length : null
  }));
};