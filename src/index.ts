#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProductTools } from './controllers/productController.js';
import { registerUserTools } from './controllers/userController.js';
import { registerCommodityTools } from './controllers/commodityController.js';
import { registerRoleTools } from './controllers/roleController.js';
import { registerCurrencyTools } from './controllers/currencyController.js';
import { registerVendorTools } from './controllers/vendorController.js';
import { setupSSEEndpoint, setupMessageEndpoint } from "./modules/transports.js";
import { registerJiraTools } from './controllers/jiraController.js';
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

/**
 * Main function to set up and run the MCP server
 */
async function main() {
  try {
    console.log('Initializing Sample MCP Server...');
    dotenv.config();
    const server = new McpServer({
      name: 'sample-mcp-server',
      version: '1.0.0',
      capabilities: {
        resources: {},
        tools: {},
      },
    });
   
    registerProductTools(server);
    registerUserTools(server);
    registerCommodityTools(server);
    registerRoleTools(server);
    registerCurrencyTools(server);
    registerVendorTools(server);
    registerJiraTools(server);
    
    const app = express();

    const corsOptions = {
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      optionsSuccessStatus: 200
    };
    
    app.use(cors(corsOptions));
    app.use(express.json());
    
    // Health check endpoint for deployment monitoring
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'mcp-server',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      });
    });
    
    setupSSEEndpoint(app, server);
    setupMessageEndpoint(app);

    app.listen(4000, () => {
      console.log(`MCP server is running on port 4000`);
    });

  } catch (error) {
    console.error('Error during MCP server initialization:', error);
    process.exit(1);
  }
};

// Run the main function
main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
