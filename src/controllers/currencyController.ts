import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SqlCurrencyService } from '../services/sqlCurrencyService.js';
import type { Currency } from '../db-models/currency.js';

// Define TextContent interface for our responses
interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export function registerCurrencyTools(server: McpServer) {
  const currencyService = new SqlCurrencyService();

  // Get all currencies with pagination
  server.tool(
    'get-currencies',
    'Get a list of currencies with optional pagination',
    {
      limit: z.number().min(1).max(100).optional().describe('Maximum number of currencies to return (1-100)'),
      skip: z.number().min(0).optional().describe('Number of currencies to skip for pagination')
    },
    async ({ limit, skip }) => {
      try {
        const currencies = await currencyService.getPaginatedCurrencies(skip || 0, limit || 10);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${currencies.length} currencies:\n\n` +
                currencies.map(currency => 
                  `ID: ${currency.ID}\nShort Name: ${currency.SHORT_NAME}\nName: ${currency.NAME}\nCreated On: ${currency.CREATED_ON ? new Date(currency.CREATED_ON).toLocaleString() : 'N/A'}\n`
                ).join('\n---\n')
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching currencies: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get currency by ID
  server.tool(
    'get-currency-by-id',
    'Get detailed information about a specific currency by its ID',
    {
      id: z.number().min(1).describe('The currency ID to fetch')
    },
    async ({ id }) => {
      try {
        const currency = await currencyService.getCurrencyById(id);
        
        if (!currency) {
          return {
            content: [
              {
                type: 'text',
                text: `No currency found with ID: ${id}`
              }
            ]
          };
        }
        
        const content: TextContent = {
          type: 'text',
          text: `Currency Details:\n` +
            `ID: ${currency.ID}\n` +
            `Short Name: ${currency.SHORT_NAME}\n` +
            `Name: ${currency.NAME}\n` +
            `Created On: ${currency.CREATED_ON ? new Date(currency.CREATED_ON).toLocaleString() : 'N/A'}\n` +
            `Created By: ${currency.CREATED_BY}\n`
        };
        
        return { content: [content] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching currency: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Search currencies
  server.tool(
    'search-currencies',
    'Search for currencies by keyword',
    {
      query: z.string().min(1).describe('Search term to find currencies')
    },
    async ({ query }) => {
      try {
        const currencies = await currencyService.searchCurrencies(query);
        
        if (currencies.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No currencies found matching '${query}'.`
              }
            ]
          };
        }
        
        // Create a markdown table for better presentation
        const tableHeader = '| ID | Short Name | Name | Created On |\n|-----|------------|------|------------|\n';
        const tableRows = currencies.map(currency => 
          `| ${currency.ID} | ${currency.SHORT_NAME} | ${currency.NAME} | ${currency.CREATED_ON ? new Date(currency.CREATED_ON).toLocaleString() : 'N/A'} |`
        ).join('\n');
        
        return {
          content: [
            {              
              type: 'text',
              text: `Found ${currencies.length} currencies matching '${query}':\n\n${tableHeader}${tableRows}`
            }
          ]
        };
      } catch (error) {        
        return {
          content: [
            {
              type: 'text',
              text: `Error searching currencies: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}
