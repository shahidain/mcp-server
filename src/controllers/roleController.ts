import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SqlRoleService } from '../services/sqlRoleService.js';
import type { Role } from '../db-models/role.js';

// Define TextContent interface for our responses
interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export function registerRoleTools(server: McpServer) {
  const roleService = new SqlRoleService();

  // Get all roles with pagination
  server.tool(
    'get-roles',
    'Get a list of roles with optional pagination',
    {
      limit: z.number().min(1).max(100).optional().describe('Maximum number of roles to return (1-100)'),
      skip: z.number().min(0).optional().describe('Number of roles to skip for pagination')
    },    async ({ limit, skip }) => {
      try {
        const roles = await roleService.getPaginatedRoles(skip || 0, limit || 10);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${roles.length} roles:\n\n` +
              roles.map(role =>
                `ID: ${role.Id}\nName: ${role.Name}\nDelete: ${role.Delete ? 'Yes' : 'No'}\n`
              ).join('\n---\n')
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching roles: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get role by ID
  server.tool(
    'get-role-by-id',
    'Get detailed information about a specific role by its ID',
    {
      id: z.number().min(1).describe('The role ID to fetch')
    },
    async ({ id }) => {
      try {
        const role = await roleService.getRoleById(id);
        
        if (!role) {
          return {
            content: [
              {
                type: 'text',
                text: `No role found with ID: ${id}`
              }
            ]
          };
        }
        
        const content: TextContent = {
          type: 'text',
          text: `Role Details:\n` +
            `ID: ${role.Id}\n` +
            `Name: ${role.Name}\n` +
            `Delete: ${role.Delete ? 'Yes' : 'No'}\n` +
            `Created On: ${role.CreatedOn ? new Date(role.CreatedOn).toLocaleString() : 'N/A'}\n` +
            `Created By: ${role.CreatedBy || 'N/A'}\n` +
            `Modified On: ${role.ModifiedOn ? new Date(role.ModifiedOn).toLocaleString() : 'N/A'}\n` +
            `Modified By: ${role.ModifiedBy || 'N/A'}`
        };
        
        return { content: [content] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching role: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Search roles
  server.tool(
    'search-roles',
    'Search for roles by keyword',
    {
      query: z.string().min(1).describe('Search term to find roles')
    },
    async ({ query }) => {
      try {
        const roles = await roleService.searchRoles(query);
          if (roles.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No roles found matching '${query}'.`
              }
            ]
          };
        }
        
        // Create a markdown table for better presentation
        const tableHeader = '| ID | Name | Delete |\n|-----|---------------------|--------|\n';
        const tableRows = roles.map(role => 
          `| ${role.Id} | ${role.Name} | ${role.Delete ? 'Yes' : 'No'} |`
        ).join('\n');
        
        return {
          content: [
            {              
              type: 'text',
              text: `Found ${roles.length} roles matching '${query}':\n\n${tableHeader}${tableRows}`
            }
          ]
        };
      } catch (error) {        
        return {
          content: [
            {
              type: 'text',
              text: `Error searching roles: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}
