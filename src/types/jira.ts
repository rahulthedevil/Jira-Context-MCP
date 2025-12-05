export interface JiraError {
  status: number;
  err: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      statusCategory: {
        name: string;
      };
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority?: {
      name: string;
      iconUrl: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
      accountId: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
      accountId: string;
    };
    created: string;
    updated: string;
    project: {
      key: string;
      name: string;
    };
    labels?: string[];
    components?: Array<{
      name: string;
    }>;
    fixVersions?: Array<{
      name: string;
    }>;
    duedate?: string;
  };
}

export interface JiraADFTextNode {
  type: "text";
  text: string;
}

export interface JiraADFParagraphNode {
  type: "paragraph";
  content: JiraADFTextNode[];
}

export interface JiraADFDocument {
  type: "doc";
  version: 1;
  content: JiraADFParagraphNode[];
}

export interface JiraComment {
  id: string;
  body: JiraADFDocument;
  self: string;
  created: string;
  updated: string;
  author: {
    accountId: string;
    displayName: string;
  };
  updateAuthor?: {
    accountId: string;
    displayName: string;
  };
}

export interface JiraSearchParams {
  jql: string;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  fieldsByKeys?: boolean;
  nextPageToken?: string;
  properties?: string[];
  reconcileIssues?: number[];
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  startAt?: number;
  maxResults?: number;
  total?: number;
  isLast?: boolean;
  nextPageToken?: string;
  warningMessages?: string[];
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    statusCategory: {
      key: string;
      name: string;
    };
  };
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead: JiraUser;
}

export interface JiraProjectListResponse {
  projects: JiraProject[];
}

export interface JiraIssueTypeResponse {
  issueTypes: Array<{
    id: string;
    name: string;
    description: string;
    iconUrl: string;
  }>;
}

export interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}
