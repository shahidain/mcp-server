import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getToolToCall, getMarkdownTableFromJson } from "../llm-api/llmTools.js";
import { SqlVendorService } from "../services/sqlVendorService.js";
import { SqlUserService } from '../services/sqlUserService.js';
import { SqlCommodityService } from "../services/sqlCommodityService.js";
import { SqlRoleService } from "../services/sqlRoleService.js";

const transports: { [sessionId: string]: SSEServerTransport } = {};
const vendorService = new SqlVendorService();
const userService = new SqlUserService();
const commoditiesService = new SqlCommodityService();
const roleService = new SqlRoleService();

export function setupSSEEndpoint(app: any, server: McpServer) {
  app.get("/sse", async (_: Request, res: Response) => {
    
    const transport = new SSEServerTransport("/messages", res);
    transports[transport.sessionId] = transport;

    console.log(`SSE connection established. Session ID: ${transport.sessionId}`);

    res.on("close", () => {
      console.log(`SSE connection closed. Session ID: ${transport.sessionId}`);
      delete transports[transport.sessionId];
    });

    try {
      await server.connect(transport);
      await sendMessages(transport);
      console.log(`Transport connected to MCP server. Session ID: ${transport.sessionId}`);
    } catch (error) {
      console.error(`Error connecting transport to MCP server. Session ID: ${transport.sessionId}`, error);
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
            const llmApiResponse: any = await getToolToCall(req.body.message);
            const toolName = llmApiResponse?.tool;
            console.log(`Tool to call with format: ${toolName} - ${JSON.stringify(llmApiResponse)}`);
            const format = llmApiResponse?.format || "table";
            const searchQuery: string | null | undefined = llmApiResponse?.parameters?.query;
            const skip: number | undefined = llmApiResponse?.parameters?.skip;
            const limit: number | undefined = llmApiResponse?.parameters?.limit;
            const id = llmApiResponse?.parameters?.id;
            switch (toolName) {
              case "get-commodities":
                const commodities = await commoditiesService.getPaginatedCommodities();
                const markDownCommodities = await getMarkdownTableFromJson(JSON.stringify(commodities), req.body.message);
                return res.status(200).type('text/plain').send(markDownCommodities);
              case "get-commodity-by-id":
                const commoditiy = await commoditiesService.getCommodityById(id);
                const markDownCommodity = await getMarkdownTableFromJson(JSON.stringify(commoditiy), req.body.message);
                return res.status(200).type('text/plain').send(markDownCommodity);
              case "search-commodities":
                const searchCommodity = await commoditiesService.searchCommodities(searchQuery);
                const markDownSearchCommodity = await getMarkdownTableFromJson(JSON.stringify(searchCommodity), req.body.message);
                return res.status(200).type('text/plain').send(markDownSearchCommodity);
              case "get-roles":
                const roles = await roleService.getPaginatedRoles(skip, limit);
                const markDownRoles = await getMarkdownTableFromJson(JSON.stringify(roles), req.body.message);
                return res.status(200).type('text/plain').send(markDownRoles);
              case "get-role-by-id":
                const role = await roleService.getRoleById(id);
                const markDownRole = await getMarkdownTableFromJson(JSON.stringify(role), req.body.message);
                return res.status(200).type('text/plain').send(markDownRole);
              case "search-roles":
                const searchRoles = await roleService.searchRoles(searchQuery);
                const markDownSearchRoles = await getMarkdownTableFromJson(JSON.stringify(searchRoles), req.body.message);
                return res.status(200).type('text/plain').send(markDownSearchRoles);
              case "get-users":
                const users = await userService.getPaginatedUsers(skip, limit);
                const markDownUsers = await getMarkdownTableFromJson(JSON.stringify(users), req.body.message);
                return res.status(200).type('text/plain').send(markDownUsers);
              case "get-user-by-id":
                const user = await userService.getUserById(id);
                const markDownUser = await getMarkdownTableFromJson(JSON.stringify(user), req.body.message);
                return res.status(200).type('text/plain').send(markDownUser);
              case "search-users":
                const searchUsers = await userService.searchUsers(searchQuery);
                const markDownSearchUsers = await getMarkdownTableFromJson(JSON.stringify(searchUsers), req.body.message);
                return res.status(200).type('text/plain').send(markDownSearchUsers);
              case "get-vendors":
                const vendors = await vendorService.getPaginatedVendors(skip, limit);
                const markDownVendors = await getMarkdownTableFromJson(JSON.stringify(vendors), req.body.message);
                return res.status(200).type('text/plain').send(markDownVendors);
              case "get-vendor-by-id":
                const vendor = await vendorService.getVendorById(id);
                const markDownVendor = await getMarkdownTableFromJson(JSON.stringify(vendor), req.body.message);
                return res.status(200).type('text/plain').send(markDownVendor);
              case "search-vendors":
                const searchVendors = await vendorService.searchVendors(searchQuery);
                const markDownSearchVendors = await getMarkdownTableFromJson(JSON.stringify(searchVendors), req.body.message);
                return res.status(200).type('text/plain').send(markDownSearchVendors);
            }
            return res.status(200).json({
              type: "error",
              response: "I am trained to give info in requested format, but your request I could not process.",
              sessionId
            });
            
          } catch (error) {
            console.error(`Error in calling tool for Session ID: ${sessionId}`, error);
            return res.status(500).json({
              type: "error",
              message: `Error calling tool - ${error instanceof Error ? error.message : String(error)}`,
              sessionId
            });
          }
        } else {
          return await transport.handlePostMessage(req, res, req.body); 
        }
      } catch (error) {
        console.error(`Error handling message for Session ID: ${sessionId}`, error);
        res.status(500).send("Internal Server Error");
      }
    } else {
      console.error(`No transport found for Session ID: ${sessionId}`);
      res.status(400).send("No transport found for sessionId");
    }
  });
}

async function sendMessages(transport: SSEServerTransport) {
  await transport.send({
    jsonrpc: "2.0",
    method: "message",
    params: { sessionId: transport.sessionId, status: "connected" }
  })
}