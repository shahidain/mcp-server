import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { UserService } from '../services/userService.js';

// Define TextContent interface for our responses
interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export function registerUserTools(server: McpServer) {
  // Get all users
  server.tool(
    'get-users',
    'Get a list of users with optional pagination',
    {
      limit: z.number().min(1).max(100).optional().describe('Maximum number of users to return (1-100)'),
      skip: z.number().min(0).optional().describe('Number of users to skip for pagination')
    },
    async ({ limit, skip }) => {
      try {
        const users = await UserService.getUsers(limit, skip);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${users.users.length} users (out of ${users.total}):\n\n` +
                users.users.map(user => 
                  `ID: ${user.id}
                    Name: ${user.firstName} ${user.lastName} ${user.maidenName ? `(née ${user.maidenName})` : ''}
                    Age: ${user.age}
                    Gender: ${user.gender}
                    Email: ${user.email}
                    Phone: ${user.phone}
                    Username: ${user.username}
                    Birth Date: ${user.birthDate}
                    Blood Group: ${user.bloodGroup}
                    Height: ${user.height} cm
                    Weight: ${user.weight} kg
                    Eye Color: ${user.eyeColor}
                    Hair: ${user.hair?.color || 'N/A'}, ${user.hair?.type || 'N/A'}
                    IP: ${user.ip}
                    MAC Address: ${user.macAddress}
                    University: ${user.university}
                    EIN: ${user.ein}
                    SSN: ${user.ssn}
                    User Agent: ${user.userAgent}
                    Role: ${user.role}

                    Address:
                    ${user.address?.address || 'N/A'}
                    ${user.address?.city || 'N/A'}, ${user.address?.state || 'N/A'} ${user.address?.postalCode || 'N/A'}
                    ${user.address?.country || 'N/A'}
                    Coordinates: ${user.address?.coordinates?.lat || 'N/A'}, ${user.address?.coordinates?.lng || 'N/A'}

                    Company:
                    Name: ${user.company?.name || 'N/A'}
                    Department: ${user.company?.department || 'N/A'}
                    Title: ${user.company?.title || 'N/A'}

                    Bank:
                    Card Type: ${user.bank?.cardType || 'N/A'}
                    Card Number: ${user.bank?.cardNumber || 'N/A'}
                    Expires: ${user.bank?.cardExpire || 'N/A'}
                    Currency: ${user.bank?.currency || 'N/A'}

                    Crypto:
                    Currency: ${user.crypto?.coin || 'N/A'}
                    Wallet: ${user.crypto?.wallet || 'N/A'}
                    Network: ${user.crypto?.network || 'N/A'}`
                ).join('\n\n---\n\n')
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
    'Get detailed information about a specific user by their ID',
    {
      id: z.number().min(1).describe('The user ID to fetch')
    },
    async ({ id }) => {
      try {
        const user = await UserService.getUserById(id);
        
        const content: TextContent = {
          type: 'text',
          text: `User Details:
          ID: ${user.id}
          Name: ${user.firstName} ${user.lastName} ${user.maidenName ? `(née ${user.maidenName})` : ''}
          Email: ${user.email}
          Username: ${user.username}
          Age: ${user.age}
          Gender: ${user.gender}
          Birth Date: ${user.birthDate}
          Blood Group: ${user.bloodGroup}
          Height: ${user.height} cm
          Weight: ${user.weight} kg
          Eye Color: ${user.eyeColor}
          Hair: ${user.hair.color}, ${user.hair.type}
          Phone: ${user.phone}
          
          Address:
          ${user.address.address}
          ${user.address.city}, ${user.address.state} ${user.address.postalCode}
          ${user.address.country}
          Coordinates: ${user.address.coordinates.lat}, ${user.address.coordinates.lng}
          
          Employment:
          Company: ${user.company.name}
          Department: ${user.company.department}
          Title: ${user.company.title}
          
          Bank Information:
          Card: ${user.bank.cardType}
          Number: ${user.bank.cardNumber}
          Expires: ${user.bank.cardExpire}
          Currency: ${user.bank.currency}
          
          Other:
          University: ${user.university}
          EIN: ${user.ein}
          SSN: ${user.ssn}
          IP Address: ${user.ip}
          MAC Address: ${user.macAddress}
          
          Crypto:
          Currency: ${user.crypto.coin}
          Wallet: ${user.crypto.wallet}
          Network: ${user.crypto.network}
          
          Role: ${user.role}
          `
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
        const results = await UserService.searchUsers(query);
        
        if (results.users.length === 0) {
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
              text: `Found ${results.users.length} users matching '${query}':\n\n` +
                results.users.map(user => 
                  `ID: ${user.id}\nName: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nUsername: ${user.username}\nRole: ${user.role}\n`
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
