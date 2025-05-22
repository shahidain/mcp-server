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
              text: `Found ${products.products.length} products (out of ${products.total}):\n\n` +
                products.products.map(product => 
                  `ID: ${product.id}\n
                  Title: ${product.title}\n
                  Price: $${product.price}\n
                  Category: ${product.category}\n
                  Brand: ${product.brand}\n
                  Rating: ${product.rating}\n
                  Description: ${product.description}\n
                  Stock: ${product.stock}\n
                  Thumbnail: ${product.thumbnail}\n
                  Tags: ${product.tags ? product.tags.join(', ') : 'N/A'}\n`
                ).join('\n---\n')
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
          text: `Product Details:
            ID: ${product.id}
            Title: ${product.title}
            Description: ${product.description}
            Price: $${product.price}
            Discount: ${product.discountPercentage}%
            Rating: ${product.rating}
            Stock: ${product.stock}
            Brand: ${product.brand}
            Category: ${product.category}
            Tags: ${product.tags ? product.tags.join(', ') : 'N/A'}
            Thumbnail: ${product.thumbnail}
            Images: ${product.images.join('\n')}`        
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
              text: `Found ${results.products.length} products matching '${query}':\n\n` +
                results.products.map(product => 
                  `ID: ${product.id}\nTitle: ${product.title}\nPrice: $${product.price}\nCategory: ${product.category}\nDescription: ${product.description}\nTags: ${product.tags ? product.tags.join(', ') : 'N/A'}\n`
                ).join('\n---\n')
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
              text: `Found ${results.products.length} products in category '${category}':\n\n` +
                results.products.map(product => 
                  `ID: ${product.id}\nTitle: ${product.title}\nPrice: $${product.price}\nRating: ${product.rating}\nDescription: ${product.description}\nTags: ${product.tags ? product.tags.join(', ') : 'N/A'}\n`
                ).join('\n---\n')
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
          // Format categories similar to products
        const formattedCategories = categories.map(category => {
          // Extract name/value from category based on its type
          const categoryName = typeof category === 'string' 
            ? category 
            : category && typeof category === 'object'
              ? (category.name || category.value || JSON.stringify(category))
              : String(category);
              
          return `${categoryName}\n`
            + (typeof category === 'object' && category.id ? `ID: ${category.id}\n` : '')
            + (typeof category === 'object' && category.description ? `Description: ${category.description}\n` : '');
        });
        
        return {          
          content: [
            {
              type: 'text',
              text: `Available product categories:\n\n` +
                formattedCategories.join('\n')
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
