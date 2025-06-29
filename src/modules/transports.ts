import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLLMService, switchLLMProvider } from "../llm-api/LLMServiceFactory.js";
import { LLMProvider } from "../llm-api/ILLMService.js";
import { SqlVendorService } from "../services/sqlVendorService.js";
import { SqlUserService } from '../services/sqlUserService.js';
import { SqlCommodityService } from "../services/sqlCommodityService.js";
import { SqlRoleService } from "../services/sqlRoleService.js";
import { ProductService } from "../services/productService.js";
import { SystemPromptForArray, SystemPromptForObject, SystemPromptForJqlResponse } from  "../llm-api/prompts.js";
import { JiraService } from "../services/jiraService.js";

const transports: { [sessionId: string]: SSEServerTransport } = {};
const vendorService = new SqlVendorService();
const userService = new SqlUserService();
const commoditiesService = new SqlCommodityService();
const roleService = new SqlRoleService();

import { DataFormat, GetJiraIssueSearchResponse } from "../utils/utilities.js";
import { JiraIssue, JiraIssueSearchResponse } from "../models/jira.js";
import { getApplication } from "../app-data/applications.js";

// Initialize LLM service based on environment configuration
const llmService = getLLMService();

export function setupSSEEndpoint(app: any, server: McpServer) {
  // Create an initial response endpoint that returns JSON right away with session ID
  app.get("/sse", (req: Request, res: Response) => {

    // Return a regular JSON response that confirms the connection with session ID
    return res.status(200).json({
      success: true,
      message: "SSE connection initialized. Connect to /sse/stream for sessionid and real-time updates.",
      streamEndpoint: "/sse/stream"
    });
  });
  // Create a separate endpoint for the actual SSE connection
  app.get("/sse/stream", (req: Request, res: Response) => {
    try {
      // Set SSE specific CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // Get sessionId from query parameter if provided (for reconnection)
      const requestedSessionId = req.query.sessionId as string;
      
      // Let SSEServerTransport handle all the headers and protocol
      const transport = new SSEServerTransport("/messages", res);
      
      // Log session ID information
      if (requestedSessionId) {
        console.log(`Client requested reconnection with Session ID: ${requestedSessionId}`);
        console.log(`New Session ID assigned: ${transport.sessionId}`);
      } else {
        console.log(`New SSE connection established. Session ID: ${transport.sessionId}`);
      }
      
      // Store the transport with its session ID
      transports[transport.sessionId] = transport;
      
      // Setup close handler
      res.on("close", () => {
        console.log(`SSE connection closed. Session ID: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      });
      
      // Connect to the server and handle errors with Promise chain
      server.connect(transport)
        .then(() => {
          console.log(`Transport connected to MCP server. Session ID: ${transport.sessionId}`);
          return sendMessages(transport);
        })
        .catch((error) => {
          console.error(`Error connecting transport to MCP server. Session ID: ${transport.sessionId}`, error);
        });
    } catch (error) {
      console.error(`Error setting up SSE connection:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to establish SSE connection" });
      }
    }
  });
}

export function setupMessageEndpoint(app: any) {
  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId] ?? Object.values(transports)[0];
    console.log(`Received message: ${JSON.stringify(req.body)}`);
    if (transport) {
      console.log(`Handling message for Session ID: ${sessionId}`);
      try {
        if (req.body?.message) {
          try {
            // Set CORS headers for streaming responses
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            const llmApiResponse: any = await llmService.getToolToCall(req.body.message);
            console.log('LLM API Response Message:', llmApiResponse);
            const toolName = llmApiResponse?.tool;
            console.log(`Tool to call with format: ${toolName} - ${JSON.stringify(llmApiResponse)}`);
            
            const format: DataFormat = llmApiResponse?.requested_format || DataFormat.MarkdownText;
            const searchQuery: string | null | undefined = llmApiResponse?.parameters?.query;
            const skip: number | undefined = llmApiResponse?.parameters?.skip;
            const limit: number | undefined = llmApiResponse?.parameters?.limit;
            const id = llmApiResponse?.parameters?.id;
            const project = llmApiResponse?.parameters?.project;
            const parentId = llmApiResponse?.parameters?.parentId;
            const summary = llmApiResponse?.parameters?.summary;
            const issuetype = llmApiResponse?.parameters?.issuetype;
            const description = llmApiResponse?.parameters?.description;
            const appName = llmApiResponse?.parameters?.appName;
            const env = llmApiResponse?.parameters?.env;
            
            switch (toolName) {              case "get-commodities":
                const commodities = await commoditiesService.getPaginatedCommodities();
                return llmService.streamMarkdownTableFromJson(JSON.stringify(commodities), req.body.message, SystemPromptForArray, res, format);
                  case "get-commodity-by-id":
                const commoditiy = await commoditiesService.getCommodityById(id);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(commoditiy), req.body.message, SystemPromptForObject, res, format);

              case "search-commodities":
                const searchCommodity = await commoditiesService.searchCommodities(searchQuery);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(searchCommodity), req.body.message,SystemPromptForArray, res, format);

              case "get-roles":
                const roles = await roleService.getPaginatedRoles(skip, limit);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(roles), req.body.message, SystemPromptForArray, res, format);

              case "get-role-by-id":
                const role = await roleService.getRoleById(id);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(role), req.body.message, SystemPromptForObject, res, format);

              case "search-roles":
                const searchRoles = await roleService.searchRoles(searchQuery);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(searchRoles), req.body.message, SystemPromptForArray, res, format);

              case "get-users":
                const users = await userService.getPaginatedUsers(skip, limit);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(users), req.body.message, SystemPromptForArray, res, format);

              case "get-user-by-id":
                const user = await userService.getUserById(id);
                return llmService.streamMarkdownTextFromJson(JSON.stringify(user), req.body.message, res);

              case "search-users":
                const searchUsers = await userService.searchUsers(searchQuery);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(searchUsers), req.body.message, SystemPromptForArray, res, format);

              case "get-vendors":
                const vendors = await vendorService.getPaginatedVendors(skip, limit);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(vendors), req.body.message, SystemPromptForArray, res, format);

              case "get-vendor-by-id":
                const vendor = await vendorService.getVendorById(id);
                return llmService.streamMarkdownTextFromJson(JSON.stringify(vendor), req.body.message, res);

              case "search-vendors":
                const searchVendors = await vendorService.searchVendors(searchQuery);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(searchVendors), req.body.message, SystemPromptForArray, res, format);

              case "get-products":
                const products = await ProductService.getProducts(limit, skip);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(products), req.body.message, SystemPromptForArray, res, format);

              case "get-product-by-id":
                const product = await ProductService.getProductById(id);
                return llmService.streamMarkdownTextFromJson(JSON.stringify(product), req.body.message, res);

              case "search-products":
                const searchProducts = await ProductService.searchProducts(searchQuery);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(searchProducts?.products), req.body.message, SystemPromptForArray, res, format);
              
              case "get-jira-issue-by-id":
                const jiraIssue = await JiraService.getIssueById(id);
                return llmService.streamMarkdownTextFromJson(JSON.stringify(jiraIssue), req.body.message, res);
                case "search-jira-issues":
                const jqlQuey = await llmService.getJQL(req.body.message);
                console.log(`JQL Query: ${jqlQuey}`);
                const jiraIssues = await JiraService.searchIssues(jqlQuey);
                const jiraIssueSearchResponse: JiraIssueSearchResponse[] = GetJiraIssueSearchResponse(jiraIssues);
                const additionalMessage = `Here is the JIRA search result for your message, which I got by executing below JQL \n\n**${jqlQuey}**\n\n`;
                await llmService.saveExample(req.body.message, jqlQuey);
                return llmService.streamMarkdownTableFromJson(JSON.stringify(jiraIssueSearchResponse), req.body.message, SystemPromptForJqlResponse, res, format, additionalMessage);

              case "create-jira-issue":
                const createdJiraIssue: JiraIssue | undefined = await JiraService.createIssue(project, summary, issuetype, description);
                return res.status(200).type('text/plain').send(
                  `Created JIRA issue with key: **${createdJiraIssue?.key}**`);

              case "create-jira-subtask":
                const createdSubtask: JiraIssue | undefined = await JiraService.createSubTask(project, parentId, summary, description);
                return res.status(200).type('text/plain').send(
                  `Created JIRA subtask with key: **${createdSubtask?.key}** under parent issue: **${parentId}**`);
                case "get-application-status":
                const application = await getApplication(appName, env);
                if (!application) {
                  return res.status(200).send(`Application ${appName} not found in environment ${env}`);
                }
                return llmService.streamMarkdownTextFromJson(JSON.stringify(application), req.body.message, res);
            }
            
            if (llmApiResponse?.response_text) {
              return llmService.streamResponseText(llmApiResponse.response_text, res);
            }
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(llmApiResponse?.response_text);

          } catch (error) {
            console.error(`Error handling invoke tool for Session ID: ${sessionId}`, error);
            await handleError(error, res);
          }
        } else {
          return await transport.handlePostMessage(req, res, req.body); 
        }
      } catch (error) {  
        console.error(`Error handling message for Session ID: ${sessionId}`, error);
        await handleError(error, res);
      }
    } else {
      console.error(`No transport found for Session ID: ${sessionId}`);
      res.status(400).send("No transport found for sessionId");
    }
  });
}

async function handleError(error: any, res: Response) {
  const errorMessage = error.message || "An unexpected error occurred while processing the message";
  const llmService = getLLMService();
  llmService.streamMarkdownTextFromJson(JSON.stringify({error: errorMessage}), "I received error while processing user message, give a detailed possible reason of this error and suggest how this can be fixed", res);
}

async function sendMessages(transport: SSEServerTransport) {
  try {
    // Send a connection confirmation message with session ID prominently featured
    await transport.send({
      jsonrpc: "2.0",
      method: "message",
      params: { 
        sessionId: transport.sessionId,
        status: "connected",
        type: "connection_response",
        message: "Connection to MCP server established successfully",
        connectionDetails: {
          sessionId: transport.sessionId,
          connectedAt: new Date().toISOString(),
          serverStatus: "ready"
        }
      }
    });    
    console.log(`Welcome message sent to client. Session ID: ${transport.sessionId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send welcome message. Session ID: ${transport.sessionId}`, error);
    return false;
  }
}
