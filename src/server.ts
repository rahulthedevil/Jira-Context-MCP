import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JiraService } from "./services/jira";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import express, { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { IncomingMessage, ServerResponse } from "http";

export class JiraMcpServer {
  private readonly server: McpServer;
  private readonly jiraService: JiraService;
  private sseTransport: SSEServerTransport | null = null;

  constructor(jiraUrl: string, username: string, apiToken: string) {
    this.jiraService = new JiraService(jiraUrl, username, apiToken);
    this.server = new McpServer({
      name: "Jira MCP Server",
      version: "0.1.0",
    });

    this.registerTools();
  }

  private registerTools(): void {
    // Tool to get issue information
    this.server.tool(
      "get_issue",
      "Get detailed information about a Jira issue",
      {
        issueKey: z
          .string()
          .describe("The key of the Jira issue to fetch (e.g., PROJECT-123)"),
      },
      async ({ issueKey }) => {
        try {
          console.log(`Fetching issue: ${issueKey}`);
          const issue = await this.jiraService.getIssue(issueKey);
          console.log(
            `Successfully fetched issue: ${issue.key} - ${issue.fields.summary}`,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
          };
        } catch (error) {
          console.error(`Error fetching issue ${issueKey}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching issue: ${error}` }],
          };
        }
      },
    );

    // Tool to add a comment to an issue
    this.server.tool(
      "add_comment",
      "Add a comment to an existing Jira issue",
      {
        issueKey: z
          .string()
          .describe("The Jira issue key to comment on (e.g., PROJ-123)"),
        comment: z
          .string()
          .min(1)
          .describe("The text of the comment to add to the issue"),
      },
      async ({ issueKey, comment }) => {
        try {
          console.log(`Adding comment to issue ${issueKey}`);
          const response = await this.jiraService.addComment(issueKey, comment);
          console.log(
            `Successfully added comment ${response.id} to ${issueKey}`,
          );
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error adding comment to ${issueKey}:`, error);
          return {
            content: [{ type: "text", text: `Error adding comment: ${error}` }],
          };
        }
      },
    );

    // Tool to transition an issue
    this.server.tool(
      "transition_issue",
      "Move an issue to a different status by applying a workflow transition",
      {
        issueKey: z
          .string()
          .describe("The Jira issue key to transition (e.g., PROJ-123)"),
        transitionId: z
          .string()
          .describe(
            "The transition ID to apply (use get_issue_transitions to discover IDs)",
          ),
      },
      async ({ issueKey, transitionId }) => {
        try {
          console.log(`Transitioning issue ${issueKey} via ${transitionId}`);
          await this.jiraService.transitionIssue(issueKey, transitionId);
          return {
            content: [
              {
                type: "text",
                text: `Issue ${issueKey} transitioned using ${transitionId}`,
              },
            ],
          };
        } catch (error) {
          console.error(`Error transitioning issue ${issueKey}:`, error);
          return {
            content: [
              { type: "text", text: `Error transitioning issue: ${error}` },
            ],
          };
        }
      },
    );

    // Tool to list available transitions for an issue
    this.server.tool(
      "get_issue_transitions",
      "List available workflow transitions for an issue",
      {
        issueKey: z
          .string()
          .describe("The Jira issue key to inspect (e.g., PROJ-123)"),
      },
      async ({ issueKey }) => {
        try {
          console.log(`Fetching transitions for issue ${issueKey}`);
          const response = await this.jiraService.getIssueTransitions(issueKey);
          console.log(
            `Fetched ${response.transitions.length} transitions for ${issueKey}`,
          );
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error fetching transitions for ${issueKey}:`, error);
          return {
            content: [
              { type: "text", text: `Error fetching transitions: ${error}` },
            ],
          };
        }
      },
    );

    // Tool to get epics
    this.server.tool(
      "get_epics",
      "Get epics from a Jira project",
      {
        projectKey: z
          .string()
          .optional()
          .describe("The key of the Jira project to fetch epics from"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of results to return"),
      },
      async ({ projectKey, maxResults }) => {
        try {
          console.log(
            `Fetching epics${projectKey ? ` for project: ${projectKey}` : ""}`,
          );
          const response = await this.jiraService.getEpics(
            projectKey,
            maxResults,
          );
          console.log(`Successfully fetched ${response.issues.length} epics`);
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error fetching epics:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching epics: ${error}`,
              },
            ],
          };
        }
      },
    );

    // Tool to get epic children
    this.server.tool(
      "get_epic_children",
      "Get child issues of a specific epic",
      {
        epicKey: z.string().describe("The Jira epic key (e.g., PROJ-123)"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of results to return"),
      },
      async ({ epicKey, maxResults }) => {
        try {
          console.log(`Fetching children for epic ${epicKey}`);
          const response = await this.jiraService.getEpicChildren(
            epicKey,
            maxResults,
          );
          console.log(
            `Successfully fetched ${response.issues.length} child issues for ${epicKey}`,
          );
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error fetching epic children for ${epicKey}:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching epic children: ${error}`,
              },
            ],
          };
        }
      },
    );

    // Tool to get assigned issues
    this.server.tool(
      "get_assigned_issues",
      "Get issues assigned to the current user in a project",
      {
        projectKey: z
          .string()
          .optional()
          .describe("The key of the Jira project to fetch issues from"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of results to return"),
      },
      async ({ projectKey, maxResults }) => {
        try {
          console.log(
            `Fetching assigned issues${projectKey ? ` for project: ${projectKey}` : ""}`,
          );
          const response = await this.jiraService.getAssignedIssues(
            projectKey,
            maxResults,
          );
          console.log(
            `Successfully fetched ${response.issues.length} assigned issues`,
          );
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error fetching assigned issues:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching assigned issues: ${error}`,
              },
            ],
          };
        }
      },
    );

    // Tool to get pending assigned issues
    this.server.tool(
      "get_pending_assigned_issues",
      "Get issues assigned to the current user that are not done",
      {
        projectKey: z
          .string()
          .optional()
          .describe("The key of the Jira project to fetch issues from"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of results to return"),
      },
      async ({ projectKey, maxResults }) => {
        try {
          console.log(
            `Fetching pending assigned issues${projectKey ? ` for project: ${projectKey}` : ""}`,
          );
          const response = await this.jiraService.getAssignedIssues(
            projectKey,
            maxResults,
            false,
          );
          console.log(
            `Successfully fetched ${response.issues.length} pending assigned issues`,
          );
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error fetching pending assigned issues:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching pending assigned issues: ${error}`,
              },
            ],
          };
        }
      },
    );

    // Tool to get issues by type

    this.server.tool(
      "get_issues_by_type",
      "Get issues of a specific type",
      {
        issueType: z
          .string()
          .describe("The type of issue to fetch (e.g., Bug, Story, Epic)"),
        projectKey: z
          .string()
          .optional()
          .describe("The key of the Jira project to fetch issues from"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of results to return"),
      },
      async ({ issueType, projectKey, maxResults }) => {
        try {
          console.log(
            `Fetching issues of type: ${issueType}${projectKey ? ` for project: ${projectKey}` : ""}`,
          );
          const response = await this.jiraService.getIssuesByType(
            issueType,
            projectKey,
            maxResults,
          );
          console.log(
            `Successfully fetched ${response.issues.length} issues of type ${issueType}`,
          );
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error fetching issues by type:`, error);
          return {
            content: [
              { type: "text", text: `Error fetching issues by type: ${error}` },
            ],
          };
        }
      },
    );

    // Tool to get projects
    this.server.tool(
      "get_projects",
      "Get list of available Jira projects",
      {},
      async () => {
        try {
          console.log("Fetching projects");
          const projects = await this.jiraService.getProjects();
          console.log(`Successfully fetched ${projects.length} projects`);
          return {
            content: [
              { type: "text", text: JSON.stringify(projects, null, 2) },
            ],
          };
        } catch (error) {
          console.error("Error fetching projects:", error);
          return {
            content: [
              { type: "text", text: `Error fetching projects: ${error}` },
            ],
          };
        }
      },
    );

    // Tool to get issue types
    this.server.tool(
      "get_issue_types",
      "Get list of available Jira issue types",
      {},
      async () => {
        try {
          console.log("Fetching issue types");
          const issueTypes = await this.jiraService.getIssueTypes();
          console.log(`Successfully fetched issue types`);
          return {
            content: [
              { type: "text", text: JSON.stringify(issueTypes, null, 2) },
            ],
          };
        } catch (error) {
          console.error("Error fetching issue types:", error);
          return {
            content: [
              { type: "text", text: `Error fetching issue types: ${error}` },
            ],
          };
        }
      },
    );

    // Tool to create a new epic
    this.server.tool(
      "create_epic",
      "Create a new epic in a Jira project",
      {
        projectKey: z
          .string()
          .describe("The key of the Jira project (e.g., PROJ)"),
        summary: z.string().describe("The summary/title of the epic"),
        description: z
          .string()
          .optional()
          .describe("Optional description for the epic"),
      },
      async ({ projectKey, summary, description }) => {
        try {
          console.log(`Creating epic in project ${projectKey}: ${summary}`);
          const response = await this.jiraService.createEpic(
            projectKey,
            summary,
            description,
          );
          console.log(`Successfully created epic: ${response.key}`);
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error creating epic:`, error);
          return {
            content: [{ type: "text", text: `Error creating epic: ${error}` }],
          };
        }
      },
    );

    // Tool to create an issue with a parent (linked to an epic)
    this.server.tool(
      "create_issue_with_parent",
      "Create a new issue linked to a parent epic",
      {
        projectKey: z
          .string()
          .describe("The key of the Jira project (e.g., PROJ)"),
        issueType: z
          .string()
          .describe("The type of issue to create (e.g., Story, Task, Bug)"),
        summary: z.string().describe("The summary/title of the issue"),
        parentKey: z
          .string()
          .describe("The key of the parent epic (e.g., PROJ-123)"),
        description: z
          .string()
          .optional()
          .describe("Optional description for the issue"),
      },
      async ({ projectKey, issueType, summary, parentKey, description }) => {
        try {
          console.log(
            `Creating ${issueType} in project ${projectKey} under parent ${parentKey}: ${summary}`,
          );
          const response = await this.jiraService.createIssueWithParent(
            projectKey,
            issueType,
            summary,
            parentKey,
            description,
          );
          console.log(`Successfully created issue: ${response.key}`);
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        } catch (error) {
          console.error(`Error creating issue with parent:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error creating issue with parent: ${error}`,
              },
            ],
          };
        }
      },
    );

    // Tool to attach an existing issue to an epic
    this.server.tool(
      "attach_to_epic",
      "Link an existing issue to a parent epic",
      {
        issueKey: z
          .string()
          .describe("The key of the issue to attach (e.g., PROJ-456)"),
        epicKey: z
          .string()
          .describe("The key of the parent epic (e.g., PROJ-123)"),
      },
      async ({ issueKey, epicKey }) => {
        try {
          console.log(`Attaching issue ${issueKey} to epic ${epicKey}`);
          await this.jiraService.attachToEpic(issueKey, epicKey);
          console.log(
            `Successfully attached issue ${issueKey} to epic ${epicKey}`,
          );
          return {
            content: [
              {
                type: "text",
                text: `Issue ${issueKey} successfully attached to epic ${epicKey}`,
              },
            ],
          };
        } catch (error) {
          console.error(`Error attaching issue to epic:`, error);
          return {
            content: [
              { type: "text", text: `Error attaching issue to epic: ${error}` },
            ],
          };
        }
      },
    );
  }

  async connect(transport: Transport): Promise<void> {
    console.log("Connecting to transport...");
    await this.server.connect(transport);
    console.log("Server connected and ready to process requests");
  }

  async startHttpServer(port: number): Promise<void> {
    const app = express();

    app.get("/sse", async (req: Request, res: Response) => {
      console.log("New SSE connection established");
      this.sseTransport = new SSEServerTransport(
        "/messages",
        res as unknown as ServerResponse<IncomingMessage>,
      );
      await this.server.connect(this.sseTransport);
    });

    app.post("/messages", async (req: Request, res: Response) => {
      if (!this.sseTransport) {
        res.sendStatus(400);
        return;
      }
      await this.sseTransport.handlePostMessage(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse<IncomingMessage>,
      );
    });

    app.listen(port, () => {
      console.log(`HTTP server listening on port ${port}`);
      console.log(`SSE endpoint available at http://localhost:${port}/sse`);
      console.log(
        `Message endpoint available at http://localhost:${port}/messages`,
      );
    });
  }
}
