import { Currency } from '../db-models/currency.js';
import sql from 'mssql';
import { getPool } from '../config/db.js';

export class SqlCurrencyService {
    async getPaginatedCurrencies(skip = 0, limit = 10): Promise<Currency[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('skip', sql.Int, skip);
            request.input('limit', sql.Int, limit);

            const result = await request.query(
                `SELECT * FROM Currency WHERE (DELETED IS NULL OR DELETED = 0) ORDER BY ID OFFSET @skip ROWS FETCH NEXT @limit ROWS ONLY`
            );

            return result.recordset;
        } catch (error) {
            console.error('Error in getPaginatedCurrencies:', error);
            throw error;
        }
    }

    async getCurrencyById(id: number): Promise<Currency | null> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('id', sql.Int, id);

            const result = await request.query(
                `SELECT * FROM Currency WHERE ID = @id AND (DELETED IS NULL OR DELETED = 0)`
            );

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error in getCurrencyById:', error);
            throw error;
        }
    }

    async searchCurrencies(query: string): Promise<Currency[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('query', sql.VarChar, `%${query}%`);

            const result = await request.query(
                `SELECT * FROM Currency 
                 WHERE (DELETED IS NULL OR DELETED = 0) 
                 AND (NAME LIKE @query 
                      OR SHORT_NAME LIKE @query)`
            );

            return result.recordset;
        } catch (error) {
            console.error('Error in searchCurrencies:', error);
            throw error;
        }
    }
}
