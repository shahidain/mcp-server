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
              text: `Found ${vendors.length} vendors:\n\n` +
                vendorsWithCreators.map(vendor => 
                  `ID: ${vendor.Id}\nName: ${vendor.Name}\nContact No: ${vendor.ContactNo || 'N/A'}\nEmail: ${vendor.Email || 'N/A'}\nBank Code: ${vendor.BankCode || 'N/A'}\nInternational: ${vendor.IsInternational ? 'Yes' : 'No'}\nCreated By: ${vendor.creatorName}\n`
                ).join('\n---\n')
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
        
        if (!vendor) {
          return {
            content: [
              {
                type: 'text',
                text: `No vendor found with ID: ${id}`
              }
            ]
          };
        }
        
        // Get creator name
        let creatorName = 'Unknown';
        if (vendor.CreatedBy) {
          const creator = await userService.getUserById(vendor.CreatedBy);
          if (creator) {
            creatorName = creator.Name;
          }
        }
        
        // Get modifier name
        let modifierName = 'Unknown';
        if (vendor.ModifiedBy) {
          const modifier = await userService.getUserById(vendor.ModifiedBy);
          if (modifier) {
            modifierName = modifier.Name;
          }
        }
        
        const formatDate = (date: Date | null) => {
          if (!date) return 'N/A';
          const d = new Date(date);
          return `${d.getDate().toString().padStart(2, '0')}-${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()} ${d.toLocaleTimeString()}`;
        };
        
        const content: TextContent = {
          type: 'text',
          text: `Vendor Details:\n` +
            `Id: ${vendor.Id}\n` +
            `Name: ${vendor.Name}\n` +
            `Address: ${vendor.Address || 'N/A'}\n` +
            `Contact No: ${vendor.ContactNo || 'N/A'}\n` +
            `Type: ${vendor.Type || 'N/A'}\n` +
            `Email: ${vendor.Email || 'N/A'}\n` +
            `Account No: ${vendor.AccNo || 'N/A'}\n` +
            `Bank Code: ${vendor.BankCode || 'N/A'}\n` +
            `International: ${vendor.IsInternational ? 'Yes' : 'No'}\n` +
            `Settlement Text: ${vendor.SettlementText || 'N/A'}\n` +
            `Contract Date: ${formatDate(vendor.ContractDate)}\n` +
            `Created By: ${creatorName} (ID: ${vendor.CreatedBy})\n` +
            `Created On: ${formatDate(vendor.CreatedOn)}\n` +
            `Modified By: ${modifierName} (ID: ${vendor.ModifiedBy})\n` +
            `Modified On: ${formatDate(vendor.ModifiedOn)}`
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
        
        if (vendors.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No vendors found matching '${query}'.`
              }
            ]
          };
        }
        
        // Create a table format for better presentation
        const tableHeader = '| Id | Name | Type | Contact No | Email | International | Bank Code |\n|---|------|------|------------|-------|---------------|----------|\n';
        const tableRows = vendors.map(vendor => 
          `| ${vendor.Id} | ${vendor.Name} | ${vendor.Type || 'N/A'} | ${vendor.ContactNo || 'N/A'} | ${vendor.Email || 'N/A'} | ${vendor.IsInternational ? 'Yes' : 'No'} | ${vendor.BankCode || 'N/A'} |`
        ).join('\n');
        
        return {
          content: [
            {              
              type: 'text',
              text: `Found ${vendors.length} vendors matching '${query}':\n\n${tableHeader}${tableRows}`
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
