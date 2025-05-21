import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SqlUserService } from '../services/sqlUserService.js';
import type { User } from '../db-models/user.js';

interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export function registerUserTools(server: McpServer) {
  const userService = new SqlUserService();

  // Get all users with pagination
  server.tool(
    'get-users',
    'Get a list of users with optional pagination',
    {
      limit: z.number().min(1).max(100).optional().describe('Maximum number of users to return (1-100)'),
      skip: z.number().min(0).optional().describe('Number of users to skip for pagination')
    },
    async ({ limit, skip }) => {
      try {
        const users = await userService.getPaginatedUsers(skip || 0, limit || 10);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${users.length} users:\n\n` +
                users.map(user => 
                  `ID: ${user.Id}\nName: ${user.Name}\nEmail: ${user.Email}\nUsername: ${user.Username}\nRole ID: ${user.RoleId}\nBlocked: ${user.Blocked ? 'Yes' : 'No'}\nLast Login: ${user.LastLogin ? new Date(user.LastLogin).toLocaleString() : 'N/A'}\nCurrent Login: ${user.CurrentLogin ? new Date(user.CurrentLogin).toLocaleString() : 'N/A'}\n`
                ).join('\n---\n')
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching users: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get user by ID
  server.tool(
    'get-user-by-id',
    'Get detailed information about a specific user by its ID',
    {
      id: z.number().min(1).describe('The user ID to fetch')
    },
    async ({ id }) => {
      try {
        const user = await userService.getUserById(id);

        if (!user) {
          return {
            content: [
              {
                type: 'text',
                text: `No user found with ID: ${id}`
              }
            ]
          };
        }

        const content: TextContent = {
          type: 'text',
          text: `User Details:\n` +
            `ID: ${user.Id}\n` +
            `Name: ${user.Name}\n` +
            `Email: ${user.Email}\n` +
            `Username: ${user.Username}\n` +
            `Role ID: ${user.RoleId}\n` +
            `Blocked: ${user.Blocked ? 'Yes' : 'No'}\n` +
            `Last Login: ${user.LastLogin ? new Date(user.LastLogin).toLocaleString() : 'N/A'}\n` +
            `Current Login: ${user.CurrentLogin ? new Date(user.CurrentLogin).toLocaleString() : 'N/A'}\n` +
            `Created On: ${user.CreatedOn ? new Date(user.CreatedOn).toLocaleString() : 'N/A'}\n` +
            `Created By: ${user.CreatedBy}\n` +
            `Modified On: ${user.ModifiedOn ? new Date(user.ModifiedOn).toLocaleString() : 'N/A'}\n` +
            `Modified By: ${user.ModifiedBy}`
        };

        return { content: [content] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching user: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Search users
  server.tool(
    'search-users',
    'Search for users by keyword',
    {
      query: z.string().min(1).describe('Search term to find users')
    },
    async ({ query }) => {
      try {
        const users = await userService.searchUsers(query);

        if (users.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No users found matching '${query}'.`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${users.length} users matching '${query}':\n\n` +
                users.map(user => 
                  `ID: ${user.Id}\nName: ${user.Name}\nEmail: ${user.Email}\nUsername: ${user.Username}\nRole ID: ${user.RoleId}\nBlocked: ${user.Blocked ? 'Yes' : 'No'}\n`
                ).join('\n---\n')
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching users: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}
