#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerProductTools } from './controllers/productController.js';
import { registerUserTools } from './controllers/userController.js';
import { registerCommodityTools } from './controllers/commodityController.js';
import { registerRoleTools } from './controllers/roleController.js';
import { registerCurrencyTools } from './controllers/currencyController.js';
import { registerVendorTools } from './controllers/vendorController.js';

/**
 * Main function to set up and run the MCP server
 */
async function main() {
  try {    
    
    console.log('Initializing Sample MCP Server...');
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

    console.log('Setting up transport...');
    
    // Set up the transport for server communication (stdio)
    const transport = new StdioServerTransport();
    
    console.log('Connecting server to transport...');
    
    // Connect the server to the transport
    await server.connect(transport);
    
    console.log('Sample MCP Server running on stdio');
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
