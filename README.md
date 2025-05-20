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

## SQL Database Integration

This MCP server now includes SQL Server integration for storing and retrieving product and user data directly from a SQL database.

### Database Setup

1. Make sure you have SQL Server installed and running
2. Configure your database connection in the `.env` file:
   ```
   MSSQL_CONNECTION_STRING=Server=yourserver;Database=yourdatabase;User Id=username;Password=password;Encrypt=false;TrustServerCertificate=true;
   ```
   Alternatively, you can set individual connection parameters:
   ```
   MSSQL_USER=username
   MSSQL_PASSWORD=password
   MSSQL_HOST=yourserver
   MSSQL_DATABASE=yourdatabase
   ```

3. Create the necessary database tables and insert sample data using the SQL script:
   ```bash
   # Using SQL Server Management Studio or sqlcmd
   # Execute the script at src/db/setup-database.sql
   ```

### SQL Tools Provided

#### Product Tools
- `sql-get-all-products` - Get all products from the SQL database
- `sql-get-product-by-id` - Get a specific product by ID
- `sql-search-products` - Search for products by name or description
- `sql-get-products-below-price` - Get products below a specified price
- `sql-get-low-inventory-products` - Get products with inventory below a threshold
- `sql-get-paginated-products` - Get paginated products with specified page and size
- `sql-add-product` - Add a new product to the database
- `sql-update-product` - Update an existing product
- `sql-delete-product` - Delete a product from the database

#### User Tools
- `sql-get-all-users` - Get all users from the SQL database
- `sql-get-user-by-id` - Get a specific user by ID
- `sql-search-users` - Search for users by username or email
- `sql-get-user-by-email` - Get a specific user by email address
- `sql-get-paginated-users` - Get paginated users with specified page and size
- `sql-add-user` - Add a new user to the database
- `sql-update-user` - Update an existing user
- `sql-delete-user` - Delete a user from the database

#### Database Tools
- `sql-check-database-health` - Check the health of the SQL database connection

### Testing the Database Connection

You can test your database connection by running:

```bash
npm run build
node dist/tools/testConnection.js
```

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
