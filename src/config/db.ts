import sql from 'mssql';
import { mssqlConfig } from './mssqlConfig.js';

/**
 * Type guard to check if config is a connection string
 */
function isConnectionString(config: unknown): config is string {
  return typeof config === 'string';
}

/**
 * Get a properly typed configuration object for SQL Server - simplified version
 * that prioritizes connection string and has minimal validation
 */
function getValidConfig(config: unknown): sql.config | string {
  // First, check if it's a connection string
  if (isConnectionString(config)) {
    return config;
  }
  
  // If not a string, ensure it's an object
  if (typeof config !== 'object' || config === null) {
    throw new Error('Invalid SQL Server configuration. Must be a connection string or a config object.');
  }
  
  // Cast to Record for property access
  const typedConfig = config as Record<string, unknown>;
  
  // Create a SQL config object with minimal validation
  const sqlConfig: sql.config = {
    user: String(typedConfig.user || ''),
    password: String(typedConfig.password || ''),
    server: String(typedConfig.server || ''),
    database: String(typedConfig.database || ''),
    options: typedConfig.options as Record<string, unknown> || {
      encrypt: false,
      trustServerCertificate: true
    },
    connectionTimeout: 30000, // Default 30s timeout
    requestTimeout: 30000     // Default 30s timeout
  };
  
  // Override defaults with any provided values
  if (typedConfig.connectionTimeout) {
    sqlConfig.connectionTimeout = Number(typedConfig.connectionTimeout);
  }
  
  if (typedConfig.requestTimeout) {
    sqlConfig.requestTimeout = Number(typedConfig.requestTimeout);
  }
  
  return sqlConfig;
}

// Global connection pool
let pool: sql.ConnectionPool | null = null;

/**
 * Get or create a connection pool to SQL Server
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      // Use the connection string directly if available, otherwise use the simplified config
      const config = getValidConfig(mssqlConfig);
      pool = await sql.connect(config);
      console.log('Connected to SQL Server database');
    } catch (err) {
      console.error('Error connecting to SQL Server:', err);
      throw err;
    }
  }
  return pool;
}

/**
 * Get a connection pool to the MS SQL Server database
 * Implements retry logic for better resilience
 */
export async function getConnection(retryCount = 3, delay = 1000): Promise<sql.ConnectionPool> {
  try {
    // Return existing pool if available
    if (pool && pool.connected) {
      return pool;
    }
    
    // Close existing pool if it exists but is not connected
    if (pool) {
      try {
        await pool.close();
        pool = null;
      } catch (err) {
        console.warn('Failed to close existing pool:', err);
        // Continue to create a new pool
      }
    }    
    // Get config and create new pool
    const config = getValidConfig(mssqlConfig);
    
    // Create new pool based on config type (string or object)
    if (typeof config === 'string') {
      pool = await new sql.ConnectionPool(config).connect();
    } else {
      pool = await new sql.ConnectionPool(config).connect();
    }
    
    console.log('Connected to SQL Server database');
    return pool;
  } catch (error) {
    console.error('Failed to connect to SQL Server:', error);
    
    // Implement retry logic
    if (retryCount > 0) {
      console.log(`Retrying connection in ${delay}ms... (${retryCount} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getConnection(retryCount - 1, delay * 1.5); // Exponential backoff
    }
    
    throw new Error(`Failed to connect to SQL Server after multiple attempts: ${error}`);
  }
}

/**
 * Execute a SQL query with parameters
 * @param query The SQL query to execute
 * @param params An object containing parameter names and values
 * @returns Promise resolving to array of result objects
 */
export async function executeQuery<T = any>(query: string, params: Record<string, unknown> = {}): Promise<T[]> {
  try {
    const conn = await getConnection();
    const request = new sql.Request(conn);
    
    // Add parameters to the request with proper type detection
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        request.input(key, value);
      }
    });
    
    const result = await request.query(query);
    return result.recordset as T[];
  } catch (error) {
    console.error('Error executing SQL query:', error);
    console.error('Query:', query);
    console.error('Parameters:', JSON.stringify(params, null, 2));
    throw error;
  }
}

/**
 * Close the database connection pool
 */
export async function closeConnection(): Promise<void> {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log('SQL Server connection closed');
    } catch (error) {
      console.error('Error closing SQL Server connection:', error);
      throw error;
    }
  }
}

// Close the connection when the application exits
// Handle various termination signals for proper cleanup
['exit', 'SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((eventType) => {
  process.on(eventType, () => {
    if (pool) {
      try {
        pool.close();
        console.log(`SQL Server connection closed due to ${eventType}`);
      } catch (error) {
        console.error(`Error closing SQL connection on ${eventType}:`, error);
      }
    }
  });
});
