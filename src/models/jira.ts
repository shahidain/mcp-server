export interface JiraIssue {
  expand: string;
  id: string;
  self: string;
  key: string;
  fields: JiraFields;
}

export interface JiraFields {
  statuscategorychangedate: string;
  issuetype: IssueType;
  components: any[];
  timespent: any;
  timeoriginalestimate: any;
  project: Project;
  description: any;
  fixVersions: any[];
  customfield_10033: any;
  aggregatetimespent: any;
  statusCategory: StatusCategory;
  resolution: any;
  timetracking: Timetracking;
  security: any;
  attachment: any[];
  aggregatetimeestimate: any;
  resolutiondate: any;
  workratio: number;
  summary: string;
  issuerestriction: IssueRestriction;
  watches: Watches;
  lastViewed: string;
  creator: User;
  subtasks: any[];
  created: string;
  customfield_10020: Sprint[];
  customfield_10021: any;
  reporter: User;
  aggregateprogress: Progress;
  priority: Priority;
  customfield_10001: any;
  labels: string[];
  customfield_10016: any;
  environment: any;
  customfield_10019: string;
  timeestimate: any;
  aggregatetimeoriginalestimate: any;
  versions: any[];
  duedate: any;
  progress: Progress;
  issuelinks: any[];
  votes: Votes;
  comment: CommentSection;
  assignee: User;
  worklog: any;
}

export interface IssueType {
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  subtask: boolean;
  avatarId: number;
  entityId: string;
  hierarchyLevel: number;
}

export interface Project {
  self: string;
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  simplified: boolean;
  avatarUrls: AvatarUrls;
}

export interface AvatarUrls {
  "48x48": string;
  "24x24": string;
  "16x16": string;
  "32x32": string;
}

export interface StatusCategory {
  self: string;
  id: number;
  key: string;
  colorName: string;
  name: string;
}

export interface Timetracking {}

export interface IssueRestriction {
  issuerestrictions: Record<string, unknown>;
  shouldDisplay: boolean;
}

export interface Watches {
  self: string;
  watchCount: number;
  isWatching: boolean;
}

export interface User {
  self: string;
  accountId: string;
  emailAddress: string;
  avatarUrls: AvatarUrls;
  displayName: string;
  active: boolean;
  timeZone: string;
  accountType: string;
}

export interface Sprint {
  id: number;
  name: string;
  state: string;
  boardId: number;
  goal: string;
  startDate: string;
  endDate: string;
}

export interface Progress {
  progress: number;
  total: number;
}

export interface Priority {
  self: string;
  iconUrl: string;
  name: string;
  id: string;
}

export interface Votes {
  self: string;
  votes: number;
  hasVoted: boolean;
}

export interface CommentSection {
  comments: Comment[];
  self: string;
  maxResults: number;
  total: number;
  startAt: number;
}

export interface Comment {
  self: string;
  id: string;
  author: User;
  body: CommentBody;
  updateAuthor: User;
  created: string;
  updated: string;
  jsdPublic: boolean;
}

export interface CommentBody {
  type: string;
  version: number;
  content: CommentContent[];
}

export interface CommentContent {
  type: string;
  content?: CommentText[];
}

export interface CommentText {
  type: string;
  text?: string;
  attrs?: MentionAttributes;
  marks?: Mark[];
}

export interface MentionAttributes {
  id: string;
  text: string;
  accessLevel: string;
}

export interface Mark {
  type: string;
  attrs?: {
    color: string;
  };
}