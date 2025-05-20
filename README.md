# Sample MCP Server

This is a Model Context Protocol (MCP) server that provides access to product and user data from DummyJSON API. The server is integrated with VS Code to provide easy access to product and user information directly within your development environment.

## Features

### Products
- Get a list of products with pagination support
- Get detailed information about a specific product by ID
- Search products by keyword
- Browse products by category
- Get a list of all available product categories

### Users
- Get a list of users with pagination support
- Get detailed information about a specific user by ID
- Search users by keyword

### General
- Integration with VS Code as an extension

## Tools Provided

This MCP server provides the following tools:

### Product Tools
- `get-products` - Get a list of products with optional pagination
- `get-product-by-id` - Get detailed information about a specific product by ID
- `search-products` - Search for products by keyword
- `get-products-by-category` - Get all products in a specific category
- `get-categories` - Get a list of all product categories

### User Tools
- `get-users` - Get a list of users with optional pagination
- `get-user-by-id` - Get detailed information about a specific user by ID
- `search-users` - Search for users by keyword
- `get-categories` - Get a list of all product categories

## VS Code Integration

### Running the Server

You can run the MCP server using the VS Code Tasks provided:

1. Press `Ctrl+Shift+P` and select "Tasks: Run Task"
2. Choose one of the following tasks:
   - **Build MCP Server**: Compiles the TypeScript code
   - **Start MCP Server**: Builds and starts the server
   - **Dev MCP Server (Watch Mode)**: Runs the server in development mode with auto-recompilation on changes
   - **Serve MCP Server**: Runs the server using the dedicated server script with improved console output

### Using with MCP-enabled AI assistants

1. Start the MCP server using the tasks above
2. Connect your AI assistant (like GitHub Copilot) to the server
3. Use natural language to request product information

## Installation

To install the dependencies, run:

```bash
npm install
```

## Development

1. Clone the repository
2. Install dependencies with `npm install`
3. Build the project with `npm run build`
4. Start the server with `npm run start`

For development with auto-recompilation:

```bash
npm run dev
```

## Project Structure

- `src/index.ts` - Main entry point for the MCP server
- `src/extension.ts` - VS Code extension entry point
- `src/controllers/` - MCP tools implementation
- `src/services/` - Business logic and API interactions
- `src/models/` - TypeScript interfaces and data models

## Debugging

You can debug the MCP server using the "Launch MCP Server" configuration in VS Code:

1. Press `F5` or select "Run > Start Debugging"
2. Choose the "Launch MCP Server" configuration
3. View debug output in the Debug Console

## API Reference

This MCP server uses the DummyJSON API (https://dummyjson.com/products) to fetch product data. For more information about available endpoints, visit the DummyJSON documentation.

## Data Sources

This server uses the following DummyJSON API endpoints as its data sources:
- Products: [DummyJSON Products API](https://dummyjson.com/products)
- Users: [DummyJSON Users API](https://dummyjson.com/users)

## Output Directory

The compiled output is in the `dist` directory as specified by the TypeScript configuration.
