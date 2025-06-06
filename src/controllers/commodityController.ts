import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SqlCommodityService } from '../services/sqlCommodityService.js';
import type { Commodity } from '../db-models/commodity.js';

// Define TextContent interface for our responses
interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export function registerCommodityTools(server: McpServer) {
  const commodityService = new SqlCommodityService();

  // Get all commodities with pagination
  server.tool(
    'get-commodities',
    'Get a list of commodities with optional pagination',
    {
      limit: z.number().min(1).max(100).optional().describe('Maximum number of commodities to return (1-100)'),
      skip: z.number().min(0).optional().describe('Number of commodities to skip for pagination')
    },
    async ({ limit, skip }) => {
      try {
        const commodities = await commodityService.getPaginatedCommodities(skip || 0, limit || 10);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(commodities, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching commodities: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get commodity by ID
  server.tool(
    'get-commodity-by-id',
    'Get detailed information about a specific commodity by its ID',
    {
      id: z.number().min(1).describe('The commodity ID to fetch')
    },
    async ({ id }) => {
      try {
        const commodity = await commodityService.getCommodityById(id);
        
        if (!commodity) {
          return {
            content: [
              {
                type: 'text',
                text: `No commodity found with ID: ${id}`
              }
            ]
          };
        }
        
        const content: TextContent = {
          type: 'text',
          text: JSON.stringify(commodity, null, 2)
        };
        
        return { content: [content] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching commodity: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Search commodities
  server.tool(
    'search-commodities',
    'Search for commodities by keyword',
    {
      query: z.string().min(1).describe('Search term to find commodities')
    },
    async ({ query }) => {
      try {
        const commodities = await commodityService.searchCommodities(query);
        
        if (commodities.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No commodities found matching '${query}'.`
              }
            ]
          };
        }
        
        return {
          content: [
            {              
              type: 'text',
              text: JSON.stringify(commodities, null, 2)
            }
          ]
        };
      } catch (error) {        
        return {
          content: [
            {
              type: 'text',
              text: `Error searching commodities: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}