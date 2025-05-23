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
              text: JSON.stringify(roles, null, 2)
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
          text: JSON.stringify(role, null, 2)
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
        return {
          content: [
            {              
              type: 'text',
              text: JSON.stringify(roles, null, 2)
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
