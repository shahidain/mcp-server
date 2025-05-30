import { Commodity } from '../db-models/commodity.js';
import sql from 'mssql';  // Changed from * as sql to default import
import { getPool } from '../config/db.js';

export class SqlCommodityService {
    async getPaginatedCommodities(skip = 0, limit = 10): Promise<Commodity[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            // Use the SQL Server data types correctly
            request.input('skip', sql.Int, skip);
            request.input('limit', sql.Int, limit);

            const result = await request.query(
                `SELECT * FROM Commodities ORDER BY Id OFFSET @skip ROWS FETCH NEXT @limit ROWS ONLY`
            );

            return result.recordset;
        } catch (error) {
            console.error('Error in getPaginatedCommodities:', error);
            throw error;
        }
    }

    async getCommodityById(id: number): Promise<Commodity | null> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('id', sql.Int, id);

            const result = await request.query(
                `SELECT * FROM Commodities WHERE Id = @id AND (Deleted = 0 OR Deleted IS NULL)`
            );

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error in getCommodityById:', error);
            throw error;
        }
    }

    async searchCommodities(query: string | null | undefined): Promise<Commodity[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('query', sql.VarChar, `%${query}%`);

            const result = await request.query(
                `SELECT * FROM Commodities 
                 WHERE Deleted = 0 
                 AND (Name LIKE @query 
                      OR Code LIKE @query 
                      OR ShortName LIKE @query 
                      OR BankCode LIKE @query)`
            );

            return result.recordset;
        } catch (error) {
            console.error('Error in searchCommodities:', error);
            throw error;
        }
    }
}