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
              text: JSON.stringify(users, null, 2)
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
          text: JSON.stringify(user, null, 2)
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(users, null, 2)
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
