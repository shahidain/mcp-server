# GitHub Copilot Instructions for MCP Server

## Project Overview
This is a Model Context Protocol (MCP) server built with TypeScript and Express.js that provides integration with various services including Jira, SQL databases, and product management systems. The server uses Server-Sent Events (SSE) for real-time communication and AI-powered tools for data processing.

## Code Style and Conventions

### TypeScript Standards
- Use strict TypeScript with proper type definitions
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Always handle async/await with proper error handling
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators

### File Organization
- Services go in `src/services/` - follow the pattern of existing services
- Controllers go in `src/controllers/` - handle HTTP requests/responses
- Models go in `src/models/` for data structures
- Database models go in `src/db-models/` for SQL entity definitions
- Utilities go in `src/utils/` for helper functions
- Types go in `src/types/` for TypeScript type definitions

### Naming Conventions
- Use camelCase for variables, functions, and methods
- Use PascalCase for classes, interfaces, and types
- Use kebab-case for file names
- Service classes should end with "Service" (e.g., `JiraService`)
- Controller functions should be descriptive (e.g., `getPaginatedUsers`)

## Architecture Patterns

### Service Layer Pattern
- All business logic should be in service classes
- Services should be stateless and reusable
- Use dependency injection where appropriate
- Example structure:
```typescript
export class MyService {
  async getData(id: number): Promise<MyData | undefined> {
    // Implementation
  }
}
```

### Error Handling
- Use try-catch blocks for async operations
- Always return meaningful error messages
- Use the `handleError` function in transports for consistent error formatting
- Log errors with context (session IDs, operation details)

### Response Formatting
- Use streaming responses for better UX: `streamMarkdownTableFromJson`, `streamMarkdownTextFromJson`
- Follow the established system prompts in `src/llm-api/prompts.ts`
- Use appropriate data formats (markdown-table, markdown-text, charts)

## Database Integration

### SQL Services
- Follow the pattern of existing SQL services (SqlVendorService, SqlUserService, etc.)
- Use parameterized queries to prevent SQL injection
- Implement pagination with `skip` and `limit` parameters
- Provide search functionality where applicable

### Connection Management
- Use the established database configuration in `src/config/`
- Handle connection pooling appropriately
- Always close connections properly

## API Integration

### Jira Integration
- Use the `JiraService` for all Jira operations
- Follow Atlassian REST API standards
- Handle authentication with environment variables
- Use JQL for complex queries

### Tool Integration
- New tools should be added to the `SystemPromtForTool` in prompts.ts
- Implement corresponding handlers in `transports.ts`
- Follow the established parameter extraction pattern
- Use appropriate response formatting

## Environment and Configuration

### Environment Variables
- Store sensitive data in `.env` file
- Use descriptive variable names with prefixes (e.g., `JIRA_`, `DB_`)
- Provide example values in `.env.example`
- Access via `process.env` with fallback values where appropriate

### Configuration Files
- Database configs go in `src/config/`
- Use TypeScript for configuration when possible
- Validate required environment variables on startup

## Testing and Quality

### Code Quality
- Write self-documenting code with clear variable names
- Add comments for complex business logic
- Keep functions focused and single-purpose
- Avoid deep nesting (prefer early returns)

### Error Scenarios
- Always handle null/undefined cases
- Provide meaningful error messages to users
- Log errors with sufficient context for debugging
- Use appropriate HTTP status codes

## AI and LLM Integration

### Prompt Engineering
- Keep prompts clear and specific in `src/llm-api/prompts.ts`
- Use consistent formatting instructions
- Provide examples in prompts when helpful
- Handle different data formats (arrays, objects, text)

### Tool Routing
- Use the `getToolToCall` function for AI-powered tool selection
- Extract parameters systematically
- Validate required parameters before processing
- Provide helpful error messages for missing parameters

## SSE and Real-time Communication

### Transport Management
- Use session IDs for connection tracking
- Handle connection lifecycle properly (connect, disconnect, errors)
- Log connection events with session context
- Clean up resources on connection close

### Message Handling
- Route messages based on content type
- Use appropriate streaming responses
- Handle errors gracefully without breaking connections
- Provide connection status feedback

## Dependencies and Libraries

### Core Dependencies
- `@modelcontextprotocol/sdk` for MCP protocol
- `express` for HTTP server
- `tedious` for SQL Server connections
- `dotenv` for environment management

### Development Practices
- Keep dependencies updated
- Use specific version numbers in package.json
- Prefer established libraries over custom implementations
- Document any special dependency requirements

## Common Patterns to Follow

1. **Service Method Pattern**:
```typescript
async getEntityById(id: number): Promise<Entity | undefined> {
  // Validation, database call, error handling
}
```

2. **Controller Response Pattern**:
```typescript
return streamMarkdownTableFromJson(
  JSON.stringify(data), 
  req.body.message, 
  SystemPromptForArray, 
  res, 
  format
);
```

3. **Error Handling Pattern**:
```typescript
try {
  // Operation
} catch (error) {
  console.error(`Error context: ${sessionId}`, error);
  await handleError(error, res);
}
```

## Security Considerations

- Validate all input parameters
- Use parameterized queries for database operations
- Sanitize user inputs before processing
- Handle authentication tokens securely
- Log security-relevant events

## Performance Guidelines

- Use pagination for large datasets
- Stream responses for better perceived performance
- Close database connections promptly
- Cache frequently accessed data when appropriate
- Monitor and log performance metrics

Remember: This is a real-time communication server handling multiple concurrent connections. Always consider the impact of your changes on performance and reliability.
