import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env file from both the current directory and the root directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Check for connection string first
const connectionString = process.env.MSSQL_CONNECTION_STRING;

if (!connectionString && (!process.env.MSSQL_USER || !process.env.MSSQL_PASSWORD || !process.env.MSSQL_HOST || !process.env.MSSQL_DATABASE)) {
    console.error('Error: Required environment variables are missing.');
    console.error('Please ensure your .env file exists and contains the necessary database configuration.');
    process.exit(1);
}

export const mssqlConfig = connectionString || {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_HOST,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: false, // set to false for local SQL Express
    trustServerCertificate: true, // change to true for local dev / self-signed certs
    connectionTimeout: 30000 // increase timeout to 30 seconds
  }
};
