import { executeQuery, closeConnection } from './db.js';

/**
 * Get table schema details
 */
async function getTableSchema(tableName: string) {
  try {
    console.log(`Checking schema for table: ${tableName}`);
    
    const columns = await executeQuery(`
      SELECT 
        c.name AS ColumnName,
        t.name AS DataType,
        c.max_length AS MaxLength,
        c.is_nullable AS IsNullable,
        c.is_identity AS IsIdentity
      FROM 
        sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE 
        c.object_id = OBJECT_ID(@tableName)
      ORDER BY 
        c.column_id
    `, { tableName });
    
    console.log(`Table: ${tableName} has ${columns.length} columns:`);
    columns.forEach(col => {
      console.log(`- ${col.ColumnName} (${col.DataType}${col.MaxLength > 0 ? `(${col.MaxLength})` : ''}, ${col.IsNullable ? 'NULL' : 'NOT NULL'}${col.IsIdentity ? ', IDENTITY' : ''})`);
    });
    
    return columns;
  } catch (error) {
    console.error(`Error fetching schema for table ${tableName}:`, error);
    throw error;
  }
}

async function checkDatabaseSchema() {
  try {
    // Check Products table
    await getTableSchema('Products');
    console.log();
    
    // Check Users table
    await getTableSchema('Users');
  } catch (error) {
    console.error('Error checking database schema:', error);
  } finally {
    await closeConnection();
  }
}

// Run the schema check
checkDatabaseSchema();
