import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getToolToCall, streamMarkdownTableFromJson, streamResponseText } from "../llm-api/llmTools.js";
import { SqlVendorService } from "../services/sqlVendorService.js";
import { SqlUserService } from '../services/sqlUserService.js';
import { SqlCommodityService } from "../services/sqlCommodityService.js";
import { SqlRoleService } from "../services/sqlRoleService.js";
import { ProductService } from "../services/productService.js";
import { SystemPromptForArray, SystemPromptForObject } from  "../llm-api/prompts.js";

const transports: { [sessionId: string]: SSEServerTransport } = {};
const vendorService = new SqlVendorService();
const userService = new SqlUserService();
const commoditiesService = new SqlCommodityService();
const roleService = new SqlRoleService();
import { DataFormat } from "../utils/utilities.js";

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

            const llmApiResponse: any = await getToolToCall(req.body.message);
            console.log('LLM API Response Message:', llmApiResponse);
            const toolName = llmApiResponse?.tool;
            console.log(`Tool to call with format: ${toolName} - ${JSON.stringify(llmApiResponse)}`);
            const format: DataFormat = llmApiResponse?.requested_format || DataFormat.MarkdownTable;
            const searchQuery: string | null | undefined = llmApiResponse?.parameters?.query;
            const skip: number | undefined = llmApiResponse?.parameters?.skip;
            const limit: number | undefined = llmApiResponse?.parameters?.limit;
            const id = llmApiResponse?.parameters?.id;
            
            // Using switch case to handle different tools
            switch (toolName) {
              case "get-commodities":
                const commodities = await commoditiesService.getPaginatedCommodities();
                // Use streaming response instead of waiting for full response
                return streamMarkdownTableFromJson(JSON.stringify(commodities), req.body.message, SystemPromptForArray, res, format);
                
              case "get-commodity-by-id":
                const commoditiy = await commoditiesService.getCommodityById(id);
                return streamMarkdownTableFromJson(JSON.stringify(commoditiy), req.body.message, SystemPromptForObject, res, format);

              case "search-commodities":
                const searchCommodity = await commoditiesService.searchCommodities(searchQuery);
                return streamMarkdownTableFromJson(JSON.stringify(searchCommodity), req.body.message,SystemPromptForArray, res, format);

              case "get-roles":
                const roles = await roleService.getPaginatedRoles(skip, limit);
                return streamMarkdownTableFromJson(JSON.stringify(roles), req.body.message, SystemPromptForArray, res, format);

              case "get-role-by-id":
                const role = await roleService.getRoleById(id);
                return streamMarkdownTableFromJson(JSON.stringify(role), req.body.message, SystemPromptForObject, res, format);

              case "search-roles":
                const searchRoles = await roleService.searchRoles(searchQuery);
                return streamMarkdownTableFromJson(JSON.stringify(searchRoles), req.body.message, SystemPromptForArray, res, format);

              case "get-users":
                const users = await userService.getPaginatedUsers(skip, limit);
                return streamMarkdownTableFromJson(JSON.stringify(users), req.body.message, SystemPromptForArray, res, format);

              case "get-user-by-id":
                const user = await userService.getUserById(id);
                return streamMarkdownTableFromJson(JSON.stringify(user), req.body.message, SystemPromptForObject, res, format);

              case "search-users":
                const searchUsers = await userService.searchUsers(searchQuery);
                return streamMarkdownTableFromJson(JSON.stringify(searchUsers), req.body.message, SystemPromptForArray, res, format);

              case "get-vendors":
                const vendors = await vendorService.getPaginatedVendors(skip, limit);
                return streamMarkdownTableFromJson(JSON.stringify(vendors), req.body.message, SystemPromptForArray, res, format);

              case "get-vendor-by-id":
                const vendor = await vendorService.getVendorById(id);
                return streamMarkdownTableFromJson(JSON.stringify(vendor), req.body.message, SystemPromptForObject, res, format);

              case "search-vendors":
                const searchVendors = await vendorService.searchVendors(searchQuery);
                return streamMarkdownTableFromJson(JSON.stringify(searchVendors), req.body.message, SystemPromptForArray, res, format);

              case "get-products":
              const products = await ProductService.getProducts(limit, skip);
              return streamMarkdownTableFromJson(JSON.stringify(products), req.body.message, SystemPromptForArray, res, format);

              case "get-product-by-id":
              const product = await ProductService.getProductById(id);
              return streamMarkdownTableFromJson(JSON.stringify(product), req.body.message, SystemPromptForObject, res, format);

              case "search-products":
                const searchProducts = await ProductService.searchProducts(searchQuery);
                return streamMarkdownTableFromJson(JSON.stringify(searchProducts?.products), req.body.message, SystemPromptForArray, res, format);
            }
            
            // Handle general responses by streaming the response as plain text
            if (llmApiResponse?.response_text) {
              return streamResponseText(llmApiResponse.response_text, res);
            }
            // Fallback to sending the response as plain text
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(llmApiResponse?.response_text);
            
          } catch (error) {
            console.error(`Error in calling tool for Session ID: ${sessionId}`, error);
            res.status(200).type('text/plain').send(`Error calling LLM API - ${error instanceof Error ? error.message : String(error)}`);
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
