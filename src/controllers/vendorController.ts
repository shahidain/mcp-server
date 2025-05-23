import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SqlVendorService } from '../services/sqlVendorService.js';
import { SqlUserService } from '../services/sqlUserService.js';
import type { Vendor } from '../db-models/vendor.js';

// Define TextContent interface for our responses
interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export function registerVendorTools(server: McpServer) {
  const vendorService = new SqlVendorService();
  const userService = new SqlUserService();

  // Get all vendors with pagination
  server.tool(
    'get-vendors',
    'Get a list of vendors with optional pagination',
    {
      limit: z.number().min(1).max(100).optional().describe('Maximum number of vendors to return (1-100)'),
      skip: z.number().min(0).optional().describe('Number of vendors to skip for pagination')
    },
    async ({ limit, skip }) => {
      try {
        const vendors = await vendorService.getPaginatedVendors(skip || 0, limit || 10);
        
        // Get creator name for each vendor
        const vendorsWithCreators = await Promise.all(vendors.map(async (vendor) => {
          let creatorName = 'Unknown';
          if (vendor.CreatedBy) {
            const creator = await userService.getUserById(vendor.CreatedBy);
            if (creator) {
              creatorName = creator.Name;
            }
          }
          return { ...vendor, creatorName };
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(vendorsWithCreators, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching vendors: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get vendor by ID
  server.tool(
    'get-vendor-by-id',
    'Get detailed information about a specific vendor by its ID',
    {
      id: z.number().min(1).describe('The vendor ID to fetch')
    },
    async ({ id }) => {
      try {
        const vendor = await vendorService.getVendorById(id);
        const content: TextContent = {
          type: 'text',
          text: JSON.stringify(vendor, null, 2)
        };
        
        return { content: [content] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching vendor: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Search vendors
  server.tool(
    'search-vendors',
    'Search for vendors by keyword',
    {
      query: z.string().min(1).describe('Search term to find vendors')
    },
    async ({ query }) => {
      try {
        const vendors = await vendorService.searchVendors(query);
        return {
          content: [
            {              
              type: 'text',
              text: JSON.stringify(vendors, null, 2)
            }
          ]
        };
      } catch (error) {        
        return {
          content: [
            {
              type: 'text',
              text: `Error searching vendors: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}
