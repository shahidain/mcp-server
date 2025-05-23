import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getToolToCall, getMarkdownTableFromJson } from "../llm-api/llmTools.js";
import { SqlVendorService } from "../services/sqlVendorService.js";
import { SqlUserService } from '../services/sqlUserService.js';

const transports: { [sessionId: string]: SSEServerTransport } = {};
const vendorService = new SqlVendorService();
const userService = new SqlUserService();

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
            let toolName = llmApiResponse?.tool;
            console.log(`Tool to call: ${toolName}`);
            switch (toolName) {
              case "get-commodities":
                console.log("Calling get-commodities tool");
                break;
              case "get-commodity-by-id":
                console.log("Calling get-commodity-by-id tool");
                break;
              case "get-roles":
                console.log("Calling get-roles tool");
                break;
              case "get-role-by-id":
                console.log("Calling get-role-by-id tool");
                break;
              case "get-users":
                const users = await userService.getPaginatedUsers();
                const markDownUsers = await getMarkdownTableFromJson(JSON.stringify(users), req.body.message);
                return res.status(200).type('text/plain').send(markDownUsers);
              case "get-vendors":
                const vendors = await vendorService.getPaginatedVendors(0, 10);
                const markDownVendors = await getMarkdownTableFromJson(JSON.stringify(vendors), req.body.message);
                return res.status(200).type('text/plain').send(markDownVendors);
            }
            return res.status(200).json({
              type: "tool_to_be_called",
              response: llmApiResponse,
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
    params: { sessionId: transport.sessionId }
  })
}