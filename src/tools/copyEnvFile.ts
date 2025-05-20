import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');

// Source and destination paths
const sourceEnvPath = path.join(rootDir, '.env');
const destEnvPath = path.join(rootDir, 'dist', '.env');

// Create dist directory if it doesn't exist
if (!fs.existsSync(path.join(rootDir, 'dist'))) {
    fs.mkdirSync(path.join(rootDir, 'dist'));
}

try {
    // Check if .env exists
    if (fs.existsSync(sourceEnvPath)) {
        // Copy .env file to dist folder
        fs.copyFileSync(sourceEnvPath, destEnvPath);
        console.log('Successfully copied .env file to dist folder');
    } else {
        console.warn('Warning: No .env file found in root directory');
        
        // Create a default .env file in dist with essential settings
        const defaultEnvContent = `# Microsoft SQL Server connection settings
MSSQL_CONNECTION_STRING=Server=localhost\\SQLEXPRESS;Database=FAJR;User Id=sa;Password=123456;Encrypt=false;TrustServerCertificate=true;

# Individual settings (used as fallback if no connection string is provided)
MSSQL_USER=sa
MSSQL_PASSWORD=123456
MSSQL_HOST=localhost\\SQLEXPRESS
MSSQL_DATABASE=FAJR`;

        fs.writeFileSync(destEnvPath, defaultEnvContent);
        console.log('Created default .env file in dist folder');
    }
} catch (error) {
    console.error('Error copying .env file:', error);
    process.exit(1);
}
