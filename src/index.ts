#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProductTools } from './controllers/productController.js';
import { registerUserTools } from './controllers/userController.js';
import { registerCommodityTools } from './controllers/commodityController.js';
import { registerRoleTools } from './controllers/roleController.js';
import { registerCurrencyTools } from './controllers/currencyController.js';
import { registerVendorTools } from './controllers/vendorController.js';
import { setupSSEEndpoint, setupMessageEndpoint } from "./modules/transports.js";
import dotenv from "dotenv";
import express from "express";

/**
 * Main function to set up and run the MCP server
 */
async function main() {
  try {
    console.log('Initializing Sample MCP Server...');
    dotenv.config();
    // Create the MCP Server instance
    const server = new McpServer({
      name: 'sample-mcp-server',
      version: '1.0.0',
      capabilities: {
        resources: {},
        tools: {},
      },
    });
    
    console.log('Registering product and user tools...');
    
    // Register all product-related tools
    registerProductTools(server);
    
    // Register all user-related tools
    registerUserTools(server);

    // Register all commodity-related tools
    registerCommodityTools(server);

    // Register all role-related tools
    registerRoleTools(server);

    // Register all currency-related tools
    registerCurrencyTools(server);

    // Register all vendor-related tools
    registerVendorTools(server);

    const app = express();
    app.use(express.json());
    
    setupSSEEndpoint(app, server);
    setupMessageEndpoint(app);
    
    app.listen(4000, () => {
      console.log(`MCP server is running on port 4000`);
    });

  } catch (error) {
    console.error('Error during MCP server initialization:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
