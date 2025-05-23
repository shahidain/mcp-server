import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProductService } from '../services/productService.js';

// Define TextContent interface for our responses
interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export function registerProductTools(server: McpServer) {
  // Get all products
  server.tool(
    'get-products',
    'Get a list of products with optional pagination',
    {
      limit: z.number().min(1).max(100).optional().describe('Maximum number of products to return (1-100)'),
      skip: z.number().min(0).optional().describe('Number of products to skip for pagination')
    },    async ({ limit, skip }) => {      try {
        const products = await ProductService.getProducts(limit, skip);
        return {
          content: [            {
              type: 'text',
              text: JSON.stringify(products, null, 2)
            }
          ]
        };
      } catch (error) {        return {
          content: [
            {
              type: 'text',
              text: `Error fetching products: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get product by ID
  server.tool(
    'get-product-by-id',
    'Get detailed information about a specific product by its ID',
    {
      id: z.number().min(1).describe('The product ID to fetch')
    },
    async ({ id }) => {
      try {
        const product = await ProductService.getProductById(id); 
        const content: TextContent = {
          type: 'text',
          text: JSON.stringify(product, null, 2)      
        };
          return { content: [content] };      
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching product: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
    }
  );

  // Search products
  server.tool(
    'search-products',
    'Search for products by keyword',
    {
      query: z.string().min(1).describe('Search term to find products')
    },
    async ({ query }) => {
      try {
        const results = await ProductService.searchProducts(query);
          if (results.products.length === 0) {          return {
            content: [
              {
                type: 'text',
                text: `No products found matching '${query}'.`
              }
            ]
          };
        }        
        return {
          content: [
            {              
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      } catch (error) {        
        return {
          content: [
            {
              type: 'text',
              text: `Error searching products: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get products by category
  server.tool(
    'get-products-by-category',
    'Get all products in a specific category',
    {
      category: z.string().min(1).describe('Product category name')
    },
    async ({ category }) => {
      try {        
        const results = await ProductService.getProductsByCategory(category);
        return {
          content: [
            {              
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      } catch (error) {        
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching products in category: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }  );
  
  // Get all categories
  server.tool(
    'get-categories',
    'Get a list of all product categories',
    {},
    async () => {
      try {
        const categories = await ProductService.getCategories();

        return {          
          content: [
            {
              type: 'text',
              text: JSON.stringify(categories, null, 2)
            }
          ]
        };
      } catch (error) {        
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching categories: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}
